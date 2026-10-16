import api from "../axiosInstance";

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "idemp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);
};

export const clientTopUpApi = async (data: {
  companyId: number;
  amount: number | string;
  paymentMethod?: string;
  referenceNo?: string;
  transactionDate?: string;
  remarks?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const response = await api.post(`/api/account-transactions/client-topup/`, data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
};

export const clientPaymentApi = async (data: {
  companyId: number;
  amount: number | string;
  paymentMethod?: string;
  referenceNo?: string;
  transactionDate?: string;
  remarks?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const response = await api.post(`/api/account-transactions/client-payment/`, data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
};

export const changeClientLimitApi = async (data: { companyId: number; newLimit: number; remarks?: string }) => {
  const response = await api.post(`/api/account-credit/client/change-limit/`, data);
  return response.data;
};

export const vendorTopUpApi = async (data: {
  companyId: number;
  amount: number | string;
  paymentMethod?: string;
  referenceNo?: string;
  transactionDate?: string;
  remarks?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const response = await api.post(`/api/account-transactions/vendor-topup/`, data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
};

export const vendorPaymentApi = async (data: {
  companyId: number;
  amount: number | string;
  paymentMethod?: string;
  referenceNo?: string;
  transactionDate?: string;
  remarks?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const response = await api.post(`/api/account-transactions/vendor-payment/`, data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
};

export const changeVendorLimitApi = async (data: { companyId: number; newLimit: number; remarks?: string }) => {
  const response = await api.post(`/api/account-credit/vendor/change-limit/`, data);
  return response.data;
};

export const adjustmentApi = async (data: {
  companyId: number;
  accountType: "CLIENT" | "VENDOR";
  transactionType: "CREDIT_ADJUSTMENT" | "DEBIT_ADJUSTMENT";
  amount: number | string;
  referenceNo?: string;
  remarks?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const response = await api.post(`/api/account-transactions/adjustment/`, data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
};

export const verifyTransactionApi = async (data: { transaction_id: number }) => {
  const response = await api.post(`/api/account-transactions/${data.transaction_id}/verify/`, { action: "verify" });
  return response.data;
};

export const getPendingTransactionsApi = async () => {
  const response = await api.get(`/api/account-transactions/?status=PENDING`);
  return response.data;
};

export const getTransactionHistoryApi = async (companyId: number, accountType?: string) => {
  let url = `/api/account-transactions/?company_id=${companyId}&status=VERIFIED`;
  if (accountType) {
    url += `&accountType=${accountType}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAccountStatementApi = async (params: {
  companyId: number;
  accountType?: "CLIENT" | "VENDOR";
  fromDate?: string;
  toDate?: string;
}) => {
  const response = await api.get(`/api/account-statements/`, { params });
  return response.data;
};

export interface AccountOverviewRow {
  companyId: number;
  companyName: string;
  shortName?: string;
  category: "PREPAID" | "POSTPAID" | string;
  currency: string;
  customer: {
    mode: "PREPAID" | "POSTPAID" | string;
    creditLimit?: string;
    outstanding?: string;
    availableCredit: string;
    prepaidBalance?: string;
  };
  vendor: {
    mode: "PREPAID" | "POSTPAID" | string;
    creditLimit?: string;
    outstanding?: string;
    availableCredit: string;
    prepaidBalance?: string;
  };
  id?: number;
  name?: string;
  categoryName?: string;
}

export interface AccountOverviewSummary {
  totalPostpaidCreditLimit: string;
  totalPostpaidOutstanding: string;
  postpaidAvailableCredit: string;
  totalPrepaidAvailableBalance: string;
  clientFundingThisMonth: string;
  vendorAvailable: string;
}

export interface AccountOverviewResponse {
  count: number;
  next: string | null;
  previous: string | null;
  summary?: AccountOverviewSummary;
  results: AccountOverviewRow[];
}

export const getAccountOverviewApi = async (
  page = 1,
  pageSize = 50,
  searchParams?: Record<string, any>
): Promise<AccountOverviewResponse> => {
  const params = { page, page_size: pageSize, ...searchParams };
  const response = await api.get(`/api/account-finance/overview/`, { params });
  return response.data;
};
