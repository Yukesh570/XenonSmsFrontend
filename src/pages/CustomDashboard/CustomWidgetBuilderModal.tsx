import React, { useState, useEffect } from "react";
import {
  Sliders,
  Table as TableIcon,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  Zap,
  TrendingDown,
  DollarSign,
  Globe,
  PieChart,
  Info,
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import type {
  CustomWidgetDefinition,
  EntityGroupBy,
  MetricType,
  VisualizationType,
  ConditionOperator,
  ConditionMode,
} from "./customWidgetTypes";
import {
  METRIC_LABELS,
  ENTITY_LABELS,
} from "./customWidgetTypes";

const ENTITY_HINTS: Record<EntityGroupBy, string> = {
  vendor: "Groups traffic per terminating carrier trunk / route provider.",
  client: "Groups traffic per customer account / SMPP user.",
  country: "Groups traffic per destination country / territory.",
  failure_reason: "Groups failed messages by carrier error code & failure reason.",
  overview: "Calculates single system-wide aggregate totals across the switch.",
};

const METRIC_HINTS: Record<MetricType, { summary: string; formula: string; detail: string }> = {
  dlr_percent: {
    summary: "Delivery success percentage confirmed by terminal carrier DLR receipts.",
    formula: "(Delivered SMS ÷ Total Volume) × 100",
    detail: "Measures overall route quality. A drop below 90% typically flags carrier degradation, expired messages, or invalid numbers.",
  },
  profit_margin: {
    summary: "Net revenue earnings generated from traffic after deducting carrier costs.",
    formula: "Client Revenue − Vendor Cost",
    detail: "Calculates total net profit in base currency ($). Positive values indicate profit; negative values flag loss-making routes.",
  },
  margin_percent: {
    summary: "Gross profitability percentage relative to total billed client revenue.",
    formula: "(Profit Margin ÷ Client Revenue) × 100",
    detail: "Measures commercial efficiency. Shows what percentage of each client dollar is retained after carrier termination costs.",
  },
  peak_tps_utilization: {
    summary: "Peak traffic burst compared against the configured maximum TPS limit.",
    formula: "(Peak Observed TPS ÷ Configured Limit) × 100",
    detail: "Identifies capacity saturation. Values approaching or exceeding 100% indicate clients or trunks bursting past their provisioned limits.",
  },
  avg_tps_utilization: {
    summary: "Average traffic load compared against the configured capacity limit.",
    formula: "(Average TPS ÷ Configured Limit) × 100",
    detail: "Measures sustained workload against provisioned capacity across the selected timeframe.",
  },
  tps_utilization: {
    summary: "Capacity utilization rate against configured TPS limit.",
    formula: "(Observed TPS ÷ Configured Limit) × 100",
    detail: "Tracks traffic rate against maximum allowed throttle limit.",
  },
  peak_tps: {
    summary: "Highest throughput rate (messages per second) reached within any hour.",
    formula: "Max hourly volume ÷ 3,600 sec",
    detail: "Captures the single biggest traffic burst in the selected timeframe, helping size connection bandwidth and TPS limits.",
  },
  tps: {
    summary: "Average messages per second processed across the active timeframe.",
    formula: "Total Messages ÷ Duration (seconds)",
    detail: "Reflects steady-state throughput volume for planning and capacity management.",
  },
  attempts: {
    summary: "Total count of SMS messages submitted into the switch.",
    formula: "Count of all processed SMS records",
    detail: "The gross traffic volume processed by the switch, regardless of delivery outcome.",
  },
  delivered: {
    summary: "Count of SMS messages confirmed delivered to handsets.",
    formula: "Count of messages with status DELIVERED",
    detail: "Messages that received a final positive delivery receipt from the handset or downstream operator.",
  },
  failed: {
    summary: "Count of messages that failed or expired without delivery.",
    formula: "Count of messages with status FAILED or EXPIRED",
    detail: "Messages that were rejected by carriers, encountered routing errors, or timed out without delivery.",
  },
  rejected: {
    summary: "Messages rejected before sending due to balance, rules, or blacklist.",
    formula: "Count of messages with status REJECTED",
    detail: "Messages rejected internally by the switch before carrier submission (e.g., insufficient balance, invalid prefix, blacklist).",
  },
  revenue: {
    summary: "Gross revenue billed to customers in the switch's base currency.",
    formula: "Sum of base_client_charge",
    detail: "Total billing amount charged to clients for submitting messages through the platform.",
  },
  vendor_cost: {
    summary: "Total carrier termination charges incurred in the switch's base currency.",
    formula: "Sum of base_vendor_charge",
    detail: "Total wholesale costs owed to downstream vendors/carriers for terminating messages.",
  },
};

interface CustomWidgetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: CustomWidgetDefinition) => void;
  editingWidget?: CustomWidgetDefinition | null;
  clientsList?: { id?: string | number; name: string }[];
  vendorsList?: { id?: string | number; profileName?: string; name?: string }[];
  countriesList?: { id?: string | number; name: string; countryCode?: string }[];
}

export const CustomWidgetBuilderModal: React.FC<CustomWidgetBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingWidget,
  clientsList = [],
  vendorsList = [],
  countriesList = [],
}) => {
  const [title, setTitle] = useState<string>("");
  const [entity, setEntity] = useState<EntityGroupBy>("vendor");
  const [primaryMetric, setPrimaryMetric] = useState<MetricType>("dlr_percent");
  const [visualization, setVisualization] = useState<VisualizationType>("table");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");

  // Filters
  const [clientFilter, setClientFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("all");

  // Condition Rule
  const [hasCondition, setHasCondition] = useState<boolean>(false);
  const [condMetric, setCondMetric] = useState<MetricType>("dlr_percent");
  const [condOperator, setCondOperator] = useState<ConditionOperator>("lt");
  const [condValue, setCondValue] = useState<number>(90);
  const [condMode, setCondMode] = useState<ConditionMode>("filter");

  // Sorting
  const [sortBy, setSortBy] = useState<"metric_desc" | "metric_asc" | "attempts_desc" | "name_asc">("metric_asc");
  const [limit, setLimit] = useState<number>(15);
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(false);

  useEffect(() => {
    if (editingWidget) {
      setTitle(editingWidget.title);
      setEntity(editingWidget.entity);
      setPrimaryMetric(editingWidget.primaryMetric);
      setVisualization(editingWidget.visualization);
      setSize(editingWidget.size);
      setClientFilter(editingWidget.filters.client || "");
      setVendorFilter(editingWidget.filters.vendor || "");
      setCountryFilter(editingWidget.filters.country || "");
      setDatePreset(editingWidget.filters.datePreset || "all");
      setIncludeDeleted(Boolean(editingWidget.filters.include_deleted));

      if (editingWidget.condition && editingWidget.condition.operator !== "none") {
        setHasCondition(true);
        setCondMetric(editingWidget.condition.metric);
        setCondOperator(editingWidget.condition.operator);
        setCondValue(editingWidget.condition.value);
        setCondMode(editingWidget.condition.mode);
      } else {
        setHasCondition(false);
      }

      setSortBy(editingWidget.sortBy || "metric_desc");
      setLimit(editingWidget.limit || 15);
    } else {
      // Defaults for a new custom widget
      setEntity("vendor");
      setPrimaryMetric("dlr_percent");
      setVisualization("table");
      setSize("medium");
      setClientFilter("");
      setVendorFilter("");
      setCountryFilter("");
      setDatePreset("all");
      setHasCondition(true);
      setCondMetric("dlr_percent");
      setCondOperator("lt");
      setCondValue(90);
      setCondMode("filter");
      setSortBy("metric_asc");
      setLimit(15);
    }
  }, [editingWidget, isOpen]);

  // Quick preset shortcuts
  const applyPreset = (presetKey: string) => {
    if (presetKey === "vendor_dlr_below_90") {
      setTitle("Degraded Vendors — DLR < 90%");
      setEntity("vendor");
      setPrimaryMetric("dlr_percent");
      setVisualization("table");
      setSize("medium");
      setHasCondition(true);
      setCondMetric("dlr_percent");
      setCondOperator("lt");
      setCondValue(90);
      setCondMode("filter");
      setSortBy("metric_asc");
    } else if (presetKey === "client_margins") {
      setTitle("Client Profitability & Margins");
      setEntity("client");
      setPrimaryMetric("profit_margin");
      setVisualization("table");
      setSize("medium");
      setHasCondition(false);
      setSortBy("metric_desc");
    } else if (presetKey === "failure_reasons") {
      setTitle("SMS Failure Reasons Breakdown");
      setEntity("failure_reason");
      setPrimaryMetric("failed");
      setVisualization("donut");
      setSize("medium");
      setHasCondition(false);
      setSortBy("metric_desc");
    } else if (presetKey === "country_deliverability") {
      setTitle("Country Delivery Ranking");
      setEntity("country");
      setPrimaryMetric("dlr_percent");
      setVisualization("bar");
      setSize("medium");
      setHasCondition(false);
      setSortBy("metric_desc");
    } else if (presetKey === "negative_margins") {
      setTitle("Loss Routes — Margin < $0");
      setEntity("client");
      setPrimaryMetric("profit_margin");
      setVisualization("table");
      setSize("large");
      setHasCondition(true);
      setCondMetric("profit_margin");
      setCondOperator("lt");
      setCondValue(0);
      setCondMode("filter");
      setSortBy("metric_asc");
    } else if (presetKey === "tps_saturation") {
      setTitle("High Traffic Load (>80%)");
      setEntity("client");
      setPrimaryMetric("peak_tps_utilization");
      setVisualization("table");
      setSize("medium");
      setHasCondition(true);
      setCondMetric("peak_tps_utilization");
      setCondOperator("gt");
      setCondValue(80);
      setCondMode("highlight");
      setSortBy("metric_desc");
    } else if (presetKey === "top_peak_tps") {
      setTitle("Top Throughput Routes (Peak TPS)");
      setEntity("vendor");
      setPrimaryMetric("peak_tps");
      setVisualization("bar");
      setSize("medium");
      setHasCondition(false);
      setSortBy("metric_desc");
    }
  };

  const handleSave = () => {
    const finalWidget: CustomWidgetDefinition = {
      id: editingWidget?.id || `cw-${Date.now()}`,
      title: title.trim() || `${ENTITY_LABELS[entity]} - ${METRIC_LABELS[primaryMetric]}`,
      entity,
      primaryMetric,
      visualization,
      size,
      filters: {
        client: clientFilter || undefined,
        vendor: vendorFilter || undefined,
        country: countryFilter || undefined,
        datePreset,
        include_deleted: includeDeleted === true ? true : false,
      },
      condition: hasCondition
        ? {
          metric: condMetric,
          operator: condOperator,
          value: Number(condValue),
          mode: condMode,
        }
        : {
          metric: primaryMetric,
          operator: "none",
          value: 0,
          mode: "filter",
        },
      sortBy,
      limit: Number(limit) || 15,
    };

    onSave(finalWidget);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-primary shrink-0" />
            <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {editingWidget ? "Edit Custom Widget" : "Build Custom Data Widget"}
            </span>
          </div>
          <p className="text-xs text-text-secondary dark:text-gray-400 font-normal">
            Customize entity grouping, primary metrics, filters, thresholds, and visualization.
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-text-secondary dark:text-gray-400 truncate max-w-[50%]">
            {entity ? `Configuring: ${ENTITY_LABELS[entity]} • ${METRIC_LABELS[primaryMetric]}` : ""}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
            >
              {editingWidget ? "Update Widget" : "Save Widget to Workspace"}
            </Button>
          </div>
        </div>
      }
      className="max-w-4xl"
    >
      <div className="space-y-6 pb-2">
        {/* Quick Preset Bar */}
        {!editingWidget && (
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" />
              Quick Preset Templates
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("vendor_dlr_below_90")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <TrendingDown size={13} className="text-rose-500 shrink-0" />
                <span>Vendor DLR &lt; 90%</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("client_margins")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <DollarSign size={13} className="text-emerald-500 shrink-0" />
                <span>Client Margins</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("failure_reasons")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <PieChart size={13} className="text-indigo-500 shrink-0" />
                <span>Failure Reasons</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("country_deliverability")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <Globe size={13} className="text-blue-500 shrink-0" />
                <span>Country Deliverability</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("negative_margins")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                <span>Negative Margin Routes</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("tps_saturation")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <Activity size={13} className="text-orange-500 shrink-0" />
                <span>High Load (&gt;80%)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("top_peak_tps")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                <Zap size={13} className="text-sky-500 shrink-0" />
                <span>Top Peak TPS</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Basic Identity & Layout */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
            1. Widget Name & Layout
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Widget Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Degraded Vendors Watchlist"
                className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Width / Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="small">Small (1/3 Width)</option>
                <option value="medium">Medium (1/2 Width)</option>
                <option value="large">Large (Full Width)</option>
              </select>
            </div>
          </div>

          {/* Visualization selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Visualization Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "table", label: "Data Table", icon: TableIcon, desc: "Detailed ranked rows" },
                { id: "bar", label: "Bar Chart", icon: BarChart2, desc: "Comparative ranking" },
                { id: "donut", label: "Donut Chart", icon: PieChartIcon, desc: "Proportional share" },
                { id: "kpi", label: "KPI Stat Card", icon: Activity, desc: "Single aggregate card" },
              ].map((item) => {
                const Icon = item.icon;
                const isSel = visualization === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVisualization(item.id as any);
                      if (item.id === "kpi" && !editingWidget && entity !== "overview") {
                        setEntity("overview");
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${isSel
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                  >
                    <Icon size={22} className={isSel ? "text-primary" : "text-gray-400"} />
                    <span className="text-xs font-semibold mt-1.5">{item.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Data Dimension & Metric */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
            2. Data Dimension & Metric
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Entity (Group By)</label>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="vendor">By Vendor (Trunk / Route)</option>
                <option value="client">By Client (Account)</option>
                <option value="country">By Country (Destination)</option>
                <option value="failure_reason">By Failure Reason</option>
                <option value="overview">Overall Summary (Switch Aggregate)</option>
              </select>
              <p className="text-[11px] text-text-secondary dark:text-gray-400 mt-1">
                {ENTITY_HINTS[entity] || "Groups data across selected entities."}
              </p>
              {visualization === "kpi" && (
                <p className="text-[11px] text-primary dark:text-primary mt-1 font-medium">
                  💡 Select <strong>Overall Summary</strong> for switch-wide aggregate stats, or select Client/Vendor to feature the #1 top-ranked entity.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Primary Metric</label>
              <select
                value={primaryMetric}
                onChange={(e) => setPrimaryMetric(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="dlr_percent">Delivery Rate (DLR %)</option>
                <option value="peak_tps">Peak Throughput (Peak TPS)</option>
                <option value="tps">Average Throughput (TPS)</option>
                <option value="peak_tps_utilization">Peak Load (%)</option>
                <option value="attempts">Total Attempts / Volume</option>
                <option value="delivered">Delivered Messages</option>
                <option value="failed">Failed Messages</option>
                <option value="rejected">Rejected Messages</option>
                <option value="profit_margin">Profit Margin ($)</option>
                <option value="margin_percent">Margin %</option>
                <option value="revenue">Revenue ($)</option>
                <option value="vendor_cost">Vendor Cost ($)</option>
              </select>
              <p className="text-[11px] text-text-secondary dark:text-gray-400 mt-1">
                {METRIC_HINTS[primaryMetric]?.summary}
              </p>
            </div>
          </div>

          {/* Metric Guide & Formula Callout Box */}
          {METRIC_HINTS[primaryMetric] && (
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-semibold text-text-primary dark:text-white flex items-center gap-2 flex-wrap">
                  <span>{METRIC_LABELS[primaryMetric] || primaryMetric}</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary font-mono border border-primary/20">
                    Formula: {METRIC_HINTS[primaryMetric].formula}
                  </span>
                </div>
                <p className="text-text-secondary dark:text-gray-300 text-[11px] leading-relaxed">
                  {METRIC_HINTS[primaryMetric].detail}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Scope Filters */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
            <span>3. Target Scope Filters</span>
            <span className="text-[11px] font-normal text-text-secondary dark:text-gray-400">Optional: filter data before grouping</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter Client</label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">All Clients</option>
                {clientsList.map((c, i) => (
                  <option key={i} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">All Vendors</option>
                {vendorsList.map((v, i) => {
                  const name = v.profileName || v.name || "";
                  return (
                    <option key={i} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter Country</label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">All Countries</option>
                {countriesList.map((cn, i) => (
                  <option key={i} value={cn.name}>
                    {cn.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Time Window</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Available History</option>
              </select>
            </div>

            {/* <div className="md:col-span-4 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="cw-include-deleted"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="cw-include-deleted" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Include soft-deleted accounts (default is active accounts only)
              </label>
            </div> */}
          </div>
        </div>

        {/* Section 4: Condition Rule / Threshold */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              4. Custom Condition / Threshold Rule
            </h3>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCondition}
                onChange={(e) => setHasCondition(e.target.checked)}
                className="rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-primary focus:ring-0"
              />
              Enable Rule Threshold
            </label>
          </div>

          {hasCondition && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Metric</label>
                  <select
                    value={condMetric}
                    onChange={(e) => setCondMetric(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
                  >
                    <option value="dlr_percent">DLR %</option>
                    <option value="peak_tps_utilization">Peak Load (%)</option>
                    <option value="peak_tps">Peak TPS</option>
                    <option value="tps">Average TPS</option>
                    <option value="margin_percent">Margin %</option>
                    <option value="profit_margin">Profit Margin ($)</option>
                    <option value="failed">Failed Count</option>
                    <option value="rejected">Rejected Count</option>
                    <option value="attempts">Total Attempts</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Operator</label>
                  <select
                    value={condOperator}
                    onChange={(e) => setCondOperator(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
                  >
                    <option value="lt">Less Than (&lt;)</option>
                    <option value="lte">Less Than or Equal (&lt;=)</option>
                    <option value="gt">Greater Than (&gt;)</option>
                    <option value="gte">Greater Than or Equal (&gt;=)</option>
                    <option value="eq">Equals (=)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Threshold Value</label>
                  <input
                    type="number"
                    value={condValue}
                    onChange={(e) => setCondValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Action Mode</label>
                  <select
                    value={condMode}
                    onChange={(e) => setCondMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 focus:outline-none"
                  >
                    <option value="filter">Filter: Only Matching Records</option>
                    <option value="highlight">Highlight: Show All & Flag</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
                ⚡ <strong>Rule Active:</strong> Will target records where{" "}
                <code className="font-semibold text-amber-900 dark:text-amber-200">
                  {condMetric} {condOperator} {condValue}
                </code>{" "}
                ({condMode === "filter" ? "excluding others" : "highlighting matching in red"}).
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Sorting & Limits */}
        {visualization === "kpi" && entity === "overview" ? (
          <div className="bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-text-secondary dark:text-gray-400 flex items-center gap-2.5">
            <span className="text-base">📊</span>
            <div>
              <span className="font-semibold text-text-primary dark:text-gray-200">Switch Aggregate Mode:</span>{" "}
              This KPI card calculates and displays the system-wide totals directly. List sorting and display limits do not apply.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
              5. Sorting & Maximum Records {visualization === "kpi" && "(Used for Ranking #1 Top Entity)"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="metric_asc">Metric Ascending (Lowest / Worst First)</option>
                  <option value="metric_desc">Metric Descending (Highest / Best First)</option>
                  <option value="attempts_desc">Volume / Attempts Descending</option>
                  <option value="name_asc">Alphabetical (Name A-Z)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Limit Display Rows</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
