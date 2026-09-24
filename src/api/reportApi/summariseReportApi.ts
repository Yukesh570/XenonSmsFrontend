import axiosInstance from "../axiosInstance";

export interface SummariseReportFilters {
  start_date?: string;
  end_date?: string;
  client?: string;
  vendor?: string;
  [key: string]: any;
}

export interface SummariseReportParams {
  filters?: SummariseReportFilters;
  group_by?: string[];
}

export interface SummariseSummaryData {
  [key: string]: any;
  attempts: number;
  successful: number;
  submitted: number;
  delivered: number;
  failed: number;
  revenue: number;
  vendor_cost: number;
  profit_margin: number;
  dlr_percent: number;
  asr_percent: number;
  margin_percent: number;
}

export interface CurrencyInfo {
  symbol: string;
  code: string;
}

export interface SummariseTotals {
  attempts: number;
  successful: number;
  submitted: number;
  delivered: number;
  failed: number;
  revenue: number;
  vendor_cost: number;
  profit_margin: number;
  dlr_percent: number;
  asr_percent: number;
  margin_percent: number;
}

export interface SummariseSummaryResponse {
  currency?: CurrencyInfo;
  summary: SummariseSummaryData[];
  totals?: SummariseTotals;
}

export interface SummariseDetailedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

/**
 * Fetch summarised report data
 * POST /api/reports/summarise/
 */
export const getSummariseSummaryApi = async (
  payload: SummariseReportParams = {}
): Promise<SummariseSummaryResponse> => {
  const response = await axiosInstance.post(`/api/reports/summarise/`, payload);
  return response.data;
};

/**
 * Fetch detailed report data
 * POST /api/reports/detailed-post/
 */
export const getSummariseDetailedApi = async (
  page: number = 1,
  pageSize: number = 50,
  payload: SummariseReportParams = {}
): Promise<SummariseDetailedResponse> => {
  const response = await axiosInstance.post(`/api/reports/detailed-post/`, payload, {
    params: {
      page,
      page_size: pageSize,
    },
  });
  return response.data;
};

/**
 * Download summarised report as CSV
 * POST /api/reports/summarise/downloadCsv/
 */
export const downloadSummariseReportCsvApi = async (
  payload: SummariseReportParams = {}
): Promise<Blob> => {
  const response = await axiosInstance.post(`/api/reports/summarise/downloadCsv/`, payload, {
    responseType: "blob",
  });
  return response.data;
};
