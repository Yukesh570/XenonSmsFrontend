import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  FileText,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Info,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import Modal from "../../../components/ui/Modal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../helper/dateFormatter";
import {
  getMessageFilterRulesApi,
  createMessageFilterRuleApi,
  updateMessageFilterRuleApi,
  deleteMessageFilterRuleApi,
  validateMessageFilterRuleApi,
  getMessageTextReplacementListsApi,
  type MessageFilterRule,
  type TextAction,
  type MessageTextReplacementList,
} from "../../../api/authorizationApi/messageFilterApi";

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (rule: MessageFilterRule) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

export type ExtendedTextAction = TextAction | "MASK_SENSITIVE";

export type MaskDataType = "OTP_6" | "OTP_4" | "CARD_16" | "ANY_NUMBERS";
export type MaskFormat =
  | "KEEP_FIRST_2"
  | "KEEP_LAST_2"
  | "KEEP_LAST_4"
  | "ALL_ASTERISKS"
  | "REDACTED";

export interface MaskConfig {
  dataType: MaskDataType;
  format: MaskFormat;
  contextKeyword: string;
}

export function generateMaskRule(config: MaskConfig): {
  textPattern: string;
  replacement: string;
} {
  const ctx = config.contextKeyword.trim();
  const escapedCtx = ctx.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixGroup = ctx ? `(${escapedCtx}\\s*(?:is|:)?\\s*)` : "";
  const prefixRef = ctx ? "$1" : "";
  const baseGroupNum = ctx ? 2 : 1;

  if (config.dataType === "OTP_6") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{4}`,
        replacement: `${prefixRef}$${baseGroupNum}****`,
      };
    }
    if (config.format === "KEEP_LAST_2") {
      return {
        textPattern: `${prefixGroup}\\d{4}(\\d{2})`,
        replacement: `${prefixRef}****$${baseGroupNum}`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{6}`,
        replacement: `${prefixRef}******`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{6}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "OTP_4") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{2}`,
        replacement: `${prefixRef}$${baseGroupNum}**`,
      };
    }
    if (config.format === "KEEP_LAST_2") {
      return {
        textPattern: `${prefixGroup}\\d{2}(\\d{2})`,
        replacement: `${prefixRef}**$${baseGroupNum}`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{4}`,
        replacement: `${prefixRef}****`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{4}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "CARD_16") {
    if (config.format === "KEEP_LAST_4") {
      return {
        textPattern: `${prefixGroup}\\d{12}(\\d{4})`,
        replacement: `${prefixRef}************$${baseGroupNum}`,
      };
    }
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{14}`,
        replacement: `${prefixRef}$${baseGroupNum}**************`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{16}`,
        replacement: `${prefixRef}****************`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{16}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "ANY_NUMBERS") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{2,}`,
        replacement: `${prefixRef}$${baseGroupNum}****`,
      };
    }
    if (config.format === "KEEP_LAST_4") {
      return {
        textPattern: `${prefixGroup}\\d{2,}(\\d{4})`,
        replacement: `${prefixRef}****$${baseGroupNum}`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{4,}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
    return {
      textPattern: `${prefixGroup}\\d{4,}`,
      replacement: `${prefixRef}****`,
    };
  }

  return {
    textPattern: `${prefixGroup}(\\d{2})\\d{4}`,
    replacement: `${prefixRef}$${baseGroupNum}****`,
  };
}

export function decodeMaskRule(rule: MessageFilterRule): {
  isMask: boolean;
  dataType?: MaskDataType;
  format?: MaskFormat;
  contextKeyword?: string;
  summary?: string;
} {
  if (rule.action !== "REGEX_REPLACE" || !rule.textPattern || !rule.replacement) {
    return { isMask: false };
  }

  const extractContext = (pattern: string) => {
    const match = pattern.match(/^\(([^)]+?)\\s\*(?:\(\?:is\|:\)\?)\\s\*\)/);
    return match ? match[1].replace(/\\/g, "") : "";
  };

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{4}") &&
    (rule.replacement.endsWith("$1****") || rule.replacement.endsWith("$2****"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `6-Digit OTP (49****)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("\\d{4}(\\d{2})") &&
    (rule.replacement.endsWith("****$1") || rule.replacement.endsWith("****$2"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "KEEP_LAST_2",
      contextKeyword: context,
      summary: `6-Digit OTP (****12)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (rule.textPattern.endsWith("\\d{6}") && rule.replacement.endsWith("******")) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "ALL_ASTERISKS",
      contextKeyword: context,
      summary: `6-Digit OTP (******)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (rule.textPattern.endsWith("\\d{6}") && rule.replacement.endsWith("[REDACTED]")) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "REDACTED",
      contextKeyword: context,
      summary: `6-Digit OTP ([REDACTED])${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{2}") &&
    (rule.replacement.endsWith("$1**") || rule.replacement.endsWith("$2**"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_4",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `4-Digit PIN (12**)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("\\d{12}(\\d{4})") &&
    (rule.replacement.endsWith("$1") || rule.replacement.endsWith("$2"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "CARD_16",
      format: "KEEP_LAST_4",
      contextKeyword: context,
      summary: `Card (****1234)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{2,}") &&
    (rule.replacement.endsWith("$1****") || rule.replacement.endsWith("$2****"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "ANY_NUMBERS",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `Numbers (49****)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  return { isMask: false };
}

const getMaskPreview = (
  dataType: MaskDataType,
  format: MaskFormat,
  contextKeyword: string
) => {
  const ctx = contextKeyword.trim() ? `${contextKeyword.trim()} ` : "";
  let sampleVal = "492812";
  let maskedVal = "49****";

  if (dataType === "OTP_6") {
    sampleVal = "492812";
    if (format === "KEEP_FIRST_2") maskedVal = "49****";
    else if (format === "KEEP_LAST_2") maskedVal = "****12";
    else if (format === "ALL_ASTERISKS") maskedVal = "******";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "OTP_4") {
    sampleVal = "4812";
    if (format === "KEEP_FIRST_2") maskedVal = "48**";
    else if (format === "KEEP_LAST_2") maskedVal = "**12";
    else if (format === "ALL_ASTERISKS") maskedVal = "****";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "CARD_16") {
    sampleVal = "4532890123456789";
    if (format === "KEEP_LAST_4") maskedVal = "************6789";
    else if (format === "KEEP_FIRST_2") maskedVal = "45**************";
    else if (format === "ALL_ASTERISKS") maskedVal = "****************";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "ANY_NUMBERS") {
    sampleVal = "893041";
    if (format === "KEEP_FIRST_2") maskedVal = "89****";
    else if (format === "KEEP_LAST_4") maskedVal = "**3041";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
    else maskedVal = "******";
  }

  const incoming = `Your verification is ${ctx}${sampleVal} `;
  const transformed = `Your verification is${ctx}${maskedVal}`;

  return { incoming, transformed };
};

interface MessageTextRulesTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

const DEFAULT_SEARCH_COLUMNS = ["name", "country", "isActive"];
const DEFAULT_TABLE_COLUMNS = [
  "id",
  "priority",
  "name",
  "country",
  "textMatchType",
  "action",
  "isActive",
];

export const MessageTextRulesTab: React.FC<MessageTextRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [rules, setRules] = useState<MessageFilterRule[]>([]);
  const [replacementLists, setReplacementLists] = useState<MessageTextReplacementList[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Dynamic Column Persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("message_text_rules_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (k: string) => k !== "replacement" && k !== "stopProcessing"
          );
          if (!cleaned.includes("id")) return ["id", ...cleaned];
          return cleaned;
        }
      }
    } catch (e) {
      console.error("Error reading saved table columns", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("message_text_rules_search_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((k) => k !== "client");
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      console.error("Error reading saved search columns", e);
    }
    return DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("message_text_rules_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("message_text_rules_search_columns_v2", JSON.stringify(searchColumns));
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (selectedClientId) {
      initial.client = String(selectedClientId);
    }
    return initial;
  });

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (selectedClientId) {
      initial.client = String(selectedClientId);
    }
    return initial;
  });

  // Sync external client change
  useEffect(() => {
    setFilterValues((prev) => {
      if (selectedClientId) {
        return { ...prev, client: String(selectedClientId) };
      } else {
        const next = { ...prev };
        delete next.client;
        return next;
      }
    });
    setAppliedFilters((prev) => {
      if (selectedClientId) {
        return { ...prev, client: String(selectedClientId) };
      } else {
        const next = { ...prev };
        delete next.client;
        return next;
      }
    });
  }, [selectedClientId]);

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowRule, setSelectedRowRule] = useState<MessageFilterRule | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingRule, setDeletingRule] = useState<MessageFilterRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    priority: number;
    country: number | null;
    textMatchType: "EXACT" | "CONTAINS" | "REGEX";
    textPattern: string;
    action: ExtendedTextAction;
    replacement: string;
    replacementList: number | null;
    stopProcessing: boolean;
    isActive: boolean;
    maskDataType: MaskDataType;
    maskFormat: MaskFormat;
    maskContextKeyword: string;
  }>({
    name: "",
    priority: 100,
    country: null,
    textMatchType: "CONTAINS",
    textPattern: "",
    action: "STRING_REPLACE",
    replacement: "",
    replacementList: null,
    stopProcessing: false,
    isActive: true,
    maskDataType: "OTP_6",
    maskFormat: "KEEP_FIRST_2",
    maskContextKeyword: "code is",
  });

  // Real-time Regex & Macro Validation
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load Rules & Replacement Lists
  const loadData = async (customFilters?: Record<string, string>) => {
    if (!selectedClientId) {
      setRules([]);
      setReplacementLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeFilters = customFilters !== undefined ? customFilters : appliedFilters;

      const params: Record<string, any> = {
        targetEntity: "MESSAGE_TEXT",
        client: selectedClientId,
      };

      for (const [key, rawVal] of Object.entries(activeFilters)) {
        const val = rawVal?.trim();
        if (!val || key === "client") continue;

        const colDef = allColumns.find((c) => c.key === key);
        const filterKey = colDef?.filterKey || key;
        params[filterKey] = val;
      }

      if (sortConfig) {
        const colDef = allColumns.find((c) => c.key === sortConfig.key);
        const sortKey = colDef?.filterKey ? colDef.filterKey.replace(/__(icontains|exact|gte|lte)$/, "") : sortConfig.key;
        params.ordering = sortConfig.direction === "desc" ? `-${sortKey}` : sortKey;
      }

      const [rulesRes, listsRes]: [any, any] = await Promise.all([
        getMessageFilterRulesApi(params),
        getMessageTextReplacementListsApi(selectedClientId),
      ]);

      const ruleList = Array.isArray(rulesRes)
        ? rulesRes
        : (rulesRes as any)?.results || [];
      setRules(
        ruleList.sort(
          (a: MessageFilterRule, b: MessageFilterRule) => a.priority - b.priority
        )
      );

      const listArray = Array.isArray(listsRes)
        ? listsRes
        : (listsRes as any)?.results || [];
      setReplacementLists(listArray);
    } catch (err: any) {
      console.error("Failed to load text rules or lists", err);
      toast.error(err.response?.data?.detail || "Failed to load message text rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      loadData();
    } else {
      setRules([]);
      setReplacementLists([]);
      setLoading(false);
    }
  }, [selectedClientId]);

  // Debounced Regex Validation - strictly for REGEX mode
  useEffect(() => {
    // Only run regex validation if textMatchType is REGEX and pattern exists
    if (formData.textMatchType !== "REGEX" || formData.action === "MASK_SENSITIVE" || !formData.textPattern.trim()) {
      setValidationResult(null);
      setIsValidating(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "MESSAGE_TEXT",
          textMatchType: "REGEX",
          textPattern: formData.textPattern.trim(),
          action: formData.action as TextAction,
          replacement: formData.replacement,
        });

        setValidationResult({
          isValid: res.valid,
          error: res.error || undefined,
        });
      } catch (e: any) {
        setValidationResult({
          isValid: false,
          error: e.response?.data?.error || "Regex pattern validation failed",
        });
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    formData.textPattern,
    formData.textMatchType,
    formData.action,
    formData.replacement,
  ]);

  const clientOptions: Option[] = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: c.name
          ? c.companyName
            ? `${c.name} (${c.companyName})`
            : c.name
          : c.companyName || `Client #${c.id}`,
      })),
    [clients]
  );

  const countryOptions: Option[] = useMemo(
    () =>
      countries.map((c) => ({
        value: String(c.id),
        label: c.name,
        icon: <CountryFlag iso2={c.iso2} width={16} height={12} />,
      })),
    [countries]
  );

  const matchTypeOptions: Option[] = [
    { label: "Contains (Sub-string)", value: "CONTAINS" },
    { label: "Exact Match", value: "EXACT" },
    { label: "Regex Pattern", value: "REGEX" },
  ];

  const actionOptions: Option[] = [
    { label: "String Replace (First Match)", value: "STRING_REPLACE" },
    { label: "Replace All Matches", value: "REPLACE_ALL" },
    { label: "Mask Sensitive Data (OTP, PIN, Cards)", value: "MASK_SENSITIVE" },
    { label: "Append to End", value: "APPEND" },
    { label: "Prepend to Beginning", value: "PREPEND" },
    { label: "Replacement List (Sequential)", value: "LIST_SEQUENTIAL" },
    { label: "Replacement List (Random)", value: "LIST_RANDOM" },
    { label: "Advanced: Regex Replace ($1, $2)", value: "REGEX_REPLACE" },
  ];

  const conflictingRule = useMemo(() => {
    if (!formData.priority) return null;
    return rules.find(
      (r) =>
        r.priority === Number(formData.priority) &&
        r.id !== editingRuleId
    );
  }, [rules, formData.priority, editingRuleId]);

  const booleanOptions: Option[] = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
  ];

  // All Column Definitions
  const allColumns: ColumnConfig[] = [
    {
      key: "id",
      label: "ID",
      tableLabel: "ID",
      type: "number",
      filterKey: "id",
      render: (rule) => (
        <span className="text-sm font-mono font-semibold text-primary">
          #{rule.id}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      tableLabel: "Priority",
      type: "number",
      filterKey: "priority",
      render: (rule) => (
        <span className="text-sm text-text-secondary dark:text-gray-300 font-mono">
          {rule.priority}
        </span>
      ),
    },
    {
      key: "name",
      label: "Rule Name",
      tableLabel: "Rule Name",
      type: "text",
      filterKey: "name__icontains",
      render: (rule) => (
        <span className="text-sm font-medium text-text-primary dark:text-white">
          {rule.name}
        </span>
      ),
    },
    {
      key: "client",
      label: "Client",
      tableLabel: "Client",
      type: "text",
      filterKey: "client",
      isSearchable: false,
      options: clientOptions,
      render: (rule) => {
        const clientName =
          rule.client__name ||
          rule.client_name ||
          clients.find((c) => c.id === rule.client || c.value === String(rule.client))?.label ||
          clients.find((c) => c.id === rule.client || c.value === String(rule.client))?.name ||
          (rule.client ? `Client #${rule.client}` : "Direct Client");

        return (
          <span className="text-sm text-text-secondary dark:text-gray-300">
            {clientName}
          </span>
        );
      },
    },
    {
      key: "country",
      label: "Country Scope",
      tableLabel: "Country",
      type: "text",
      filterKey: "country",
      options: countryOptions,
      render: (rule) => {
        const countryName =
          rule.country__name ||
          rule.country_name ||
          countries.find((c) => c.id === rule.country || c.value === String(rule.country))?.name ||
          (rule.country ? `Country #${rule.country}` : "Global");

        const countryObj = countries.find(
          (c) =>
            c.id === rule.country ||
            c.value === String(rule.country) ||
            c.name?.toLowerCase() === countryName?.toLowerCase()
        );
        const iso2 = countryObj?.iso2 || rule.country_code;

        return countryName && countryName !== "Global" ? (
          <div className="flex items-center gap-2">
            {iso2 && <CountryFlag iso2={iso2} width={18} height={12} />}
            <span className="text-sm text-text-secondary dark:text-gray-300">
              {countryName}
            </span>
          </div>
        ) : (
          <span className="text-sm text-text-secondary dark:text-gray-400">
            Global
          </span>
        );
      },
    },
    {
      key: "textMatchType",
      label: "Match Criteria",
      tableLabel: "Match Type",
      type: "text",
      filterKey: "textMatchType",
      options: matchTypeOptions,
      render: (rule) => {
        const decodedMask = decodeMaskRule(rule);
        if (decodedMask.isMask) {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusBadge status="WARNING" customText="MASK_RULE" />
              <span className="text-sm font-mono text-text-secondary dark:text-gray-300">
                {decodedMask.summary || "Sensitive Data"}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusBadge status="SUBMITTED" customText={rule.textMatchType || "CONTAINS"} />
            {rule.textPattern && (
              <span
                className="text-sm text-text-secondary dark:text-gray-300 max-w-[140px] truncate"
                title={rule.textPattern}
              >
                {rule.textPattern}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "action",
      label: "Action & Target",
      tableLabel: "Action",
      type: "text",
      filterKey: "action",
      options: actionOptions,
      render: (rule) => {
        const decodedMask = decodeMaskRule(rule);
        if (decodedMask.isMask) {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusBadge status="ACTIVE" customText="MASK" />
              <span className="text-sm font-mono text-text-secondary dark:text-gray-300">
                {decodedMask.format === "KEEP_FIRST_2"
                  ? "Keep First 2 (**)"
                  : decodedMask.format === "KEEP_LAST_2"
                    ? "Keep Last 2 (**)"
                    : decodedMask.format === "KEEP_LAST_4"
                      ? "Keep Last 4 (****)"
                      : decodedMask.format === "REDACTED"
                        ? "[REDACTED]"
                        : "Asterisks (******)"}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusBadge status="SENT_TO_VENDOR" customText={rule.action} />
            {rule.replacement && (
              <span
                className="text-sm text-text-secondary dark:text-gray-300 max-w-[150px] truncate"
                title={rule.replacement}
              >
                &quot;{rule.replacement}&quot;
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      tableLabel: "Status",
      type: "boolean",
      filterKey: "isActive",
      options: booleanOptions,
      render: (rule) => (
        <StatusBadge
          status={rule.isActive ? "ACTIVE" : "INACTIVE"}
          customText={rule.isActive ? "Active" : "Inactive"}
        />
      ),
    },
    // Optional Backend Search Fields (Available in Search Fields modal)
    {
      key: "textPattern",
      label: "Text Pattern / Keyword",
      filterKey: "textPattern__icontains",
      type: "text",
      isSearchOnly: true,
    },
    {
      key: "findText",
      label: "Find Text",
      filterKey: "findText__icontains",
      type: "text",
      isSearchOnly: true,
    },
    {
      key: "allowMacros",
      label: "Allow Random Macros",
      filterKey: "allowMacros",
      options: [
        { label: "Macros Allowed", value: "true" },
        { label: "No Macros", value: "false" },
      ],
      isSearchOnly: true,
    },
    {
      key: "country__isnull",
      label: "Global Rules Only",
      filterKey: "country__isnull",
      options: [
        { label: "Global Rules (No Country)", value: "true" },
        { label: "Country Specific", value: "false" },
      ],
      isSearchOnly: true,
    },
    {
      key: "status",
      label: "Lifecycle Status",
      filterKey: "status",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Draft", value: "DRAFT" },
        { label: "Inactive", value: "INACTIVE" },
      ],
      isSearchOnly: true,
    },
    {
      key: "createdAt",
      label: "Created At",
      tableLabel: "Created At",
      type: "date",
      isSearchable: false,
      render: (rule) => (rule.createdAt ? formatDateTime(rule.createdAt) : "-"),
    },
    {
      key: "updatedAt",
      label: "Updated At",
      tableLabel: "Updated At",
      type: "date",
      isSearchable: false,
      render: (rule) =>
        rule.updatedAt ? formatDateTime(rule.updatedAt) : "-",
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key)
  );

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type,
    }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filterValues });
    loadData(filterValues);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
    if (selectedClientId) {
      loadData({});
    }
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
    if (colIndex >= 0 && colIndex < visibleTableFields.length) {
      const col = visibleTableFields[colIndex];
      setCurrentPage(1);
      setSortConfig((prev) => {
        if (prev?.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  // Filter & Sort Rules
  const filteredAndSortedRules = useMemo(() => {
    let result = rules.filter((r) => {
      for (const colKey of Object.keys(appliedFilters)) {
        const val = appliedFilters[colKey]?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "client") {
          const ruleClient = String(r.client || "");
          const clientName = (r.client__name || r.client_name || "").toLowerCase();
          if (ruleClient !== val && !clientName.includes(val)) {
            return false;
          }
        } else if (colKey === "country") {
          const ruleCountry = String(r.country || "");
          const countryName = (r.country__name || r.country_name || "").toLowerCase();
          if (ruleCountry !== val && !countryName.includes(val)) return false;
        } else if (colKey === "country__isnull") {
          if (val === "true" && r.country !== null && r.country !== undefined) return false;
          if (val === "false" && (r.country === null || r.country === undefined)) return false;
        } else if (colKey === "isActive") {
          const expected = val === "true";
          if (r.isActive !== expected) return false;
        } else if (colKey === "status" || colKey === "ruleStatus") {
          if (r.status?.toLowerCase() !== val) return false;
        } else if (colKey === "textMatchType") {
          if (r.textMatchType !== val.toUpperCase()) return false;
        } else if (colKey === "textPattern") {
          if (!r.textPattern?.toLowerCase().includes(val)) return false;
        } else if (colKey === "findText") {
          if (!r.findText?.toLowerCase().includes(val)) return false;
        } else if (colKey === "allowMacros") {
          const expected = val === "true";
          if (Boolean(r.allowMacros) !== expected) return false;
        } else if (colKey === "action") {
          if (r.action !== val.toUpperCase()) return false;
        } else if (colKey === "priority") {
          if (String(r.priority) !== val) return false;
        } else if (colKey === "name") {
          if (!r.name.toLowerCase().includes(val)) return false;
        } else {
          const itemVal = String((r as any)[colKey] || "").toLowerCase();
          if (!itemVal.includes(val)) return false;
        }
      }
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return result;
  }, [rules, appliedFilters, sortConfig]);

  const handleOpenAdd = () => {
    setEditingRuleId(null);
    setFormData({
      name: "",
      priority:
        rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 10 : 100,
      country: null,
      textMatchType: "CONTAINS",
      textPattern: "",
      action: "STRING_REPLACE",
      replacement: "",
      replacementList: null,
      stopProcessing: false,
      isActive: true,
      maskDataType: "OTP_6",
      maskFormat: "KEEP_FIRST_2",
      maskContextKeyword: "code is",
    });
    setValidationResult(null);
    setShowHint(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: MessageFilterRule) => {
    setEditingRuleId(rule.id || null);
    const decodedMask = decodeMaskRule(rule);

    if (decodedMask.isMask) {
      setFormData({
        name: rule.name,
        priority: rule.priority,
        country: rule.country,
        textMatchType: "REGEX",
        textPattern: rule.textPattern || "",
        action: "MASK_SENSITIVE",
        replacement: rule.replacement || "",
        replacementList: null,
        stopProcessing: rule.stopProcessing,
        isActive: rule.isActive,
        maskDataType: decodedMask.dataType || "OTP_6",
        maskFormat: decodedMask.format || "KEEP_FIRST_2",
        maskContextKeyword: decodedMask.contextKeyword || "",
      });
    } else {
      setFormData({
        name: rule.name,
        priority: rule.priority,
        country: rule.country,
        textMatchType:
          (rule.textMatchType as "EXACT" | "CONTAINS" | "REGEX") || "CONTAINS",
        textPattern: rule.textPattern || "",
        action: (rule.action as ExtendedTextAction) || "STRING_REPLACE",
        replacement: rule.replacement || "",
        replacementList: rule.replacementList || null,
        stopProcessing: rule.stopProcessing,
        isActive: rule.isActive,
        maskDataType: "OTP_6",
        maskFormat: "KEEP_FIRST_2",
        maskContextKeyword: "code is",
      });
    }
    setValidationResult(null);
    setShowHint(false);
    setShowModal(true);
  };

  // Static reference preview for message text transformation actions
  const getTransformationPreview = () => {
    const action = formData.action || "STRING_REPLACE";

    if (action === "STRING_REPLACE") {
      return {
        input: "Your verification code is 491234",
        output: "Your secure OTP is 491234",
        note: "String Replace (First Match)",
        explanation:
          'Replaces the first occurrence of the search text with the replacement text, leaving the remainder intact.',
      };
    }

    if (action === "REPLACE_ALL") {
      return {
        input: "Call support or email support team",
        output: "Call helpdesk or email helpdesk team",
        note: "Replace All Matches",
        explanation:
          'Substitutes all matching occurrences of the target word or phrase throughout the entire message body.',
      };
    }

    if (action === "MASK_SENSITIVE") {
      return {
        input: "Your OTP is 491234 for login",
        output: "Your OTP is 49**** for login",
        note: "Mask Sensitive Data",
        explanation:
          'Masks confidential numeric digits (OTPs, PINs, card numbers) according to carrier and privacy regulations.',
      };
    }

    if (action === "APPEND") {
      return {
        input: "Your parcel #9823 has arrived.",
        output: "Your parcel #9823 has arrived. Reply STOP to opt out.",
        note: "Append to End",
        explanation:
          'Appends mandatory regulatory disclaimers, brand taglines, or opt-out notices to the end of the message.',
      };
    }

    if (action === "PREPEND") {
      return {
        input: "Your appointment is at 3:00 PM.",
        output: "[ALERT] Your appointment is at 3:00 PM.",
        note: "Prepend to Beginning",
        explanation:
          'Prepends urgent alert prefixes, company tags, or brand headers to the beginning of the message text.',
      };
    }

    if (action === "LIST_SEQUENTIAL") {
      return {
        input: "Claim your coupon: PROMO",
        output: "Claim your coupon: DISC-001",
        note: "Replacement List (Sequential)",
        explanation:
          'Rotates round-robin through predefined values in the selected replacement list sequentially across messages.',
      };
    }

    if (action === "LIST_RANDOM") {
      return {
        input: "Call our representative today.",
        output: "Call 1800-555-0199 today.",
        note: "Replacement List (Random)",
        explanation:
          'Picks a random item from the selected replacement list to balance routing load across available values.',
      };
    }

    if (action === "REGEX_REPLACE") {
      return {
        input: "Order #8921 status update",
        output: "Tracking ref: 8921 status update",
        note: "Regex Group Substitution",
        explanation:
          'Matches regex pattern (Order #(\\d+)) and substitutes captured groups ($1) into the replacement template.',
      };
    }

    return null;
  };

  const handleInsertMacro = (macroText: string) => {
    setFormData((prev) => ({
      ...prev,
      replacement: prev.replacement ? `${prev.replacement} ${macroText}` : macroText,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    let finalMatchType = formData.textMatchType;
    let finalPattern = formData.textPattern.trim();
    let finalAction: TextAction = (formData.action === "MASK_SENSITIVE" ? "REGEX_REPLACE" : formData.action) as TextAction;
    let finalReplacement: string | null = formData.replacement.trim() || "";

    if (formData.action === "MASK_SENSITIVE") {
      finalMatchType = "REGEX";
      finalAction = "REGEX_REPLACE";
      const generated = generateMaskRule({
        dataType: formData.maskDataType,
        format: formData.maskFormat,
        contextKeyword: formData.maskContextKeyword,
      });
      finalPattern = generated.textPattern;
      finalReplacement = generated.replacement;
    } else if (["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)) {
      finalReplacement = null;
    }

    if (!finalPattern) {
      toast.error("Search text/pattern is required");
      return;
    }
    if (validationResult && !validationResult.isValid) {
      toast.error(`Rule validation error: ${validationResult.error}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<MessageFilterRule> = {
        client: selectedClientId || (filterValues.client ? Number(filterValues.client) : 0),
        targetEntity: "MESSAGE_TEXT",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        textMatchType: finalMatchType,
        textPattern: finalPattern,
        action: finalAction,
        replacement: finalReplacement,
        replacementList:
          ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)
            ? formData.replacementList
            : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRuleId) {
        await updateMessageFilterRuleApi(editingRuleId, payload);
        toast.success("Message text rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Message text rule created successfully");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      const detail =
        err.response?.data?.textPattern?.[0] ||
        err.response?.data?.replacement?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save message text rule";
      toast.error(String(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule?.id) return;
    setIsDeleting(true);
    try {
      await deleteMessageFilterRuleApi(deletingRule.id);
      toast.success("Message text rule deleted");
      setDeletingRule(null);
      setSelectedRowRule(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (rule: MessageFilterRule) => {
    if (!rule.id) return;
    try {
      await updateMessageFilterRuleApi(rule.id, {
        isActive: !rule.isActive,
        status: !rule.isActive ? "ACTIVE" : "INACTIVE",
      });
      toast.success(`Rule "${rule.name}" ${!rule.isActive ? "activated" : "deactivated"}`);
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? { ...r, isActive: !rule.isActive, status: !rule.isActive ? "ACTIVE" : "INACTIVE" }
            : r
        )
      );
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const handleContextMenu = (e: React.MouseEvent, rule: MessageFilterRule) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowRule(rule);
  };

  const contextMenuItems: ContextMenuItem[] = selectedRowRule
    ? [
      {
        label: "Edit Rule",
        icon: <Edit size={16} />,
        onClick: () => {
          handleOpenEdit(selectedRowRule);
          setContextMenuPos(null);
        },
      },
      {
        label: selectedRowRule.isActive ? "Deactivate Rule" : "Activate Rule",
        icon: <FileText size={16} />,
        onClick: () => {
          handleToggleStatus(selectedRowRule);
          setContextMenuPos(null);
        },
      },
      {
        label: "Delete Rule",
        icon: <Trash size={16} />,
        variant: "danger",
        onClick: () => {
          setDeletingRule(selectedRowRule);
          setContextMenuPos(null);
        },
      },
    ]
    : [];

  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  return (
    <div className="space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Sleek, Compact Selector Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => {
                setSelectedClientId(val ? Number(val) : null);
              }}
              options={clients.map((c) => ({
                value: String(c.id),
                label: c.name
                  ? c.companyName
                    ? `${c.name} (${c.companyName})`
                    : c.name
                  : c.companyName || `Client #${c.id}`,
              }))}
            />
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedClientId(null)}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Instruction Note if no client selected */}
      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to configure and manage its message content text rules and regex transformations.
          </p>
        </div>
      )}

      {selectedClientId && (
        <>
          {/* Top Filter Bar Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative z-20">
                <AdvancedFilter
                  columns={tableFilterColumns as any}
                  selectedColumns={tableColumns}
                  defaultColumns={DEFAULT_TABLE_COLUMNS}
                  onFilter={(cols: string[]) => setTableColumns(cols)}
                  onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
                  buttonLabel="Columns"
                  enableReorder={true}
                />
              </div>
              <div className="relative z-20">
                <AdvancedFilter
                  columns={searchableColumns as any}
                  selectedColumns={searchColumns}
                  defaultColumns={DEFAULT_SEARCH_COLUMNS}
                  onFilter={(newCols: string[]) => {
                    setSearchColumns(newCols);
                    setFilterValues((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        if (!newCols.includes(k)) delete next[k];
                      });
                      return next;
                    });
                  }}
                  onClear={() => setSearchColumns(DEFAULT_SEARCH_COLUMNS)}
                  isLoading={loading}
                  buttonLabel="Search Fields"
                />
              </div>
            </div>
          </div>

          {/* Dynamic FilterCard */}
          <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
            {visibleSearchFields.map((col) => {
              const baseLabel = getBaseLabel(col.label || "");
              if (col.options) {
                return (
                  <Select
                    key={col.key}
                    label={baseLabel}
                    value={filterValues[col.key] || ""}
                    onChange={(val) => handleFilterChange(col.key, val)}
                    options={col.options}
                    placeholder={`Select ${baseLabel}`}
                    allowCustomValue={true}
                  />
                );
              }
              return (
                <Input
                  key={col.key}
                  type={col.type === "number" ? "number" : "text"}
                  label={baseLabel}
                  value={filterValues[col.key] || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleFilterChange(col.key, e.target.value)
                  }
                  placeholder={`Search ${baseLabel}`}
                />
              );
            })}
          </FilterCard>

          {/* Reusable DataTable */}
          <DataTable
            density="compact"
            headers={tableHeaders}
            data={filteredAndSortedRules}
            totalItems={filteredAndSortedRules.length}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            isLoading={loading}
            onSort={handleSort}
            sortColumnIndex={
              sortConfig
                ? visibleTableFields.findIndex((c) => c.key === sortConfig.key) + 1
                : null
            }
            sortDirection={sortConfig?.direction || null}
            onReorderColumns={(fromIdx, toIdx) => {
              setTableColumns((prev) => {
                const validKeys = prev.filter((key) =>
                  allColumns.some((c) => c.key === key)
                );
                const next = [...validKeys];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(toIdx, 0, moved);
                return next;
              });
            }}
            headerActions={
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                leftIcon={<Plus size={16} />}
              >
                Add Text Rule
              </Button>
            }
            renderRow={(rule, index) => {
              const targetRuleId = new URLSearchParams(window.location.search).get("ruleId");
              const isTargetRule = targetRuleId && rule.id === Number(targetRuleId);
              return (
                <tr
                  key={rule.id || index}
                  onContextMenu={(e) => handleContextMenu(e, rule)}
                  className={`border-b border-gray-100 dark:border-gray-700 cursor-context-menu transition-colors ${isTargetRule
                      ? "bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                >
                  <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleTableFields.map((col) => {
                    if (col.render) {
                      return (
                        <td
                          key={col.key}
                          className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                        >
                          {col.render(rule)}
                        </td>
                      );
                    }
                    const cellData = (rule as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                      >
                        {cellData ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            }}
          />
        </>
      )}

      {/* Context Menu */}
      <ContextMenu
        position={contextMenuPos}
        items={contextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Add / Edit Message Text Rule Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-2xl"
        title={editingRuleId ? "Update Message Text Rule" : "Add Message Text Rule"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Brand Name Masking / Dynamic OTP Token"
              required
            />

            <div>
              <Input
                label="Priority (Evaluation Order)"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                min={1}
                max={99999}
                required
              />
              {conflictingRule && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                  <span>⚠️</span>
                  <span>
                    Priority already in use by rule &quot;{conflictingRule.name}&quot; (ID #{conflictingRule.id}). Must be unique.
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country Scope"
              value={formData.country ? String(formData.country) : ""}
              onChange={(val) => setFormData({ ...formData, country: val ? Number(val) : null })}
              options={[
                { value: "", label: "Global (All Countries)" },
                ...countries.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  icon: <CountryFlag iso2={c.iso2} width={16} height={12} />,
                })),
              ]}
              placeholder="Select Country Scope"
            />

            <Select
              label="Match Type"
              value={formData.textMatchType}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  textMatchType: val as "EXACT" | "CONTAINS" | "REGEX",
                })
              }
              options={[
                { value: "CONTAINS", label: "Contains (Sub-string)" },
                { value: "EXACT", label: "Exact Match" },
                { value: "REGEX", label: "Regex Pattern" },
              ]}
            />
          </div>

          {/* Pattern Input - Only shown for standard string / regex replacement */}
          {formData.action !== "MASK_SENSITIVE" && (
            <div>
              <Input
                label={formData.textMatchType === "REGEX" ? "Search Pattern (Regex)" : "Search Text"}
                value={formData.textPattern}
                onChange={(e) => setFormData({ ...formData, textPattern: e.target.value })}
                placeholder={
                  formData.textMatchType === "REGEX"
                    ? "(?:code|otp):?\\s*(\\d{4,6})"
                    : "AcmeBank"
                }
                isLoading={isValidating && formData.textMatchType === "REGEX"}
                required
              />
              {formData.textMatchType === "REGEX" && validationResult && !validationResult.isValid && (
                <p className="text-[11px] text-red-500 mt-1 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{validationResult.error}</span>
                </p>
              )}
            </div>
          )}

          {/* Action & Replacement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Action"
              value={formData.action}
              onChange={(val) => {
                const nextAction = val as ExtendedTextAction;
                let nextReplacementList = formData.replacementList;
                if (nextAction === "LIST_SEQUENTIAL" || nextAction === "LIST_RANDOM") {
                  const targetMode = nextAction === "LIST_SEQUENTIAL" ? "SEQUENTIAL" : "RANDOM";
                  const currentSelected = replacementLists.find((l) => l.id === formData.replacementList);
                  if (currentSelected && (currentSelected.selectionMode || "RANDOM").toUpperCase() !== targetMode) {
                    nextReplacementList = null;
                  }
                }
                setFormData({
                  ...formData,
                  action: nextAction,
                  replacementList: nextReplacementList,
                });
              }}
              options={actionOptions}
            />

            {["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) ? (
              <Select
                label={`Text Replacement List (${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"})`}
                value={formData.replacementList ? String(formData.replacementList) : ""}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    replacementList: val ? Number(val) : null,
                  })
                }
                options={replacementLists
                  .filter((l) => {
                    const mode = (l.selectionMode || "RANDOM").toUpperCase();
                    return formData.action === "LIST_SEQUENTIAL"
                      ? mode === "SEQUENTIAL"
                      : mode === "RANDOM";
                  })
                  .map((l) => ({
                    value: String(l.id),
                    label: l.name,
                  }))}
                placeholder={
                  replacementLists.filter((l) => {
                    const mode = (l.selectionMode || "RANDOM").toUpperCase();
                    return formData.action === "LIST_SEQUENTIAL" ? mode === "SEQUENTIAL" : mode === "RANDOM";
                  }).length > 0
                    ? `Select ${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"} List`
                    : `No ${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"} lists found`
                }
              />
            ) : formData.action === "MASK_SENSITIVE" ? (
              <Select
                label="Masking Format"
                value={formData.maskFormat}
                onChange={(val) =>
                  setFormData({ ...formData, maskFormat: val as MaskFormat })
                }
                options={[
                  { value: "KEEP_FIRST_2", label: "Show first 2 digits, mask rest (49****)" },
                  { value: "KEEP_LAST_2", label: "Show last 2 digits, mask rest (****12)" },
                  { value: "KEEP_LAST_4", label: "Show last 4 digits, mask rest (****6789)" },
                  { value: "ALL_ASTERISKS", label: "Mask entirely with asterisks (******)" },
                  { value: "REDACTED", label: "Replace with [REDACTED]" },
                ]}
              />
            ) : (
              <div>
                <Input
                  label="Replacement Text"
                  value={formData.replacement}
                  onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                  placeholder="e.g. SecretBrand or [REF: ${RANDINT:1000:9999}]"
                />
              </div>
            )}
          </div>

          {formData.action === "MASK_SENSITIVE" && (
            <div className="p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-xs font-semibold text-text-primary dark:text-white uppercase tracking-wider">
                  Sensitive Data Target & Preview
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Data to Mask"
                  value={formData.maskDataType}
                  onChange={(val) =>
                    setFormData({ ...formData, maskDataType: val as MaskDataType })
                  }
                  options={[
                    { value: "OTP_6", label: "6-Digit OTP / Verification Code (e.g. 492812)" },
                    { value: "OTP_4", label: "4-Digit PIN Code (e.g. 4812)" },
                    { value: "CARD_16", label: "16-Digit Card / Account Number" },
                    { value: "ANY_NUMBERS", label: "Any Number Sequence (4+ digits)" },
                  ]}
                />

                <Input
                  label="Preceding Trigger Phrase (Optional)"
                  value={formData.maskContextKeyword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maskContextKeyword: e.target.value,
                    })
                  }
                  placeholder="e.g. code is, OTP (or leave empty to mask anywhere)"
                />
              </div>

              {/* Live Transformation Preview with Fixed Min-Height to prevent modal jitter */}
              {(() => {
                const preview = getMaskPreview(
                  formData.maskDataType,
                  formData.maskFormat,
                  formData.maskContextKeyword
                );
                return (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-primary/20 dark:border-primary/30 space-y-2 text-xs min-h-[96px] box-border">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Sparkles size={13} />
                      <span>Live Transformation Preview:</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-text-primary dark:text-white">
                      <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded font-mono text-[11px] min-w-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Incoming SMS</span>
                        <span className="truncate block" title={preview.incoming}>&quot;{preview.incoming}&quot;</span>
                      </div>
                      <ArrowRight size={14} className="text-gray-400 hidden sm:block shrink-0" />
                      <div className="flex-1 p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded font-mono text-[11px] border border-emerald-200 dark:border-emerald-800/40 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Delivered to Carrier</span>
                        <span className="truncate block" title={preview.transformed}>&quot;{preview.transformed}&quot;</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Macro Quick-Insert Helper Pills */}
          {!["LIST_SEQUENTIAL", "LIST_RANDOM", "MASK_SENSITIVE"].includes(formData.action) && (
            <div className="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary dark:text-white">
                <Sparkles size={14} className="text-primary" />
                <span>Dynamic Random Tags Quick-Insert:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "${RANDINT:1000:9999}", desc: "Random 4-digit number" },
                  { tag: "${RANDHEX:8}", desc: "8-char hex string" },
                  { tag: "${RANDTEXT:6}", desc: "6-char alphanumeric" },
                  { tag: "${RANDLETTERS:6}", desc: "6 random uppercase letters" },
                ].map(({ tag, desc }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertMacro(tag)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary hover:text-primary transition-all font-mono text-text-primary dark:text-white shadow-2xs"
                    title={desc}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Text Translation Preview with Toggle */}
          {(() => {
            const preview = getTransformationPreview();
            if (!preview) return null;

            if (!showHint) {
              return (
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/60 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700/60 rounded-lg text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-[11px]">
                    <Info size={12} className="text-primary/70" />
                    Action Example: <span className="font-mono font-medium text-text-primary dark:text-gray-300">[{preview.note}]</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-[11px] font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                  >
                    Show Example <ChevronDown size={12} />
                  </button>
                </div>
              );
            }

            return (
              <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                    <Info size={13} className="text-primary" />
                    How this rule transforms traffic:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {preview.note}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHint(false)}
                      className="text-[11px] text-gray-400 hover:text-text-primary dark:hover:text-white flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                      title="Hide example"
                    >
                      Hide <ChevronUp size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                      Client Submits (Incoming)
                    </div>
                    <div className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200 truncate whitespace-pre">
                      {preview.input}
                    </div>
                  </div>

                  <span className="text-gray-400 font-bold text-sm shrink-0">➔</span>

                  <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Delivered to Vendor (Transformed)
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate whitespace-pre">
                      {preview.output}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {preview.explanation}
                </p>
              </div>
            );
          })()}

          {/* Clean UI Switches */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-text-primary dark:text-white">
                  Stop Processing Further Rules
                </div>
                <div className="text-xs text-text-secondary dark:text-gray-400">
                  Skip lower-priority rules when this rule matches
                </div>
              </div>
              <ToggleSwitch
                checked={formData.stopProcessing}
                onChange={(checked) =>
                  setFormData({ ...formData, stopProcessing: checked })
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-text-primary dark:text-white">
                  Rule Status
                </div>
                <div className="text-xs text-text-secondary dark:text-gray-400">
                  Enable or disable this rule in the live routing pipeline
                </div>
              </div>
              <ToggleSwitch
                checked={formData.isActive}
                onChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                (validationResult !== null && !validationResult.isValid)
              }
            >
              {editingRuleId ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingRule && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingRule(null)}
          onConfirm={handleDelete}
          title="Delete Message Text Rule"
          message={`Are you sure you want to permanently delete rule "${deletingRule.name}"? Active message flows will no longer apply this transformation.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
