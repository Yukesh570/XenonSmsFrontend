import api from "../axiosInstance";

export interface TerminatingVendor {
  id: number;
  name: string;
  system_id: string;
  company_name: string;
  currencyCode: string;
}

export interface RouteItem {
  route_id: string | number;
  route_group?: string;
  mcc?: string;
  mnc?: string;
  client_cost: number;
  vendor_cost: number;
  traffic_percentage: number;
  terminating_vendor: TerminatingVendor;
  client?: ClientInfo;
}

export interface CountryInfo {
  id: number;
  name: string;
  code: string;
}

export interface ClientInfo {
  id: number;
  name: string;
  smpp_username: string;
  currencyCode: string;
}

export interface RouteLookupResponse {
  searched_number: string;
  normalized_number: string;
  country?: CountryInfo | null;
  mccmnc?: string | null;
  mcc?: string | null;
  mnc?: string | null;
  network_name?: string | null;
  routing_basis?: string | null;
  client?: ClientInfo | null;
  route?: RouteItem[];
  routing_type?: string | null;
  error?: string | null;
}

export const getRouteLookupApi = async (
  _moduleName?: string,
  paramsData?: {
    number?: string;
    clientId?: string;
    mcc?: string;
    mnc?: string;
    network_name?: string;
  }
): Promise<RouteLookupResponse> => {
  const params: Record<string, any> = {};
  if (paramsData?.number) params.number = paramsData.number;
  if (paramsData?.clientId) params.client_id = paramsData.clientId;
  if (paramsData?.mcc) params.mcc = paramsData.mcc;
  if (paramsData?.mnc) params.mnc = paramsData.mnc;
  if (paramsData?.network_name) params.network_name = paramsData.network_name;
  const response = await api.get(`/routeLookup/`, { params });
  return response.data;
};