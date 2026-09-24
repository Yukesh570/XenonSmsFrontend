import api from "../axiosInstance";

export interface VendorPolicyData {
  id?: number;
  vendor_name?: string;
  rateTps?: number;
  sendQueueLimit?: number;
  delayTime?: number;
  maxSession?: number;
  responseTimeout?: number;
  enquireLinkInterval?: number;
  connectionTimeout?: number;
  maxMessageRetries?: number;
  connectionRetryDelay?: number;
  connectionRetryCount?: number;
  bindRetryDelay?: number;
  bindRetryCount?: number;
  connectionRecoveryDelay?: number;
  logLevel?: string;
  tlvTag?: string;
  tlvValue?: string;
  isDeleted?: boolean;
}

export interface VendorData {
  id?: number;
  company?: number;
  companyName?: string;
  profileName: string;
  vendorRateGroup?: number;
  vendorRateGroupName?: string;
  connectionType: "SMPP" | "HTTP";
  invoicePolicy: string;
  smpp?: number;
  smppName?: string;
  smppHost?: string;
  smppPort?: number | string;
  smppSystemId?: string;
  systemID?: string;
  smppPassword?: string;
  password?: string;
  bindStatus?: string;
  status?: "ACTIVE" | "TRIAL" | "SUSPENDED";
  active_session_count?: number;
  max_allowed_sessions?: number;
  maxSession?: number;
  vendorPolicy?: VendorPolicyData;
}

export interface VendorRateGroupData {
  id?: number;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET - Vendors
export const getVendorsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<VendorData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams,
  };
  const response = await api.get(`/vendor/`, { params });
  return response.data;
};

// POST - Vendors
export const createVendorApi = async (
  data: any,
  _module?: string,
): Promise<VendorData> => {
  const response = await api.post(`/vendor/`, data);
  return response.data;
};

// PATCH - Vendors
export const updateVendorApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<VendorData> => {
  const response = await api.patch(`/vendor/${id}/`, data);
  return response.data;
};

// DELETE - Vendors
export const deleteVendorApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/vendor/${id}/`);
};

// GET - Vendor Rate Groups
export const getVendorRateGroupsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<VendorRateGroupData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendorRateGroup/`, { params });
  return response.data;
};

export interface VendorRateData {
  country_id?: number;
  country_name?: string;
  MCC?: string;
  MNC?: string;
  rate?: number;
}

export const getVendorRateByVendorApi = async (params: {
  vendor_id: number;
  page?: number;
  page_size?: number;
  [key: string]: any;
}): Promise<PaginatedResponse<VendorRateData>> => {
  const { vendor_id, page = 1, page_size = 10, ...rest } = params;
  const response = await api.get(`/vendorRateByVendor/`, {
    params: { vendor_id, page, page_size, ...rest },
  });
  return response.data;
};