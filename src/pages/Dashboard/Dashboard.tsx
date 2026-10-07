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
  Zap,
  Radio,
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
import { getDaysAgoInAppTimezone, formatDateTime } from "../../helper/dateFormatter";



// DLR colours — stable, not derived from API
const DLR_COLORS: Record<string, string> = {
  Delivered: "#10b981",
  Failed: "#ef4444",
  Undelivered: "#f97316",
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
  const [undeliveredCount, setUndeliveredCount] = useState<string>("-");
  const [rejectedCount, setRejectedCount] = useState<string>("-");
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
  const [tpsNotifications, setTpsNotifications] = useState<NotificationData[]>([]);
  const [isTpsLoading, setIsTpsLoading] = useState(false);
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
    if (range === "all") return {};
    if (range === "today") {
      const today = getDaysAgoInAppTimezone(0);
      return { today: true, startDate: today, endDate: today };
    }
    const end = new Date();
    const start = new Date();

    if (range === "5m") start.setMinutes(start.getMinutes() - 5);
    else if (range === "15m") start.setMinutes(start.getMinutes() - 15);
    else if (range === "1h") start.setHours(start.getHours() - 1);
    else if (range === "2h") start.setHours(start.getHours() - 2);
    else if (range === "4h") start.setHours(start.getHours() - 4);
    else {
      const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
      return {
        startDate: getDaysAgoInAppTimezone(days - 1),
        endDate: getDaysAgoInAppTimezone(0),
      };
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const buildTpsParams = (range: RangeKey): Record<string, any> => {
    const params: Record<string, any> = {
      title: "Client TPS Throttled",
    };

    if (range === "all") return params;

    if (range === "today") {
      const today = getDaysAgoInAppTimezone(0);
      params.createdAt__gte = `${today}T00:00:00`;
      params.createdAt__lte = `${today}T23:59:59`;
      return params;
    }

    if (range === "5m" || range === "15m" || range === "1h" || range === "2h" || range === "4h") {
      const end = new Date();
      const start = new Date();
      if (range === "5m") start.setMinutes(start.getMinutes() - 5);
      else if (range === "15m") start.setMinutes(start.getMinutes() - 15);
      else if (range === "1h") start.setHours(start.getHours() - 1);
      else if (range === "2h") start.setHours(start.getHours() - 2);
      else if (range === "4h") start.setHours(start.getHours() - 4);

      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      params.createdAt__gte = fmt(start);
      params.createdAt__lte = fmt(end);
      return params;
    }

    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const start = getDaysAgoInAppTimezone(days - 1);
    const end = getDaysAgoInAppTimezone(0);
    params.createdAt__gte = `${start}T00:00:00`;
    params.createdAt__lte = `${end}T23:59:59`;
    return params;
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
      setUndeliveredCount(Number(d.undeliveredCount || 0).toLocaleString());
      setRejectedCount(Number(d.rejectedCount || 0).toLocaleString());
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
        { name: "Undelivered", value: d.undeliveredPercent || 0, color: DLR_COLORS.Undelivered },
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

  const fetchClientSessionSummary = async (isRefetch = false) => {
    if (!isRefetch) setIsLiveSessionsLoading(true);
    try {
      const data = await getClientSessionSummaryApi();
      setLiveSessions(data);

      // Calculate total active sessions directly from the summary data!
      const totalCount = data.reduce((sum, item) => sum + (item.active_sessions || 0), 0);
      setActiveSessionsCount(totalCount);
      setOnlineClients(data.length);
    } catch (e) {
      console.error("fetchClientSessionSummary failed", e);
      if (!isRefetch) {
        setLiveSessions([]);
        setActiveSessionsCount("-");
      }
    } finally {
      if (!isRefetch) setIsLiveSessionsLoading(false);
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

  const fetchTpsNotifications = async (range: RangeKey = activeRangeRef.current) => {
    setIsTpsLoading(true);
    try {
      const res = await getNotificationApi(1, 15, buildTpsParams(range));
      if (res?.results) {
        setTpsNotifications(res.results);
      } else if (Array.isArray(res)) {
        setTpsNotifications(res);
      } else {
        setTpsNotifications([]);
      }
    } catch (e) {
      console.error("fetchTpsNotifications failed", e);
      setTpsNotifications([]);
    } finally {
      setIsTpsLoading(false);
    }
  };

  const parseTpsDescription = (desc?: string) => {
    if (!desc) return { clientName: null, message: "" };
    const clientPrefixMatch = desc.match(/^Client\s+['"]([^'"]+)['"]\s+(.+)$/i);
    if (clientPrefixMatch) {
      return { clientName: clientPrefixMatch[1], message: clientPrefixMatch[2] };
    }
    const quotedMatch = desc.match(/^['"]([^'"]+)['"]\s+(.+)$/);
    if (quotedMatch) {
      return { clientName: quotedMatch[1], message: quotedMatch[2] };
    }
    const unquotedMatch = desc.match(/^([a-zA-Z0-9_\-\s]+?)\s+(exceeded\s+.*)$/i);
    if (unquotedMatch) {
      return { clientName: unquotedMatch[1], message: unquotedMatch[2] };
    }
    return { clientName: null, message: desc };
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

  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refreshData = () => {
      fetchFailureBreakdown(activeRange);
      fetchVendorPerformance(activeRange);
      fetchClientPerformance(activeRange);
      fetchGeoBreakdown(activeRange);
      fetchLatencyStats(activeRange);
      fetchSmsStats(activeRange);
      fetchTrafficTraffic(activeRange);
      fetchDlrStats(activeRange);
      fetchRevenue(activeRange);
      fetchTpsNotifications(activeRange);
      setSelectedFailureCategory(null);
    };

    const handleTimezoneChange = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        refreshData();
      }, 150);
    };

    refreshData();
    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
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
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    if (!wsBase) {
      console.error("WebSocket Error: VITE_WS_BASE_URL is missing in your .env file!");
      return;
    }

    let isMounted = true;
    const wsUrl = `${wsBase}/ws/status/`;
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    let fetchTimeout: ReturnType<typeof setTimeout>;
    const debouncedFetch = () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        fetchClientSessionSummary(true);
      }, 500);
    };

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

          if ((payload.username && payload.status) || payload.type === "session_count_change") {
            debouncedFetch();
          }

          if (payload.action === "dashboard_metrics_update") {
            const { data } = payload;
            if (isMetricsLiveRef.current && activeRangeRef.current === "today") {
              if (data.smsStats) {
                setTotalSms(Number(data.smsStats.count).toLocaleString());
                setDeliveredCount(Number(data.smsStats.deliveredCount).toLocaleString());
                setFailedCount(Number(data.smsStats.failedCount).toLocaleString());
                setUndeliveredCount(Number(data.smsStats.undeliveredCount || 0).toLocaleString());
                setRejectedCount(Number(data.smsStats.rejectedCount || 0).toLocaleString());
                setDeliveryRate(`${data.smsStats.deliveryRate}%`);
                setIsStatsLoading(false);
              }
              if (data.dlrStats) {
                setDlrData([
                  { name: "Delivered", value: data.dlrStats.deliveredPercent || 0, color: DLR_COLORS.Delivered },
                  { name: "Failed", value: data.dlrStats.failedPercent || 0, color: DLR_COLORS.Failed },
                  { name: "Undelivered", value: data.dlrStats.undeliveredPercent || 0, color: DLR_COLORS.Undelivered },
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

          if (payload.action === "new_notification" && payload.notification) {
            console.log("Got a live notification:", payload.notification);
            const notif = payload.notification;
            if (!notif.title || notif.title === "Client TPS Throttled") {
              setTpsNotifications((prev) => [
                notif,
                ...prev.filter((item) => item.id !== notif.id),
              ]);
            }
          }
        } catch (err) {
          console.error("WebSocket parse error in Dashboard", err);
        }
      };
    };

    connectWebSocket();

    const wsDashboardUrl = `${wsBase}/ws/dashboard/`;
    let wsDashboard: WebSocket;
    let reconnectDashboardTimeout: ReturnType<typeof setTimeout>;

    const connectDashboardWebSocket = () => {
      console.log(`Attempting to connect to Dashboard WebSocket at: ${wsDashboardUrl}`);
      wsDashboard = new WebSocket(wsDashboardUrl);

      wsDashboard.onopen = () => {
        console.log("Dashboard WebSocket connected successfully!");
      };

      wsDashboard.onerror = (error) => {
        console.error("Dashboard WebSocket error:", error);
      };

      wsDashboard.onclose = (event) => {
        console.warn("Dashboard WebSocket closed.", event.reason);
        if (isMounted) {
          reconnectDashboardTimeout = setTimeout(connectDashboardWebSocket, 3000);
        }
      };

      wsDashboard.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action === "new_notification" && data.notification) {
            console.log("Got a live notification:", data.notification);
            const notif = data.notification;
            if (!notif.title || notif.title === "Client TPS Throttled") {
              setTpsNotifications((prev) => [
                notif,
                ...prev.filter((item) => item.id !== notif.id),
              ]);
            }
          }
        } catch (err) {
          console.error("Dashboard WebSocket parse error", err);
        }
      };
    };

    connectDashboardWebSocket();



    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (reconnectDashboardTimeout) clearTimeout(reconnectDashboardTimeout);
      if (ws) ws.close();
      if (wsDashboard) wsDashboard.close();

    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatLatency = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "-";
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
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
    <div className="container mx-auto pb-6">
      {/* Header */}
      <div className="mb-3.5 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-0.5">
            Live system metrics and SMS traffic analytics.{" "}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary">
              {activeRangeLabel}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ToggleSwitch
            label="Auto-Refresh Metrics"
            checked={isMetricsLive}
            onChange={setIsMetricsLive}
          />

          {/* Range dropdown */}
          <div className="relative">
            <button
              onClick={() => setRangeOpen((o) => !o)}
              className="h-[34px] flex items-center gap-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-text-primary dark:text-white shadow-sm hover:border-primary hover:text-primary transition-colors"
            >
              <Calendar size={14} className="text-primary" />
              {activeRangeLabel}
              <ChevronDown
                size={14}
                className={`transition-transform ${rangeOpen ? "rotate-180" : ""}`}
              />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setActiveRange(opt.key); setRangeOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm transition-colors ${activeRange === opt.key
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
        </div>
      </div>

      {/* Row 1: KPI Cards — SMS stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <StatCard
          title={`Total SMS (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : totalSms}
          icon={<MessageSquare size={21} />}
        />
        <StatCard
          title={`Delivered (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : deliveredCount}
          icon={<Activity size={21} />}
        />
        <StatCard
          title={`Failed (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : failedCount}
          icon={<XCircle size={21} />}
        />
        <StatCard
          title={`Undelivered (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : undeliveredCount}
          icon={<XCircle size={21} />}
        />
        <StatCard
          title={`Rejected (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : rejectedCount}
          icon={<AlertTriangle size={21} />}
        />
        <StatCard
          title={`Delivery Rate (${activeRangeLabel})`}
          value={isStatsLoading ? "…" : deliveryRate}
          icon={<Activity size={21} />}
        />
      </div>

      {/* Row 2: KPI Cards — Connectivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <StatCard
          title="Active Client Sessions"
          value={activeSessionsCount}
          icon={<Monitor size={21} />}
        />
        <StatCard
          title="Online Clients"
          value={onlineClients}
          icon={<Users size={21} />}
        />
        <StatCard
          title="Online Vendors"
          value={onlineVendors}
          icon={<Server size={21} />}
        />
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        {/* Traffic Volume */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 sm:p-4 shadow-sm flex flex-col">
          <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white mb-2.5">
            Traffic Volume ({activeRangeLabel})
          </h3>
          <div className="h-[210px] sm:h-[220px] w-full overflow-hidden">
            {isTrafficLoading ? (
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
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
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
                No traffic data available.
              </div>
            )}
          </div>
        </div>

        {/* DLR Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 sm:p-4 shadow-sm flex flex-col">
          <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white mb-2.5">
            DLR Breakdown ({activeRangeLabel})
          </h3>
          <div className="h-[210px] sm:h-[220px] w-full flex-1">
            {isDlrLoading ? (
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
                Loading DLR data…
              </div>
            ) : dlrData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dlrData}
                    cx="50%"
                    cy="42%"
                    innerRadius={50}
                    outerRadius={75}
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
                    content={() => {
                      const delivered = dlrData.find((d) => d.name === "Delivered") || { name: "Delivered", value: 0, color: DLR_COLORS.Delivered };
                      const failed = dlrData.find((d) => d.name === "Failed") || { name: "Failed", value: 0, color: DLR_COLORS.Failed };
                      const undelivered = dlrData.find((d) => d.name === "Undelivered") || { name: "Undelivered", value: 0, color: DLR_COLORS.Undelivered };
                      const pending = dlrData.find((d) => d.name === "Pending") || { name: "Pending", value: 0, color: DLR_COLORS.Pending };
                      const rejected = dlrData.find((d) => d.name === "Rejected") || { name: "Rejected", value: 0, color: DLR_COLORS.Rejected };

                      const renderLegendItem = (item: { name: string; value: number; color: string }) => (
                        <div key={item.name} className="inline-flex items-center gap-1.5 text-xs text-text-secondary dark:text-gray-300">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                          <span className="font-medium text-text-primary dark:text-white">({item.value}%)</span>
                        </div>
                      );

                      return (
                        <div className="flex flex-col items-center gap-1.5 pt-2">
                          <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-6">
                            {renderLegendItem(delivered)}
                            {renderLegendItem(failed)}
                            {renderLegendItem(undelivered)}
                          </div>
                          <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-6">
                            {renderLegendItem(pending)}
                            {renderLegendItem(rejected)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
                No DLR data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <StatCard
          title="Total Revenue"
          value={
            revenue && revenue.total_revenue != null && !isNaN(Number(revenue.total_revenue))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.total_revenue).toFixed(4)}`
              : "-"
          }
          icon={<Banknote size={21} />}
          trendText="Received from clients"
        />
        <StatCard
          title="Total Cost"
          value={
            revenue && revenue.total_cost != null && !isNaN(Number(revenue.total_cost))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.total_cost).toFixed(4)}`
              : "-"
          }
          icon={<Banknote size={21} />}
          trendText="Paid to vendors"
        />
        <StatCard
          title="Gross Margin"
          value={
            revenue && revenue.gross_margin != null && !isNaN(Number(revenue.gross_margin))
              ? `${revenue.currencySymbol || "$"}${Number(revenue.gross_margin).toFixed(4)}`
              : "-"
          }
          icon={<TrendingUp size={21} />}
          trendText="Revenue minus cost"
        />
        <StatCard
          title="Margin %"
          value={
            revenue && revenue.margin_pct != null && !isNaN(Number(revenue.margin_pct))
              ? `${Number(revenue.margin_pct).toFixed(2)}%`
              : "-"
          }
          icon={<Activity size={21} />}
          trendText="Gross margin percentage"
        />
      </div>

      {/* Analytics Toggle */}
      <div className="flex justify-end mb-2 sm:mb-2.5">
        <ToggleSwitch
          label="Auto-Refresh Analytics"
          checked={isAnalyticsLive}
          onChange={setIsAnalyticsLive}
        />
      </div>

      {/* Performance Section: Vendor & Route Performance, Client Performance, Geographic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        {/* Vendor & Route Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
              <Server size={16} className="text-primary" />
              Vendor & Route Performance
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[240px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Route</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Delivery Rate</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {isVendorLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-text-secondary dark:text-gray-500">
                      Loading vendor performance…
                    </td>
                  </tr>
                ) : vendorPerformance.length > 0 ? (
                  vendorPerformance.map((v, i) => (
                    <tr
                      key={`${v.vendor}-${v.route}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-xs font-medium text-text-primary dark:text-white">{v.vendor}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{v.route}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{v.total.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{v.deliveryRate}%</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">
                        {formatLatency(v.avgLatencySeconds)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center">
                      <Server size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-xs">No vendor traffic yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
              <Users size={16} className="text-primary" />
              Client Performance
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[240px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Delivery Rate</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {isClientLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-text-secondary dark:text-gray-500">
                      Loading client performance…
                    </td>
                  </tr>
                ) : clientPerformance.length > 0 ? (
                  clientPerformance.map((c, i) => (
                    <tr
                      key={`${c.client}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-xs font-medium text-text-primary dark:text-white">{c.client}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{c.total.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{c.deliveryRate}%</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">
                        {formatLatency(c.avgLatencySeconds)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center">
                      <Users size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-xs">No client traffic yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
              <Globe size={16} className="text-primary" />
              Geographic Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[240px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Country</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Delivery Rate</th>
                </tr>
              </thead>
              <tbody>
                {isGeoLoading ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-text-secondary dark:text-gray-500">
                      Loading geographic data…
                    </td>
                  </tr>
                ) : geoBreakdown.length > 0 ? (
                  geoBreakdown.map((g, i) => (
                    <tr
                      key={`${g.iso2}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-xs font-medium text-text-primary dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {g.iso2 && <CountryFlag iso2={g.iso2} />}
                          {g.country}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{g.total.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{g.deliveryRate}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center">
                      <Globe size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-text-secondary dark:text-gray-400 text-xs">
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

      {/* Row: Failure Breakdown + (Latency & SLA / Client TPS Throttled) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white mb-2.5 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-primary" />
            Failure Breakdown ({activeRangeLabel})
          </h3>
          <div className="h-[200px] sm:h-[210px] w-full">
            {isFailureLoading ? (
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
                Loading failure data…
              </div>
            ) : failureBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                <BarChart
                  data={failureBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 5, bottom: 0 }}
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
                    width={130}
                    tick={{ fill: isDark ? "#9ca3af" : "#6b7280", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderRadius: "0.5rem",
                      color: isDark ? "#f3f4f6" : "#111827",
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
              <div className="h-full flex items-center justify-center text-xs sm:text-sm text-text-secondary dark:text-gray-500">
                No failures recorded for this range.
              </div>
            )}
          </div>
        </div>

        {/* Latency & SLA (half) + Client TPS Throttled (half) */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {/* Latency & SLA */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-3.5 shadow-sm">
            <h3 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white mb-2 flex items-center gap-1.5">
              <Clock size={15} className="text-primary" />
              Latency & SLA ({activeRangeLabel})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <p className="text-[11px] text-text-secondary dark:text-gray-400 mb-0.5">Avg Latency</p>
                <p className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                  {isLatencyLoading ? "…" : formatLatency(latencyStats?.avgLatencySeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary dark:text-gray-400 mb-0.5">P95 Latency</p>
                <p className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                  {isLatencyLoading ? "…" : formatLatency(latencyStats?.p95LatencySeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary dark:text-gray-400 mb-0.5">P50 Latency</p>
                <p className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                  {isLatencyLoading ? "…" : formatLatency(latencyStats?.p50LatencySeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary dark:text-gray-400 mb-0.5">
                  Stuck &gt;{latencyStats?.stuckThresholdMinutes ?? 5}m
                </p>
                <p
                  className={`text-base sm:text-lg font-bold ${(latencyStats?.stuckCount ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-text-primary dark:text-white"
                    }`}
                >
                  {isLatencyLoading ? "…" : latencyStats?.stuckCount ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Client TPS Throttled Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                  <Zap size={15} className="text-primary" />
                  Client TPS Throttled
                </h3>
                {tpsNotifications.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary rounded-full">
                    {tpsNotifications.length}
                  </span>
                )}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 flex-1 overflow-y-auto space-y-1.5 max-h-[140px] custom-scrollbar">
              {isTpsLoading && tpsNotifications.length === 0 ? (
                <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 text-center py-4">
                  Loading TPS alerts…
                </p>
              ) : tpsNotifications.length > 0 ? (
                tpsNotifications.map((n, i) => {
                  const { clientName, message } = parseTpsDescription(n.description);
                  return (
                    <div
                      key={n.id || i}
                      className="p-2 rounded-lg bg-gray-50/80 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 hover:bg-gray-100/70 dark:hover:bg-gray-700/60 transition-all flex items-start gap-2"
                    >
                      <div className="shrink-0 mt-0.5">
                        <div className="bg-primary/10 dark:bg-primary/20 text-primary p-1 rounded">
                          <AlertTriangle size={12} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-secondary dark:text-gray-300 leading-snug">
                          {clientName ? (
                            <>
                              <span className="font-semibold text-text-primary dark:text-white">
                                '{clientName}'
                              </span>{" "}
                              <span>{message}</span>
                            </>
                          ) : (
                            n.description
                          )}
                        </p>

                        {n.createdAt && (
                          <div className="mt-1 flex items-center text-[10px] text-text-secondary dark:text-gray-400 font-mono">
                            <Clock size={10} className="mr-1 shrink-0 opacity-70" />
                            <span>{formatDateTime(n.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 text-center py-4">
                  No TPS throttled alerts.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Error Messages (Raw) */}
      {selectedFailureCategory && (
        <div className="mb-2.5 sm:mb-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-primary" />
                Detailed Error "{selectedFailureCategory}" ({activeRangeLabel})
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setSelectedFailureCategory(null)}>
                Close Details
              </Button>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[220px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Error Reason</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider w-32 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {isFailureReasonCountsLoading ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-xs text-text-secondary dark:text-gray-500">
                        Loading error details…
                      </td>
                    </tr>
                  ) : failureReasonCounts.length > 0 ? (
                    failureReasonCounts.map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300 break-words whitespace-normal">
                          {f.failure_reason || "Unknown"}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-medium text-text-primary dark:text-white text-right">
                          {f.count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-xs text-text-secondary dark:text-gray-500">
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

      {/* Live Client Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-2.5 sm:mb-3">
        <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
            <Radio size={16} className="text-primary" />
            Live Client Sessions
          </h3>
          <NavLink to="/clientSession">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
              View Details
            </Button>
          </NavLink>
        </div>
        <div className="overflow-y-auto custom-scrollbar max-h-[220px]">
          {isLiveSessionsLoading ? (
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 text-center py-6">
              Loading sessions…
            </p>
          ) : liveSessions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">System ID</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Active Sessions</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map((session, idx) => (
                  <tr
                    key={`${session.systemId}-${idx}`}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-xs font-medium text-text-primary dark:text-white">{session.systemId}</td>
                    <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{session.client_name}</td>
                    <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{session.companyName}</td>
                    <td className="px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300">{session.active_sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 text-center py-6">
              No active live client sessions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;