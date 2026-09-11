import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Activity,
  Monitor,
  XCircle,
  Users,
  Server,
  ArrowRight,
  TrendingUp,
  Banknote,
  ChevronDown,
  Calendar,
  Globe,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import { CountryFlag } from "../../components/ui/CountryFlag";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import Button from "../../components/ui/Button";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import {
  getClientSessionSummaryApi,
  type ClientSessionSummaryData,
} from "../../api/clientSessionApi/clientSessionApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getNotificationApi, type NotificationData } from "../../api/userActionApi/notificationApi";
import {
  getSmsDailyApi,
  getSmsHourlyApi,
  getDlrStatsApi,
  getRevenueApi,
  getFailureBreakdownApi,
  getVendorPerformanceApi,
  getClientPerformanceApi,
  getGeoBreakdownApi,
  getLatencyStatsApi,
  type SmsHourlyData,
  type RevenueData,
  type FailureBreakdownData,
  type VendorPerformanceData,
  type ClientPerformanceData,
  type GeoBreakdownData,
  type LatencyStatsData,
  getSmsStatsApi,
  type SmsDailyData,
  getFailureReasonCountsApi,
  type FailureReasonCountsData,
} from "../../api/reportApi/smsCountsApi";



// DLR colours — stable, not derived from API
const DLR_COLORS: Record<string, string> = {
  Delivered: "#10b981",
  Failed: "#ef4444",
  Pending: "#f59e0b",
  Rejected: "#6b7280",
};

const Dashboard: React.FC = () => {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // --- Auto-Refresh States (Persisted in LocalStorage) ---
  const [isMetricsLive, setIsMetricsLive] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashboard_metrics_live");
    return saved ? JSON.parse(saved) : true;
  });
  const isMetricsLiveRef = React.useRef(isMetricsLive);

  const [isAnalyticsLive, setIsAnalyticsLive] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashboard_analytics_live");
    return saved ? JSON.parse(saved) : true;
  });
  const isAnalyticsLiveRef = React.useRef(isAnalyticsLive);

  useEffect(() => {
    localStorage.setItem("dashboard_metrics_live", JSON.stringify(isMetricsLive));
    isMetricsLiveRef.current = isMetricsLive;
  }, [isMetricsLive]);

  useEffect(() => {
    localStorage.setItem("dashboard_analytics_live", JSON.stringify(isAnalyticsLive));
    isAnalyticsLiveRef.current = isAnalyticsLive;
  }, [isAnalyticsLive]);

  // --- KPI states ---
  const [totalSms, setTotalSms] = useState<string>("-");
  const [deliveredCount, setDeliveredCount] = useState<string>("-");
  const [failedCount, setFailedCount] = useState<string>("-");
  const [deliveryRate, setDeliveryRate] = useState<string>("-");
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number | string>("-");
  const [onlineVendors, setOnlineVendors] = useState<number | string>("-");
  const [onlineClients, setOnlineClients] = useState<number | string>("-");

  // --- Chart states ---
  const [trafficData, setTrafficData] = useState<(SmsHourlyData | SmsDailyData)[]>([]);
  const [dlrData, setDlrData] = useState<{ name: string; value: number; color: string }[]>([]);

  // Dedicated loading states for charts to distinguish empty data from fetching
  const [isTrafficLoading, setIsTrafficLoading] = useState(true);
  const [isDlrLoading, setIsDlrLoading] = useState(true);
  const trafficScrollRef = React.useRef<HTMLDivElement>(null);

  // --- Table / panel states ---
  const [liveSessions, setLiveSessions] = useState<ClientSessionSummaryData[]>([]);
  const [isLiveSessionsLoading, setIsLiveSessionsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);



  // --- Analytics: failure / vendor+route / client / geo / latency ---
  const [failureBreakdown, setFailureBreakdown] = useState<FailureBreakdownData[]>([]);
  const [isFailureLoading, setIsFailureLoading] = useState(true);
  const [selectedFailureCategory, setSelectedFailureCategory] = useState<string | null>(null);
  const [failureReasonCounts, setFailureReasonCounts] = useState<FailureReasonCountsData[]>([]);
  const [isFailureReasonCountsLoading, setIsFailureReasonCountsLoading] = useState(true);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformanceData[]>([]);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [clientPerformance, setClientPerformance] = useState<ClientPerformanceData[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [geoBreakdown, setGeoBreakdown] = useState<GeoBreakdownData[]>([]);
  const [isGeoLoading, setIsGeoLoading] = useState(true);
  const [latencyStats, setLatencyStats] = useState<LatencyStatsData | null>(null);
  const [isLatencyLoading, setIsLatencyLoading] = useState(true);

  // ─── Date range ──────────────────────────────────────────────────────────────

  type RangeKey = "5m" | "15m" | "1h" | "2h" | "4h" | "today" | "7d" | "30d" | "90d" | "365d" | "all";

  const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
    { key: "5m", label: "Last 5 Minutes" },
    { key: "15m", label: "Last 15 Minutes" },
    { key: "1h", label: "Last 1 Hour" },
    { key: "2h", label: "Last 2 Hour" },
    { key: "4h", label: "Last 4 Hour" },
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "90d", label: "Last 90 Days" },
    { key: "365d", label: "Last Year" },
  ];

  const [activeRange, setActiveRange] = useState<RangeKey>("today");
  const activeRangeRef = React.useRef<RangeKey>(activeRange);

  useEffect(() => {
    activeRangeRef.current = activeRange;
  }, [activeRange]);
  const [rangeOpen, setRangeOpen] = useState(false);

  const buildParams = (range: RangeKey): Record<string, any> => {
    if (range === "today") return { today: true };
    if (range === "all") return {};
    const end = new Date();
    const start = new Date();

    if (range === "5m") start.setMinutes(start.getMinutes() - 5);
    else if (range === "15m") start.setMinutes(start.getMinutes() - 15);
    else if (range === "1h") start.setHours(start.getHours() - 1);
    else if (range === "2h") start.setHours(start.getHours() - 2);
    else if (range === "4h") start.setHours(start.getHours() - 4);
    else {
      const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
      start.setDate(start.getDate() - days + 1);
      const fmtDate = (d: Date) => d.toISOString().split("T")[0];
      return { startDate: fmtDate(start), endDate: fmtDate(end) };
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  // ─── Fetchers ────────────────────────────────────────────────────────────────
  const fetchTrafficTraffic = async (range: RangeKey) => {
    setIsTrafficLoading(true);
    try {
      if (range === "today") {
        const data = await getSmsHourlyApi(buildParams(range));
        setTrafficData(data);
      } else {
        const data = await getSmsDailyApi(buildParams(range));
        setTrafficData(data);
      }
    } catch (e) {
      console.error("fetchTrafficTraffic failed", e);
      setTrafficData([]);
    } finally {
      setIsTrafficLoading(false);
    }
  };
  const fetchSmsStats = async (range: RangeKey) => {
    setIsStatsLoading(true);
    try {
      const d = await getSmsStatsApi(buildParams(range));
      setTotalSms(Number(d.count).toLocaleString());
      setDeliveredCount(Number(d.deliveredCount).toLocaleString());
      setFailedCount(Number(d.failedCount).toLocaleString());
      setDeliveryRate(`${d.deliveryRate}%`);
    } catch (e) {
      console.error("fetchSmsStats failed", e);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchDlrStats = async (range: RangeKey) => {
    setIsDlrLoading(true);
    try {
      const d = await getDlrStatsApi(buildParams(range));
      setDlrData([
        { name: "Delivered", value: d.deliveredPercent || 0, color: DLR_COLORS.Delivered },
        { name: "Failed", value: d.failedPercent || 0, color: DLR_COLORS.Failed },
        { name: "Pending", value: d.pendingPercent || 0, color: DLR_COLORS.Pending },
        { name: "Rejected", value: d.rejectedPercent || 0, color: DLR_COLORS.Rejected },
      ]);
    } catch (e) {
      console.error("fetchDlrStats failed", e);
      setDlrData([]);
    } finally {
      setIsDlrLoading(false);
    }
  };

  const fetchClientSessionSummary = async () => {
    setIsLiveSessionsLoading(true);
    try {
      const data = await getClientSessionSummaryApi();
      setLiveSessions(data);

      // Calculate total active sessions directly from the summary data!
      const totalCount = data.reduce((sum, item) => sum + (item.active_sessions || 0), 0);
      setActiveSessionsCount(totalCount);
    } catch (e) {
      console.error("fetchClientSessionSummary failed", e);
      setLiveSessions([]);
      setActiveSessionsCount("-");
    } finally {
      setIsLiveSessionsLoading(false);
    }
  };

  const fetchOnlineVendors = async () => {
    try {
      const res = await getVendorsApi("vendor", 1, 1, { bindStatus: "ONLINE" });
      if (res?.count !== undefined) setOnlineVendors(res.count);
    } catch (e) {
      console.error("fetchOnlineVendors failed", e);
    }
  };

  const fetchOnlineClients = async () => {
    try {
      const res = await getClientsApi("client", 1, 1, { bindStatus: "ONLINE" });
      if (res?.count !== undefined) setOnlineClients(res.count);
    } catch (e) {
      console.error("fetchOnlineClients failed", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationApi(1, 5);
      if (res?.results) setNotifications(res.results);
    } catch (e) {
      console.error("fetchNotifications failed", e);
    }
  };

  const fetchRevenue = async (range: RangeKey) => {
    try {
      const d = await getRevenueApi(buildParams(range));
      setRevenue(d);
    } catch (e) {
      console.error("fetchRevenue failed", e);
    }
  };

  const fetchFailureBreakdown = async (range: RangeKey) => {
    setIsFailureLoading(true);
    try {
      const data = await getFailureBreakdownApi(buildParams(range));
      setFailureBreakdown(data);
    } catch (e) {
      console.error("fetchFailureBreakdown failed", e);
      setFailureBreakdown([]);
    } finally {
      setIsFailureLoading(false);
    }
  };

  const fetchFailureReasonCounts = async (range: RangeKey, category: string) => {
    setIsFailureReasonCountsLoading(true);
    try {
      const data = await getFailureReasonCountsApi({ ...buildParams(range), category });
      setFailureReasonCounts(data);
    } catch (e) {
      console.error("fetchFailureReasonCounts failed", e);
      setFailureReasonCounts([]);
    } finally {
      setIsFailureReasonCountsLoading(false);
    }
  };

  const fetchVendorPerformance = async (range: RangeKey) => {
    setIsVendorLoading(true);
    try {
      const data = await getVendorPerformanceApi(buildParams(range));
      setVendorPerformance(data);
    } catch (e) {
      console.error("fetchVendorPerformance failed", e);
      setVendorPerformance([]);
    } finally {
      setIsVendorLoading(false);
    }
  };

  const fetchClientPerformance = async (range: RangeKey) => {
    setIsClientLoading(true);
    try {
      const data = await getClientPerformanceApi(buildParams(range));
      setClientPerformance(data);
    } catch (e) {
      console.error("fetchClientPerformance failed", e);
      setClientPerformance([]);
    } finally {
      setIsClientLoading(false);
    }
  };

  const fetchGeoBreakdown = async (range: RangeKey) => {
    setIsGeoLoading(true);
    try {
      const data = await getGeoBreakdownApi(buildParams(range));
      setGeoBreakdown(data);
    } catch (e) {
      console.error("fetchGeoBreakdown failed", e);
      setGeoBreakdown([]);
    } finally {
      setIsGeoLoading(false);
    }
  };

  const fetchLatencyStats = async (range: RangeKey) => {
    setIsLatencyLoading(true);
    try {
      const d = await getLatencyStatsApi(buildParams(range));
      setLatencyStats(d);
    } catch (e) {
      console.error("fetchLatencyStats failed", e);
      setLatencyStats(null);
    } finally {
      setIsLatencyLoading(false);
    }
  };


  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchFailureBreakdown(activeRange);
    fetchVendorPerformance(activeRange);
    fetchClientPerformance(activeRange);
    fetchGeoBreakdown(activeRange);
    fetchLatencyStats(activeRange);
    fetchSmsStats(activeRange);
    fetchTrafficTraffic(activeRange);
    fetchDlrStats(activeRange);
    fetchRevenue(activeRange);
    setSelectedFailureCategory(null);
  }, [activeRange]);

  useEffect(() => {
    if (selectedFailureCategory) {
      fetchFailureReasonCounts(activeRange, selectedFailureCategory);
    } else {
      setFailureReasonCounts([]);
    }
  }, [activeRange, selectedFailureCategory]);

  useEffect(() => {
    fetchClientSessionSummary();
    fetchOnlineVendors();
    fetchOnlineClients();
    fetchNotifications();
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    if (!wsBase) {
      console.error("WebSocket Error: VITE_WS_BASE_URL is missing in your .env file!");
      return;
    }

    let isMounted = true;
    const wsUrl = `${wsBase}/ws/status/`;
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWebSocket = () => {
      console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected successfully!");
      };

      ws.onerror = (error) => {
        console.error("WebSocket encountered an error. Is the backend ASGI server running?", error);
      };

      ws.onclose = (event) => {
        console.warn("WebSocket closed.", event.reason);
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // console.log("WebSocket Message Received:", payload); // Keep it less spammy in console too

          if (payload.status === "DISCONNECTED" || payload.status === "OFFLINE") {
            setActiveSessionsCount((prev) => {
              if (typeof prev === "number" && prev > 0) {
                return prev - 1;
              }
              return prev;
            });
          }

          if (payload.action === "dashboard_metrics_update") {
            const { data } = payload;

            const currentPath = window.location.pathname;
            // Only fetch if the user is actually looking at the dashboard!
            if (currentPath === "/dashboard" || currentPath === "/") {
              if (isMetricsLiveRef.current || isAnalyticsLiveRef.current) {
                fetchClientSessionSummary();
              }
            }

            if (isMetricsLiveRef.current && activeRangeRef.current === "today") {
              if (data.smsStats) {
                setTotalSms(Number(data.smsStats.count).toLocaleString());
                setDeliveredCount(Number(data.smsStats.deliveredCount).toLocaleString());
                setFailedCount(Number(data.smsStats.failedCount).toLocaleString());
                setDeliveryRate(`${data.smsStats.deliveryRate}%`);
                setIsStatsLoading(false);
              }
              if (data.dlrStats) {
                setDlrData([
                  { name: "Delivered", value: data.dlrStats.deliveredPercent || 0, color: DLR_COLORS.Delivered },
                  { name: "Failed", value: data.dlrStats.failedPercent || 0, color: DLR_COLORS.Failed },
                  { name: "Pending", value: data.dlrStats.pendingPercent || 0, color: DLR_COLORS.Pending },
                  { name: "Rejected", value: data.dlrStats.rejectedPercent || 0, color: DLR_COLORS.Rejected },
                ]);
                setIsDlrLoading(false);
              }
              if (data.onlineClients !== undefined) {
                setOnlineClients(data.onlineClients);
              }
              if (data.onlineVendors !== undefined) {
                setOnlineVendors(data.onlineVendors);
              }
              if (data.revenue) {
                setRevenue(data.revenue);
              }
              if (data.trafficData) {
                setTrafficData(data.trafficData);
                setIsTrafficLoading(false);
              }
            }

            if (isAnalyticsLiveRef.current && activeRangeRef.current === "today") {
              if (data.failureBreakdown) {
                setFailureBreakdown(data.failureBreakdown);
                setIsFailureLoading(false);
              }
              if (data.vendorPerformance) {
                setVendorPerformance(data.vendorPerformance);
                setIsVendorLoading(false);
              }
              if (data.clientPerformance) {
                setClientPerformance(data.clientPerformance);
                setIsClientLoading(false);
              }
              if (data.geoBreakdown) {
                setGeoBreakdown(data.geoBreakdown);
                setIsGeoLoading(false);
              }
              if (data.latencyStats) {
                setLatencyStats(data.latencyStats);
                setIsLatencyLoading(false);
              }
            }
          }
        } catch (err) {
          console.error("WebSocket parse error in Dashboard", err);
        }
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatLatency = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "-";
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  const formatNotificationTime = (iso?: string) => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const activeRangeLabel = RANGE_OPTIONS.find((r) => r.key === activeRange)?.label ?? "";

  // ─── Traffic Volume chart granularity helpers ───────────────────────────────
  const isHourly = activeRange === "today";
  const firstItem = trafficData[0] as any;
  const xAxisKey = firstItem && ("date" in firstItem) ? "date" : firstItem && ("day" in firstItem) ? "day" : "hour";

  const formatXAxisTick = (value: any) => {
    if (isHourly) return `${value}:00`;
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);

    if (activeRange === "365d" || activeRange === "all") {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTooltipLabel = (value: any) => {
    if (isHourly) return `Hour ${value}:00`;
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);

    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  let tickInterval: any = "preserveStartEnd";
  let chartMinWidth = "100%";
  let needsScroll = false;

  if (activeRange === "today") {
    tickInterval = 3;
  } else if (activeRange === "7d") {
    tickInterval = 0;
  } else if (activeRange === "30d") {
    tickInterval = 0;
    chartMinWidth = "1800px";
    needsScroll = true;
  } else if (activeRange === "90d") {
    tickInterval = 0;
    chartMinWidth = "4500px";
    needsScroll = true;
  } else if (activeRange === "365d" || activeRange === "all") {
    tickInterval = 0;
    chartMinWidth = "1800px";
    needsScroll = true;
  }

  useEffect(() => {
    if (needsScroll && trafficScrollRef.current) {
      trafficScrollRef.current.scrollLeft = trafficScrollRef.current.scrollWidth;
    }
  }, [trafficData, needsScroll]);

  const monthlyTicks = React.useMemo(() => {
    if (activeRange !== "365d" && activeRange !== "all") return undefined;
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const item of trafficData as any[]) {
      const raw = item[xAxisKey];
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const key = activeRange === "all"
        ? `${d.getFullYear()}-${Math.floor(d.getMonth() / 6)}`
        : `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        ticks.push(raw);
      }
    }
    return ticks;
  }, [trafficData, xAxisKey, activeRange]);

  const renderTrafficTick = (props: any) => {
    const { x, y, payload } = props;
    let fill = isDark ? "#9ca3af" : "#6b7280";

    if (activeRange === "90d" && payload?.value) {
      const d = new Date(payload.value);
      const start = new Date((trafficData[0] as any)?.[xAxisKey] ?? payload.value);
      if (!isNaN(d.getTime()) && !isNaN(start.getTime())) {
        const monthDiff =
          (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
        fill = monthDiff % 2 === 1 ? "var(--color-primary)" : (isDark ? "#9ca3af" : "#6b7280");
      }
    }

    return (
      <text x={x} y={y + 10} textAnchor="middle" fontSize={11} fill={fill}>
        {formatXAxisTick(payload.value)}
      </text>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
            Live system metrics and SMS traffic analytics.{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {activeRangeLabel}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            label="Auto-Refresh Metrics"
            checked={isMetricsLive}
            onChange={setIsMetricsLive}
          />

          {/* Range dropdown */}
          <div className="relative">
            <button
              onClick={() => setRangeOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-text-primary dark:text-white shadow-sm hover:border-primary hover:text-primary transition-colors"
            >
              <Calendar size={15} className="text-primary" />
              {activeRangeLabel}
              <ChevronDown
                size={15}
                className={`transition-transform ${rangeOpen ? "rotate-180" : ""}`}
              />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setActiveRange(opt.key); setRangeOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeRange === opt.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* <div className="flex items-center space-x-2 text-sm text-text-secondary">
            <Home size={16} className="text-gray-400" />
            <span className="text-text-primary dark:text-white">Dashboard</span>
          </div> */}
        </div>
      </div>

      {/* Row 1: KPI Cards — SMS stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title={`Total SMS (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : totalSms}
          icon={<MessageSquare size={24} />}
        />
        <StatCard
          title={`Delivered (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : deliveredCount}
          icon={<Activity size={24} />}
        />
        <StatCard
          title={`Failed (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : failedCount}
          icon={<XCircle size={24} />}
        />
        <StatCard
          title="Delivery Rate"
          value={isStatsLoading ? "…" : deliveryRate}
          icon={<Activity size={24} />}
          trendText={activeRangeLabel}
        />
      </div>

      {/* Row 2: KPI Cards — Connectivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Active Client Sessions"
          value={activeSessionsCount}
          icon={<Monitor size={24} />}
          trendText="Live via WebSocket"
        />
        <StatCard
          title="Online Clients"
          value={onlineClients}
          icon={<Users size={24} />}
          trendText="bindStatus: ONLINE"
        />
        <StatCard
          title="Online Vendors"
          value={onlineVendors}
          icon={<Server size={24} />}
          trendText="bindStatus: ONLINE"
        />
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Traffic Volume */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">
            Traffic Volume ({activeRangeLabel})
          </h3>
          <div className="h-[280px] w-full overflow-hidden">
            {isTrafficLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                Loading traffic data…
              </div>
            ) : trafficData.length > 0 ? (
              <div className="h-full w-full flex">
                {needsScroll && (
                  <div className="h-full flex-shrink-0" style={{ width: 44 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trafficData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: isDark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                          dx={-10}
                          allowDecimals={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="none"
                          fill="none"
                          isAnimationActive={false}
                          legendType="none"
                          tooltipType="none"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div ref={trafficScrollRef} className={`h-full flex-1 min-w-0 ${needsScroll ? "overflow-x-auto overflow-y-hidden custom-scrollbar pb-2" : ""}`}>
                  <div style={{ height: "100%", width: chartMinWidth }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trafficData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke={isDark ? "#374151" : "#f3f4f6"}
                        />
                        <XAxis
                          dataKey={xAxisKey}
                          axisLine={false}
                          tickLine={false}
                          tick={renderTrafficTick}
                          dy={10}
                          interval={tickInterval}
                          minTickGap={activeRange === "365d" || activeRange === "all" ? 60 : 5}
                          ticks={monthlyTicks}
                          tickFormatter={formatXAxisTick}
                        />
                        {!needsScroll && (
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: isDark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                            dx={-10}
                            allowDecimals={false}
                          />
                        )}
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1f2937" : "#fff",
                            borderColor: isDark ? "#374151" : "#e5e7eb",
                            borderRadius: "0.5rem",
                          }}
                          itemStyle={{ color: "var(--color-primary)", fontWeight: 600 }}
                          labelFormatter={formatTooltipLabel}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="var(--color-primary)"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorVolume)"
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                No traffic data available.
              </div>
            )}
          </div>
        </div>

        {/* DLR Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">
            DLR Breakdown ({activeRangeLabel})
          </h3>
          <div className="h-[280px] w-full flex-1">
            {isDlrLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                Loading DLR data…
              </div>
            ) : dlrData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dlrData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {dlrData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value: string, entry) => {
                      const p = entry.payload as { value?: number };
                      return (
                        <span className="text-sm text-text-secondary dark:text-gray-300">
                          {value}{" "}
                          <span className="font-medium text-text-primary dark:text-white ml-1">
                            ({p?.value}%)
                          </span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                No DLR data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={
            revenue && revenue.total_revenue != null && !isNaN(Number(revenue.total_revenue))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.total_revenue).toFixed(4)}`
              : "-"
          }
          icon={<Banknote size={24} />}
          trendText="Received from clients"
        />
        <StatCard
          title="Total Cost"
          value={
            revenue && revenue.total_cost != null && !isNaN(Number(revenue.total_cost))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.total_cost).toFixed(4)}`
              : "-"
          }
          icon={<Banknote size={24} />}
          trendText="Paid to vendors"
        />
        <StatCard
          title="Gross Margin"
          value={
            revenue && revenue.gross_margin != null && !isNaN(Number(revenue.gross_margin))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.gross_margin).toFixed(4)}`
              : "-"
          }
          icon={<TrendingUp size={24} />}
          trendText="Revenue minus cost"
        />
        <StatCard
          title="Margin %"
          value={
            revenue && revenue.margin_pct != null && !isNaN(Number(revenue.margin_pct))
              ? `${Number(revenue.margin_pct).toFixed(2)}%`
              : "-"
          }
          icon={<Activity size={24} />}
          trendText="Gross margin percentage"
        />
      </div>

      {/* Analytics Toggle */}
      <div className="flex justify-end mb-4">
        <ToggleSwitch
          label="Auto-Refresh Analytics"
          checked={isAnalyticsLive}
          onChange={setIsAnalyticsLive}
        />
      </div>

      {/* Row 5: Live Sessions + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center">
              Live Client Sessions
              {isAnalyticsLive ? (
                <span className="ml-3 flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              ) : (
                <span className="ml-3 flex h-3 w-3 relative">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                </span>
              )}
            </h3>
            <NavLink to="/clientSession">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
                View Details
              </Button>
            </NavLink>
          </div>
          <div className="overflow-y-auto custom-scrollbar max-h-[280px]">
            {isLiveSessionsLoading ? (
              <p className="text-sm text-text-secondary dark:text-gray-400 text-center py-8">
                Loading sessions…
              </p>
            ) : liveSessions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-gray-800">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">System ID</th>
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Username</th>
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Company</th>
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Active Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSessions.map((session, idx) => (
                    <tr
                      key={`${session.systemId}-${idx}`}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium text-text-primary dark:text-white">{session.systemId}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{session.client_name}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{session.companyName}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{session.active_sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-text-secondary dark:text-gray-400 text-center py-8">
                No active live client sessions.
              </p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Recent Notifications</h3>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((n, i) => (
                <div key={n.id || i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs">
                  <p className="font-medium text-text-primary dark:text-white">{n.title || "Alert"}</p>
                  <span className="text-text-secondary dark:text-gray-400 mt-1 block">{formatNotificationTime(n.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary dark:text-gray-400 text-center py-4">No new notifications.</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 6: Failure Breakdown + Latency & SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-primary" />
            Failure Breakdown ({activeRangeLabel})
          </h3>
          <div className="h-[260px] w-full">
            {isFailureLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                Loading failure data…
              </div>
            ) : failureBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                <BarChart
                  data={failureBreakdown}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  style={{ outline: "none" }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={isDark ? "#374151" : "#f3f4f6"}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fill: isDark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    width={150}
                    tick={{ fill: isDark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                    cursor={{ fill: isDark ? "#37415133" : "#f3f4f633" }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    minPointSize={5}
                    onClick={(data: any) => {
                      if (data && data.category) {
                        setSelectedFailureCategory(data.category);
                      }
                    }}
                    cursor="pointer"
                  >
                    {failureBreakdown.map((entry, index) => {
                      const isSelected = entry.category === selectedFailureCategory;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? "var(--color-primary)" : (isDark ? "#4ade8080" : "#86efac")}
                          className={isSelected ? "selected-bar-animate" : ""}
                          style={{ outline: "none" }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-text-secondary dark:text-gray-500">
                No failures recorded for this range.
              </div>
            )}
          </div>
        </div>

        {/* Latency & SLA */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            Latency & SLA ({activeRangeLabel})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Avg Latency</p>
              <p className="text-xl font-bold text-text-primary dark:text-white">
                {isLatencyLoading ? "…" : formatLatency(latencyStats?.avgLatencySeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">P95 Latency</p>
              <p className="text-xl font-bold text-text-primary dark:text-white">
                {isLatencyLoading ? "…" : formatLatency(latencyStats?.p95LatencySeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">P50 Latency</p>
              <p className="text-xl font-bold text-text-primary dark:text-white">
                {isLatencyLoading ? "…" : formatLatency(latencyStats?.p50LatencySeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">
                Stuck &gt;{latencyStats?.stuckThresholdMinutes ?? 5}m
              </p>
              <p
                className={`text-xl font-bold ${(latencyStats?.stuckCount ?? 0) > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-text-primary dark:text-white"
                  }`}
              >
                {isLatencyLoading ? "…" : latencyStats?.stuckCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 7: Detailed Error Messages (Raw) */}
      {selectedFailureCategory && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-primary" />
                Detailed Error "{selectedFailureCategory}" ({activeRangeLabel})
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setSelectedFailureCategory(null)}>
                Close Details
              </Button>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Error Reason</th>
                    <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400 w-32 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {isFailureReasonCountsLoading ? (
                    <tr>
                      <td colSpan={2} className="p-10 text-center text-sm text-text-secondary dark:text-gray-500">
                        Loading error details…
                      </td>
                    </tr>
                  ) : failureReasonCounts.length > 0 ? (
                    failureReasonCounts.map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="p-4 text-sm text-text-secondary dark:text-gray-300 break-words whitespace-normal">
                          {f.failure_reason || "Unknown"}
                        </td>
                        <td className="p-4 text-sm font-medium text-text-primary dark:text-white text-right">
                          {f.count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-10 text-center text-sm text-text-secondary dark:text-gray-500">
                        No errors recorded for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Row 8: Vendor Performance + Client Performance + Geographic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Vendor & Route Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Server size={18} className="text-primary" />
              Vendor & Route Performance
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Vendor</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Route</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Total</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Delivery Rate</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {isVendorLoading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm text-text-secondary dark:text-gray-500">
                      Loading vendor performance…
                    </td>
                  </tr>
                ) : vendorPerformance.length > 0 ? (
                  vendorPerformance.map((v, i) => (
                    <tr
                      key={`${v.vendor}-${v.route}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium text-text-primary dark:text-white">{v.vendor}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{v.route}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{v.total.toLocaleString()}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{v.deliveryRate}%</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">
                        {formatLatency(v.avgLatencySeconds)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <Server size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-sm">No vendor traffic yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Client Performance
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Client</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Total</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Delivery Rate</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {isClientLoading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-sm text-text-secondary dark:text-gray-500">
                      Loading client performance…
                    </td>
                  </tr>
                ) : clientPerformance.length > 0 ? (
                  clientPerformance.map((c, i) => (
                    <tr
                      key={`${c.client}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium text-text-primary dark:text-white">{c.client}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{c.total.toLocaleString()}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{c.deliveryRate}%</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">
                        {formatLatency(c.avgLatencySeconds)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <Users size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-sm">No client traffic yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Globe size={18} className="text-primary" />
              Geographic Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Country</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Total</th>
                  <th className="p-4 text-xs font-medium text-text-secondary dark:text-gray-400">Delivery Rate</th>
                </tr>
              </thead>
              <tbody>
                {isGeoLoading ? (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-sm text-text-secondary dark:text-gray-500">
                      Loading geographic data…
                    </td>
                  </tr>
                ) : geoBreakdown.length > 0 ? (
                  geoBreakdown.map((g, i) => (
                    <tr
                      key={`${g.iso2}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium text-text-primary dark:text-white">
                        <div className="flex items-center gap-2">
                          {g.iso2 && <CountryFlag iso2={g.iso2} />}
                          {g.country}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{g.total.toLocaleString()}</td>
                      <td className="p-4 text-sm text-text-secondary dark:text-gray-300">{g.deliveryRate}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-10 text-center">
                      <Globe size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-sm">
                        No geographic data yet — this section fills in as new traffic is routed.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;