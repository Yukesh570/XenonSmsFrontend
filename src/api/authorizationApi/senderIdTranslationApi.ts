import api from "../axiosInstance";

export interface SenderIdTranslationPolicy {
  id: number;
  client: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SenderIdTranslationRule {
  id?: number;
  client?: number;
  country: number | null;
  sourceSenderId: string;
  action: "FIXED_REPLACE" | "STRIP" | "TRUNCATE";
  replacementSenderId?: string;
  truncateLength?: number | null;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  remarks?: string;
}

export interface TestTranslationData {
  sender_id: string;
  destination: string;
}

export interface TestTranslationResponse {
  matched: boolean;
  original_sender: string;
  effective_sender: string;
  action: string;
  matched_rule_id: number | null;
  matched_rule_description?: string | null;
  country_id: number | null;
  source: string;
  is_system_error: boolean;
}

export const getSenderTranslationPolicyApi = async (clientId: number) => {
  const response = await api.get(`/api/clients/${clientId}/sender-translation-policy/`);
  return response.data;
};

export const updateSenderTranslationPolicyApi = async (clientId: number, isActive: boolean) => {
  const response = await api.put(`/api/clients/${clientId}/sender-translation-policy/`, { isActive });
  return response.data;
};

export const getSenderTranslationRulesApi = async (clientId: number) => {
  const response = await api.get(`/api/clients/${clientId}/sender-translations/`);
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const createSenderTranslationRuleApi = async (clientId: number, data: SenderIdTranslationRule) => {
  const response = await api.post(`/api/clients/${clientId}/sender-translations/`, data);
  return response.data;
};

export const updateSenderTranslationRuleApi = async (ruleId: number, data: Partial<SenderIdTranslationRule>) => {
  const response = await api.patch(`/api/sender-translations/${ruleId}/`, data);
  return response.data;
};

export const deleteSenderTranslationRuleApi = async (ruleId: number) => {
  const response = await api.delete(`/api/sender-translations/${ruleId}/`);
  return response.data;
};

export const testSenderTranslationApi = async (clientId: number, data: TestTranslationData): Promise<TestTranslationResponse> => {
  const response = await api.post(`/api/clients/${clientId}/sender-translations/test/`, data);
  return response.data;
};
