import React, { useState, useEffect, useRef } from "react";
import {
  Home, RefreshCw, Server, Database, Cpu, HardDrive,
  Activity, AlertTriangle, CheckCircle, Zap, Layers,
  Clock, Wifi, ListMinus, ActivitySquare, ShieldCheck,
  Lock, Send, Inbox, AlertOctagon, CreditCard,
  DollarSign, FileText
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  getServerInfoApi,
  getServerHealthApi,
  getServerReconciliationApi,
  type ServerInfoData,
  type ServerHealthData,
  type ReconciliationResponse
} from "../../api/reportApi/serverInfoApi";
import Button from "../../components/ui/Button";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";

interface HistorySample {
  time: string;
  cpu: number;
  ram: number;
  sentBps: number;
  recvBps: number;
}

const MAX_SAMPLES = 120; // 20 mins at 10s intervals

const formatBytesPerSec = (bytes: number) => {
  if (bytes === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTableSize = (size?: string, totalBytes?: number) => {
  if (size && size !== "N/A") return size;
  if (totalBytes === undefined || totalBytes === null) return "N/A";
  if (totalBytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(totalBytes) / Math.log(k));
  return parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatCredit = (val: string | number | undefined) => {
  if (val === undefined || val === null) return "0.00";
  const num = typeof val === "string" ? parseFloat(val) : Number(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMountpoint = (path?: string) => {
  if (!path) return "";
  if (path.length > 25) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      return `…/${last.length > 22 ? last.slice(0, 20) + "…" : last}`;
    }
    return `${path.slice(0, 22)}…`;
  }
  return path;
};

interface ResourceCardProps {
  title: string;
  percent: number;
  details: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  textColor?: string;
}

interface ServiceCardProps {
  name: string;
  status?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ServerInfo: React.FC = () => {
  const location = useLocation();
  const [serverData, setServerData] = useState<ServerInfoData | null>(null);
  const [healthData, setHealthData] = useState<ServerHealthData | null>(null);
  const [reconData, setReconData] = useState<ReconciliationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"telemetry" | "database" | "reconciliation">("telemetry");
  const [isLoading, setIsLoading] = useState(true);

  // Rolling history state and refs
  const [history, setHistory] = useState<HistorySample[]>([]);
  const prevNetRef = useRef<{ sent: number; recv: number; t: number } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAllTelemetry = async (isBackground = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (!isBackground) setIsLoading(true);

    try {
      const [infoRes, healthRes, reconRes] = await Promise.all([
        getServerInfoApi(),
        getServerHealthApi(),
        getServerReconciliationApi(),
      ]);

      if (newController.signal.aborted) return;

      if (infoRes) {
        setServerData(infoRes);

        // Compute Bps and append to history if hardware exists
        if (infoRes.hardware) {
          const now = Date.now();
          const hw = infoRes.hardware;
          let sentBps = 0, recvBps = 0;

          if (prevNetRef.current && hw.network_bytes_sent !== undefined && hw.network_bytes_recv !== undefined) {
            const dt = (now - prevNetRef.current.t) / 1000;
            if (dt > 0) {
              sentBps = Math.max(0, (hw.network_bytes_sent - prevNetRef.current.sent) / dt);
              recvBps = Math.max(0, (hw.network_bytes_recv - prevNetRef.current.recv) / dt);
            }
          }

          if (hw.network_bytes_sent !== undefined && hw.network_bytes_recv !== undefined) {
            prevNetRef.current = { sent: hw.network_bytes_sent, recv: hw.network_bytes_recv, t: now };
          }

          setHistory((prev) => {
            const next = [...prev, {
              time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              cpu: hw.cpu_usage_percent || 0,
              ram: hw.ram_usage_percent || 0,
              sentBps,
              recvBps,
            }];
            return next.length > MAX_SAMPLES ? next.slice(-MAX_SAMPLES) : next;
          });
        }
      }

      if (healthRes) {
        setHealthData(healthRes);
      }

      if (reconRes) {
        setReconData(reconRes);
      }
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name !== "AbortError" && !isBackground) {
        toast.error("Failed to fetch server telemetry.");
      }
    } finally {
      if (abortControllerRef.current === newController) {
        if (!isBackground) setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAllTelemetry(false);
    const intervalId = setInterval(() => { 
      const currentGlobalPath = window.location.pathname === "/" ? "/dashboard" : window.location.pathname;
      const isTabActive = currentGlobalPath === location.pathname || currentGlobalPath.startsWith(`${location.pathname}/`);
      
      if (isTabActive) {
        fetchAllTelemetry(true); 
      }
    }, 10000);
    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [location.pathname]);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => { actionHelper("Server Info", `Opened Server Info Dashboard`, false); }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  // Components (ResourceCard, MetricCard, ServiceCard) - Dashboard style with theme color
  const ResourceCard = ({ title, percent, details, icon: Icon }: ResourceCardProps) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-3.5 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md min-h-[88px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-text-secondary dark:text-gray-400 text-xs sm:text-[13px] font-medium truncate" title={title}>
            {title}
          </h3>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white leading-tight mt-0.5">
            {percent}%
          </h2>
          <p className="text-[11px] text-text-secondary dark:text-gray-500 mt-0.5 truncate" title={details}>
            {details}
          </p>
        </div>
        <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center [&>svg]:w-[21px] [&>svg]:h-[21px] sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]">
          <Icon size={21} />
        </div>
      </div>
      <div className="mt-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );

  const MetricCard = ({ title, value, subtitle, icon: Icon, textColor = "text-text-primary dark:text-white" }: MetricCardProps) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-3.5 shadow-sm flex items-center justify-between gap-3 transition-shadow hover:shadow-md min-h-[68px]">
      <div className="min-w-0 flex-1">
        <h3 className="text-text-secondary dark:text-gray-400 text-xs sm:text-[13px] font-medium truncate" title={title}>
          {title}
        </h3>
        <h2 className={`text-lg sm:text-xl font-bold leading-tight mt-0.5 truncate ${textColor}`} title={String(value)}>
          {value}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-text-secondary dark:text-gray-500 mt-0.5 truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center [&>svg]:w-[21px] [&>svg]:h-[21px] sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]">
        <Icon size={21} />
      </div>
    </div>
  );

  const ServiceCard = ({ name, status, icon: Icon }: ServiceCardProps) => {
    const isUp = status === "UP";
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-3.5 shadow-sm flex items-center justify-between gap-3 transition-shadow hover:shadow-md min-h-[68px]">
        <div className="min-w-0 flex-1">
          <h3 className="text-text-secondary dark:text-gray-400 text-xs sm:text-[13px] font-medium truncate" title={name}>{name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-semibold ${isUp ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {status || "UNKNOWN"}
            </span>
          </div>
        </div>
        <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center [&>svg]:w-[21px] [&>svg]:h-[21px] sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]">
          <Icon size={21} />
        </div>
      </div>
    );
  };

  if (isLoading && !serverData && !healthData) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-[40vh]">
        <RefreshCw size={20} className="animate-spin text-primary mr-2.5" />
        <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">Loading server telemetry & diagnostics...</span>
      </div>
    );
  }

  const isWarming = serverData?.status === "warming";
  const isUnavailable = serverData?.status === "unavailable";
  const hardware = serverData?.hardware || { cpu_usage_percent: 0, cpu_load: {}, ram_usage_percent: 0, ram_details: "N/A", disk_usage_percent: 0, server_uptime: "N/A", network_traffic: "N/A", disk_partitions: [] };
  const infrastructure = serverData?.infrastructure || { database: "UNKNOWN", redis: "UNKNOWN", rabbitmqPortStatus: "UNKNOWN", celery_workers: "UNKNOWN", active_celery_nodes: 0, pending_tasks: 0 };
  const db_stats = serverData?.database_stats;

  const healthDbUp = healthData?.database === "UP";
  const healthRedisUp = healthData?.redis === "UP";

  return (
    <div className="container mx-auto pb-4 space-y-2.5 sm:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
            Server Telemetry & Diagnostics
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Real-time dependency monitoring, hardware telemetry, and system reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => fetchAllTelemetry(false)} leftIcon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}>
            Refresh
          </Button>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-text-secondary">
            <Home size={14} className="text-gray-400" />
            <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
            <span>/</span><span className="text-text-primary dark:text-white font-medium">Server Info</span>
          </div>
        </div>
      </div>

      {/* Real-time Fast Health Check Strip (/server/health/) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3.5 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white">Live Dependency Heartbeat</h4>
          <p className="text-[11px] text-text-secondary dark:text-gray-400">Direct zero-query TCP/Socket verification</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-secondary dark:text-gray-400 font-medium">PostgreSQL:</span>
            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-semibold ${healthDbUp ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {healthData?.database || "DOWN"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-secondary dark:text-gray-400 font-medium">Redis Cache:</span>
            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-semibold ${healthRedisUp ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {healthData?.redis || "DOWN"}
            </span>
          </div>
          <div className="text-[11px] text-text-secondary dark:text-gray-500 pl-2 border-l border-gray-200 dark:border-gray-700 hidden md:block">
            Status: <span className="font-semibold uppercase">{healthData?.status || "Checking..."}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 sm:gap-6">
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-2 font-medium text-xs sm:text-sm border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === "telemetry"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
              }`}
          >
            <Activity size={15} />
            Hardware & Infrastructure
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={`pb-2 font-medium text-xs sm:text-sm border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === "database"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
              }`}
          >
            <Database size={15} />
            Database Deep Dive
          </button>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`pb-2 font-medium text-xs sm:text-sm border-b-2 flex items-center gap-1.5 transition-colors ${activeTab === "reconciliation"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
              }`}
          >
            <ShieldCheck size={15} />
            System Reconciliation
            {reconData?.status === "ok" && (
              <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: HARDWARE & INFRASTRUCTURE */}
      {activeTab === "telemetry" && (
        <div className="space-y-3 sm:space-y-3.5 animate-fadeIn">
          {isWarming && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-3 rounded-xl flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
              <RefreshCw className="animate-spin flex-shrink-0" size={16} />
              <div>
                <h4 className="font-semibold text-xs sm:text-sm">Server telemetry is warming up</h4>
                <p className="text-[11px] mt-0.5">Background Celery workers are collecting system diagnostics. Data will populate automatically within moments.</p>
              </div>
            </div>
          )}

          {isUnavailable && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="flex-shrink-0" size={16} />
              <div>
                <h4 className="font-semibold text-xs sm:text-sm">Metrics Cache Unavailable</h4>
                <p className="text-[11px] mt-0.5">{serverData?.detail || "The server telemetry cache is currently unreachable."}</p>
              </div>
            </div>
          )}

          {/* Instantaneous Hardware */}
          <div>
            <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Instantaneous Hardware</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
              <ResourceCard
                title="CPU Usage"
                percent={hardware.cpu_usage_percent || 0}
                details={hardware.cpu_load?.load_1m !== undefined ? `Load (1m): ${hardware.cpu_load.load_1m} | ${hardware.cpu_load.cpu_count || 1} Cores` : "Real-time utilization"}
                icon={Cpu}
              />
              <ResourceCard title="RAM Usage" percent={hardware.ram_usage_percent || 0} details={hardware.ram_details || "N/A"} icon={Activity} />
              <ResourceCard title="Disk Usage (Root)" percent={hardware.disk_usage_percent || 0} details="Primary storage consumption" icon={HardDrive} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
              <MetricCard title="Server Uptime" value={hardware.server_uptime || "N/A"} icon={Clock} />
              <MetricCard title="Cumulative Network Traffic" value={hardware.network_traffic || "N/A"} icon={Wifi} />
            </div>
          </div>

          {/* Historical Resource Graphs */}
          <div>
            <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Resource History (Last 20 Mins)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
              {/* CPU & RAM Graph */}
              <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white mb-2 sm:mb-2.5">CPU & RAM Utilization</h3>
                <div className="h-48 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} domain={[0, 100]} tickFormatter={(val: number) => `${val}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                        itemStyle={{ color: '#e5e7eb' }}
                        formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" name="CPU" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} isAnimationActive={false} />
                      <Area type="monotone" name="RAM" dataKey="ram" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRam)" strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Network Throughput Graph */}
              <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white mb-2 sm:mb-2.5">Network Throughput</h3>
                <div className="h-48 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val: number) => formatBytesPerSec(val).split(' ')[0]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                        itemStyle={{ color: '#e5e7eb' }}
                        formatter={(value: any, name: any) => [formatBytesPerSec(Number(value)), name]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" name="Sent" dataKey="sentBps" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" name="Received" dataKey="recvBps" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Disk by Partition */}
          {hardware.disk_partitions && hardware.disk_partitions.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Disk Usage by Partition</h2>
              <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div style={{ height: Math.max(220, hardware.disk_partitions.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hardware.disk_partitions} layout="vertical" margin={{ top: 5, right: 25, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.3} />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        dataKey="mountpoint"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        width={160}
                        tickFormatter={formatMountpoint}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.mountpoint || _label}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value}% (${props.payload?.used_gb || 0}GB / ${props.payload?.total_gb || 0}GB - ${props.payload?.fstype || 'ext4'})`, 'Usage'
                        ]}
                      />
                      <Bar dataKey="percent" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Infrastructure Services */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-2.5">
              <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Infrastructure Services</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[11px] font-medium px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md shadow-sm transition-all duration-300">
                  <span className="text-gray-700 dark:text-gray-300">Active Celery Nodes:</span>
                  <span className="text-primary ml-1 font-bold text-xs">{infrastructure.active_celery_nodes}</span>
                </div>
                <div className="text-[11px] font-medium px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md shadow-sm transition-all duration-300 flex items-center gap-1">
                  <ListMinus size={13} className="text-primary shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Pending Tasks:</span>
                  <span className="text-primary ml-1 font-bold text-xs">{infrastructure.pending_tasks || 0}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <ServiceCard name="Database" status={infrastructure.database} icon={Database} />
              <ServiceCard name="Redis" status={infrastructure.redis} icon={Layers} />
              <ServiceCard name="RabbitMQ" status={infrastructure.rabbitmqPortStatus} icon={Zap} />
              <ServiceCard name="Celery Workers" status={infrastructure.celery_workers} icon={Server} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATABASE DEEP DIVE */}
      {activeTab === "database" && (
        <div className="space-y-3 sm:space-y-3.5 animate-fadeIn">
          {isWarming && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-3 rounded-xl flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
              <RefreshCw className="animate-spin flex-shrink-0" size={16} />
              <div>
                <h4 className="font-semibold text-xs sm:text-sm">Database analytics are warming up</h4>
                <p className="text-[11px] mt-0.5">Table size scans and stats are collected in background workers every few minutes.</p>
              </div>
            </div>
          )}

          {!db_stats && !isWarming && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400">
              <Database size={30} className="mx-auto mb-1.5 opacity-50" />
              <p className="text-xs sm:text-sm">Database statistics are not currently available.</p>
            </div>
          )}

          {db_stats && (
            <>
              <div>
                <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">PostgreSQL Telemetry & Saturation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <MetricCard title="Database Size" value={db_stats.size || "N/A"} icon={Database} subtitle={`Total bytes: ${db_stats.size_bytes ? db_stats.size_bytes.toLocaleString() : 0}`} />
                  <MetricCard title="Active Connections" value={`${db_stats.active_connections || 0} / ${db_stats.max_connections || 0}`} icon={ActivitySquare} subtitle="Current vs max capacity" />
                  <MetricCard
                    title="Idle In Transaction"
                    value={db_stats.idle_in_transaction || 0}
                    icon={AlertTriangle}
                    subtitle="Open idle transactions"
                    textColor={(db_stats.idle_in_transaction || 0) > 0 ? "text-red-500 font-bold" : "text-green-500 font-semibold"}
                  />
                  <MetricCard title="Cache Hit Ratio" value={db_stats.cache_hit_ratio_percent ? `${db_stats.cache_hit_ratio_percent}%` : "N/A"} icon={Zap} subtitle="Buffer pool efficiency" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" />
                    Largest Database Tables
                  </h3>
                  <span className="text-[11px] text-text-secondary dark:text-gray-400">Top relations by total disk footprint</span>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-text-secondary dark:text-gray-400 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        <th className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider w-12">#</th>
                        <th className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider">Table Name</th>
                        <th className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(db_stats.largest_tables || []).map((tableInfo, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-3.5 py-1.5 text-text-secondary dark:text-gray-500 font-mono text-xs">{idx + 1}</td>
                          <td className="px-3.5 py-1.5 text-text-primary dark:text-white font-medium font-mono text-xs">{tableInfo.table}</td>
                          <td className="px-3.5 py-1.5 text-text-secondary dark:text-gray-300 text-right font-semibold text-xs">
                            {formatTableSize(tableInfo.size, tableInfo.total_bytes)}
                          </td>
                        </tr>
                      ))}
                      {(db_stats.largest_tables || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3.5 py-5 text-center text-xs text-text-secondary dark:text-gray-500">
                            No table scan data available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="space-y-3 sm:space-y-3.5 animate-fadeIn">
          {reconData?.status === "unauthorized" ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg text-amber-700 dark:text-amber-400">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Administrator Privileges Required</h3>
                <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-300">
                  {reconData.detail || "Server reconciliation telemetry contains sensitive system totals and credit balances. Only administrative user accounts are authorized to inspect this endpoint."}
                </p>
              </div>
            </div>
          ) : reconData?.status === "warming" ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl flex items-center gap-3 text-blue-800 dark:text-blue-300 shadow-sm">
              <RefreshCw className="animate-spin flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-xs sm:text-sm">Reconciliation snapshot is warming up</h4>
                <p className="text-[11px] mt-0.5">{reconData.detail || "Background tasks are currently counting billing outboxes, SMS records, and database integrity metrics."}</p>
              </div>
            </div>
          ) : reconData?.status === "unavailable" || reconData?.status === "error" ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-300 shadow-sm">
              <AlertTriangle size={20} className="flex-shrink-0 text-red-500" />
              <div>
                <h4 className="font-semibold text-xs sm:text-sm">Reconciliation Data Unavailable</h4>
                <p className="text-[11px] mt-0.5">{reconData.detail || "Unable to load reconciliation snapshot from server."}</p>
              </div>
            </div>
          ) : reconData?.status === "ok" && reconData.data ? (
            <>
              {/* Timestamp Banner */}
              <div className="bg-white dark:bg-gray-800 px-3.5 py-2 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
                  <Clock size={14} className="text-primary" />
                  <span>Snapshot Generated: <strong className="text-text-primary dark:text-white ml-1">{formatDateTime(reconData.data.generated_at)}</strong></span>
                </div>
                <div className="text-[11px] font-mono px-2 py-0.5 bg-gray-50 dark:bg-gray-700/60 rounded-md text-text-secondary dark:text-gray-400">
                  Query Generation Latency: <strong className="text-green-600 dark:text-green-400">{reconData.data.generation_ms} ms</strong>
                </div>
              </div>

              {/* Section A: SMS & Messaging Reconciliation */}
              <div>
                <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Send size={15} className="text-primary" />
                  SMS & Message Dispatch Totals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-3">
                  <MetricCard title="Total SMS Records" value={(reconData.data.sms_rows || 0).toLocaleString()} icon={Send} subtitle="All SMS rows in database" />
                  <MetricCard title="Terminated / Sent SMS" value={(reconData.data.sms_sent || 0).toLocaleString()} icon={CheckCircle} textColor="text-green-600 dark:text-green-400" subtitle="Transitioned out of pending or queued" />
                  <MetricCard
                    title="Failed SMS"
                    value={(reconData.data.sms_failed || 0).toLocaleString()}
                    icon={AlertTriangle}
                    textColor={(reconData.data.sms_failed || 0) > 0 ? "text-red-500 font-bold" : "text-text-primary dark:text-white"}
                    subtitle="Failed prior to termination"
                  />
                  <MetricCard
                    title="In-Flight / Pending SMS"
                    value={Math.max(0, (reconData.data.sms_rows || 0) - (reconData.data.sms_sent || 0) - (reconData.data.sms_failed || 0)).toLocaleString()}
                    icon={Clock}
                    textColor={((reconData.data.sms_rows || 0) - (reconData.data.sms_sent || 0) - (reconData.data.sms_failed || 0)) > 0 ? "text-amber-500 font-bold" : "text-text-primary dark:text-white"}
                    subtitle="Currently queued or transmitting"
                  />
                </div>
              </div>

              {/* Section B: Billing Delta Outbox */}
              <div>
                <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Inbox size={15} className="text-primary" />
                  Billing Delta Outbox & Ledger
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                  <MetricCard title="Outbox Total Records" value={(reconData.data.outbox_rows || 0).toLocaleString()} icon={Inbox} subtitle="Total billing events tracked" />
                  <MetricCard title="Processed Outbox Events" value={(reconData.data.outbox_processed || 0).toLocaleString()} icon={CheckCircle} textColor="text-green-600 dark:text-green-400" subtitle="Successfully applied to balance" />
                  <MetricCard
                    title="Pending Outbox Events"
                    value={(reconData.data.outbox_pending || 0).toLocaleString()}
                    icon={AlertOctagon}
                    textColor={(reconData.data.outbox_pending || 0) > 0 ? "text-orange-500 font-bold" : "text-green-600 dark:text-green-400"}
                    subtitle="Awaiting reconciliation processing"
                  />
                </div>
              </div>

              {/* Section C: Financial & Company Credits + Database Contention */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="lg:col-span-2 space-y-2">
                  <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={15} className="text-primary" />
                    Company Credit Utilization
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    <MetricCard
                      title="Used Customer Credit"
                      value={formatCredit(reconData.data.company_used_customer_credit)}
                      icon={CreditCard}
                      subtitle="Cumulative customer credit consumption"
                    />
                    <MetricCard
                      title="Used Vendor Credit"
                      value={formatCredit(reconData.data.company_used_vendor_credit)}
                      icon={DollarSign}
                      subtitle="Cumulative vendor credit consumption"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-primary" />
                    Database Contention
                  </h2>
                  <MetricCard
                    title="PostgreSQL Deadlocks"
                    value={reconData.data.deadlocks || 0}
                    icon={AlertTriangle}
                    textColor={(reconData.data.deadlocks || 0) > 0 ? "text-red-600 dark:text-red-400 font-bold" : "text-green-600 dark:text-green-400"}
                    subtitle="Cumulative deadlocks recorded"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400">
              <ShieldCheck size={36} className="mx-auto mb-2 opacity-40 text-primary" />
              <p className="text-xs sm:text-sm">Click refresh or wait for the initial reconciliation snapshot to load...</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ServerInfo;