import api from "../../axiosInstance";

export interface SmsNliLanguage {
  id: number;
  language_code: string;
  language_name: string;
  language_id: number;
  hex_language_id: string;
  single_shift_available: boolean;
  locking_shift_available: boolean;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SmsEncodingConfig {
  id: number;
  nli_enabled: boolean;
  unicode_normalization: string;
  fallback_encoding: string;
  rollout_mode: "OFF" | "SHADOW" | "ENFORCE";
  enabled_languages: SmsNliLanguage[];
  created_at: string;
  updated_at: string;
}

export interface EncodingAnalysisPreview {
  encoding: "GSM7" | "GSM7_NLI" | "UCS2";
  language?: string;
  language_id?: number;
  shift_mode?: "SINGLE" | "LOCKING" | "LOCKING_AND_SINGLE";
  character_count: number;
  septet_count: number;
  segments: number;
}

export interface EncodingDebugResponse {
  analysis: {
    encoding: string;
    nli_language?: string;
    nli_language_id?: number;
    single_shift: boolean;
    locking_shift: boolean;
    character_count: number;
    septet_count: number;
    utf16_units: number;
    udh_bytes: number;
    segment_count: number;
    fallback_used: boolean;
    fallback_reason?: string;
    original_text: string;
    normalized_text: string;
  };
  rollout_mode: string;
  segments: Array<{
    segment_index: number;
    total_segments: number;
    text: string;
    udh_hex: string;
    payload_units: number;
    pdu_hex: string;
  }>;
  character_breakdown: Array<{
    index: number;
    character: string;
    unicode_codepoint: string;
    classification: string;
    cost_septets: number;
  }>;
}

// GET global config
export const getSmsEncodingConfigApi = async (): Promise<SmsEncodingConfig> => {
  const response = await api.get("/api/sms/encoding/config/");
  return response?.data;
};

// PATCH global config
export const updateSmsEncodingConfigApi = async (
  data: Partial<SmsEncodingConfig>
): Promise<SmsEncodingConfig> => {
  const response = await api.patch("/api/sms/encoding/config/", data);
  return response?.data;
};

// GET list of 13 NLI languages
export const getSmsNliLanguagesApi = async (): Promise<SmsNliLanguage[]> => {
  const response = await api.get("/api/sms/encoding/languages/");
  return response?.data;
};

// PATCH single language enabled / order
export const updateSmsNliLanguageApi = async (
  id: number,
  data: Partial<SmsNliLanguage>
): Promise<SmsNliLanguage> => {
  const response = await api.patch(`/api/sms/encoding/languages/${id}/`, data);
  return response?.data;
};

// POST live text analysis preview
export const analyzeSmsEncodingApi = async (
  text: string
): Promise<EncodingAnalysisPreview> => {
  const response = await api.post("/api/sms/encoding/analyze/", { text });
  return response?.data;
};

// POST admin debugger
export const debugSmsEncodingApi = async (
  text: string
): Promise<EncodingDebugResponse> => {
  const response = await api.post("/api/sms/encoding/debug/", { text });
  return response?.data;
};
