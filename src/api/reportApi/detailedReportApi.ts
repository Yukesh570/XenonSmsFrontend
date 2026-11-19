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
  countryMCC?: string;
  operatorMNC?: string;
  networkName?: string;
  client: string;
  company?: string;
  destination: string;
  base_clientRate?: string | number;
  base_client_charge?: string | number;
  clientRate?: string | number;
  client_charge?: string | number;
  part_total: number;
  senderId: string;
  effectiveSenderId?: string;
  senderTranslationRuleId?: number | string;
  original_destination?: string;
  effective_destination?: string;
  original_text?: string;
  effective_text?: string;
  effectiveText?: string;
  original_segment_count?: number;
  effective_segment_count?: number;
  destination_translation_rule_ids?: number[] | string;
  text_translation_rule_ids?: number[] | string;
  message_translation_latency_us?: number;
  originalDestination?: string;
  effectiveDestination?: string;
  originalMessageText?: string;
  effectiveMessageText?: string;
  originalSegmentCount?: number;
  effectiveSegmentCount?: number;
  destinationTranslationRuleIds?: number[] | string;
  textTranslationRuleIds?: number[] | string;
  translationLatencyUs?: number;
  finalVendorSenderId?: string;
  finalVendorDestination?: string;
  finalVendorMessageText?: string;
  finalVendorSegmentCount?: number;
  vendorTransformRuleIds?: number[] | string;
  vendorTransformLatencyUs?: number;
  final_vendor_sender_id?: string;
  final_vendor_destination?: string;
  final_vendor_text?: string;
  final_vendor_segment_count?: number;
  vendor_transform_rule_ids?: number[] | string;
  vendor_transform_latency_us?: number;
  vendor: string;
  base_vendorRate?: string | number;
  base_vendor_charge?: string | number;
  vendorRate?: string | number;
  vendor_charge?: string | number;
  content: string; // The message text
  submitStatus: string;
  request_time: string;
  delivery_time?: string;
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

export const downloadDetailedReportCsvApi = async (
  searchParams?: Record<string, any>,
) => {
  const response = await api.get(`/api/reports/detailed/downloadCsv/`, {
    params: searchParams,
  });
  return response.data; // { task_id: "...", status: "processing" }
};