import React, { useState, useEffect, useMemo } from "react";
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
  Lock,
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select, { type SelectOption } from "../../components/ui/Select";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import type {
  CustomWidgetDefinition,
  CustomWidgetSize,
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
  failure_reason: "Groups failed messages by carrier error code & failure reason. Exclusively tracks failure counts (deliveries, DLR, and margins are not applicable).",
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
    summary: "Highest throughput rate (messages per second) reached within any 1-second window.",
    formula: "Max 1-second burst volume",
    detail:
      "Captures the single highest 1-second traffic burst in the selected timeframe, helping verify carrier connection bandwidth and TPS throttle limits.",
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

const SIZE_OPTIONS: SelectOption[] = [
  { value: "small", label: "1x (1/3 Width)" },
  { value: "medium", label: "2x (1/2 Width)" },
  { value: "large", label: "3x (2/3 Width)" },
  { value: "full", label: "Full (Full Width)" },
];

const ENTITY_OPTIONS: SelectOption[] = [
  { value: "vendor", label: "By Vendor" },
  { value: "client", label: "By Client" },
  { value: "country", label: "By Country" },
  { value: "failure_reason", label: "By Failure Reason" },
  { value: "overview", label: "Overall Summary" },
];

const METRIC_OPTIONS: SelectOption[] = [
  { value: "dlr_percent", label: "Delivery Rate (DLR %)" },
  { value: "peak_tps", label: "Peak Throughput (Peak TPS)" },
  { value: "tps", label: "Average Throughput (TPS)" },
  { value: "peak_tps_utilization", label: "Peak Load (%)" },
  { value: "attempts", label: "Total Attempts / Volume" },
  { value: "delivered", label: "Delivered Messages" },
  { value: "failed", label: "Failed Messages" },
  { value: "rejected", label: "Rejected Messages" },
  { value: "profit_margin", label: "Profit Margin ($)" },
  { value: "margin_percent", label: "Margin %" },
  { value: "revenue", label: "Revenue ($)" },
  { value: "vendor_cost", label: "Vendor Cost ($)" },
];

const FAILURE_METRIC_OPTIONS: SelectOption[] = [
  { value: "failed", label: "Failed Messages (Error Occurrences)" },
];

const COND_METRIC_OPTIONS: SelectOption[] = [
  { value: "dlr_percent", label: "DLR %" },
  { value: "peak_tps_utilization", label: "Peak Load (%)" },
  { value: "peak_tps", label: "Peak TPS" },
  { value: "tps", label: "Average TPS" },
  { value: "margin_percent", label: "Margin %" },
  { value: "profit_margin", label: "Profit Margin ($)" },
  { value: "failed", label: "Failed Count" },
  { value: "rejected", label: "Rejected Count" },
  { value: "attempts", label: "Total Attempts" },
];

const COND_OPERATOR_OPTIONS: SelectOption[] = [
  { value: "lt", label: "Less Than (<)" },
  { value: "lte", label: "Less Than or Equal (<=)" },
  { value: "gt", label: "Greater Than (>)" },
  { value: "gte", label: "Greater Than or Equal (>=)" },
  { value: "eq", label: "Equals (=)" },
];

const COND_MODE_OPTIONS: SelectOption[] = [
  { value: "filter", label: "Show Matches Only" },
  { value: "highlight", label: "Highlight Matches" },
];

const SORT_BY_OPTIONS: SelectOption[] = [
  { value: "metric_desc", label: "Metric Descending (Highest / Best First)" },
  { value: "metric_asc", label: "Metric Ascending (Lowest / Worst First)" },
  { value: "attempts_desc", label: "Volume / Attempts Descending" },
  { value: "name_asc", label: "Alphabetical (Name A-Z)" },
];

const LIMIT_OPTIONS: SelectOption[] = [
  { value: "5", label: "Top 5" },
  { value: "10", label: "Top 10" },
  { value: "15", label: "Top 15" },
  { value: "20", label: "Top 20" },
  { value: "50", label: "Top 50" },
];

const PRESETS = [
  { key: "vendor_dlr_below_90", label: "Vendor DLR < 90%", icon: TrendingDown },
  { key: "client_margins", label: "Client Margins", icon: DollarSign },
  { key: "failure_reasons", label: "Failure Reasons", icon: PieChart },
  { key: "country_deliverability", label: "Country Deliverability", icon: Globe },
  { key: "negative_margins", label: "Negative Margin Routes", icon: AlertTriangle },
  { key: "tps_saturation", label: "High Load (>80%)", icon: Activity },
  { key: "top_peak_tps", label: "Top Peak TPS", icon: Zap },
];

const VISUALIZATION_TYPES = [
  { id: "table", label: "Data Table", icon: TableIcon, desc: "Detailed ranked rows" },
  { id: "bar", label: "Bar Chart", icon: BarChart2, desc: "Comparative ranking" },
  { id: "donut", label: "Donut Chart", icon: PieChartIcon, desc: "Proportional share" },
  { id: "kpi", label: "KPI Stat Card", icon: Activity, desc: "Single aggregate card" },
];

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
  const [size, setSize] = useState<CustomWidgetSize>("medium");

  // Filters
  const [clientFilter, setClientFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");

  // Condition Rule
  const [hasCondition, setHasCondition] = useState<boolean>(false);
  const [condMetric, setCondMetric] = useState<MetricType>("dlr_percent");
  const [condOperator, setCondOperator] = useState<ConditionOperator>("lt");
  const [condValue, setCondValue] = useState<number>(90);
  const [condMode, setCondMode] = useState<ConditionMode>("filter");

  // Sorting
  const [sortBy, setSortBy] = useState<"metric_desc" | "metric_asc" | "attempts_desc" | "name_asc">("metric_desc");
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
      setTitle("");
      setEntity("vendor");
      setPrimaryMetric("dlr_percent");
      setVisualization("table");
      setSize("medium");
      setClientFilter("");
      setVendorFilter("");
      setCountryFilter("");
      setHasCondition(false);
      setCondMetric("dlr_percent");
      setCondOperator("lt");
      setCondValue(90);
      setCondMode("filter");
      setSortBy("metric_desc");
      setLimit(15);
    }
  }, [editingWidget, isOpen]);

  // Options memoization for custom Select components
  const clientOptions = useMemo<SelectOption[]>(() => {
    const list = clientsList.map((c) => ({
      value: c.name,
      label: c.name,
    }));
    return [{ value: "", label: "All Clients" }, ...list];
  }, [clientsList]);

  const vendorOptions = useMemo<SelectOption[]>(() => {
    const list = vendorsList.map((v) => {
      const name = v.profileName || v.name || "";
      return { value: name, label: name };
    });
    return [{ value: "", label: "All Vendors" }, ...list];
  }, [vendorsList]);

  const countryOptions = useMemo<SelectOption[]>(() => {
    const list = countriesList.map((cn) => ({
      value: cn.name,
      label: cn.name,
    }));
    return [{ value: "", label: "All Countries" }, ...list];
  }, [countriesList]);

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
            <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white">
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-4 pb-2"
      >
        {/* Quick Preset Templates */}
        {!editingWidget && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap size={13} className="text-primary" />
              Quick Preset Templates
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-text-secondary hover:text-text-primary dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-input"
                  >
                    <Icon size={13} className="text-primary shrink-0" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 1: Basic Identity & Layout */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-text-primary dark:text-white px-2">
            1. Widget Name & Layout
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-2">
              <Input
                label="Widget Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Degraded Vendors Watchlist"
              />
            </div>
            <div>
              <Select
                label="Width / Size"
                value={size}
                onChange={(v) => setSize(v as CustomWidgetSize)}
                options={SIZE_OPTIONS}
                clearable={false}
                isLoading={false}
              />
            </div>
          </div>

          {/* Visualization selector */}
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400">
              Visualization Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VISUALIZATION_TYPES.map((item) => {
                const Icon = item.icon;
                const isSel = visualization === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVisualization(item.id as VisualizationType);
                      if (item.id === "kpi" && !editingWidget && entity !== "overview") {
                        setEntity("overview");
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                      isSel
                        ? "bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text-primary dark:hover:text-gray-200 shadow-input"
                    }`}
                  >
                    <Icon size={22} className={isSel ? "text-primary" : "text-gray-400 dark:text-gray-500"} />
                    <span className="text-xs font-semibold mt-1.5">{item.label}</span>
                    <span className="text-xs text-text-secondary/70 dark:text-gray-500 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        {/* Section 2: Data Dimension & Metric */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-text-primary dark:text-white px-2">
            2. Data Dimension & Metric
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            <div>
              <Select
                label="Entity (Group By)"
                value={entity}
                onChange={(v) => {
                  const val = v as EntityGroupBy;
                  setEntity(val);
                  if (val === "failure_reason" && primaryMetric !== "failed") {
                    setPrimaryMetric("failed");
                  }
                }}
                options={ENTITY_OPTIONS}
                clearable={false}
                isLoading={false}
              />
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5">
                {ENTITY_HINTS[entity] || "Groups data across selected entities."}
              </p>
              {visualization === "kpi" && (
                <p className="text-xs text-primary dark:text-primary mt-1 font-medium">
                  💡 Select <strong>Overall Summary</strong> for switch-wide aggregate stats, or select Client/Vendor to feature the #1 top-ranked entity.
                </p>
              )}
            </div>

            <div>
              <Select
                label="Primary Metric"
                value={primaryMetric}
                onChange={(v) => setPrimaryMetric(v as MetricType)}
                options={entity === "failure_reason" ? FAILURE_METRIC_OPTIONS : METRIC_OPTIONS}
                disabled={entity === "failure_reason"}
                clearable={false}
                isLoading={false}
              />
              {entity === "failure_reason" ? (
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5 font-medium">
                  💡 Failure reasons exclusively track error occurrences (deliveries, DLR %, and margins do not apply).
                </p>
              ) : (
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5">
                  {METRIC_HINTS[primaryMetric]?.summary}
                </p>
              )}
            </div>
          </div>

          {/* Metric Guide & Formula Callout Box */}
          {METRIC_HINTS[primaryMetric] && (
            <div className="mt-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg p-3 flex items-start gap-2.5">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-semibold text-text-primary dark:text-white flex items-center gap-2 flex-wrap">
                  <span>{METRIC_LABELS[primaryMetric] || primaryMetric}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                    Formula: {METRIC_HINTS[primaryMetric].formula}
                  </span>
                </div>
                <p className="text-text-secondary dark:text-gray-400 text-xs leading-relaxed">
                  {METRIC_HINTS[primaryMetric].detail}
                </p>
              </div>
            </div>
          )}
        </fieldset>

        {/* Section 3: Scope Filters */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <legend className="text-sm font-semibold text-text-primary dark:text-white px-2">
              3. Target Scope Filters
            </legend>
            <span className="text-xs font-normal text-text-secondary dark:text-gray-400">
              Optional: filter data before grouping
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <Select
              label="Filter Client"
              value={clientFilter}
              onChange={setClientFilter}
              options={clientOptions}
              placeholder="All Clients"
              clearable
              isLoading={false}
            />
            <Select
              label="Filter Vendor"
              value={vendorFilter}
              onChange={setVendorFilter}
              options={vendorOptions}
              placeholder="All Vendors"
              clearable
              isLoading={false}
            />
            <Select
              label="Filter Country"
              value={countryFilter}
              onChange={setCountryFilter}
              options={countryOptions}
              placeholder="All Countries"
              clearable
              isLoading={false}
            />
          </div>
        </fieldset>

        {/* Section 4: Condition Rule / Threshold */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
            <legend className="text-sm font-semibold text-text-primary dark:text-white px-2 flex items-center gap-1.5">
              <AlertTriangle size={14} className={hasCondition ? "text-primary" : "text-gray-400 dark:text-gray-500"} />
              <span>4. Custom Condition / Threshold Rule</span>
              {!hasCondition && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full ml-1">
                  <Lock size={10} />
                  Locked
                </span>
              )}
            </legend>
            <ToggleSwitch
              label="Enable Rule Threshold"
              checked={hasCondition}
              onChange={setHasCondition}
            />
          </div>

          <div
            className={`p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 transition-opacity ${
              !hasCondition ? "opacity-50 pointer-events-none select-none" : ""
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-start">
              <Select
                label="Metric"
                value={condMetric}
                onChange={(v) => setCondMetric(v as MetricType)}
                options={COND_METRIC_OPTIONS}
                clearable={false}
                isLoading={false}
                disabled={!hasCondition}
              />
              <Select
                label="Operator"
                value={condOperator}
                onChange={(v) => setCondOperator(v as ConditionOperator)}
                options={COND_OPERATOR_OPTIONS}
                clearable={false}
                isLoading={false}
                disabled={!hasCondition}
              />
              <Input
                label="Threshold Value"
                type="number"
                value={condValue}
                onChange={(e) => setCondValue(Number(e.target.value))}
                isClearable={false}
                disabled={!hasCondition}
              />
              <Select
                label="Rule Action"
                value={condMode}
                onChange={(v) => setCondMode(v as ConditionMode)}
                options={COND_MODE_OPTIONS}
                clearable={false}
                isLoading={false}
                disabled={!hasCondition}
              />
            </div>

            <div className="text-xs text-text-secondary dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-text-primary dark:text-white">
                <Zap size={13} className={hasCondition ? "text-primary shrink-0" : "text-gray-400 shrink-0"} />
                <span className="font-medium text-xs">Rule Behavior:</span>
                <code
                  className={`font-semibold px-1.5 py-0.5 rounded text-xs font-mono ${
                    hasCondition
                      ? "text-primary bg-primary/10"
                      : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  {condMetric} {condOperator} {condValue}
                </code>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary dark:text-gray-400">
                {condMode === "filter"
                  ? "• Show Matches Only: Only displays entities that meet this rule condition (hides non-matching items)."
                  : "• Highlight Matches: Displays all entities and highlights the ones that meet this rule condition."}
              </p>
            </div>
          </div>
        </fieldset>

        {/* Section 5: Sorting & Limits */}
        {visualization === "kpi" && entity === "overview" ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-text-secondary dark:text-gray-400 flex items-center gap-2.5">
            <span className="text-base">📊</span>
            <div>
              <span className="font-semibold text-text-primary dark:text-gray-200">Switch Aggregate Mode:</span>{" "}
              This KPI card calculates and displays the system-wide totals directly. List sorting and display limits do not apply.
            </div>
          </div>
        ) : (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-text-primary dark:text-white px-2">
              5. Sorting & Maximum Records {visualization === "kpi" && "(Used for Ranking #1 Top Entity)"}
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <Select
                label="Sort By"
                value={sortBy}
                onChange={(v) => setSortBy(v as "metric_desc" | "metric_asc" | "attempts_desc" | "name_asc")}
                options={SORT_BY_OPTIONS}
                clearable={false}
                isLoading={false}
              />
              <Select
                label="Limit Display Rows"
                value={String(limit)}
                onChange={(v) => setLimit(Number(v))}
                options={LIMIT_OPTIONS}
                clearable={false}
                isLoading={false}
              />
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  );
};
