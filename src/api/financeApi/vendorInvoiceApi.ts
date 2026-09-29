import api from "../axiosInstance";

export interface VendorInvoiceData {
  id?: number;
  accountManager?: number;
  accountManagerName?: string;
  invoiceNumber?: string;
  vendor: number;
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

export const getVendorInvoicesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<VendorInvoiceData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendorCompanyInvoice/`, { params });
  return response.data;
};

export const generateVendorInvoiceApi = async (
  data: any,
  action: "PREVIEW" | "GENERATE" = "GENERATE"
): Promise<any> => {
  const payload = {
    ...data,
    action: action
  };

  const config = action === "PREVIEW" ? { responseType: 'blob' as const } : {};

  const response = await api.post(`/finance/generate-vendorInvoice/`, payload, config);
  return response.data;
};

export const deleteVendorInvoiceApi = async (
  id: number,
  _module?: string
): Promise<void> => {
  await api.delete(`/vendorCompanyInvoice/${id}/`);
};

export const getVendorsApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 1000,
  searchParams?: Record<string, any>
): Promise<any> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...searchParams,
  };
  const response = await api.get(`/vendor/`, { params });
  return response.data;
};

export const generateVendorCompanyInvoiceApi = async (
  data: any,
  action: "PREVIEW" | "GENERATE" = "GENERATE"
): Promise<any> => {
  const payload = {
    ...data,
    action: action
  };

  const config = action === "PREVIEW" ? { responseType: "blob" as const } : {};

  const response = await api.post(`/finance/generate-vendorCompanyInvoice/`, payload, config);

  if (action === "PREVIEW" && response.data instanceof Blob) {
    if (response.data.type?.includes("pdf")) {
      return response.data;
    }
    try {
      const text = await response.data.text();
      const parsed = JSON.parse(text);

      if (parsed?.id || parsed?.invoiceNumber) {
        let invoiceId = parsed.id;
        let downloadUrl = parsed.downloadUrl;

        if (!invoiceId && parsed.invoiceNumber) {
          const listRes = await api.get(`/vendorCompanyInvoice/`, {
            params: { page: 1, page_size: 5, invoiceNumber__icontains: parsed.invoiceNumber }
          });
          const match =
            listRes.data?.results?.find((item: any) => item.invoiceNumber === parsed.invoiceNumber) ||
            listRes.data?.results?.[0];
          if (match) {
            invoiceId = match.id;
            downloadUrl = match.downloadUrl;
          }
        }

        if (invoiceId || downloadUrl) {
          const cleanUrl = downloadUrl
            ? downloadUrl.replace(/^None\/?/, "/").replace(/(?<!:)\/\//g, "/")
            : `/api/finance/company-vendor-invoice/${invoiceId}/download/`;

          const pdfRes = await api.get(cleanUrl, { responseType: "blob" });
          return pdfRes.data;
        }
      }
      return parsed;
    } catch {
      return response.data;
    }
  }

  return response.data;
};

export interface CompanyVendorInvoiceData {
  id?: number;
  accountManager?: number | null;
  accountManagerName?: string;
  invoiceNumber?: string;
  company?: number;
  companyName?: string;
  vendorName?: string;
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

export const getVendorInvoiceByCompanyApi = async (
  companyInvoiceId: number
): Promise<PaginatedResponse<CompanyVendorInvoiceData>> => {
  const response = await api.get(`/vendorInvoice/`, {
    params: {
      company_invoice_id: companyInvoiceId,
    },
  });
  return response.data;
};