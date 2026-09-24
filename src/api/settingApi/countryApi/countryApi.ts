import api from "../../axiosInstance";

export interface CountryData {
  id?: number;
  name: string;
  countryCode: string;
  iso2: string; // NEW
  region: string; // NEW
  subRegion: string; // NEW
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getCountriesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CountryData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams,
  };
  const response = await api.get(`/country/`, { params });
  return response.data;
};

export const createCountryApi = async (
  data: any,
  _module?: string,
): Promise<CountryData> => {
  const response = await api.post(`/country/`, data);
  return response.data;
};

export const updateCountryApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<CountryData> => {
  const response = await api.patch(`/country/${id}/`, data);
  return response.data;
};

export const deleteCountryApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/country/${id}/`);
};

// Import API
export const importCountryApi = async (formData: FormData): Promise<any> => {
  const response = await api.post(`/country/import`, formData, {
    headers: {
      "Content-Type": undefined,
    },
  });
  return response.data;
};

// Status API
export const getImportStatusApi = async (taskId: string): Promise<any> => {
  const response = await api.get(`/status/${taskId}/`);
  return response.data;
};