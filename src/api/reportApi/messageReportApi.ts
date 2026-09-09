import api from "../../api/axiosInstance";

export interface MessageLogData {
  id: number;
  destination: string;
  text: string;
  status:
  | "PENDING"
  | "QUEUED"
  | "SUBMITTED"
  | "FAILED"
  | "DELIVERED"
  | "REJECTED"
  | "UNDELIVERED"
  | "EXPIRED"
  | "IN_PROGRESS"
  | "PARTIALLY_DELIVERED"
  | "NO_ROUTE"
  | "RETRY_PENDING"
  | "UNCERTAIN";
  message_id: string;
  source_addr?: string;
  encoding?: string;
  countryName?: string;
  segmentNumber?: string;
  characterCount?: string;
  failure_reason?: string;
  effectiveSenderId?: string;
  senderTranslationAction?: string;
  senderTranslationRuleId?: number | string;

  clientName?: string;
  vendorName?: string;
  smppName?: string;
  systemId?: string;
  createdAt?: string;
  queued_at?: string | null;
  submitted_at?: string | null;
  delivered_at?: string | null;
  failed_at?: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getMessageLogsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<MessageLogData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/smppSMS/`, { params });
  return response.data;
};

export const exportMessageLogsApi = async (
  _module?: string,
  searchParams?: Record<string, any>,
) => {
  const response = await api.get(`/smppSMS/export/`, {
    params: searchParams,
    responseType: "blob",
  });
  return response.data;
};

export const downloadCSVApi = async (
  _module?: string,
  searchParams?: Record<string, any>,
) => {
  // Remove responseType: "blob" here!
  const response = await api.get(`/smppSMS/downloadCsv/`, {
    params: searchParams,
  });
  return response.data; // This will now correctly be the { task_id: ... } JSON
};