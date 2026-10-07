import api from "../axiosInstance";

export interface ClientInvoiceData {
  id?: number;
  accountManager?: number;
  accountManagerName?: string;
  invoiceNumber?: string;
  client: number;
  companyName?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  invoiceDate?: string;
  totalAmount?: string | number;
  totalSegments?: number;
  status?: string;
  invoicePdf?: string;
  downloadUrl?: string;
  createdAt?: string;
  currencyCode?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getClientInvoicesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<ClientInvoiceData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/clientCompanyInvoice/`, { params });
  return response.data;
};

export const generateClientInvoiceApi = async (
  data: any,
  action: "PREVIEW" | "GENERATE" = "GENERATE"
): Promise<any> => {
  const payload = {
    ...data,
    action: action
  };

  // FIXED: If we are previewing, tell Axios we are receiving a raw PDF file (blob)
  const config = action === "PREVIEW" ? { responseType: 'blob' as const } : {};

  const response = await api.post(`/finance/generate-clientInvoice/`, payload, config);
  return response.data;
};

export const deleteClientInvoiceApi = async (
  id: number,
  _module?: string
): Promise<void> => {
  await api.delete(`/clientCompanyInvoice/${id}/`);
};

export const generateClientCompanyInvoiceApi = async (
  data: any,
  action: "PREVIEW" | "GENERATE" = "GENERATE"
): Promise<any> => {
  const payload = {
    ...data,
    action: action
  };

  const response = await api.post(`/finance/generate-clientCompanyInvoice/`, payload);
  return response.data;
};

export interface CompanyClientInvoiceData {
  id?: number;
  accountManager?: number | null;
  accountManagerName?: string;
  invoiceNumber?: string;
  company?: number;
  companyName?: string;
  clientName?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  invoiceDate?: string;
  totalAmount?: string | number;
  taxAmount?: string | number;
  taxPercentage?: string | number;
  totalSegments?: number;
  status?: string;
  createdAt?: string;
  currencyCode?: string;
}

export const getClientInvoiceByCompanyApi = async (
  companyInvoiceId: number
): Promise<PaginatedResponse<CompanyClientInvoiceData>> => {
  const response = await api.get(`/clientInvoice/`, {
    params: {
      company_invoice_id: companyInvoiceId,
    },
  });
  return response.data;
};