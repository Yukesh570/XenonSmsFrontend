import api from "../../axiosInstance";

export interface TimezoneData {
  id?: number;
  name: string;
  utcOffset: string;
  abbreviation: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET
export const getTimezoneApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<TimezoneData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams,
  };
  const response = await api.get(`/timeZone/`, { params });
  return response.data;
};

// POST
export const createTimezoneApi = async (
  data: any,
  _module?: string,
): Promise<TimezoneData> => {
  const response = await api.post(`/timeZone/`, data);
  return response.data;
};

// PATCH
export const updateTimezoneApi = async (
  id: number,
  data: any,
  _module?: string,
): Promise<TimezoneData> => {
  const response = await api.patch(`/timeZone/${id}/`, data);
  return response.data;
};

// DELETE
export const deleteTimezoneApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/timeZone/${id}/`);
};