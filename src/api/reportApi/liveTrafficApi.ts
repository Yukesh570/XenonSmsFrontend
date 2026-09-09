import api from "../../api/axiosInstance";

export interface TrafficLogData {
  id: number; // or string, depending on backend
  messageId: string;
  time: string;
  client: string;
  vendor: string;
  route: string;
  msisdn: string;
  senderId: string;
  messageType: string;
  status: "DELIVERED" | "FAILED" | "PENDING" | "UNDELIVERED" | "UNCERTAIN";
  error?: string;
  latency: string;
  cost: string;
  country?: string;
  operator?: string;
  effectiveSenderId?: string;
  senderTranslationAction?: string;
  senderTranslationRuleId?: number | string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getTrafficLogsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<TrafficLogData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/report/traffic/`, { params });
  return response.data;
};

export const exportTrafficLogsApi = async (
  _module?: string,
  searchParams?: Record<string, any>
) => {
  const response = await api.get(`/report/traffic/export/`, {
    params: searchParams,
    responseType: "blob",
  });
  return response.data;
};