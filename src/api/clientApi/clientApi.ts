import api from "../../api/axiosInstance";

export interface ClientPolicyData {
  id?: number;
  client_name?: string;
  maxTps?: number;
  maxQueueDepth?: number;
  maxWindowPerSession?: number;
  maxWindowGlobal?: number;
  maxSessions?: number;
  idleTimeoutSec?: number;
  submitTimeoutSec?: number;
  senderIdPolicy?: string;
  isDeleted?: boolean;
}

export interface ClientData {
  id?: number;
  company: number;
  companyName?: string;
  routeGroup?: number;
  routeGroupName?: string;
  customerRateGroup?: number;
  customerRateGroupName?: string;
  name: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED";
  bindStatus: "ONLINE" | "OFFLINE";
  route: "DIRECT" | "HIGH QUALITY" | "SIM" | "WHOLESALE" | "FULL" | "SPAM";
  // paymentTerms: "PREPAID" | "POSTPAID" | "NET7" | "NET15" | "NET30";
  paymentTerms: "PREPAID" | "POSTPAID";
  invoicePolicy: "ON_ATTEMPT" | "ON_SUBMIT" | "ON_DELIVERED" | string;
  allowNetting: boolean;
  enableDlr: boolean;
  session: string;
  smppUsername?: string;
  smppPassword?: string;
  internalNotes?: string;
  createdAt?: string;
  clientPolicy?: ClientPolicyData;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET
export const getClientsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<ClientData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/client/`, { params });
  return response.data;
};

// POST
export const createClientApi = async (
  data: any,
  _module?: string,
): Promise<ClientData> => {
  const response = await api.post(`/client/`, data);
  return response.data;
};

// PUT
export const putClientApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<ClientData> => {
  const response = await api.put(`/client/${id}/`, data);
  return response.data;
};

// PATCH
export const updateClientApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<ClientData> => {
  const response = await api.patch(`/client/${id}/`, data);
  return response.data;
};

// DELETE
export const deleteClientApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/client/${id}/`);
};

// --- NEW: Generate Credentials API ---
export const generateCredentialsApi = async (companyName?: string): Promise<{ username: string; password: string }> => {
  const url = companyName 
    ? `/generate-credentials/?company_name=${encodeURIComponent(companyName)}`
    : `/generate-credentials/`;
  const response = await api.get(url);
  return response.data;
};

// --- NEW: Send Details Email API ---
export const sendClientDetailsEmailApi = async (data: {
  templateName: string;
  clientId: number;
}) => {
  const response = await api.post(`/sendMailToClient/`, data);
  return response.data;
};

// --- NEW: Client Rate Overview API ---
export const getClientRateOverViewApi = async (params: {
  client: number;
  routeGroup: string;
  customerRateGroup: string;
}) => {
  const response = await api.get(`/clientRateOverView/`, { params });
  return response.data;
};

// --- NEW: View Client Rates API ---
export interface ClientRateData {
  country_id?: number;
  country_name?: string;
  MCC?: string;
  MNC?: string;
  rate?: number;
}

export const getCustomerRateByClientApi = async (params: {
  client_id: number;
  page?: number;
  page_size?: number;
  [key: string]: any;
}): Promise<PaginatedResponse<ClientRateData>> => {
  const { client_id, page = 1, page_size = 10, ...rest } = params;
  const response = await api.get(`/customerRateByClient/`, {
    params: { client_id, page, page_size, ...rest },
  });
  return response.data;
};