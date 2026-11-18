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
  ReferenceLine,
  LabelList,
} from "recharts";
import type { CustomWidgetDefinition, MetricType, CustomWidgetCondition } from "./customWidgetTypes";
import { METRIC_LABELS, ENTITY_LABELS } from "./customWidgetTypes";
import { getSummariseSummaryApi, getFailureReasonsApi } from "../../api/reportApi/summariseReportApi";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getDaysAgoInAppTimezone } from "../../helper/dateFormatter";

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

export const formatConditionBadge = (cond?: CustomWidgetCondition): string | null => {
  if (!cond || cond.operator === "none") return null;
  const metricName = METRIC_LABELS[cond.metric]?.split("(")[0]?.trim() || cond.metric;
  const opSymbol =
    cond.operator === "gt"
      ? ">"
      : cond.operator === "gte"
      ? "≥"
      : cond.operator === "lt"
      ? "<"
      : cond.operator === "lte"
      ? "≤"
      : "=";
  const isPercent =
    cond.metric.includes("percent") || cond.metric.includes("utilization");
  const valueDisplay = `${cond.value}${isPercent ? "%" : ""}`;
  return `Rule: ${metricName} ${opSymbol} ${valueDisplay}`;
};

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
    const num = Number(value || 0);
    if (num < 0) {
      return `-$${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return Number(value).toLocaleString();
};

const METRIC_DESCRIPTIONS: Record<string, { summary: string; formula: string }> = {
  profit_margin: {
    summary: "Net revenue earnings generated from traffic after carrier costs.",
    formula: "Profit Margin = Client Revenue − Vendor Cost",
  },
  margin_percent: {
    summary: "Gross profitability percentage relative to total billed client revenue.",
    formula: "Margin % = (Profit Margin / Revenue) × 100",
  },
  dlr_percent: {
    summary: "Percentage of submitted messages confirmed successfully delivered to handsets.",
    formula: "DLR % = (Delivered SMS / Total Volume) × 100",
  },
  peak_tps_utilization: {
    summary: "Peak traffic burst compared against the configured maximum TPS limit.",
    formula: "Peak Load % = (Peak Observed TPS / Configured Limit) × 100",
  },
  avg_tps_utilization: {
    summary: "Average traffic load compared against the configured capacity limit.",
    formula: "Average Load % = (Average TPS / Configured Limit) × 100",
  },
  tps_utilization: {
    summary: "Capacity utilization rate against configured TPS limit.",
    formula: "Load % = (Observed TPS / Configured Limit) × 100",
  },
  peak_tps: {
    summary: "Highest throughput rate (messages per second) reached within any 1-second window.",
    formula: "Peak TPS = Max 1-second burst volume",
  },
  tps: {
    summary: "Average messages per second processed across the active timeframe.",
    formula: "Average TPS = Total Messages / Time Window (sec)",
  },
  attempts: {
    summary: "Total volume of SMS messages submitted into the switch.",
    formula: "Volume = Count of all processed SMS records",
  },
  delivered: {
    summary: "Count of SMS messages confirmed delivered by terminal carrier DLRs.",
    formula: "Delivered = Count of messages with status DELIVERED",
  },
  failed: {
    summary: "Count of messages that failed to deliver or expired without carrier delivery.",
    formula: "Failed = Count of messages with status FAILED or EXPIRED",
  },
  rejected: {
    summary: "Messages rejected before sending due to routing rules, balance, or blacklist.",
    formula: "Rejected = Count of messages with status REJECTED",
  },
  revenue: {
    summary: "Gross revenue billed to customers in the switch's base currency.",
    formula: "Revenue = Sum of client charges (base currency)",
  },
  vendor_cost: {
    summary: "Total carrier termination charges incurred in the switch's base currency.",
    formula: "Vendor Cost = Sum of vendor charges (base currency)",
  },
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

  // Global timeframe selector on the dashboard controls all widget date ranges
  const activeDatePreset = globalDatePreset || "today";

  const getDateRange = useCallback(() => {
    if (activeDatePreset === "all") return {};

    if (activeDatePreset === "today") {
      const today = getDaysAgoInAppTimezone(0);
      return {
        start_date: `${today} 00:00:00`,
        end_date: `${today} 23:59:59`,
        startDate: today,
        endDate: today,
        today: true,
      };
    }

    if (activeDatePreset === "yesterday") {
      const yesterday = getDaysAgoInAppTimezone(1);
      return {
        start_date: `${yesterday} 00:00:00`,
        end_date: `${yesterday} 23:59:59`,
        startDate: yesterday,
        endDate: yesterday,
      };
    }

    if (
      activeDatePreset === "5m" ||
      activeDatePreset === "15m" ||
      activeDatePreset === "1h" ||
      activeDatePreset === "2h" ||
      activeDatePreset === "4h"
    ) {
      const end = new Date();
      const start = new Date();
      if (activeDatePreset === "5m") start.setMinutes(start.getMinutes() - 5);
      else if (activeDatePreset === "15m") start.setMinutes(start.getMinutes() - 15);
      else if (activeDatePreset === "1h") start.setHours(start.getHours() - 1);
      else if (activeDatePreset === "2h") start.setHours(start.getHours() - 2);
      else if (activeDatePreset === "4h") start.setHours(start.getHours() - 4);

      const pad = (n: number) => String(n).padStart(2, "0");
      const formatDT = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      return {
        start_date: formatDT(start),
        end_date: formatDT(end),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }

    const days =
      activeDatePreset === "3d"
        ? 3
        : activeDatePreset === "7d"
        ? 7
        : activeDatePreset === "15d"
        ? 15
        : 30;

    const start = getDaysAgoInAppTimezone(days - 1);
    const end = getDaysAgoInAppTimezone(0);
    return {
      start_date: `${start} 00:00:00`,
      end_date: `${end} 23:59:59`,
      startDate: start,
      endDate: end,
    };
  }, [activeDatePreset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateRange = getDateRange();
      const filters: Record<string, any> = {
        ...dateRange,
        include_deleted: widget.filters?.include_deleted === true,
      };
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
        const normalized = summary.map((row) => ({
          ...row,
          name: "Overall Switch Total",
          cleanName: "Overall Switch Total",
          profit_margin: Number(row.profit_margin ?? t.profit_margin ?? 0),
          margin_percent: Number(row.margin_percent ?? t.margin_percent ?? 0),
          revenue: Number(row.revenue ?? t.revenue ?? 0),
          vendor_cost: Number(row.vendor_cost ?? t.vendor_cost ?? 0),
          attempts: Number(row.attempts ?? t.attempts ?? 0),
          delivered: Number(row.delivered ?? t.delivered ?? 0),
          failed: Number(row.failed ?? t.failed ?? 0),
          dlr_percent: typeof row.dlr_percent === "number" ? row.dlr_percent : Number(t.dlr_percent || 0),
        }));
        if (normalized.length === 0 && Object.keys(t).length > 0) {
          normalized.push({
            name: "Overall Switch Total",
            cleanName: "Overall Switch Total",
            profit_margin: Number(t.profit_margin || 0),
            margin_percent: Number(t.margin_percent || 0),
            revenue: Number(t.revenue || 0),
            vendor_cost: Number(t.vendor_cost || 0),
            attempts: Number(t.attempts || 0),
            delivered: Number(t.delivered || 0),
            failed: Number(t.failed || 0),
            dlr_percent: Number(t.dlr_percent || 0),
          } as any);
        }
        setData(normalized);
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
          const is_deleted = Boolean((row as any).is_deleted || (row as any).client_is_deleted || (row as any).vendor_is_deleted);

          return {
            name,
            cleanName: cleanDisplayName(name),
            is_deleted,
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
    if (widget.entity === "failure_reason" && totals?.failed) {
      return Number(totals.failed);
    }
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

  const { chartDataMin, chartDataMax } = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { chartDataMin: 0, chartDataMax: 0 };
    }
    const vals = processedData.map((d) => Number(d[widget.primaryMetric] || 0));
    return {
      chartDataMin: Math.min(...vals),
      chartDataMax: Math.max(...vals),
    };
  }, [processedData, widget.primaryMetric]);

  // Minimum width for bar chart to guarantee breathing room and enable smooth horizontal scrolling when bars increase
  const barChartMinWidth = useMemo(() => {
    if (!processedData || processedData.length === 0) return "100%";
    const perBarWidth = 64; // Comfortable minimum space per bar for labels and margins
    const basePadding = 56; // Room for Y-axis numbers and right margins
    const calculatedPx = processedData.length * perBarWidth + basePadding;
    return `${Math.max(calculatedPx, 340)}px`;
  }, [processedData]);

  const sizeClass =
    widget.size === "small"
      ? "col-span-12 md:col-span-6 lg:col-span-4"
      : widget.size === "medium"
      ? "col-span-12 lg:col-span-6"
      : "col-span-12";

  const metricMeta = METRIC_DESCRIPTIONS[widget.primaryMetric] || {
    summary: "Tracks custom switch traffic metrics.",
    formula: "",
  };

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-text-primary dark:text-white truncate" title={widget.title}>
                {widget.title}
              </h3>

              {/* Informative Hint / Guide Tooltip */}
              <div className="relative group/hint inline-flex items-center">
                <button
                  type="button"
                  className="text-gray-400 hover:text-primary dark:hover:text-primary transition-colors p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/60"
                  title="Click or hover to understand what this widget displays"
                >
                  <HelpCircle size={13} />
                </button>
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover/hint:block group-focus-within/hint:block w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 z-50 text-xs select-text">
                  <div className="font-semibold text-text-primary dark:text-white pb-1.5 border-b border-gray-100 dark:border-gray-700 mb-2 flex items-center justify-between">
                    <span>Widget Guide</span>
                    <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-text-secondary dark:text-gray-300 capitalize">
                      {widget.visualization} View
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-text-secondary dark:text-gray-400">Grouping:</span>{" "}
                      <span className="font-medium text-text-primary dark:text-gray-200">
                        {ENTITY_LABELS[widget.entity] || widget.entity}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary dark:text-gray-400">Primary Metric:</span>{" "}
                      <span className="font-medium text-text-primary dark:text-gray-200">
                        {METRIC_LABELS[widget.primaryMetric] || widget.primaryMetric}
                      </span>
                    </div>
                    {metricMeta.summary && (
                      <p className="text-text-secondary dark:text-gray-300 pt-1 leading-relaxed border-t border-gray-50 dark:border-gray-700/60">
                        {metricMeta.summary}
                      </p>
                    )}
                    {metricMeta.formula && (
                      <div className="bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg font-mono text-xs text-text-primary dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                        {metricMeta.formula}
                      </div>
                    )}
                    {widget.condition && widget.condition.operator !== "none" && (
                      <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700 text-amber-700 dark:text-amber-400 font-medium">
                        Active Rule: {METRIC_LABELS[widget.condition.metric] || widget.condition.metric}{" "}
                        {widget.condition.operator} {widget.condition.value} ({widget.condition.mode === "filter" ? "matches only" : "highlight matches"})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {widget.condition && widget.condition.operator !== "none" && (
                <div
                  title={widget.condition.mode === "filter" ? "Rule: Showing matches only" : "Rule: Highlighting matches"}
                  className="inline-flex items-center"
                >
                  <StatusBadge
                    status="WARNING"
                    customText={
                      <span className="inline-flex items-center gap-1 text-xs font-medium leading-none">
                        <AlertTriangle size={11} className="shrink-0" />
                        <span>{formatConditionBadge(widget.condition)}</span>
                      </span>
                    }
                  />
                </div>
              )}
            </div>
            <div className="text-xs text-text-secondary dark:text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>{METRIC_LABELS[widget.primaryMetric] || widget.primaryMetric}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-text-secondary dark:text-gray-300 font-medium">{ENTITY_LABELS[widget.entity] || widget.entity}</span>
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
            <div className="text-xs mt-1 text-text-secondary/80">Try loosening the threshold or date filter.</div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI CARD VISUALIZATION */}
            {widget.visualization === "kpi" && (
              <div className="flex flex-col justify-between h-full py-1">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white tracking-tight tabular-nums">
                      {widget.entity === "overview" && totals
                        ? formatMetricValue(widget.primaryMetric, totals[widget.primaryMetric] || 0)
                        : processedData[0]
                        ? formatMetricValue(widget.primaryMetric, processedData[0][widget.primaryMetric] || 0)
                        : "0"}
                    </div>
                    {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) && (
                      <div className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                        {widget.primaryMetric === "peak_tps" && "Peak 1-second throughput burst observed"}
                        {widget.primaryMetric === "tps" && "Average sustained window throughput"}
                        {widget.primaryMetric === "tps_utilization" && "Capacity saturation vs configured policy limit"}
                      </div>
                    )}
                  </div>
                  {widget.entity === "overview" ? (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/60 text-text-secondary dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      System Total
                    </span>
                  ) : processedData.length > 0 ? (
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[170px]"
                      title={`Top ${widget.entity}: ${processedData[0]?.name} (from ${processedData.length} records)`}
                    >
                      Top: {cleanDisplayName(processedData[0]?.name)}
                    </span>
                  ) : null}
                </div>

                {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) ? (
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">
                        {widget.primaryMetric === "peak_tps" ? "Total Volume" : "Peak Rate"}
                      </div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {widget.primaryMetric === "peak_tps"
                          ? `${Number(
                              (widget.entity === "overview" && totals?.attempts) ||
                                (processedData[0]?.attempts) ||
                                processedData.reduce((acc, x) => acc + (x.attempts || 0), 0)
                            ).toLocaleString()} SMS`
                          : `${Number(
                              (widget.entity === "overview" && totals?.peak_tps) ||
                                (processedData[0]?.peak_tps) || 0
                            ).toFixed(2)} TPS`}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">
                        {widget.primaryMetric === "tps" ? "Total Volume" : "Avg Rate"}
                      </div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {widget.primaryMetric === "tps"
                          ? `${Number(
                              (widget.entity === "overview" && totals?.attempts) ||
                                (processedData[0]?.attempts) ||
                                processedData.reduce((acc, x) => acc + (x.attempts || 0), 0)
                            ).toLocaleString()} SMS`
                          : `${Number(
                              (widget.entity === "overview" && (totals?.avg_tps ?? totals?.tps)) ||
                                (processedData[0]?.avg_tps ?? processedData[0]?.tps) || 0
                            ).toFixed(2)} TPS`}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">Peak Load</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {Number(
                          (widget.entity === "overview" && (totals?.peak_tps_utilization ?? totals?.tps_utilization)) ||
                            (processedData[0]?.peak_tps_utilization ?? processedData[0]?.tps_utilization) || 0
                        ).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ) : widget.entity === "failure_reason" ? (
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">Total Failures</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {totalSum.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">#1 Reason Share</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {totalSum > 0 ? `${(((processedData[0]?.failed || 0) / totalSum) * 100).toFixed(1)}%` : "0.0%"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">Volume</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {Number(
                          (widget.entity === "overview" && totals?.attempts) ||
                            processedData.reduce((acc, x) => acc + (x.attempts || 0), 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">Delivered</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
                        {Number(
                          (widget.entity === "overview" && totals?.delivered) ||
                            processedData.reduce((acc, x) => acc + (x.delivered || 0), 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700/60">
                      <div className="text-xs text-text-secondary dark:text-gray-400 uppercase font-medium">Failures</div>
                      <div className="text-sm font-semibold text-text-primary dark:text-white mt-1 tabular-nums">
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
              <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                <div style={{ minWidth: barChartMinWidth, width: "100%", height: 245 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData} margin={{ top: 22, right: 15, left: -10, bottom: 42 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f1f5f9"} vertical={false} />
                    <XAxis
                      dataKey="cleanName"
                      stroke={isDark ? "#9ca3af" : "#64748b"}
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={52}
                      tickMargin={14}
                      dy={6}
                      dx={-4}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11 }}
                      tickFormatter={(val) => (String(val).length > 18 ? `${String(val).slice(0, 17)}…` : String(val))}
                    />
                    <YAxis
                      stroke={isDark ? "#9ca3af" : "#64748b"}
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: isDark ? "#9ca3af" : "#64748b", fontSize: 11 }}
                      domain={[
                        (dataMin: number) => {
                          if (dataMin < 0 || chartDataMin < 0) {
                            const minVal = Math.min(dataMin, chartDataMin);
                            return Math.floor(minVal * 1.25);
                          }
                          return 0;
                        },
                        (dataMax: number) => {
                          const targetMax = Math.max(dataMax, chartDataMax);
                          const isPercent =
                            widget.primaryMetric.includes("percent") ||
                            widget.primaryMetric.includes("utilization");
                          if (isPercent) {
                            if (targetMax <= 0.5) return 1;
                            if (targetMax <= 1.5) return 2;
                            if (targetMax <= 5) return Math.max(2, Math.ceil(targetMax * 1.25));
                            if (targetMax <= 15) return Math.ceil(targetMax * 1.2);
                            if (targetMax <= 40) return Math.ceil((targetMax * 1.2) / 5) * 5;
                            if (targetMax <= 80) return Math.ceil((targetMax * 1.12) / 5) * 5;
                            return Math.max(100, Math.ceil(targetMax * 1.1));
                          }
                          if (targetMax <= 0.1) {
                            return Number((Math.max(0.01, targetMax) * 1.35).toFixed(3));
                          }
                          if (targetMax <= 1) {
                            return Number((targetMax * 1.25).toFixed(2));
                          }
                          if (targetMax <= 10) {
                            return Math.ceil(targetMax * 1.25);
                          }
                          return Math.ceil(targetMax * 1.2);
                        },
                      ]}
                      tickFormatter={(val) => {
                        if (widget.primaryMetric.includes("percent") || widget.primaryMetric.includes("utilization")) {
                          return `${Number(Number(val).toFixed(1))}%`;
                        }
                        if (val >= 1000) {
                          return `${(val / 1000).toFixed(1)}k`;
                        }
                        if (["tps", "peak_tps"].includes(widget.primaryMetric)) {
                          return `${val} TPS`;
                        }
                        return val;
                      }}
                    />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        const metricVal = item[widget.primaryMetric];
                        const isAlert = Boolean(item._isMatch && widget.condition?.mode === "highlight");
                        const metricLabel = METRIC_LABELS[widget.primaryMetric] || widget.primaryMetric;
                        const isTpsMetric = [
                          "tps",
                          "peak_tps",
                          "peak_tps_utilization",
                          "avg_tps_utilization",
                          "tps_utilization",
                        ].includes(widget.primaryMetric);

                        return (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-xl text-xs min-w-[210px] z-50">
                            <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-gray-100 dark:border-gray-700">
                              <span className="font-bold text-text-primary dark:text-white truncate" title={String(label)}>
                                {cleanDisplayName(String(label))}
                              </span>
                              {isAlert && (
                                <StatusBadge status="CRITICAL" customText="Rule Triggered" />
                              )}
                            </div>

                            <div className="space-y-1.5 font-sans text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary dark:text-gray-400">{metricLabel}:</span>
                                <span className={`font-semibold tabular-nums ${isAlert ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                                  {formatMetricValue(widget.primaryMetric, Number(metricVal))}
                                </span>
                              </div>

                              {isTpsMetric && (
                                <>
                                  <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400">
                                    <span>Observed Peak:</span>
                                    <span className="text-text-primary dark:text-gray-200 font-medium tabular-nums">
                                      {Number(item.peak_tps || 0).toFixed(2)} TPS
                                    </span>
                                  </div>
                                  {item.configured_tps !== null && item.configured_tps !== undefined && (
                                    <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400">
                                      <span>Configured Limit:</span>
                                      <span className="text-text-primary dark:text-gray-200 font-medium tabular-nums">
                                        {item.configured_tps} TPS
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {item.attempts > 0 && (
                                <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                                  <span>Total Volume:</span>
                                  <span className="text-text-primary dark:text-gray-200 tabular-nums">
                                    {Number(item.attempts).toLocaleString()} SMS
                                  </span>
                                </div>
                              )}
                              {item.delivered > 0 && (
                                <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400">
                                  <span>Delivered:</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {Number(item.delivered).toLocaleString()} ({Number(item.dlr_percent || 0).toFixed(1)}%)
                                  </span>
                                </div>
                              )}
                              {item.failed > 0 && (
                                <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400">
                                  <span>Failed:</span>
                                  <span className="text-rose-500 dark:text-rose-400 tabular-nums">
                                    {Number(item.failed).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />

                    {/* Zero baseline reference line when negative values are present */}
                    {chartDataMin < 0 && (
                      <ReferenceLine
                        y={0}
                        stroke={isDark ? "#4b5563" : "#cbd5e1"}
                        strokeWidth={1}
                      />
                    )}

                    <Bar dataKey={widget.primaryMetric} radius={[4, 4, 0, 0]} minPointSize={4} maxBarSize={48}>
                      {processedData.map((entry, index) => {
                        const isAlert = Boolean(entry._isMatch && widget.condition?.mode === "highlight");
                        const fill = isAlert ? "#ef4444" : PALETTE[index % PALETTE.length];
                        const val = Number(entry[widget.primaryMetric] || 0);
                        const isZero = val === 0;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={fill}
                            fillOpacity={isZero ? 0 : 1}
                          />
                        );
                      })}
                      <LabelList
                        dataKey={widget.primaryMetric}
                        content={(props: any) => {
                          const { x, y, width, height, value } = props;
                          if (value === null || value === undefined || isNaN(value)) return null;
                          const numVal = Number(value);
                          if (numVal === 0) return null;

                          const formatted = formatMetricValue(widget.primaryMetric, numVal);
                          const isNegative = numVal < 0;

                          // Negative bars extend downwards from y (the 0 baseline).
                          // Shallow bars (height <= 28) sit 10px ABOVE the baseline to prevent colliding with rotated X-axis text.
                          // Deep bars (height > 28) sit comfortably inside the bar.
                          const labelY = isNegative ? (height > 28 ? y + 16 : y - 10) : y - 6;

                          return (
                            <text
                              x={x + width / 2}
                              y={labelY}
                              fill={isNegative ? (isDark ? "#f87171" : "#dc2626") : (isDark ? "#9ca3af" : "#475569")}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={600}
                              fontFamily="sans-serif"
                            >
                              {formatted}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

            {/* DONUT VISUALIZATION - CLEAN SIDE-BY-SIDE EXECUTIVE LAYOUT */}
            {widget.visualization === "donut" && donutData.length > 0 && (
              <div className="flex flex-row items-center justify-between gap-4 py-2 px-1">
                {/* Left: Donut Chart with Center Total */}
                <div className="w-[170px] h-[170px] shrink-0 relative flex items-center justify-center">
                  {/* Center Text inside Donut Hole (rendered behind the chart tooltip) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
                    <span className="text-lg font-bold text-text-primary dark:text-white leading-tight tabular-nums">
                      {totalSum >= 1000000
                        ? `${(totalSum / 1000000).toFixed(1)}M`
                        : totalSum >= 1000
                        ? `${(totalSum / 1000).toFixed(1)}k`
                        : totalSum.toLocaleString()}
                    </span>
                    <span className="text-xs uppercase font-medium text-text-secondary dark:text-gray-400 tracking-wider mt-0.5">
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
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-text-secondary dark:text-gray-400 pb-2 mb-1 border-b border-gray-100 dark:border-gray-700 select-none">
                    <span className="truncate pr-2">
                      {widget.entity === "vendor"
                        ? "Vendor / Trunk"
                        : widget.entity === "client"
                        ? "Client Account"
                        : widget.entity === "country"
                        ? "Destination"
                        : "Failure Reason"}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span>{METRIC_LABELS[widget.primaryMetric]?.split("(")[0]?.trim() || "Value"}</span>
                      <span className="w-14 text-right">Share</span>
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
                          <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                            <span className="text-text-secondary dark:text-gray-400">{val.toLocaleString()}</span>
                            <span className="font-semibold text-text-primary dark:text-white w-14 text-right">
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
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider w-8 whitespace-nowrap">#</th>
                      <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {widget.entity === "vendor"
                          ? "Vendor / Trunk"
                          : widget.entity === "client"
                          ? "Client Account"
                          : widget.entity === "country"
                          ? "Destination"
                          : widget.entity === "overview"
                          ? "Scope / Aggregate"
                          : "Failure Reason"}
                      </th>
                      {widget.entity === "failure_reason" ? (
                        <>
                          <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">
                            Failed Messages
                          </th>
                          <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">
                            Share (%)
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Volume</th>
                          {["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric) ? (
                            <>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Avg TPS</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Peak TPS</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Config Limit</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap" title="Peak Load: Highest traffic burst as a % of configured limit">Peak Load</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">DLR %</th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Delivered</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Failed</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">DLR %</th>
                              <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Margin ($)</th>
                            </>
                          )}
                        </>
                      )}
                      {widget.condition && widget.condition.operator !== "none" && widget.condition.mode === "highlight" && (
                        <th className="px-3 py-2 text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                    {processedData.map((row, idx) => {
                      const isAlert = Boolean(row._isMatch && widget.condition?.mode === "highlight");
                      const dlr = Number(row.dlr_percent || 0);
                      const isTps = ["tps", "peak_tps", "peak_tps_utilization", "avg_tps_utilization", "tps_utilization"].includes(widget.primaryMetric);
                      const isFailureReason = widget.entity === "failure_reason";
                      const failedCount = Number(row.failed || row.attempts || 0);
                      const failureShare = totalSum > 0 ? (failedCount / totalSum) * 100 : 0;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors border-b border-gray-100 dark:border-gray-700/60 ${
                            isAlert
                              ? "bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-text-secondary dark:text-gray-300"
                          }`}
                        >
                          <td className="px-3 py-2 text-text-secondary dark:text-gray-400 text-xs w-8 whitespace-nowrap">{idx + 1}</td>
                          <td
                            className={`px-3 py-2 font-medium text-text-primary dark:text-white text-xs ${
                              isFailureReason ? "max-w-[380px] lg:max-w-[480px]" : "max-w-[220px]"
                            } truncate`}
                            title={row.name}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{cleanDisplayName(row.name)}</span>
                              {(row as any).is_deleted && (
                                <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                  Deleted
                                </span>
                              )}
                            </div>
                          </td>

                          {isFailureReason ? (
                            <>
                              <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400 text-xs tabular-nums whitespace-nowrap">
                                {failedCount.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap text-text-secondary dark:text-gray-300">
                                {failureShare.toFixed(1)}%
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right text-xs text-text-secondary dark:text-gray-300 tabular-nums whitespace-nowrap">
                                {Number(row.attempts || 0).toLocaleString()}
                              </td>

                              {isTps ? (
                                <>
                                  <td className="px-3 py-2 text-right text-xs text-text-secondary dark:text-gray-300 tabular-nums whitespace-nowrap">
                                    {Number(row.avg_tps || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs font-semibold text-primary tabular-nums whitespace-nowrap">
                                    {Number(row.peak_tps || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs text-text-secondary dark:text-gray-400 tabular-nums whitespace-nowrap">
                                    {row.configured_tps ? `${row.configured_tps} TPS` : "Uncapped"}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                    {row.configured_tps ? (
                                      <span className="font-medium text-text-primary dark:text-gray-200">
                                        {row.tps_utilization.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-text-secondary dark:text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                    <span className="font-medium text-text-primary dark:text-gray-200">
                                      {dlr.toFixed(1)}%
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 text-right text-xs text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                    {Number(row.delivered || 0).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                                    {Number(row.failed || 0).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                    <span className="font-medium text-text-primary dark:text-gray-200">
                                      {dlr.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td
                                    className={`px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap font-medium ${
                                      Number(row.profit_margin || 0) < 0
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-text-primary dark:text-white"
                                    }`}
                                  >
                                    {Number(row.profit_margin || 0) < 0
                                      ? `-$${Math.abs(Number(row.profit_margin || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : `$${Number(row.profit_margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                  </td>
                                </>
                              )}
                            </>
                          )}

                          {widget.condition && widget.condition.operator !== "none" && widget.condition.mode === "highlight" && (
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <StatusBadge
                                status={isAlert ? "CRITICAL" : "OK"}
                                customText={isAlert ? "Alert" : "OK"}
                              />
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
