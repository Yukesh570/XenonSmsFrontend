import api from "../axiosInstance";

export interface MessageFilterPolicy {
  id?: number;
  client: number;
  client_name?: string;
  client__name?: string;
  isActive: boolean;
  destinationRulesEnabled: boolean;
  textRulesEnabled: boolean;
  allowRandomFunctions: boolean;
  allowCountryChange: boolean;
  cacheFailureMode: "FAIL_CLOSED" | "FAIL_OPEN";
  maxTextExpansionChars: number;
  configGeneration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TargetEntity = "DESTINATION" | "MESSAGE_TEXT";

export type DestinationAction =
  | "NO_CHANGE"
  | "FIXED_REPLACE"
  | "REGEX_REPLACE"
  | "PREFIX_ADD"
  | "PREFIX_REMOVE"
  | "NORMALIZE";

export type TextAction =
  | "NO_CHANGE"
  | "STRING_REPLACE"
  | "REPLACE_ALL"
  | "REGEX_REPLACE"
  | "APPEND"
  | "PREPEND"
  | "LIST_SEQUENTIAL"
  | "LIST_RANDOM";

export interface MessageFilterRule {
  id?: number;
  client: number;
  client_name?: string;
  client__name?: string;
  country: number | null;
  country_name?: string | null;
  country__name?: string | null;
  country_code?: string | null;
  name: string;
  description?: string;
  targetEntity: TargetEntity;

  // Conditions
  senderMatchType?: "EXACT" | "REGEX" | null;
  senderPattern?: string | null;
  destinationMatchType?: "EXACT" | "PREFIX" | "REGEX" | null;
  destinationPattern?: string | null;
  textMatchType?: "EXACT" | "CONTAINS" | "REGEX" | null;
  textPattern?: string | null;

  // Actions
  action: DestinationAction | TextAction;
  replacement?: string | null;
  findText?: string | null;
  prefixValue?: string | null;
  normalizationMode?: string | null;
  replacementList?: number | null;
  replacementList_name?: string | null;
  allowMacros?: boolean;
  compiledPatternHash?: string | null;

  // Execution controls
  priority: number;
  stopProcessing: boolean;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "EXPIRED";
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageTextReplacementList {
  id?: number;
  client: number | null;
  client_name?: string | null;
  client__name?: string | null;
  name: string;
  description?: string;
  selectionMode: "SEQUENTIAL" | "RANDOM";
  status: "ACTIVE" | "INACTIVE";
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageTextReplacementListItem {
  id?: number;
  replacementList: number;
  value: string;
  sequenceNo: number;
  status: "ACTIVE" | "INACTIVE";
  validFrom?: string | null;
  validTo?: string | null;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PreviewRequest {
  client: number;
  sender: string;
  destination: string;
  text: string;
  country?: number | null;
}

export interface PreviewTraceEntry {
  rule_id: number;
  rule_name: string;
  target: string;
  action: string;
  before: string;
  after: string;
  reason: string;
}

export interface PreviewResponse {
  matched: boolean;
  original: {
    sender: string;
    destination: string;
    text: string;
    country_id?: number | null;
    country_name?: string | null;
    segmentCount: number;
    encoding: string;
  };
  effective: {
    sender: string;
    destination: string;
    text: string;
    country_id?: number | null;
    country_name?: string | null;
    segmentCount: number;
    encoding: string;
  };
  appliedRules: number[];
  destinationRuleIds?: number[];
  textRuleIds?: number[];
  trace: PreviewTraceEntry[];
  randomFunctionsUsed: boolean;
  latencyUs?: number;
  errors: string[];
}

export interface ValidateRuleResponse {
  valid: boolean;
  error?: string | null;
  patternHash?: string | null;
}

// --- Policy APIs ---
export const getMessageFilterPoliciesApi = async (params?: Record<string, any> | number): Promise<any> => {
  const queryParams = typeof params === "number" ? { client: params } : params || {};
  const response = await api.get("/api/message-filter-policies/", { params: queryParams });
  return response.data;
};

export const getMessageFilterPolicyApi = async (id: number): Promise<MessageFilterPolicy> => {
  const response = await api.get(`/api/message-filter-policies/${id}/`);
  return response.data;
};

export const createMessageFilterPolicyApi = async (data: Partial<MessageFilterPolicy>): Promise<MessageFilterPolicy> => {
  const response = await api.post("/api/message-filter-policies/", data);
  return response.data;
};

export const updateMessageFilterPolicyApi = async (id: number, data: Partial<MessageFilterPolicy>): Promise<MessageFilterPolicy> => {
  const response = await api.patch(`/api/message-filter-policies/${id}/`, data);
  return response.data;
};

// --- Rules APIs ---
export const getMessageFilterRulesApi = async (params?: Record<string, any>): Promise<any> => {
  const response = await api.get("/api/message-filter-rules/", { params });
  return response.data;
};

export const createMessageFilterRuleApi = async (data: Partial<MessageFilterRule>): Promise<MessageFilterRule> => {
  const response = await api.post("/api/message-filter-rules/", data);
  return response.data;
};

export const updateMessageFilterRuleApi = async (id: number, data: Partial<MessageFilterRule>): Promise<MessageFilterRule> => {
  const response = await api.patch(`/api/message-filter-rules/${id}/`, data);
  return response.data;
};

export const deleteMessageFilterRuleApi = async (id: number): Promise<void> => {
  await api.delete(`/api/message-filter-rules/${id}/`);
};

export const validateMessageFilterRuleApi = async (data: Partial<MessageFilterRule>): Promise<ValidateRuleResponse> => {
  const response = await api.post("/api/message-filter-rules/validate/", data);
  return response.data;
};

export const previewMessageFilterRuleApi = async (data: PreviewRequest): Promise<PreviewResponse> => {
  const response = await api.post("/api/message-filter-rules/preview/", data);
  return response.data;
};

// --- Text Replacement Lists & Items APIs ---
export const getMessageTextReplacementListsApi = async (params?: Record<string, any> | number): Promise<any> => {
  const queryParams = typeof params === "number" ? { client: params } : params || {};
  const response = await api.get("/api/message-text-lists/", { params: queryParams });
  return response.data;
};

export const createMessageTextReplacementListApi = async (data: Partial<MessageTextReplacementList>): Promise<MessageTextReplacementList> => {
  const response = await api.post("/api/message-text-lists/", data);
  return response.data;
};

export const updateMessageTextReplacementListApi = async (id: number, data: Partial<MessageTextReplacementList>): Promise<MessageTextReplacementList> => {
  const response = await api.patch(`/api/message-text-lists/${id}/`, data);
  return response.data;
};

export const deleteMessageTextReplacementListApi = async (id: number): Promise<void> => {
  await api.delete(`/api/message-text-lists/${id}/`);
};

export const getMessageTextReplacementListItemsApi = async (listId: number, params?: Record<string, any>): Promise<any> => {
  const response = await api.get(`/api/message-text-lists/${listId}/items/`, { params });
  return response.data;
};

export const createMessageTextReplacementListItemApi = async (listId: number, data: Partial<MessageTextReplacementListItem>): Promise<MessageTextReplacementListItem> => {
  const response = await api.post(`/api/message-text-lists/${listId}/items/`, data);
  return response.data;
};

export const updateMessageTextReplacementListItemApi = async (listId: number, itemId: number, data: Partial<MessageTextReplacementListItem>): Promise<MessageTextReplacementListItem> => {
  const response = await api.patch(`/api/message-text-lists/${listId}/items/${itemId}/`, data);
  return response.data;
};

export const deleteMessageTextReplacementListItemApi = async (listId: number, itemId: number): Promise<void> => {
  await api.delete(`/api/message-text-lists/${listId}/items/${itemId}/`);
};

// --- Cache APIs ---
export const rebuildMessageFilterCacheApi = async (clientId: number): Promise<{ message: string; timestamp: string }> => {
  const response = await api.post("/api/message-filter-cache/rebuild/", { client: clientId });
  return response.data;
};

export const getMessageFilterCacheStatusApi = async (clientId: number): Promise<any> => {
  const response = await api.get("/api/message-filter-cache/status/", { params: { client: clientId } });
  return response.data;
};
