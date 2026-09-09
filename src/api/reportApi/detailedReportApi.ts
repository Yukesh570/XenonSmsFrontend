import api from "../axiosInstance";

export interface DetailedReportData {
  id: number;

  // Fields pulled from SMSMessage
  encoding?: string;
  characterCount?: string;
  source_addr?: string;
  message_queued_at?: string;
  message_sent_at?: string;
  message_delivered_at?: string;
  message_failed_at?: string;
  failure_reason?: string;

  countryName?: string;
  client: string;
  destination: string;
  clientRate: string | number;
  client_charge: string | number;
  part_total: number;
  senderId: string;
  effectiveSenderId?: string;
  senderTranslationAction?: string;
  senderTranslationRuleId?: number | string;
  vendor: string;
  vendorRate: string | number;
  vendor_charge: string | number;
  content: string; // The message text
  submitStatus: string;
  request_time: string;
  text_message_id: string;
  vendor_msg_id: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getDetailedReportsApi = async (
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<DetailedReportData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };

  // FIX: Added the missing '/api/' prefix here
  const response = await api.get(`/api/reports/detailed/`, { params });
  return response.data;
};

export const exportDetailedReportsApi = async (
  searchParams?: Record<string, any>
) => {
  // FIX: Added the missing '/api/' prefix here
  const response = await api.get(`/api/reports/detailed/export/`, {
    params: searchParams,
    responseType: "blob",
  });
  return response.data;
};