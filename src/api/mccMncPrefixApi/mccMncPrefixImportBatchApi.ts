import api from "../axiosInstance";

export interface MccMncPrefixImportBatchData {
  id?: number;
  fileName?: string;
  filePath?: string;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  duplicateRows?: number;
  overlapRows?: number;
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL_SUCCESS";
  errorSummary?: string;
  uploadedAt?: string;
  completedAt?: string;
  createdAt?: string;
  uploadedBy?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getMccMncPrefixImportBatchesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<MccMncPrefixImportBatchData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/mccMncPrefixImportBatch/`, { params });
  return response.data;
};

export const updateMccMncPrefixImportBatchApi = async (
  id: number,
  data: any,
  _module?: string
): Promise<MccMncPrefixImportBatchData> => {
  const response = await api.patch(`/mccMncPrefixImportBatch/${id}/`, data);
  return response.data;
};

// ⚡️ FIX: Added Import (Upload) API
export const importMccMncPrefixApi = async (
  formData: FormData,
): Promise<any> => {
  const response = await api.post(`/mccMncPrefix/upload/`, formData, {
    headers: {
      "Content-Type": undefined,
    },
  });
  return response.data;
};

export const getMccMncPrefixImportStatusApi = async (batchId: number): Promise<any> => {
  const response = await api.get(`/mccmncstatus/${batchId}/`);
  return response.data;
};

export const getMccMncPrefixImportErrorsApi = async (
  batchId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<any> => {
  const response = await api.get(`/mccMncPrefixImportError/`, {
    params: {
      batch: batchId,
      page,
      page_size: pageSize,
    }
  });
  return response.data;
};