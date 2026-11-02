import React, { useState, useEffect } from "react";
import {
  Sliders,
  Table as TableIcon,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  Zap,
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
      setTitle("Vendors — DLR < 90%");
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
      setTitle("High TPS Saturation (>80%)");
      setEntity("client");
      setPrimaryMetric("tps_utilization");
      setVisualization("table");
      setSize("medium");
      setHasCondition(true);
      setCondMetric("tps_utilization");
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
        <div className="flex items-center gap-2">
          <Sliders size={20} className="text-primary shrink-0" />
          <span className="truncate">{editingWidget ? "Edit Custom Widget" : "Build Custom Data Widget"}</span>
        </div>
      }
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <p className="text-xs text-text-secondary dark:text-gray-400 -mt-2">
          Customize entity grouping, primary metrics, filters, thresholds, and visualization.
        </p>

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
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                📉 Vendor DLR &lt; 90%
              </button>
              <button
                type="button"
                onClick={() => applyPreset("client_margins")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                💰 Client Margins
              </button>
              <button
                type="button"
                onClick={() => applyPreset("failure_reasons")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                🍩 Failure Reasons
              </button>
              <button
                type="button"
                onClick={() => applyPreset("country_deliverability")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                🌍 Country Deliverability
              </button>
              <button
                type="button"
                onClick={() => applyPreset("negative_margins")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                ⚠️ Negative Margin Routes
              </button>
              <button
                type="button"
                onClick={() => applyPreset("tps_saturation")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                ⚡ High TPS Saturation (&gt;80%)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("top_peak_tps")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                🚀 Top Peak TPS
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
                    onClick={() => setVisualization(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSel
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
                <option value="overview">Overall Summary (Aggregate)</option>
              </select>
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
                <option value="tps_utilization">TPS Capacity Utilization (%)</option>
                <option value="attempts">Total Attempts / Volume</option>
                <option value="delivered">Delivered Messages</option>
                <option value="failed">Failed Messages</option>
                <option value="rejected">Rejected Messages</option>
                <option value="profit_margin">Profit Margin ($)</option>
                <option value="margin_percent">Margin %</option>
                <option value="revenue">Revenue ($)</option>
                <option value="vendor_cost">Vendor Cost ($)</option>
              </select>
            </div>
          </div>
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
                    <option value="tps_utilization">TPS Capacity Utilization (%)</option>
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
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">
            5. Sorting & Maximum Records
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-text-secondary dark:text-gray-400">
            {entity ? `Configuring: ${ENTITY_LABELS[entity]} • ${METRIC_LABELS[primaryMetric]}` : ""}
          </div>
          <div className="flex items-center gap-3">
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
      </div>
    </Modal>
  );
};
