import api from "../../axiosInstance";

export interface CurrencyData {
  id?: number;
  name: string;
  currencyCode: string;
  numericCode: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  createdAt?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET
export const getCurrenciesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CurrencyData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams,
  };
  const response = await api.get(`/currency/`, { params });
  return response.data;
};

// POST
export const createCurrencyApi = async (
  data: any,
  _module?: string,
): Promise<CurrencyData> => {
  const response = await api.post(`/currency/`, data);
  return response.data;
};

// PATCH
export const updateCurrencyApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<CurrencyData> => {
  const response = await api.patch(`/currency/${id}/`, data);
  return response.data;
};

// DELETE
export const deleteCurrencyApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/currency/${id}/`);
};

// IMPORT
export const importCurrencyApi = async (formData: FormData): Promise<any> => {
  const response = await api.post(`/currency/import`, formData, {
    headers: {
      "Content-Type": undefined,
    },
  });
  return response.data;
};

// STATUS CHECK (Polling)
export const getImportStatusApi = async (taskId: string): Promise<any> => {
  const response = await api.get(`/status/${taskId}/`);
  return response.data;
};