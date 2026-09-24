import api from "../axiosInstance";

export interface SmsStatsData {
  count: number;
  deliveredCount: number;
  failedCount: number;
  rejectedCount: number;
  deliveryRate: number;
}

export interface SmsHourlyData {
  hour: string;
  count: number;
}
export interface SmsDailyData {
  date: string;
  count: number;
}
export interface DlrStatsData {
  deliveredPercent: number;
  failedPercent: number;
  pendingPercent: number;
  rejectedPercent: number;
}

export const getSmsStatsApi = async (
  searchParams?: Record<string, any>
): Promise<SmsStatsData> => {
  const response = await api.get("/smppSMSCounts/", { params: searchParams });
  return response.data;
};

export const getSmsHourlyApi = async (
  searchParams?: Record<string, any>
): Promise<SmsHourlyData[]> => {
  const response = await api.get("/smppSMSHourly/", { params: searchParams });
  return response.data;
};

export const getDlrStatsApi = async (
  searchParams?: Record<string, any>
): Promise<DlrStatsData> => {
  const response = await api.get("/smppSMSDlrStats/", { params: searchParams });
  return response.data;
};

export interface RevenueData {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_pct: number;
  currencyCode?: string;
  currencySymbol?: string;
}

export const getRevenueApi = async (
  searchParams?: Record<string, any>
): Promise<RevenueData> => {
  const response = await api.get("/smppSMSRevenue/", { params: searchParams });
  return response.data;
};

export interface FailureBreakdownData {
  category: string;
  count: number;
}

export const getFailureBreakdownApi = async (
  searchParams?: Record<string, any>
): Promise<FailureBreakdownData[]> => {
  const response = await api.get("/smppSMSFailureBreakdown/", {
    params: searchParams,
  });
  return response.data;
};

export interface VendorPerformanceData {
  vendor: string;
  route: string;
  total: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  avgLatencySeconds: number | null;
}

export const getVendorPerformanceApi = async (
  searchParams?: Record<string, any>
): Promise<VendorPerformanceData[]> => {
  const response = await api.get("/smppSMSVendorPerformance/", {
    params: searchParams,
  });
  return response.data;
};

export interface ClientPerformanceData {
  client: string;
  total: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  avgLatencySeconds: number | null;
}

export const getClientPerformanceApi = async (
  searchParams?: Record<string, any>
): Promise<ClientPerformanceData[]> => {
  const response = await api.get("/smppSMSClientPerformance/", {
    params: searchParams,
  });
  return response.data;
};

export interface GeoBreakdownData {
  country: string;
  iso2: string;
  total: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export const getGeoBreakdownApi = async (
  searchParams?: Record<string, any>
): Promise<GeoBreakdownData[]> => {
  const response = await api.get("/smppSMSGeoBreakdown/", {
    params: searchParams,
  });
  return response.data;
};

export interface LatencyStatsData {
  avgLatencySeconds: number | null;
  p50LatencySeconds: number | null;
  p95LatencySeconds: number | null;
  stuckCount: number;
  stuckThresholdMinutes: number;
}

export const getLatencyStatsApi = async (
  searchParams?: Record<string, any>
): Promise<LatencyStatsData> => {
  const response = await api.get("/smppSMSLatencyStats/", {
    params: searchParams,
  });
  return response.data;
};

export const getSmsDailyApi = async (
  searchParams?: Record<string, any>
): Promise<SmsDailyData[]> => {
  const response = await api.get("/smppSMSDaily/", {
    params: searchParams,
  });
  return response.data;
};

export interface FailureReasonCountsData {
  failure_reason: string;
  count: number;
}

export const getFailureReasonCountsApi = async (
  searchParams?: Record<string, any>
): Promise<FailureReasonCountsData[]> => {
  const response = await api.get("/failureReasonCounts/", {
    params: searchParams,
  });
  return response.data;
};