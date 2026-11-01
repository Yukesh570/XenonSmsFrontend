import React, { useState, useEffect } from "react";
import {
  Globe,
  Save,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingDown,
  FileText,
  Activity,
  Search,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";
import ToggleSwitch from "../../../../components/ui/ToggleSwitch";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
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

const SAMPLE_PRESETS = [
  {
    label: "Spanish Production (107 Chars)",
    text: "Recibiste un cupo pre-aprobado de $3.000.000. bogs-cupo.co/preaprobado ¡Solicítalo hoy y no lo dejes pasar!",
  },
  {
    label: "¡Solicítalo hoy!",
    text: "¡Solicítalo hoy y aprovecha la oferta especial!",
  },
  {
    label: "Standard GSM-7",
    text: "Hello, your verification code is 482910. Valid for 5 minutes.",
  },
  {
    label: "Portuguese Test",
    text: "Atenção à promoção de verão! Você ganhou um desconto imperdível.",
  },
  {
    label: "Emoji Fallback (UCS-2)",
    text: "Limited time discount! 🚀 Use code SUPER50 now! 🎉",
  },
];

const LANGUAGE_META: Record<string, {
  characters: string;
}> = {
  tr: {
    characters: "ş, ğ, ı, ç, ö, ü, Ş, Ğ, İ, Ç, Ö, Ü",
  },
  es: {
    characters: "á, é, í, ó, ú, ¿, ¡",
  },
  pt: {
    characters: "ã, õ, ç, á, é, í, ó, ú, à, ê, ô",
  },
  bn: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  gu: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  hi: {
    characters: "Hinglish: 160 chars GSM-7 • Native: Unicode",
  },
  kn: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  ml: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  or: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  pa: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  ta: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  te: {
    characters: "Roman: 160 chars GSM-7 • Native: Unicode",
  },
  ur: {
    characters: "Roman Urdu: 160 chars GSM-7 • Native: Unicode",
  },
};

interface Props {
  canUpdate?: boolean;
}

const SmsEncodingSettingsTab: React.FC<Props> = ({ canUpdate = true }) => {
  // Navigation between the two focused views
  const [activeSubTab, setActiveSubTab] = useState<"simulator" | "configuration">("simulator");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<SmsEncodingConfig | null>(null);
  const [languages, setLanguages] = useState<SmsNliLanguage[]>([]);
  const [languageSearch, setLanguageSearch] = useState("");

  // Interactive Live Analyzer State
  const [testText, setTestText] = useState(SAMPLE_PRESETS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EncodingAnalysisPreview | null>(null);

  useEffect(() => {
    fetchInitialData();
    runLiveAnalysis(SAMPLE_PRESETS[0].text);
  }, []);

  // Real-time calculation as user types (no button click needed!)
  useEffect(() => {
    const timer = setTimeout(() => {
      runLiveAnalysis(testText);
    }, 200);
    return () => clearTimeout(timer);
  }, [testText]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [cfgData, langData] = await Promise.all([
        getSmsEncodingConfigApi(),
        getSmsNliLanguagesApi(),
      ]);
      setConfig(cfgData);
      setLanguages(langData);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load SMS encoding configuration");
    } finally {
      setIsLoading(false);
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
      setConfig(updated);
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
      toast.error("Permission denied.");
      return;
    }
    const newStatus = !lang.enabled;
    try {
      const updated = await updateSmsNliLanguageApi(lang.id, { enabled: newStatus });
      setLanguages((prev) =>
        prev.map((item) => (item.id === lang.id ? { ...item, enabled: updated.enabled } : item))
      );
      toast.success(`${lang.language_name} table ${newStatus ? "enabled" : "disabled"}`);
      runLiveAnalysis(testText);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to update ${lang.language_name}`);
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
      setAnalysisResult(res);
    } catch {
      // silently handle preview errors
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (text: string) => {
    setTestText(text);
    runLiveAnalysis(text);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading SMS Encoding..." className="p-10" />;
  }

  const isEnforced = config?.rollout_mode === "ENFORCE" && config?.nli_enabled;
  const filteredLanguages = languages.filter((l) =>
    l.language_name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    l.language_code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        {/* Sub-Tabs Pills */}
        <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl inline-flex self-start border border-gray-200 dark:border-gray-700/80">
          <button
            type="button"
            onClick={() => setActiveSubTab("simulator")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeSubTab === "simulator"
                ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            SMS Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("configuration")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeSubTab === "configuration"
                ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            Configuration & Tables
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
              {languages.filter((l) => l.enabled).length} Active
            </span>
          </button>
        </div>

        {/* Global Status Pill */}
        <div className="flex items-center gap-2">
          {isEnforced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NLI Active (ENFORCE)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <AlertCircle className="w-3.5 h-3.5 text-gray-400" /> {config?.rollout_mode || "OFF"} Mode
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: CLEAN & FOCUSED SMS SIMULATOR (REAL-TIME AS YOU TYPE)             */}
      {/* ========================================================================= */}
      {activeSubTab === "simulator" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mr-1 font-medium">
              <FileText className="w-3.5 h-3.5" /> Sample Presets:
            </span>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset.text)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${testText === preset.text
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300 font-semibold"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Composer Box (Clean, Real-time calculation) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Type or paste your SMS message here to test real-time segments..."
              className="w-full p-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none font-sans text-sm resize-y"
            />

            <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{testText.length} characters</span>
                {isAnalyzing && (
                  <span className="flex items-center gap-1 text-[11px] text-indigo-500 font-sans animate-pulse">
                    <Activity className="w-3 h-3 animate-spin" /> Calculating...
                  </span>
                )}
              </div>

              {testText && (
                <button
                  type="button"
                  onClick={() => setTestText("")}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-medium"
                >
                  Clear Text
                </button>
              )}
            </div>
          </div>

          {/* Results Overview: Clear, Friendly & Focused */}
          {analysisResult && (
            <div className="space-y-4">
              {/* Friendly Result Summary Banner */}
              {analysisResult.encoding === "GSM7_NLI" && analysisResult.segments === 1 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Great News! Fits in 1 Single SMS Segment (50% Cost Savings)
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Accented Spanish characters (like <code>á, é, í, ó, ú, ¿</code>) fit into a single 155-septet SMS using National Language Support instead of splitting into 2 expensive UCS-2 messages.
                    </p>
                  </div>
                </div>
              ) : analysisResult.encoding === "UCS2" ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Standard Unicode (UCS-2) • {analysisResult.segments} {analysisResult.segments === 1 ? "Segment" : "Segments"}
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      This text contains characters, accents, or emojis outside the GSM-7 alphabet. Standard Unicode limits each SMS segment to 70 characters (or 67 characters for multi-part messages).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      Standard GSM-7 Encoding • {analysisResult.segments} {analysisResult.segments === 1 ? "Segment" : "Segments"}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Standard alphabet message. Full 160 characters fit in a single SMS credit.
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Clean Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Encoding</span>
                  <span className={`text-base font-bold block mt-1 ${analysisResult.encoding === "GSM7_NLI"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : analysisResult.encoding === "GSM7"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                    {analysisResult.encoding === "GSM7_NLI" ? `${analysisResult.language} NLI` : analysisResult.encoding}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {analysisResult.shift_mode ? `Mode: ${analysisResult.shift_mode}` : "Standard"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Characters</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white block mt-1">
                    {analysisResult.character_count} chars
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {analysisResult.septet_count > 0 ? `${analysisResult.septet_count} septets` : "Unicode units"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Segments Billed</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 block mt-1">
                    {analysisResult.segments} {analysisResult.segments === 1 ? "Segment" : "Segments"}
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {analysisResult.segments === 1 ? "1 SMS Credit" : `${analysisResult.segments} SMS Credits`}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Cost Savings</span>
                  {analysisResult.encoding === "GSM7_NLI" && analysisResult.segments === 1 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      <TrendingDown className="w-4 h-4" /> 50% Cheaper
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mt-1">
                      Standard Rate
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    vs UCS-2 multi-part
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CLEAN CONFIGURATION & 3GPP LANGUAGE TABLES                       */}
      {/* ========================================================================= */}
      {activeSubTab === "configuration" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Global Master Settings Card */}
          {config && (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Global Gateway Settings
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Configure master switch, rollout mode, and unicode normalization.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveConfig}
                  leftIcon={<Save size={15} />}
                  disabled={isSaving || !canUpdate}
                  className="px-5 py-2 text-xs font-semibold"
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Master Killswitch */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                      GSM7 National Language Support (NLI)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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

          {/* Compact 3GPP National Language Shift Tables */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  3GPP National Language Tables
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Enable or disable language tables. The engine deterministically picks the highest-priority enabled table.
                </p>
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={languageSearch}
                  onChange={(e) => setLanguageSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Clean, Compact Language Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Language</th>
                    <th className="py-2.5 px-3">Supported Accents & Characters</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                  {filteredLanguages.map((lang) => {
                    const code = lang.language_code.toLowerCase();
                    const meta = LANGUAGE_META[code] || {
                      characters: "Standard regional characters",
                    };

                    return (
                      <tr
                        key={lang.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${lang.enabled ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""}`}
                      >
                        <td className="py-3 px-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                {lang.language_name}
                              </span>
                              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800">
                                Global NLI
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {lang.language_code.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/40 inline-block max-w-[360px] truncate">
                            {meta.characters}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <ToggleSwitch
                            checked={lang.enabled}
                            onChange={() => handleToggleLanguage(lang)}
                            disabled={!canUpdate}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Native Script Auto-Routing Note */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-800 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Native Script Auto-Routing:</span>{" "}
                Non-Latin scripts (Hindi/Devanagari, Urdu/Arabic, Bengali, Tamil, etc.) automatically route to standard UCS-2 Unicode for crisp native rendering across all smartphones. Romanized scripts (e.g. Hinglish, Roman Urdu) are natively handled in standard 160-character GSM-7.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsEncodingSettingsTab;
