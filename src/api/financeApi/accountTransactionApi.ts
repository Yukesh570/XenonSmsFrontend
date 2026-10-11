import api from "../axiosInstance";

export const clientTopUpApi = async (data: { companyId: number; amount: number; remarks?: string }) => {
  const response = await api.post(`/api/account-transactions/client-topup/`, data);
  return response.data;
};

export const clientPaymentApi = async (data: { companyId: number; amount: number; remarks?: string }) => {
  const response = await api.post(`/api/account-transactions/client-payment/`, data);
  return response.data;
};

export const changeClientLimitApi = async (data: { companyId: number; newLimit: number; remarks?: string }) => {
  const response = await api.post(`/api/account-credit/client/change-limit/`, data);
  return response.data;
};

export const vendorTopUpApi = async (data: { companyId: number; amount: number; remarks?: string }) => {
  const response = await api.post(`/api/account-transactions/vendor-topup/`, data);
  return response.data;
};

export const vendorPaymentApi = async (data: { companyId: number; amount: number; remarks?: string }) => {
  const response = await api.post(`/api/account-transactions/vendor-payment/`, data);
  return response.data;
};

export const changeVendorLimitApi = async (data: { companyId: number; newLimit: number; remarks?: string }) => {
  const response = await api.post(`/api/account-credit/vendor/change-limit/`, data);
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
