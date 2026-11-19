import api from "../axiosInstance";

export interface VendorTransformPolicy {
  id?: number;
  client: number;
  client__name?: string;
  company__name?: string;
  isActive: boolean;
  failureMode: "FAIL_CLOSED" | "FAIL_OPEN";
  allowSenderRewrite: boolean;
  allowTextRewrite: boolean;
  allowDestinationRewrite: boolean;
  maxCandidates: number;
  configGeneration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SenderFormat = "ALPHA" | "NUMERIC" | "ANY";
export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "DEPRECATED";

export interface VendorCompatibilityEvidence {
  id?: number;
  profile: number;
  verificationDate: string;
  environment: string;
  operatorOrCountry?: string;
  evidenceReference: string;
  verifiedBy?: number | null;
  verifiedBy__username?: string | null;
  expiryDate?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorCompatibilityProfile {
  id?: number;
  vendor: number;
  vendor__profileName?: string;
  country: number | null;
  country__name?: string | null;
  country__countryCode?: string | null;
  senderFormat: SenderFormat;
  maxSenderLength: number;
  allowBlank: boolean;
  supportedDataCoding?: number[];
  tlvCapabilities?: Record<string, any>;
  verificationStatus: VerificationStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  remarks?: string;
  evidences?: VendorCompatibilityEvidence[];
  createdAt?: string;
  updatedAt?: string;
}

export type VendorTransformTarget = "SENDER_ID" | "DESTINATION" | "MESSAGE_TEXT" | "TLV";

export type VendorTransformAction =
  | "NO_CHANGE"
  | "FIXED_REPLACE"
  | "STRIP"
  | "TRUNCATE"
  | "APPROVED_POOL_SEQUENTIAL"
  | "APPROVED_POOL_RANDOM"
  | "PREFIX_ADD"
  | "PREFIX_REMOVE"
  | "NORMALIZE"
  | "REGEX_REPLACE";

export type VendorTransformMatchType = "EXACT" | "REGEX" | "ANY";

export interface VendorTransformRule {
  id?: number;
  client: number;
  client__name?: string;
  company__name?: string;
  vendor?: number | null;
  vendor__profileName?: string | null;
  routeGroup?: number | null;
  routeGroup__name?: string | null;
  route?: number | null;
  country?: number | null;
  country__name?: string | null;
  name: string;
  targetEntity: VendorTransformTarget;
  matchType: VendorTransformMatchType;
  pattern?: string | null;
  action: VendorTransformAction;
  replacement?: string | null;
  truncateLength?: number | null;
  senderPool?: number | null;
  replacementList?: number | null;
  priority: number;
  stopProcessing: boolean;
  compiledPatternHash?: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "EXPIRED";
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CandidateEvaluationResultDto {
  vendor_id?: number | null;
  vendor_name: string;
  route_id?: number | null;
  route_name?: string | null;
  compatible: boolean;
  exclusion_reason?: string | null;
  projected_sender: string;
  applied_rule_ids: number[];
  segments: number;
}

export interface VendorTransformPreviewRequest {
  client: number;
  sender: string;
  destination: string;
  text?: string;
  country?: number | null;
}

export interface VendorTransformPreviewResponse {
  matched: boolean;
  is_error: boolean;
  error_reason?: string | null;
  selected_candidate?: {
    vendor_id?: number | null;
    route_id?: number | null;
  } | null;
  original_sender: string;
  final_sender: string;
  applied_rule_ids: number[];
  evaluated_candidates: CandidateEvaluationResultDto[];
  exclusions_summary: string[];
  latency_us: number;
}

export interface VendorTransformCacheStatusResponse {
  status: "OK" | "ERROR";
  client?: {
    id: number | string;
    generation: number;
    policy_cached: boolean;
  };
  vendor?: {
    id: number | string;
    generation: number;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Policies API
// ---------------------------------------------------------------------------
export const getVendorTransformPoliciesApi = async (clientId?: number) => {
  const params = clientId ? { client: clientId } : {};
  const res = await api.get("/api/vendor-transform-policies/", { params });
  return Array.isArray(res.data) ? res.data : res.data.results || [];
};

export const getVendorTransformPolicyApi = async (policyId: number) => {
  const res = await api.get(`/api/vendor-transform-policies/${policyId}/`);
  return res.data;
};

export const createVendorTransformPolicyApi = async (data: Partial<VendorTransformPolicy>) => {
  const res = await api.post("/api/vendor-transform-policies/", data);
  return res.data;
};

export const updateVendorTransformPolicyApi = async (
  policyId: number,
  data: Partial<VendorTransformPolicy>
) => {
  const res = await api.patch(`/api/vendor-transform-policies/${policyId}/`, data);
  return res.data;
};

// ---------------------------------------------------------------------------
// Rules API
// ---------------------------------------------------------------------------
export const getVendorTransformRulesApi = async (params?: {
  client?: number;
  vendor?: number;
  country?: number;
  search?: string;
}) => {
  const res = await api.get("/api/vendor-transform-rules/", { params });
  return Array.isArray(res.data) ? res.data : res.data.results || [];
};

export const createVendorTransformRuleApi = async (data: Partial<VendorTransformRule>) => {
  const res = await api.post("/api/vendor-transform-rules/", data);
  return res.data;
};

export const updateVendorTransformRuleApi = async (
  ruleId: number,
  data: Partial<VendorTransformRule>
) => {
  const res = await api.patch(`/api/vendor-transform-rules/${ruleId}/`, data);
  return res.data;
};

export const deleteVendorTransformRuleApi = async (ruleId: number) => {
  const res = await api.delete(`/api/vendor-transform-rules/${ruleId}/`);
  return res.data;
};

export const validateVendorTransformRuleApi = async (data: Partial<VendorTransformRule>) => {
  const res = await api.post("/api/vendor-transform-rules/validate/", data);
  return res.data;
};

// ---------------------------------------------------------------------------
// Profiles API
// ---------------------------------------------------------------------------
export const getVendorCompatibilityProfilesApi = async (params?: {
  vendor?: number;
  country?: number;
  search?: string;
}) => {
  const res = await api.get("/api/vendor-compatibility-profiles/", { params });
  return Array.isArray(res.data) ? res.data : res.data.results || [];
};

export const createVendorCompatibilityProfileApi = async (
  data: Partial<VendorCompatibilityProfile>
) => {
  const res = await api.post("/api/vendor-compatibility-profiles/", data);
  return res.data;
};

export const updateVendorCompatibilityProfileApi = async (
  profileId: number,
  data: Partial<VendorCompatibilityProfile>
) => {
  const res = await api.patch(`/api/vendor-compatibility-profiles/${profileId}/`, data);
  return res.data;
};

export const deleteVendorCompatibilityProfileApi = async (profileId: number) => {
  const res = await api.delete(`/api/vendor-compatibility-profiles/${profileId}/`);
  return res.data;
};

// ---------------------------------------------------------------------------
// Preview Simulator API
// ---------------------------------------------------------------------------
export const previewVendorTransformApi = async (
  data: VendorTransformPreviewRequest
): Promise<VendorTransformPreviewResponse> => {
  const res = await api.post("/api/vendor-transform/preview/", data);
  return res.data;
};

// ---------------------------------------------------------------------------
// Cache Management API
// ---------------------------------------------------------------------------
export const getVendorTransformCacheStatusApi = async (params: {
  client?: number;
  vendor?: number;
}): Promise<VendorTransformCacheStatusResponse> => {
  const res = await api.get("/api/vendor-transform-cache/status/", { params });
  return res.data;
};

export const rebuildVendorTransformCacheApi = async (data: {
  client?: number;
  vendor?: number;
}) => {
  const res = await api.post("/api/vendor-transform-cache/rebuild/", data);
  return res.data;
};

// ---------------------------------------------------------------------------
// Client Route Scoped Vendors API
// ---------------------------------------------------------------------------
export const getClientRouteVendorsApi = async (
  clientId: number,
  countryId?: number | null
): Promise<{ id: number; profileName: string }[]> => {
  const params: any = {};
  if (countryId) params.country = countryId;
  const res = await api.get(`/api/clients/${clientId}/route-vendors/`, { params });
  return res.data;
};

