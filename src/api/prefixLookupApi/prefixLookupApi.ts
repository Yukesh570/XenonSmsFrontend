import api from "../axiosInstance";

export interface PrefixLookupCountry {
  id?: number;
  name: string;
  code: string;
}

export interface PrefixLookupData {
  searched_number: string;
  normalized_number: string;
  country?: PrefixLookupCountry | null;
  mccmnc?: string | null;
  mcc?: string | null;
  mnc?: string | null;
  operator?: string | null;
  matchedPrefixStart?: number | string | null;
  matchedPrefixEnd?: number | string | null;
  error?: string | null;
}

export interface PrefixLookupResponse extends Partial<PrefixLookupData> {
  results?: PrefixLookupData[];
  error?: string | null;
  message?: string | null;
}

export const getPrefixLookupApi = async (
  number: string
): Promise<any> => {
  const response = await api.get(`/prefixLookup/`, {
    params: { number },
  });
  return response.data;
};
