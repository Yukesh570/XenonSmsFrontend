import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  Activity,
  Search,
  Lock,
  RotateCcw,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";
import ToggleSwitch from "../../../../components/ui/ToggleSwitch";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import DataTable from "../../../../components/ui/DataTable";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import {
  getSmsEncodingConfigApi,
  updateSmsEncodingConfigApi,
  getSmsNliLanguagesApi,
  updateSmsNliLanguageApi,
  analyzeSmsEncodingApi,
  type SmsEncodingConfig,
  type SmsNliLanguage,
  type EncodingAnalysisPreview,
} from "../../../../api/settingApi/smsEncodingApi/smsEncodingApi";

const rolloutOptions = [
  { label: "ENFORCE (Active Production Encoding & 1-Segment Transport)", value: "ENFORCE" },
  { label: "SHADOW (Simulate & Log Savings without altering wire transport)", value: "SHADOW" },
  { label: "OFF (Disabled - Standard XenonSMS Behavior)", value: "OFF" },
];

const normalizationOptions = [
  { label: "NFC - Canonical Composition (Recommended)", value: "NFC" },
  { label: "NFD - Canonical Decomposition", value: "NFD" },
];

const fallbackOptions = [
  { label: "UCS-2 / UTF-16 (Standard SMS Fallback)", value: "UCS2" },
];

// Fallback initial 3GPP National Language Shift Tables
const DEFAULT_3GPP_LANGUAGES: SmsNliLanguage[] = [
  { id: 1, language_code: "tr", language_name: "Turkish", language_id: 1, hex_language_id: "0x01", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 1, created_at: "", updated_at: "" },
  { id: 2, language_code: "es", language_name: "Spanish", language_id: 2, hex_language_id: "0x02", single_shift_available: true, locking_shift_available: false, enabled: true, display_order: 2, created_at: "", updated_at: "" },
  { id: 3, language_code: "pt", language_name: "Portuguese", language_id: 3, hex_language_id: "0x03", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 3, created_at: "", updated_at: "" },
  { id: 4, language_code: "bn", language_name: "Bengali", language_id: 4, hex_language_id: "0x04", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 4, created_at: "", updated_at: "" },
  { id: 5, language_code: "gu", language_name: "Gujarati", language_id: 5, hex_language_id: "0x05", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 5, created_at: "", updated_at: "" },
  { id: 6, language_code: "hi", language_name: "Hindi", language_id: 6, hex_language_id: "0x06", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 6, created_at: "", updated_at: "" },
  { id: 7, language_code: "kn", language_name: "Kannada", language_id: 7, hex_language_id: "0x07", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 7, created_at: "", updated_at: "" },
  { id: 8, language_code: "ml", language_name: "Malayalam", language_id: 8, hex_language_id: "0x08", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 8, created_at: "", updated_at: "" },
  { id: 9, language_code: "or", language_name: "Oriya", language_id: 9, hex_language_id: "0x09", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 9, created_at: "", updated_at: "" },
  { id: 10, language_code: "pa", language_name: "Punjabi", language_id: 10, hex_language_id: "0x0A", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 10, created_at: "", updated_at: "" },
  { id: 11, language_code: "ta", language_name: "Tamil", language_id: 11, hex_language_id: "0x0B", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 11, created_at: "", updated_at: "" },
  { id: 12, language_code: "te", language_name: "Telugu", language_id: 12, hex_language_id: "0x0C", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 12, created_at: "", updated_at: "" },
  { id: 13, language_code: "ur", language_name: "Urdu", language_id: 13, hex_language_id: "0x0D", single_shift_available: true, locking_shift_available: true, enabled: false, display_order: 13, created_at: "", updated_at: "" },
];

const DEFAULT_CONFIG: SmsEncodingConfig = {
  id: 1,
  nli_enabled: true,
  rollout_mode: "ENFORCE",
  unicode_normalization: "NFC",
  fallback_encoding: "UCS2",
  enabled_languages: [DEFAULT_3GPP_LANGUAGES[1]],
  created_at: "",
  updated_at: "",
};

// 5 Sample Presets covering real-world telecom test scenarios (all with char counts)
const SAMPLE_PRESETS = [
  {
    id: "spanish-prod",
    label: "Spanish Production (107 Chars)",
    text: "Recibiste un cupo pre-aprobado de $3.000.000. bogs-cupo.co/preaprobado ¡Solicítalo hoy y no lo dejes pasar!",
    expectedLang: "Spanish",
    description: "Accented characters fit into a single 155-septet SMS using Spanish NLI (50% Cost Savings).",
  },
  {
    id: "spanish-short",
    label: "¡Solicítalo hoy! (47 Chars)",
    text: "¡Solicítalo hoy y aprovecha la oferta especial!",
    expectedLang: "Spanish",
    description: "Short promotional Spanish copy with accents and inverted exclamation mark.",
  },
  {
    id: "gsm7-standard",
    label: "Standard GSM-7 (61 Chars)",
    text: "Hello, your verification code is 482910. Valid for 5 minutes.",
    expectedLang: undefined,
    description: "Pure standard GSM 7-bit alphabet text (160 characters per SMS credit).",
  },
  {
    id: "portuguese-test",
    label: "Portuguese Test (64 Chars)",
    text: "Atenção à promoção de verão! Você ganhou um desconto imperdível.",
    expectedLang: "Portuguese",
    description: "Portuguese characters (ã, õ, ç, etc.) tested against Portuguese NLI shift table.",
  },
  {
    id: "emoji-ucs2",
    label: "Emoji Fallback UCS-2 (48 Chars)",
    text: "Limited time discount! 🚀 Use code SUPER50 now! 🎉",
    expectedLang: undefined,
    description: "Emojis trigger standard 16-bit Unicode UCS-2 encoding (70 characters per segment).",
  },
];

// Local Client-side Analysis Fallback (prevents blank/stale state when offline or awaiting server)
const GSM7_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "|^€{}[~]\\";
const SPANISH_EXT = "áíóúÁÍÓÚ";
const PORTUGUESE_CHARS = "ãõâêôÃÕÂÊÔáàçéíóúÁÀÇÉÍÓÚ";
const TURKISH_CHARS = "ğışĞİŞçöüÇÖÜ";

function localAnalyzeSms(text: string, enabledLanguages: SmsNliLanguage[] = []): EncodingAnalysisPreview {
  const chars = [...text].length;
  if (!chars) {
    return { encoding: "GSM7", character_count: 0, septet_count: 0, segments: 0 };
  }

  const isSpanishActive = enabledLanguages.some((l) => l.language_code === "es" && l.enabled);
  const isPortugueseActive = enabledLanguages.some((l) => l.language_code === "pt" && l.enabled);
  const isTurkishActive = enabledLanguages.some((l) => l.language_code === "tr" && l.enabled);

  let hasSpanishOnly = false;
  let hasPortugueseOnly = false;
  let hasTurkishOnly = false;
  let isUcs2 = false;
  let septets = 0;

  for (const ch of text) {
    if (GSM7_BASIC.includes(ch)) {
      septets += 1;
    } else if (GSM7_EXT.includes(ch)) {
      septets += 2;
    } else if (SPANISH_EXT.includes(ch)) {
      if (isSpanishActive) {
        hasSpanishOnly = true;
        septets += 2; // Single shift escape
      } else {
        isUcs2 = true;
        break;
      }
    } else if (PORTUGUESE_CHARS.includes(ch)) {
      if (isPortugueseActive) {
        hasPortugueseOnly = true;
        septets += 1; // Locking shift
      } else {
        isUcs2 = true;
        break;
      }
    } else if (TURKISH_CHARS.includes(ch)) {
      if (isTurkishActive) {
        hasTurkishOnly = true;
        septets += 2;
      } else {
        isUcs2 = true;
        break;
      }
    } else {
      isUcs2 = true;
      break;
    }
  }

  if (isUcs2) {
    const segs = chars <= 70 ? 1 : Math.ceil(chars / 67);
    return {
      encoding: "UCS2",
      character_count: chars,
      septet_count: 0,
      segments: segs,
    };
  }

  if (hasSpanishOnly) {
    const segs = septets <= 155 ? 1 : Math.ceil(septets / 149);
    return {
      encoding: "GSM7_NLI",
      language: "Spanish",
      language_id: 2,
      shift_mode: "SINGLE",
      character_count: chars,
      septet_count: septets,
      segments: segs,
    };
  }

  if (hasPortugueseOnly) {
    const segs = septets <= 155 ? 1 : Math.ceil(septets / 149);
    return {
      encoding: "GSM7_NLI",
      language: "Portuguese",
      language_id: 3,
      shift_mode: "LOCKING",
      character_count: chars,
      septet_count: septets,
      segments: segs,
    };
  }

  if (hasTurkishOnly) {
    const segs = septets <= 155 ? 1 : Math.ceil(septets / 149);
    return {
      encoding: "GSM7_NLI",
      language: "Turkish",
      language_id: 1,
      shift_mode: "SINGLE",
      character_count: chars,
      septet_count: septets,
      segments: segs,
    };
  }

  const segs = septets <= 160 ? 1 : Math.ceil(septets / 153);
  return {
    encoding: "GSM7",
    character_count: chars,
    septet_count: septets,
    segments: segs,
  };
}

interface Props {
  canUpdate?: boolean;
}

const SmsEncodingSettingsTab: React.FC<Props> = ({ canUpdate = true }) => {
  // Navigation: Configuration & Tables is front/default, SMS Simulator is second
  const [activeSubTab, setActiveSubTab] = useState<"configuration" | "simulator">("configuration");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<SmsEncodingConfig | null>(DEFAULT_CONFIG);
  const [languages, setLanguages] = useState<SmsNliLanguage[]>(DEFAULT_3GPP_LANGUAGES);
  const [languageSearch, setLanguageSearch] = useState("");

  // Table pagination state
  const [tablePage, setTablePage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(25);

  // Sorting state for DataTable
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Interactive Live Analyzer State
  const [testText, setTestText] = useState(SAMPLE_PRESETS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EncodingAnalysisPreview | null>(() =>
    localAnalyzeSms(SAMPLE_PRESETS[0].text, DEFAULT_3GPP_LANGUAGES)
  );

  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Real-time calculation with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      runLiveAnalysis(testText);
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [testText, languages]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [cfgData, langData] = await Promise.all([
        getSmsEncodingConfigApi(),
        getSmsNliLanguagesApi(),
      ]);
      if (cfgData) setConfig(cfgData);
      if (Array.isArray(langData) && langData.length > 0) {
        setLanguages(langData);
      }
    } catch {
      // Fallback is kept from default state
    } finally {
      setIsLoading(false);
    }
  };

  const runLiveAnalysis = async (text: string) => {
    if (!text.trim()) {
      setAnalysisResult(null);
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await analyzeSmsEncodingApi(text);
      if (res && res.encoding) {
        setAnalysisResult(res);
      } else {
        setAnalysisResult(localAnalyzeSms(text, languages));
      }
    } catch {
      // Fallback to local deterministic analysis
      setAnalysisResult(localAnalyzeSms(text, languages));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !canUpdate) return;
    setIsSaving(true);
    try {
      const updated = await updateSmsEncodingConfigApi({
        nli_enabled: config.nli_enabled,
        rollout_mode: config.rollout_mode,
        unicode_normalization: config.unicode_normalization,
        fallback_encoding: config.fallback_encoding,
      });
      if (updated) setConfig(updated);
      toast.success("Global SMS encoding settings updated successfully!");
      runLiveAnalysis(testText);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save encoding settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLanguage = async (lang: SmsNliLanguage) => {
    if (!canUpdate) {
      toast.error("Permission denied. Read-only access.");
      return;
    }
    const newStatus = !lang.enabled;
    try {
      const updated = await updateSmsNliLanguageApi(lang.id, { enabled: newStatus });
      setLanguages((prev) =>
        prev.map((item) => (item.id === lang.id ? { ...item, enabled: updated ? updated.enabled : newStatus } : item))
      );
      toast.success(`${lang.language_name} table ${newStatus ? "enabled" : "disabled"}`);
    } catch {
      // Local optimistic update if API failed
      setLanguages((prev) =>
        prev.map((item) => (item.id === lang.id ? { ...item, enabled: newStatus } : item))
      );
      toast.info(`${lang.language_name} table status updated locally`);
    }
  };

  const handleSelectPreset = (text: string) => {
    setTestText(text);
    runLiveAnalysis(text);
  };

  // Filtered & sorted languages for DataTable
  const filteredLanguages = useMemo(() => {
    let result = languages.filter((l) =>
      l.language_name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      l.language_code.toLowerCase().includes(languageSearch.toLowerCase()) ||
      l.hex_language_id.toLowerCase().includes(languageSearch.toLowerCase())
    );

    if (sortColumnIndex !== null && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA: any = "";
        let valB: any = "";
        if (sortColumnIndex === 1) {
          valA = a.language_name;
          valB = b.language_name;
        } else if (sortColumnIndex === 2) {
          valA = a.hex_language_id;
          valB = b.hex_language_id;
        } else if (sortColumnIndex === 3) {
          valA = a.single_shift_available ? 1 : 0;
          valB = b.single_shift_available ? 1 : 0;
        } else if (sortColumnIndex === 4) {
          valA = a.locking_shift_available ? 1 : 0;
          valB = b.locking_shift_available ? 1 : 0;
        } else if (sortColumnIndex === 5) {
          valA = a.enabled ? 1 : 0;
          valB = b.enabled ? 1 : 0;
        }

        if (typeof valA === "string") {
          return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [languages, languageSearch, sortColumnIndex, sortDirection]);

  const handleSort = (colIdx: number) => {
    if (sortColumnIndex === colIdx) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortColumnIndex(null);
        setSortDirection(null);
      }
    } else {
      setSortColumnIndex(colIdx);
      setSortDirection("asc");
    }
  };

  const isEnforced = config?.rollout_mode === "ENFORCE" && config?.nli_enabled;
  const activeLanguageCount = languages.filter((l) => l.enabled).length;

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading SMS Encoding Configuration..." className="p-10" />;
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header (Configuration & Tables FIRST, SMS Simulator SECOND - No icons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        {/* Sub-Tabs Pills */}
        <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl inline-flex self-start border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveSubTab("configuration")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeSubTab === "configuration"
                ? "bg-white dark:bg-gray-800 text-primary dark:text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Configuration & Tables
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold transition-all border ${
                activeSubTab === "configuration"
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 shadow-2xs"
              }`}
            >
              {activeLanguageCount} Active
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("simulator")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeSubTab === "simulator"
                ? "bg-white dark:bg-gray-800 text-primary dark:text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            SMS Simulator
          </button>
        </div>

        {/* Global Status Pill & Permission Badge */}
        <div className="flex items-center gap-2">
          {!canUpdate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              <Lock className="w-3.5 h-3.5" /> Read-only Mode
            </span>
          )}
          {isEnforced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NLI Active (ENFORCE)
            </span>
          ) : (
            <StatusBadge 
              status={config?.rollout_mode === "SHADOW" ? "PENDING" : "UNKNOWN"} 
              customText={
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {config?.rollout_mode || "OFF"} Mode
                </span>
              } 
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: CONFIGURATION & 3GPP LANGUAGE TABLES (NOW FRONT / DEFAULT)        */}
      {/* ========================================================================= */}
      {activeSubTab === "configuration" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Global Master Settings Card */}
          {config && (
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-3.5">
                <div>
                  <h3 className="text-base font-semibold text-text-primary dark:text-white">
                    Global Gateway Settings
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                    Configure master switch, rollout mode, and unicode normalization.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveConfig}
                  leftIcon={<Save size={15} />}
                  isLoading={isSaving}
                  disabled={isSaving || !canUpdate}
                >
                  Save Settings
                </Button>
              </div>

              {!canUpdate && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Lock size={14} className="shrink-0" />
                  <span>Settings are locked in read-only mode. You do not have permission to modify gateway encoding.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Master Killswitch */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white block">
                      GSM7 National Language Support (NLI)
                    </label>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                      Master toggle across entire SMS gateway.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={config.nli_enabled}
                    onChange={() => canUpdate && setConfig({ ...config, nli_enabled: !config.nli_enabled })}
                    disabled={!canUpdate}
                  />
                </div>

                {/* Rollout Mode */}
                <div>
                  <Select
                    label="Rollout Mode"
                    options={rolloutOptions}
                    value={config.rollout_mode}
                    onChange={(val) => setConfig({ ...config, rollout_mode: val as SmsEncodingConfig["rollout_mode"] })}
                    disabled={!config.nli_enabled || !canUpdate}
                  />
                </div>

                {/* Unicode Normalization */}
                <div>
                  <Select
                    label="Unicode Normalization"
                    options={normalizationOptions}
                    value={config.unicode_normalization}
                    onChange={(val) => setConfig({ ...config, unicode_normalization: val as SmsEncodingConfig["unicode_normalization"] })}
                    disabled={!canUpdate}
                  />
                </div>

                {/* Fallback Encoding */}
                <div>
                  <Select
                    label="Fallback Encoding"
                    options={fallbackOptions}
                    value={config.fallback_encoding}
                    onChange={(val) => setConfig({ ...config, fallback_encoding: val as SmsEncodingConfig["fallback_encoding"] })}
                    disabled={!canUpdate}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3GPP National Language Shift Tables with ADVANCE TABLE (DataTable) */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3.5">
              <div>
                <h3 className="text-base font-semibold text-text-primary dark:text-white">
                  3GPP National Language Tables
                </h3>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                  Enable or disable language tables. The engine deterministically picks the highest-priority enabled table.
                </p>
              </div>
            </div>

            {/* Advance DataTable Component */}
            <DataTable
              data={filteredLanguages}
              headers={["S.N.", "Language", "3GPP ID", "Single Shift", "Locking Shift", "Status"]}
              density="compact"
              totalItems={filteredLanguages.length}
              currentPage={tablePage}
              rowsPerPage={tableRowsPerPage}
              onPageChange={setTablePage}
              onRowsPerPageChange={setTableRowsPerPage}
              rowsPerPageOptions={[
                { value: "15", label: "15" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
              ]}
              serverSide={false}
              onSort={handleSort}
              sortColumnIndex={sortColumnIndex}
              sortDirection={sortDirection}
              emptyMessage="No 3GPP language tables match your search query."
              headerActions={
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search languages or ID..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {languageSearch && (
                    <button
                      type="button"
                      onClick={() => setLanguageSearch("")}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              }
              renderRow={(lang: SmsNliLanguage, index: number) => {
                const rowNumber = (tablePage - 1) * tableRowsPerPage + index + 1;
                return (
                  <tr
                    key={lang.id || index}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700 transition-colors ${
                      lang.enabled ? "bg-primary-light/40 dark:bg-purple-950/20" : ""
                    }`}
                  >
                    {/* S.N. Column (Locked) */}
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 text-center font-medium">
                      {rowNumber}
                    </td>

                    {/* Language Name & Code */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            lang.enabled ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                        <span className="font-semibold text-text-primary dark:text-white text-xs sm:text-sm">
                          {lang.language_name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-gray-300 font-semibold uppercase">
                          {lang.language_code}
                        </span>
                      </div>
                    </td>

                    {/* 3GPP Hex ID */}
                    <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">
                      {lang.hex_language_id}
                    </td>

                    {/* Single Shift Support */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {lang.single_shift_available ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          ✓ IEI 0x24
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Locking Shift Support */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {lang.locking_shift_available ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-primary-light text-primary dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          ✓ IEI 0x25
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Status Toggle & Badge */}
                    <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2.5">
                        <ToggleSwitch
                          checked={lang.enabled}
                          onChange={() => handleToggleLanguage(lang)}
                          disabled={!canUpdate}
                        />
                        <StatusBadge status={lang.enabled ? "ACTIVE" : "OFFLINE"} />
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CLEAN & FOCUSED SMS SIMULATOR (NOW SECOND)                       */}
      {/* ========================================================================= */}
      {activeSubTab === "simulator" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Quick Presets Bar - Strictly Single Line */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
            <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 whitespace-nowrap shrink-0 mr-1">
              Sample Presets:
            </span>
            {SAMPLE_PRESETS.map((preset) => {
              const isSelected = testText === preset.text;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.text)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 font-medium whitespace-nowrap shrink-0 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm font-semibold"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:text-text-primary dark:hover:text-white"
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Composer Box (Clean, Real-time calculation) */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-input overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Type or paste your SMS message here to test real-time segments..."
              className="w-full p-4 bg-transparent text-text-primary dark:text-white placeholder-gray-400 focus:outline-none font-sans text-sm resize-y"
            />

            <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-text-secondary dark:text-gray-400 font-sans">
                <span className="font-semibold text-text-primary dark:text-gray-200">
                  {testText.length} characters
                </span>
                {isAnalyzing && (
                  <span className="flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                    <Activity className="w-3.5 h-3.5 animate-spin" /> Calculating...
                  </span>
                )}
              </div>

              {testText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setTestText("")}
                  leftIcon={<RotateCcw size={12} />}
                  className="text-xs text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-white"
                >
                  Clear Text
                </Button>
              )}
            </div>
          </div>

          {/* Results Overview: Clean Unified Summary Card & 4 Metric Cards */}
          {analysisResult && (
            <div className="space-y-4">
              {/* Clean Uniform Summary Card (Standard UI Surface, NO green box, NO white border) */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white">
                      {analysisResult.encoding === "GSM7_NLI" && analysisResult.segments === 1
                        ? "Single SMS Segment (50% Cost Savings)"
                        : analysisResult.encoding === "UCS2"
                        ? `Standard Unicode (UCS-2) • ${analysisResult.segments} ${analysisResult.segments === 1 ? "Segment" : "Segments"}`
                        : `Standard GSM-7 Encoding • ${analysisResult.segments} ${analysisResult.segments === 1 ? "Segment" : "Segments"}`}
                    </h4>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                      {analysisResult.encoding === "GSM7_NLI" && analysisResult.segments === 1
                        ? `Accented ${analysisResult.language || "national language"} characters fit into a single ${analysisResult.septet_count || 155}-septet SMS using National Language Support instead of splitting into 2 UCS-2 messages.`
                        : analysisResult.encoding === "UCS2"
                        ? "This text contains characters, accents, or emojis outside the GSM-7 alphabet, limiting each segment to 70 characters (or 67 for concatenated messages)."
                        : "Standard alphabet message. Full 160 characters fit in a single SMS credit."}
                    </p>
                  </div>
                  <StatusBadge
                    status={analysisResult.encoding === "GSM7_NLI" ? "ACTIVE" : analysisResult.encoding === "GSM7" ? "SUBMITTED" : "PENDING"}
                    customText={analysisResult.encoding === "GSM7_NLI" ? `${analysisResult.language} NLI` : analysisResult.encoding}
                  />
                </div>
              </div>

              {/* 4 Clean Metric Cards (Uniform typography & consistent text color) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-text-secondary dark:text-gray-400 block font-medium">Encoding</span>
                  <span className="text-base sm:text-lg font-bold text-text-primary dark:text-white block mt-1">
                    {analysisResult.encoding === "GSM7_NLI" ? `${analysisResult.language} NLI` : analysisResult.encoding}
                  </span>
                  <span className="text-[11px] text-text-secondary dark:text-gray-500 block mt-0.5">
                    {analysisResult.shift_mode ? `Mode: ${analysisResult.shift_mode}` : "Standard"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-text-secondary dark:text-gray-400 block font-medium">Characters</span>
                  <span className="text-base sm:text-lg font-bold text-text-primary dark:text-white block mt-1">
                    {analysisResult.character_count} chars
                  </span>
                  <span className="text-[11px] text-text-secondary dark:text-gray-500 block mt-0.5">
                    {analysisResult.septet_count > 0 ? `${analysisResult.septet_count} septets` : "Unicode units"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-text-secondary dark:text-gray-400 block font-medium">Segments Billed</span>
                  <span className="text-base sm:text-lg font-bold text-text-primary dark:text-white block mt-1">
                    {analysisResult.segments} {analysisResult.segments === 1 ? "Segment" : "Segments"}
                  </span>
                  <span className="text-[11px] text-text-secondary dark:text-gray-500 block mt-0.5">
                    {analysisResult.segments === 1 ? "1 SMS Credit" : `${analysisResult.segments} SMS Credits`}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-text-secondary dark:text-gray-400 block font-medium">Cost Savings</span>
                  <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-bold text-text-primary dark:text-white mt-1">
                    {analysisResult.encoding === "GSM7_NLI" && analysisResult.segments === 1 ? (
                      <>
                        <TrendingDown className="w-4 h-4 text-accent shrink-0" />
                        <span>50% Cheaper</span>
                      </>
                    ) : (
                      <span>Standard Rate</span>
                    )}
                  </span>
                  <span className="text-[11px] text-text-secondary dark:text-gray-500 block mt-0.5">
                    vs UCS-2 multi-part
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmsEncodingSettingsTab;
