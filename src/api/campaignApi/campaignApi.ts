import api from "../axiosInstance";

export interface templateData {
  id?: number;
  name: string;
  content: string;
}

export interface CampaignFormData {
  id?: number;
  name: string;
  client?: number;
  clientName?: string; // NEW
  objective: string;
  schedule: string;
  content: string;
  template: string;
  senderId?: string;
  is_active: boolean;
  module: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getTemplatesApi = async (
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<templateData> | templateData[]> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/template/`, { params });
  return response.data;
};

export const createTemplate = async (
  data: templateData,
  _module?: string,
): Promise<templateData> => {
  const response = await api.post(`/template/`, data);
  return response.data;
};

export const updateTemplateApi = async (
  id: number,
  data: templateData,
  _module?: string,
): Promise<templateData> => {
  const response = await api.patch(`/template/${id}/`, data);
  return response.data;
};

export const deleteTemplateApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/template/${id}/`);
};

export const getCampaignsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>,
): Promise<PaginatedResponse<CampaignFormData> | CampaignFormData[]> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/campaign/`, { params });
  return response.data;
};

export const createCampaignApi = async (data: FormData, _module?: string) => {
  const response = await api.post(`/campaign/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateCampaignApi = async (
  id: number,
  data: FormData,
  _module?: string,
) => {
  const response = await api.patch(`/campaign/${id}/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteCampaignApi = async (
  id: number,
  _module?: string,
): Promise<void> => {
  await api.delete(`/campaign/${id}/`);
};

export const uploadCampaignCsvApi = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/campaigns/upload-csv/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};