import api from "../axiosInstance";

export interface CompanyData {
  id?: number;
  name: string;
  shortName: string;
  phone: string;
  companyEmail: string;
  supportEmail: string;
  billingEmail: string;
  amEmail: string;
  ratesEmail: string;
  lowBalanceAlertEmail: string;

  // Account Manager
  accountManager?: number | null;
  accountManagerName?: string;

  // Foreign Keys (IDs)
  country: number;
  category: number;
  status: number;
  currency: number;
  timeZone: number;

  // Finance
  customerCreditLimit: string;
  vendorCreditLimit: string;
  balanceAlertAmount: string;
  usedCustomerCredit: string;
  usedVendorCredit: string;
  referencNumber: string;

  // Address
  address: string;

  // Enums & Booleans
  validityPeriod: string;
  defaultEmail: string;
  onlinePayment: boolean;
  companyBlocked: boolean;
  allowWhiteListedCards: boolean;
  sendDailyReports: boolean;
  allowNetting: boolean;
  showHlrApi: boolean;
  enableVendorPanel: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// GET
export const getCompaniesApi = async (
  _module?: string,
  page: number = 1,
  pageSize: number = 10,
  searchParams?: Record<string, any>
): Promise<PaginatedResponse<CompanyData>> => {
  const params: any = {
    page: page,
    page_size: pageSize,
    ...(pageSize >= 1000 ? { dropdown: "true" } : {}),
    ...searchParams
  };
  const response = await api.get(`/company/`, { params });
  return response.data;
};

// POST
export const createCompanyApi = async (
  data: any,
  _module?: string
): Promise<CompanyData> => {
  const response = await api.post(`/company/`, data);
  return response.data;
};

// PATCH
export const updateCompanyApi = async (
  id: number,
  data: any,
  _module?: string
): Promise<CompanyData> => {
  const response = await api.patch(`/company/${id}/`, data);
  return response.data;
};

// DELETE
export const deleteCompanyApi = async (
  id: number,
  _module?: string
): Promise<void> => {
  await api.delete(`/company/${id}/`);
};

// --- Add Credit API ---
// POST
export const addCreditApi = async (
  data: { company: number; creditType: string; creditAmount: number },
  _module?: string
) => {
  const response = await api.post(`/addCreditForCompany/`, data);
  return response.data;
};

// GET Credit History
export const getCreditTransactionHistoryApi = async (
  _module?: string,
  companyId?: number
) => {
  const response = await api.get(`/addCreditForCompany/?company__id=${companyId}`);
  return response.data;
};