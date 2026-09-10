import api from "../axiosInstance";

export interface ClientSessionData {
  id?: string; // Added to satisfy DataTable's strict id requirement
  sessionId: string;
  client: number;
  clientUsername: string;
  companyName: string;
  systemId: string;
  bindType: string;
  remoteIp: string;
  remotePort: number;
  connectedAt: string;
  boundAt: string;
  last_activityAt: string;
  disconnectedAt: string;
  disconnectReason: string;
  disconnectInitiatedBy: string;
  status: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ClientSessionSummaryData {
  systemId: string;
  client_name: string;
  companyName: string;
  active_sessions: number;
}

// GET (Read-Only)
export const getClientSessionsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<ClientSessionData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/clientSession/`, { params });
  return response.data;
};

// GET (Read-Only)
export const getClientSessionSummaryApi = async (): Promise<ClientSessionSummaryData[]> => {
  const response = await api.get(`/clientSessionSummary/`);
  return response.data;
};