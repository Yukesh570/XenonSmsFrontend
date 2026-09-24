import api from "../axiosInstance";

export interface NotificationData {
  id?: number;
  title: string;
  description: string;
  createdAt?: string;
  seen?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET
export const getNotificationApi = async (
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<NotificationData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/notification/`, { params });
  return response.data;
};

// POST
export const createNotificationApi = async (
  data: any,
): Promise<NotificationData> => {
  const response = await api.post(`/notification/`, data);
  return response.data;
};

// PATCH
export const updateNotificationApi = async (
  id: number,
  data: any,
): Promise<NotificationData> => {
  const response = await api.patch(`/notification/${id}/`, data);
  return response.data;
};

// DELETE
export const deleteNotificationApi = async (
  id: number,
): Promise<void> => {
  await api.delete(`/notification/${id}/`);
};