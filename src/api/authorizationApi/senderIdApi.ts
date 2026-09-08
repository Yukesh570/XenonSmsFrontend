import api from "../axiosInstance";

export interface SenderIdPolicyData {
  id?: number;
  client?: number;
  mode: "DISABLED" | "WHITELIST_ONLY" | "BLACKLIST_ONLY";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SenderIdRuleData {
  id?: number;
  client?: number;
  senderId: string;
  action: "ALLOW" | "BLOCK";
  country?: number | null;
  countryName?: string;
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestPolicyData {
  sender_id: string;
  destination: string;
}

export interface TestPolicyResponse {
  allowed: boolean;
  country_id: number | null;
  policy_mode: string;
  reason: string;
  matched_rule_id: number | null;
  matched_rule_description?: string | null;
  evaluation_source: string;
}

export interface SenderIdAuditData {
  id?: number;
  client?: number;
  systemId?: string;
  clientIp?: string;
  sessionId?: string;
  senderId: string;
  destination: string;
  country?: number;
  policyMode: string;
  matchedRule?: number;
  matched_rule_description?: string | null;
  decision: string;
  reasonCode: string;
  smppStatus: number;
  createdAt?: string;
}

// --- Policy APIs ---
export const getSenderPolicyApi = async (clientId: number) => {
  const response = await api.get(`/api/sender-policy/${clientId}/`);
  return response.data;
};

export const createSenderPolicyApi = async (clientId: number, data: SenderIdPolicyData) => {
  const response = await api.post(`/api/sender-policy/${clientId}/`, data);
  return response.data;
};

export const updateSenderPolicyApi = async (clientId: number, id: number, data: Partial<SenderIdPolicyData>) => {
  const response = await api.patch(`/api/sender-policy/${clientId}/${id}/`, data);
  return response.data;
};

// --- Rules APIs ---
export const getSenderRulesApi = async (clientId: number, params?: Record<string, any>) => {
  const response = await api.get(`/api/sender-rules/${clientId}/`, { params });
  return response.data;
};

export const createSenderRuleApi = async (clientId: number, data: SenderIdRuleData) => {
  const response = await api.post(`/api/sender-rules/${clientId}/`, data);
  return response.data;
};

export const updateSenderRuleApi = async (clientId: number, id: number, data: Partial<SenderIdRuleData>) => {
  const response = await api.patch(`/api/sender-rules/${clientId}/${id}/`, data);
  return response.data;
};

export const deleteSenderRuleApi = async (clientId: number, id: number) => {
  const response = await api.delete(`/api/sender-rules/${clientId}/${id}/`);
  return response.data;
};

export const testSenderPolicyApi = async (clientId: number, data: TestPolicyData): Promise<TestPolicyResponse> => {
  const response = await api.post(`/api/sender-rules/${clientId}/test/`, data);
  return response.data;
};

// --- Audit APIs ---
export const getSenderAuditLogsApi = async (clientId: number, params?: Record<string, any>) => {
  const response = await api.get(`/api/sender-audit/${clientId}/`, { params });
  return response.data;
};
