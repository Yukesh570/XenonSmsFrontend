import api from "../axiosInstance";

export interface CustomerRateData {
  id?: number;
  country: number;
  countryName?: string;
  MCC: number;
  MNC?: number;
  countryCode: number;
  rate: number;
  remark: string;
  dateTime?: string;
  version?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  network?: string;
  currencyCode?: string;
  rateBase?: number;
  baseCurrencyCode?: string;
}

// ⚡️ Added Customer Rate Group Interface
export interface CustomerRateGroupData {
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

// ==========================================
// CUSTOMER RATE GROUP API (Outer Table)
// ==========================================

export const getCustomerRateGroupsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CustomerRateGroupData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams,
  };
  const response = await api.get(`/customerRateGroup/`, { params });
  return response.data;
};

export const createCustomerRateGroupApi = async (
  data: any,
  _module?: string,
): Promise<CustomerRateGroupData> => {
  const response = await api.post(`/customerRateGroup/`, data);
  return response.data;
};

export const updateCustomerRateGroupApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<CustomerRateGroupData> => {
  const response = await api.patch(`/customerRateGroup/${id}/`, data);
  return response.data;
};

export const deleteCustomerRateGroupApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/customerRateGroup/${id}/`);
};


// ==========================================
// CUSTOMER RATE API (Inner Table)
// ==========================================

export const getCustomerRatesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CustomerRateData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/customerRate/`, { params });
  return response.data;
};

export const getCustomerRatesPerMNCMCCApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CustomerRateData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/customerRatePerQuery/`, { params });
  return response.data;
};

// ⚡️ Added: Looks up the matching active customer rate for a given RouteGroup + MCC + MNC
export const findCustomerRateApi = async (
  searchParams: { routeGroupName: string; MCC: string | number; MNC: string | number },
): Promise<PaginatedResponse<CustomerRateData>> => {
  const response = await api.get(`/findCustomerRate/`, { params: searchParams });
  return response.data;
};

export const createCustomerRateApi = async (
  data: any,
  _module?: string,
): Promise<CustomerRateData> => {
  const response = await api.post(`/customerRate/`, data);
  return response.data;
};

// POST Upgrade (Replaced PATCH/PUT with Upgrade Rate API as requested)
export const updateCustomerRateApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<CustomerRateData> => {
  const response = await api.post(`/customerRate/upgrade_rate/${id}/`, data);
  return response.data;
};

export const deleteCustomerRateApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/customerRate/${id}/`);
};

export const importCustomerRatesApi = async (
  file: File,
  rateGroupId: number,
): Promise<{ task_id: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/customer-rate/import/${rateGroupId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// ⚡️ Correct API: /customerRateGroup/<int:pk>/export_rates_email/
export const exportCustomerRatesEmailApi = async (
  rateGroupId: number,
  data: { exportOnlyNew: boolean; emailTemplateId: number },
  _module?: string,
): Promise<any> => {
  const response = await api.post(`/customerRateGroup/${rateGroupId}/export_rates_email/`, data);
  return response.data;
};
// ⚡️ Added: Download Rates CSV
export const downloadCustomerRatesCsvApi = async (
  rateGroupId: number,
): Promise<{ task_id: string }> => {
  const response = await api.get(`/customerRateGroup/${rateGroupId}/download_rates_csv/`);
  return response.data;
};
