import api from "../axiosInstance";

export interface VendorRateData {
  id?: number;
  country: number | string;
  countryName?: string;
  countryCode: number | string;
  network: string;
  MCC: number | string;
  MNC: number | string;
  rate: number | string;
  dateTime?: string;
  remark: string;
  version?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  currencyCode?: string;
  rateBase?: number;
  baseCurrencyCode?: string;
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

export const createVendorRateGroupApi = async (
  data: any,
  _module?: string,
): Promise<VendorRateGroupData> => {
  const response = await api.post(`/vendorRateGroup/`, data);
  return response.data;
};

export const updateVendorRateGroupApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<VendorRateGroupData> => {
  const response = await api.patch(`/vendorRateGroup/${id}/`, data);
  return response.data;
};

export const deleteVendorRateGroupApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/vendorRateGroup/${id}/`);
};

export const getVendorRatesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<VendorRateData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendorRate/`, { params });
  return response.data;
};

export const getVendorRatesPerMNCMCCApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<VendorRateData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendorRatePerQuery/`, { params });
  return response.data;
};

// Looks up the matching active vendor rate for a given terminating vendor + MCC + MNC.
// Hits GET /findVendorRate/vendorRate/?terminatingVendor=&MCC=&MNC=
export const findVendorRateApi = async (
  searchParams: { terminatingVendor: number | string; MCC: string | number; MNC: string | number },
): Promise<PaginatedResponse<VendorRateData>> => {
  const response = await api.get(`/findVendorRate/`, { params: searchParams });
  return response.data;
};

export const createVendorRateApi = async (
  data: any,
  _module?: string,
): Promise<VendorRateData> => {
  const response = await api.post(`/vendorRate/`, data);
  return response.data;
};

export const updateVendorRateApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<VendorRateData> => {
  const response = await api.post(`/vendorRate/upgrade_rate/${id}/`, data);
  return response.data;
};

export const deleteVendorRateApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/vendorRate/${id}/`);
};

// ⚡️ FIX: Send rateGroupId directly in the URL string
export const importVendorRatesApi = async (
  file: File,
  mappingId: string,
  rateGroupId: number,
): Promise<{ task_id: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mapped", mappingId);

  // ⚡️ URL changed to include rateGroupId at the end
  const response = await api.post(`/vendor-rate/import/${rateGroupId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getImportStatusApi = async (taskId: string): Promise<any> => {
  const response = await api.get(`/status/${taskId}/`);
  return response.data;
};

// ⚡️ Added: Export Rates via Email API for Vendor Rate Group
export const exportVendorRatesEmailApi = async (
  rateGroupId: number,
  data: { exportOnlyNew: boolean; emailTemplateId: number },
  _module?: string,
): Promise<any> => {
  const response = await api.post(`/vendorRateGroup/emailtemplate/${rateGroupId}/export_rates_email/`, data);
  return response.data;
};