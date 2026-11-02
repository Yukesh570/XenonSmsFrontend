import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GripVertical,
  Settings,
  Trash2,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { CustomWidgetDefinition, MetricType } from "./customWidgetTypes";
import { METRIC_LABELS } from "./customWidgetTypes";
import { getSummariseSummaryApi, getFailureReasonsApi } from "../../api/reportApi/summariseReportApi";

interface CustomWidgetCardProps {
  widget: CustomWidgetDefinition;
  globalDatePreset?: string;
  isDark?: boolean;
  onEdit: (widget: CustomWidgetDefinition) => void;
  onRemove: (id: string) => void;
  onResize: (id: string) => void;
  isDragging?: boolean;
}

const PALETTE = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#0ea5e9", // Sky Blue
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#f97316", // Orange
];

export const cleanDisplayName = (name: string): string => {
  if (!name) return "Unknown";
  let str = String(name).trim();
  // Strip "Breakdown: [1] " prefix
  str = str.replace(/^Breakdown:\s*\[\d+\]\s*/i, "");
  str = str.replace(/^Breakdown:\s*/i, "");
  return str;
};

const formatMetricValue = (metric: MetricType, value: number): string => {
  if (value === undefined || value === null || isNaN(value)) return "0";
  if (
    metric === "dlr_percent" ||
    metric === "margin_percent" ||
    metric === "tps_utilization" ||
    metric === "peak_tps_utilization" ||
    metric === "avg_tps_utilization"
  ) {
    return `${Number(value).toFixed(1)}%`;
  }
  if (metric === "tps" || metric === "peak_tps") {
    return `${Number(value).toFixed(2)} TPS`;
  }
  if (metric === "profit_margin" || metric === "revenue" || metric === "vendor_cost") {
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return Number(value).toLocaleString();
};

export const CustomWidgetCard: React.FC<CustomWidgetCardProps> = ({
  widget,
  globalDatePreset,
  isDark = false,
  onEdit,
  onRemove,
  onResize,
  isDragging,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global timeframe selector on the dashboard overrides individual widget preset unless specified
  const activeDatePreset = globalDatePreset || widget.filters.datePreset || "all";

  const getDateRange = useCallback(() => {
    const today = new Date();
    const toYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (activeDatePreset === "today") {
      const s = toYMD(today);
      return { start_date: `${s} 00:00:00`, end_date: `${s} 23:59:59` };
    }
    if (activeDatePreset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = toYMD(y);
      return { start_date: `${s} 00:00:00`, end_date: `${s} 23:59:59` };
    }
    if (activeDatePreset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      return { start_date: `${toYMD(past)} 00:00:00`, end_date: `${toYMD(today)} 23:59:59` };
    }
    if (activeDatePreset === "30d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      return { start_date: `${toYMD(past)} 00:00:00`, end_date: `${toYMD(today)} 23:59:59` };
    }
    return {};
  }, [activeDatePreset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateRange = getDateRange();
      const filters: Record<string, any> = { ...dateRange };
      if (widget.filters.client) filters.client = widget.filters.client;
      if (widget.filters.vendor) filters.vendor = widget.filters.vendor;
      if (widget.filters.country) filters.country = widget.filters.country;

      if (widget.entity === "failure_reason") {
        const res = await getFailureReasonsApi({ filters });
        const list = (res?.data || []).map((item) => ({
          name: item.failure_reason || "Unknown Failure",
          cleanName: cleanDisplayName(item.failure_reason || "Unknown Failure"),
          failed: item.count || 0,
          attempts: item.count || 0,
          delivered: 0,
          dlr_percent: 0,
          profit_margin: 0,
        }));
        setData(list);
        setTotals({ failed: list.reduce((acc, x) => acc + x.failed, 0) });
      } else if (widget.entity === "overview") {
        const res = await getSummariseSummaryApi({ filters, group_by: [] });
        const summary = res?.summary || [];
        const t = res?.totals || summary[0] || {};
        setTotals(t);
        setData(summary);
      } else {
        const groupByParam =
          widget.entity === "country"
            ? ["country"]
            : widget.entity === "vendor"
            ? ["vendor"]
            : ["client"];

        const res = await getSummariseSummaryApi({ filters, group_by: groupByParam });
        const summary = res?.summary || [];
        setTotals(res?.totals || null);

        const normalized = summary.map((row) => {
          let name = "Unknown";
          if (widget.entity === "vendor") name = row.vendor || "No Vendor";
          else if (widget.entity === "client") name = row.client || "No Client";
          else if (widget.entity === "country") name = row.country || row.message__country__name || "Unknown Country";

          const attempts = Number(row.attempts || 0);
          const delivered = Number(row.delivered || 0);
          const failed = Number(row.failed || 0);
          const rejected = Number(row.rejected || 0);
          const dlr = typeof row.dlr_percent === "number" ? row.dlr_percent : attempts > 0 ? (delivered / attempts) * 100 : 0;
          const profit = Number(row.profit_margin || 0);
          const marginPct = Number(row.margin_percent || 0);
          const rev = Number(row.revenue || 0);
          const cost = Number(row.vendor_cost || 0);
          const tps = Number(row.avg_tps ?? row.tps ?? 0);
          const peakTps = Number(row.peak_tps ?? 0);
          const configuredTps = row.configured_tps !== undefined && row.configured_tps !== null ? Number(row.configured_tps) : null;
          const peakTpsUtilization = Number(row.peak_tps_utilization ?? row.tps_utilization ?? 0);
          const avgTpsUtilization = Number(row.avg_tps_utilization ?? 0);

          return {
            name,
            cleanName: cleanDisplayName(name),
            attempts,
            delivered,
            failed,
            rejected,
            dlr_percent: dlr,
            profit_margin: profit,
            margin_percent: marginPct,
            revenue: rev,
            vendor_cost: cost,
            tps,
            avg_tps: tps,
            peak_tps: peakTps,
            configured_tps: configuredTps,
            peak_tps_utilization: peakTpsUtilization,
            tps_utilization: peakTpsUtilization,
            avg_tps_utilization: avgTpsUtilization,
            raw: row,
          };
        });

        setData(normalized);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load data for this widget");
    } finally {
      setLoading(false);
    }
  }, [widget, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply condition rules & sorting
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let list = [...data];

    const cond = widget.condition;
    if (cond && cond.operator && cond.operator !== "none") {
      list = list
        .map((row) => {
          const val = Number(row[cond.metric] ?? 0);
          let match = false;
          if (cond.operator === "lt") match = val < cond.value;
          else if (cond.operator === "lte") match = val <= cond.value;
          else if (cond.operator === "gt") match = val > cond.value;
          else if (cond.operator === "gte") match = val >= cond.value;
          else if (cond.operator === "eq") match = val === cond.value;

          return { ...row, _isMatch: match };
        })
        .filter((row) => (cond.mode === "filter" ? row._isMatch : true));
    }

    // Sorting
    const sort = widget.sortBy || "metric_desc";
    const metric = widget.primaryMetric || "dlr_percent";
    list.sort((a, b) => {
      if (sort === "metric_desc") return (b[metric] || 0) - (a[metric] || 0);
      if (sort === "metric_asc") return (a[metric] || 0) - (b[metric] || 0);
      if (sort === "attempts_desc") return (b.attempts || 0) - (a.attempts || 0);
      if (sort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""));
      return 0;
    });

    if (widget.limit && widget.limit > 0) {
      list = list.slice(0, widget.limit);
    }

    return list;
  }, [data, widget]);

  const totalSum = useMemo(() => {
    if (widget.entity === "overview" && totals) {
      return Number(totals[widget.primaryMetric] || totals.attempts || 0);
    }
    return processedData.reduce((acc, x) => acc + Number(x[widget.primaryMetric] || 0), 0);
  }, [processedData, widget, totals]);

  // Dedicated data for Donut Chart (ALWAYS sorted descending by primary metric)
  const donutData = useMemo(() => {
    if (widget.visualization !== "donut" || !processedData || processedData.length === 0) return [];
    // Sort descending by primary metric so slices and legend are ordered largest to smallest
    const sorted = [...processedData].sort(
      (a, b) => (Number(b[widget.primaryMetric]) || 0) - (Number(a[widget.primaryMetric]) || 0)
    );

    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);

    if (rest.length > 0) {
      const restSum = rest.reduce((acc, x) => acc + (Number(x[widget.primaryMetric]) || 0), 0);
      if (restSum > 0) {
        top.push({
          name: `Other (${rest.length} items)`,
          cleanName: `Other (${rest.length} items)`,
          [widget.primaryMetric]: restSum,
          attempts: rest.reduce((acc, x) => acc + (x.attempts || 0), 0),
          delivered: rest.reduce((acc, x) => acc + (x.delivered || 0), 0),
          failed: rest.reduce((acc, x) => acc + (x.failed || 0), 0),
          dlr_percent: 0,
          profit_margin: 0,
        });
      }
    }
    return top;
  }, [processedData, widget.visualization, widget.primaryMetric]);

  const sizeClass =
    widget.size === "small"
      ? "col-span-12 md:col-span-6 lg:col-span-4"
      : widget.size === "medium"
      ? "col-span-12 lg:col-span-6"
      : "col-span-12";

  return (
    <div
      className={`${sizeClass} flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
        isDragging ? "opacity-40 scale-[0.98]" : ""
      }`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-text-primary dark:hover:text-gray-300 p-0.5 rounded transition-colors" title="Drag to reorder">
            <GripVertical size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-text-primary dark:text-white truncate" title={widget.title}>
                {widget.title}
              </h3>
              {widget.condition && widget.condition.operator !== "none" && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    widget.condition.mode === "filter"
                      ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  <AlertTriangle size={10} />
                  Rule: {widget.condition.metric} {widget.condition.operator} {widget.condition.value}
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary dark:text-gray-400 flex items-center gap-2 mt-0.5">
              <span>{METRIC_LABELS[widget.primaryMetric] || widget.primaryMetric}</span>
              {widget.filters.client && <span>• Client: {widget.filters.client}</span>}
              {widget.filters.vendor && <span>• Vendor: {widget.filters.vendor}</span>}
              {widget.filters.country && <span>• {widget.filters.country}</span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-text-secondary dark:text-gray-400">
          <button
            type="button"
            onClick={fetchData}
            title="Refresh Widget"
            className="p-1.5 hover:text-text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} />
          </button>
          <button
            type="button"
            onClick={() => onResize(widget.id)}
            title={`Current size: ${widget.size}. Click to toggle width.`}
            className="h-[26px] px-2 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-300 hover:border-primary hover:text-primary transition-colors font-mono"
          >
            {widget.size === "small" ? "1x" : widget.size === "medium" ? "2x" : "Full"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(widget)}
            title="Configure Widget"
            className="p-1.5 hover:text-text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(widget.id)}
            title="Remove Widget"
            className="p-1.5 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Widget Body */}
      <div className="p-3.5 sm:p-4 flex-1 min-h-[200px] flex flex-col justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <span className="text-xs">Executing custom query...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Query Failed</div>
              <div className="text-rose-600 dark:text-rose-400 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && processedData.length === 0 && widget.entity !== "overview" && (
          <div className="text-center py-10 text-text-secondary dark:text-gray-400 text-xs">
            <HelpCircle size={24} className="mx-auto mb-2 opacity-60" />
            <div>No records match this custom query and condition.</div>
            <div className="text-[11px] mt-1">Try loosening the threshold or date filter.</div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI CARD VISUALIZATION */}
            {widget.visualization === "kpi" && (
              <div className="flex flex-col justify-between h-full py-1">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-text-primary dark:text-white tracking-tight">
                      {widget.entity === "overview" && totals
                        ? formatMetricValue(widget.primaryMetric, totals[widget.primaryMetric] || 0)
                        : processedData[0]
                        ? formatMetricValue(widget.primaryMetric, processedData[0][widget.primaryMetric] || 0)
                        : "0"}
                    </div>
                    {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) && (
                      <div className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                        {widget.primaryMetric === "peak_tps" && "Peak hourly throughput rate observed"}
                        {widget.primaryMetric === "tps" && "Average sustained window throughput"}
                        {widget.primaryMetric === "tps_utilization" && "Capacity saturation vs configured policy limit"}
                      </div>
                    )}
                  </div>
                  {processedData.length > 0 && widget.entity !== "overview" && (
                    <span className="text-xs text-text-secondary dark:text-gray-400">
                      {processedData.length} records found
                    </span>
                  )}
                </div>

                {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) ? (
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Peak Rate</div>
                      <div className="text-xs font-semibold text-primary mt-0.5">
                        {Number(
                          (widget.entity === "overview" && totals?.peak_tps) ||
                            (processedData[0]?.peak_tps) || 0
                        ).toFixed(2)} TPS
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Avg Rate</div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {Number(
                          (widget.entity === "overview" && (totals?.avg_tps ?? totals?.tps)) ||
                            (processedData[0]?.avg_tps ?? processedData[0]?.tps) || 0
                        ).toFixed(2)} TPS
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Peak Load</div>
                      <div className="text-xs font-semibold text-text-primary dark:text-white mt-0.5">
                        {Number(
                          (widget.entity === "overview" && totals?.tps_utilization) ||
                            (processedData[0]?.tps_utilization) || 0
                        ).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Volume</div>
                      <div className="text-xs font-semibold text-text-primary dark:text-white mt-0.5">
                        {Number(
                          (widget.entity === "overview" && totals?.attempts) ||
                            processedData.reduce((acc, x) => acc + (x.attempts || 0), 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Delivered</div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {Number(
                          (widget.entity === "overview" && totals?.delivered) ||
                            processedData.reduce((acc, x) => acc + (x.delivered || 0), 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-[10px] text-text-secondary dark:text-gray-400 uppercase font-semibold">Failures</div>
                      <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        {Number(
                          (widget.entity === "overview" && totals?.failed) ||
                            processedData.reduce((acc, x) => acc + (x.failed || 0), 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BAR CHART VISUALIZATION */}
            {widget.visualization === "bar" && processedData.length > 0 && (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f1f5f9"} vertical={false} />
                    <XAxis
                      dataKey="cleanName"
                      stroke={isDark ? "#9ca3af" : "#64748b"}
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={42}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11 }}
                      tickFormatter={(val) => (String(val).length > 12 ? `${String(val).slice(0, 11)}…` : String(val))}
                    />
                    <YAxis
                      stroke={isDark ? "#9ca3af" : "#64748b"}
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11 }}
                      tickFormatter={(val) =>
                        widget.primaryMetric.includes("percent")
                          ? `${val}%`
                          : val >= 1000
                          ? `${(val / 1000).toFixed(1)}k`
                          : val
                      }
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: isDark ? "#1f2937" : "#fff",
                        borderColor: isDark ? "#374151" : "#e5e7eb",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                        color: isDark ? "#f3f4f6" : "#111827",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      labelStyle={{
                        color: isDark ? "#f9fafb" : "#111827",
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                      itemStyle={{
                        color: "var(--color-primary)",
                        fontWeight: 600,
                      }}
                      formatter={(value: any) => [formatMetricValue(widget.primaryMetric, Number(value)), METRIC_LABELS[widget.primaryMetric]]}
                      labelFormatter={(lbl: any) => cleanDisplayName(String(lbl))}
                    />
                    <Bar dataKey={widget.primaryMetric} radius={[4, 4, 0, 0]}>
                      {processedData.map((entry, index) => {
                        const isAlert = entry._isMatch;
                        const fill = isAlert ? "#ef4444" : PALETTE[index % PALETTE.length];
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* DONUT VISUALIZATION - CLEAN SIDE-BY-SIDE EXECUTIVE LAYOUT */}
            {widget.visualization === "donut" && donutData.length > 0 && (
              <div className="flex flex-row items-center justify-between gap-4 py-2 px-1">
                {/* Left: Donut Chart with Center Total */}
                <div className="w-[170px] h-[170px] shrink-0 relative flex items-center justify-center">
                  {/* Center Text inside Donut Hole (rendered behind the chart tooltip) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
                    <span className="text-base font-bold font-mono text-text-primary dark:text-white leading-tight">
                      {totalSum >= 1000 ? `${(totalSum / 1000).toFixed(1)}k` : totalSum}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-text-secondary dark:text-gray-400 tracking-wider">
                      Total
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Tooltip
                        wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                        contentStyle={{
                          backgroundColor: isDark ? "#1f2937" : "#fff",
                          borderColor: isDark ? "#374151" : "#e5e7eb",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                          color: isDark ? "#f3f4f6" : "#111827",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        labelStyle={{
                          color: isDark ? "#f9fafb" : "#111827",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                        itemStyle={{
                          color: "var(--color-primary)",
                          fontWeight: 600,
                        }}
                        formatter={(val: any) => [
                          formatMetricValue(widget.primaryMetric, Number(val)),
                          METRIC_LABELS[widget.primaryMetric],
                        ]}
                        labelFormatter={(lbl: any) => cleanDisplayName(String(lbl))}
                      />
                      <Pie
                        data={donutData}
                        dataKey={widget.primaryMetric}
                        nameKey="cleanName"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        minAngle={8}
                        paddingAngle={2}
                        stroke={isDark ? "#1f2937" : "#ffffff"}
                        strokeWidth={2}
                      >
                        {donutData.map((_, index) => (
                          <Cell key={`donut-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Right: Clean Compact Ranked Legend List with Column Headers */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* Legend Column Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 pb-1.5 mb-1 border-b border-gray-100 dark:border-gray-700 select-none">
                    <span className="truncate pr-2">
                      {widget.entity === "vendor"
                        ? "Vendor / Trunk"
                        : widget.entity === "client"
                        ? "Client Account"
                        : widget.entity === "country"
                        ? "Destination"
                        : "Failure Reason"}
                    </span>
                    <div className="flex items-center gap-2.5 font-mono shrink-0">
                      <span>{METRIC_LABELS[widget.primaryMetric]?.split("(")[0]?.trim() || "Value"}</span>
                      <span className="w-12 text-right">Share</span>
                    </div>
                  </div>

                  {/* Legend Rows */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {donutData.map((item, idx) => {
                      const val = Number(item[widget.primaryMetric] || 0);
                      const pct = totalSum > 0 ? (val / totalSum) * 100 : 0;
                      const color = PALETTE[idx % PALETTE.length];
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5" title={item.name}>
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                            <span className="truncate font-medium text-text-primary dark:text-white text-xs">
                              {cleanDisplayName(item.name)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
                            <span className="text-text-secondary dark:text-gray-400">{val.toLocaleString()}</span>
                            <span className="font-semibold text-text-primary dark:text-white w-12 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE VISUALIZATION */}
            {widget.visualization === "table" && processedData.length > 0 && (
              <div className="overflow-x-auto overflow-y-auto max-h-[260px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider w-8">#</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                        {widget.entity === "vendor"
                          ? "Vendor / Trunk"
                          : widget.entity === "client"
                          ? "Client Account"
                          : widget.entity === "country"
                          ? "Destination"
                          : "Failure Reason"}
                      </th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Volume</th>
                      {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) ? (
                        <>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Avg TPS</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Peak TPS</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Config Limit</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right" title="Peak Load: Highest traffic burst as a % of configured limit">Peak Load</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">DLR %</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Delivered</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Failed</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">DLR %</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right">Margin ($)</th>
                        </>
                      )}
                      {widget.condition && widget.condition.operator !== "none" && (
                        <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-mono">
                    {processedData.map((row, idx) => {
                      const isAlert = row._isMatch;
                      const dlr = Number(row.dlr_percent || 0);
                      const isTps = ["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric);

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors border-b border-gray-100 dark:border-gray-700/60 ${
                            isAlert
                              ? "bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-text-secondary dark:text-gray-300"
                          }`}
                        >
                          <td className="px-3 py-2 text-text-secondary dark:text-gray-400 text-xs font-sans">{idx + 1}</td>
                          <td
                            className="px-3 py-2 font-sans font-medium text-text-primary dark:text-white max-w-[220px] truncate"
                            title={row.name}
                          >
                            {cleanDisplayName(row.name)}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary dark:text-gray-300">
                            {Number(row.attempts || 0).toLocaleString()}
                          </td>

                          {isTps ? (
                            <>
                              <td className="px-3 py-2 text-right text-text-secondary dark:text-gray-300">
                                {Number(row.avg_tps || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-primary">
                                {Number(row.peak_tps || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-text-secondary dark:text-gray-400">
                                {row.configured_tps ? `${row.configured_tps} TPS` : "Uncapped"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.configured_tps ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        row.tps_utilization >= 90
                                          ? "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                          : row.tps_utilization >= 70
                                          ? "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                          : "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                      }`}
                                    >
                                      {row.tps_utilization.toFixed(1)}%
                                    </span>
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          row.tps_utilization >= 90
                                            ? "bg-rose-500"
                                            : row.tps_utilization >= 70
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                        }`}
                                        style={{ width: `${Math.min(100, row.tps_utilization)}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-text-secondary dark:text-gray-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                    dlr >= 90
                                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : dlr >= 75
                                      ? "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
                                  }`}
                                >
                                  {dlr.toFixed(1)}%
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                                {Number(row.delivered || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400">
                                {Number(row.failed || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                    dlr >= 90
                                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : dlr >= 75
                                      ? "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
                                  }`}
                                >
                                  {dlr.toFixed(1)}%
                                </span>
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  Number(row.profit_margin || 0) >= 0
                                    ? "text-text-primary dark:text-white"
                                    : "text-rose-600 dark:text-rose-400 font-semibold"
                                }`}
                              >
                                ${Number(row.profit_margin || 0).toFixed(2)}
                              </td>
                            </>
                          )}

                          {widget.condition && widget.condition.operator !== "none" && (
                            <td className="px-3 py-2 text-center">
                              {isAlert ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                  Alert
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  OK
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
