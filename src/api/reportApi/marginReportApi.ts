import axiosInstance from "../axiosInstance";

export interface MarginReportFilters {
  start_date?: string;
  end_date?: string;
  client?: string;
  vendor?: string;
  [key: string]: any;
}

export interface MarginReportParams {
  filters?: MarginReportFilters;
  group_by?: string[];
}

export interface MarginSummaryData {
  [key: string]: any;
  revenue: number;
  vendor_cost: number;
  profit_margin: number;
  margin_percent: number;
}

export interface CurrencyInfo {
  symbol: string;
  code: string;
}

export interface MarginTotals {
  revenue: number;
  vendor_cost: number;
  profit_margin: number;
  margin_percent: number;
}

export interface MarginSummaryResponse {
  currency?: CurrencyInfo;
  summary: MarginSummaryData[];
  totals?: MarginTotals;
}

/**
 * Fetch margin report data
 * POST /api/reports/margin/
 */
export const getMarginSummaryApi = async (
  payload: MarginReportParams = {}
): Promise<MarginSummaryResponse> => {
  const response = await axiosInstance.post(`/api/reports/margin/`, payload);
  return response.data;
};

/**
 * Download margin report as CSV
 * POST /api/reports/margin/downloadCsv/
 */
export const downloadMarginReportCsvApi = async (
  payload: MarginReportParams = {}
): Promise<Blob> => {
  const response = await axiosInstance.post(`/api/reports/margin/downloadCsv/`, payload, {
    responseType: "blob",
  });
  return response.data;
};
