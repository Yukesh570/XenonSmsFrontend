import api from "../axiosInstance";

export interface SOARequestPayload {
  companyId: number;
  fromDate: string;
  toDate: string;
  includeInvoices?: boolean;
  includePayments?: boolean;
  includeCreditNotes?: boolean;
}

export interface SOALedgerItem {
  id: string;
  date: string;
  rawDate: string;
  reference: string;
  description: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE";
  debit: number | null;
  credit: number | null;
  balance: number;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID" | null;
  allocatedAmount?: number;
  unpaidAmount?: number;
}

export interface SOAResponseData {
  company: {
    id: number;
    name: string;
    currency: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  statementPeriod: {
    fromDate: string;
    toDate: string;
    formatted: string;
  };
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  netMovement: number;
  items: SOALedgerItem[];
}

export const getCompanySOAMetaApi = async (
  companyId: number,
  fromDate?: string
): Promise<{
  companyId: number;
  companyName: string;
  currency: string;
  fromDate: string;
  openingBalance: number;
}> => {
  const params = fromDate ? { fromDate } : {};
  const response = await api.get(`/finance/soa/company-meta/${companyId}/`, {
    params,
  });
  return response.data;
};

export const generateSOAPreviewApi = async (
  payload: SOARequestPayload
): Promise<SOAResponseData> => {
  const response = await api.post(`/finance/soa/preview/`, payload);
  return response.data;
};

export const downloadSOAPDFApi = async (
  payload: SOARequestPayload
): Promise<Blob> => {
  const response = await api.post(`/finance/soa/export-pdf/`, payload, {
    responseType: "blob",
  });
  return response.data;
};

export const downloadSOAExcelApi = async (
  payload: SOARequestPayload
): Promise<Blob> => {
  const response = await api.post(`/finance/soa/export-excel/`, payload, {
    responseType: "blob",
  });
  return response.data;
};
