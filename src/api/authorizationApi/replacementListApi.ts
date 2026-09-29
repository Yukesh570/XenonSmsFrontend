import api from "../axiosInstance";

export interface ReplacementList {
  id?: number;
  name: string;
  client: number | null;
  description?: string;
  selectionMode: "SEQUENTIAL" | "RANDOM";
  status: "ACTIVE" | "INACTIVE";
}

export interface ReplacementListItem {
  id?: number;
  replacementList: number;
  value: string;
  sequenceNo: number;
  status: "ACTIVE" | "INACTIVE";
  label?: string;
}

export const getReplacementListsApi = async (clientId?: number) => {
  const params = clientId ? { client: clientId } : {};
  const response = await api.get(`/api/replacement-lists/`, { params });
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const createReplacementListApi = async (data: ReplacementList) => {
  const response = await api.post(`/api/replacement-lists/`, data);
  return response.data;
};

export const updateReplacementListApi = async (id: number, data: Partial<ReplacementList>) => {
  const response = await api.patch(`/api/replacement-lists/${id}/`, data);
  return response.data;
};

export const deleteReplacementListApi = async (id: number) => {
  const response = await api.delete(`/api/replacement-lists/${id}/`);
  return response.data;
};

export const getReplacementListItemsApi = async (listId: number) => {
  const response = await api.get(`/api/replacement-list-items/?replacementList=${listId}`);
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const createReplacementListItemApi = async (data: ReplacementListItem) => {
  const response = await api.post(`/api/replacement-list-items/`, data);
  return response.data;
};

export const updateReplacementListItemApi = async (id: number, data: Partial<ReplacementListItem>) => {
  const response = await api.patch(`/api/replacement-list-items/${id}/`, data);
  return response.data;
};

export const deleteReplacementListItemApi = async (id: number) => {
  const response = await api.delete(`/api/replacement-list-items/${id}/`);
  return response.data;
};
