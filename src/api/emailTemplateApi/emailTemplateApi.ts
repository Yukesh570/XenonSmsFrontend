import api from "../axiosInstance";

export interface EmailTemplateData {
  id?: number;
  name: string;
  subject: string;
  content: string;
  emailServer?: number | null; // Optional Foreign Key to SMTP Server
  emailServerName?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getEmailTemplatesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<EmailTemplateData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams
  };
  const response = await api.get(`/emailTemplate/`, { params });
  return response.data;
};

export const createEmailTemplateApi = async (
  data: Omit<EmailTemplateData, 'id'>,
  _module?: string
): Promise<EmailTemplateData> => {
  const response = await api.post(`/emailTemplate/`, data);
  return response.data;
};

export const updateEmailTemplateApi = async (
  id: number,
  data: Omit<EmailTemplateData, 'id'>,
  _module?: string
): Promise<EmailTemplateData> => {
  const response = await api.patch(`/emailTemplate/${id}/`, data);
  return response.data;
};

export const deleteEmailTemplateApi = async (
  id: number,
  _module?: string
): Promise<void> => {
  await api.delete(`/emailTemplate/${id}/`);
};

export const getEmailTemplateVariablesApi = async (): Promise<any> => {
  const response = await api.get(`/emailTemplateVariables/`);
  return response.data;
};