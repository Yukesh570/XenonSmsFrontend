import api from "../../../api/axiosInstance";

export interface ImportBatchData {
  id?: number;
  sourceType?: string;
  parserProfileId?: number;
  vendorName?: string;
  senderEmail?: string;
  subject?: string;
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  unmappedRows?: number;
  updatedRows?: number;
  newRows?: number;
  failureReason?: string;
  currency?: string;
  effectiveDate?: string;
  batchStatus?: "PARSING" | "PARSED" | "READY_FOR_REVIEW" | "AUTO_APPROVED" | "MANUAL_APPROVED" | "PUBLISHED" | "ROLLED_BACK";
  publishedAt?: string;
  vendor?: number;
  mail?: number;
  attachment?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getImportBatchesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<ImportBatchData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendorRateImportBatch/`, { params });
  return response.data;
};

export const updateImportBatchApi = async (
  id: number,
  data: any,
  _module?: string
): Promise<ImportBatchData> => {
  const response = await api.patch(`/vendorRateImportBatch/${id}/`, data);
  return response.data;
};

export const approveAndPublishBatchApi = async (
  batch_id: number
): Promise<any> => {
  const response = await api.post(`/approveAndPublishBatch/${batch_id}/`);
  return response.data;
};