import api from "../axiosInstance";

export interface SenderPool {
  id?: number;
  name: string;
  client: number | null;
  description?: string;
  selectionMode: "SEQUENTIAL" | "RANDOM";
  status: "ACTIVE" | "INACTIVE";
}

export interface SenderPoolItem {
  id?: number;
  senderPool: number;
  senderId: string;
  sequenceNo: number;
  status: "ACTIVE" | "INACTIVE";
  comment?: string;
}

export const getSenderPoolsApi = async (clientId?: number) => {
  const params = clientId ? { client: clientId } : {};
  const response = await api.get(`/api/sender-pools/`, { params });
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const createSenderPoolApi = async (data: SenderPool) => {
  const response = await api.post(`/api/sender-pools/`, data);
  return response.data;
};

export const updateSenderPoolApi = async (id: number, data: Partial<SenderPool>) => {
  const response = await api.patch(`/api/sender-pools/${id}/`, data);
  return response.data;
};

export const deleteSenderPoolApi = async (id: number) => {
  const response = await api.delete(`/api/sender-pools/${id}/`);
  return response.data;
};

export const getSenderPoolItemsApi = async (poolId: number) => {
  const response = await api.get(`/api/sender-pool-items/?senderPool=${poolId}`);
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const createSenderPoolItemApi = async (data: SenderPoolItem) => {
  const response = await api.post(`/api/sender-pool-items/`, data);
  return response.data;
};

export const updateSenderPoolItemApi = async (id: number, data: Partial<SenderPoolItem>) => {
  const response = await api.patch(`/api/sender-pool-items/${id}/`, data);
  return response.data;
};

export const deleteSenderPoolItemApi = async (id: number) => {
  const response = await api.delete(`/api/sender-pool-items/${id}/`);
  return response.data;
};
