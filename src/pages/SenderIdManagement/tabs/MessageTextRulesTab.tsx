import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  FileText,
  AlertTriangle,
  Sparkles,
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
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
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

interface MessageTextRulesTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

const DEFAULT_SEARCH_COLUMNS = ["name", "client", "isActive"];
const DEFAULT_TABLE_COLUMNS = [
  "priority",
  "name",
  "country",
  "textMatchType",
  "action",
  "replacement",
  "stopProcessing",
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    action: TextAction;
    replacement: string;
    replacementList: number | null;
    stopProcessing: boolean;
    isActive: boolean;
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
  });

  // Real-time Regex & Macro Validation
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load Rules & Replacement Lists
  const loadData = async (customFilters?: Record<string, string>) => {
    setLoading(true);
    try {
      const activeFilters = customFilters !== undefined ? customFilters : appliedFilters;
      const clientParam = activeFilters.client ? Number(activeFilters.client) : selectedClientId || undefined;

      const params: Record<string, any> = {
        targetEntity: "MESSAGE_TEXT",
      };

      if (clientParam) {
        params.client = clientParam;
      }

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
        getMessageTextReplacementListsApi(clientParam),
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
    loadData();
  }, [selectedClientId]);

  // Debounced Regex Validation
  useEffect(() => {
    if (!formData.textPattern) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "MESSAGE_TEXT",
          textMatchType: formData.textMatchType,
          textPattern: formData.textPattern,
          action: formData.action,
          replacement: formData.replacement,
        });

        setValidationResult({
          isValid: res.valid,
          error: res.error || undefined,
        });
      } catch (e: any) {
        setValidationResult({
          isValid: false,
          error: e.response?.data?.error || "Validation failed",
        });
      } finally {
        setIsValidating(false);
      }
    }, 400);

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
    { label: "String Replace", value: "STRING_REPLACE" },
    { label: "Replace All", value: "REPLACE_ALL" },
    { label: "Regex Replace", value: "REGEX_REPLACE" },
    { label: "Append", value: "APPEND" },
    { label: "Prepend", value: "PREPEND" },
    { label: "List (Sequential)", value: "LIST_SEQUENTIAL" },
    { label: "List (Random)", value: "LIST_RANDOM" },
  ];

  const booleanOptions: Option[] = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
  ];

  // All Column Definitions
  const allColumns: ColumnConfig[] = [
    {
      key: "priority",
      label: "Priority",
      tableLabel: "Priority",
      type: "number",
      filterKey: "priority",
      render: (rule) => (
        <span className="text-sm text-text-secondary dark:text-gray-300">
          #{rule.priority}
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
        <span className="text-sm text-text-primary dark:text-white">
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
      render: (rule) => (
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
      ),
    },
    {
      key: "action",
      label: "Action & Target",
      tableLabel: "Action",
      type: "text",
      filterKey: "action",
      options: actionOptions,
      render: (rule) => (
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
      ),
    },
    {
      key: "replacement",
      label: "Macros / List",
      tableLabel: "Macros / List",
      type: "text",
      filterKey: "replacement__icontains",
      render: (rule) => {
        const matchedList = replacementLists.find(
          (l) => l.id === rule.replacementList
        );
        const hasRandomMacro =
          rule.replacement &&
          (rule.replacement.includes("${RANDINT") ||
            rule.replacement.includes("${RANDHEX") ||
            rule.replacement.includes("${RANDTEXT") ||
            rule.replacement.includes("${RANDLETTERS"));

        return matchedList ? (
          <StatusBadge status="ACTIVE" customText={matchedList.name} />
        ) : hasRandomMacro ? (
          <StatusBadge status="PENDING" customText="Macro" />
        ) : (
          <span className="text-sm text-text-secondary dark:text-gray-400">Static</span>
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
      key: "stopProcessing",
      label: "Stop",
      tableLabel: "Stop",
      isSearchable: false,
      render: (rule) => (
        <StatusBadge
          status={rule.stopProcessing ? "FAILED" : "QUEUED"}
          customText={rule.stopProcessing ? "Stop" : "Next"}
        />
      ),
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
    setSelectedClientId(null);
    loadData({});
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
    });
    setValidationResult(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: MessageFilterRule) => {
    setEditingRuleId(rule.id || null);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      country: rule.country,
      textMatchType:
        (rule.textMatchType as "EXACT" | "CONTAINS" | "REGEX") || "CONTAINS",
      textPattern: rule.textPattern || "",
      action: (rule.action as TextAction) || "STRING_REPLACE",
      replacement: rule.replacement || "",
      replacementList: rule.replacementList || null,
      stopProcessing: rule.stopProcessing,
      isActive: rule.isActive,
    });
    setValidationResult(null);
    setShowModal(true);
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
    if (!formData.textPattern.trim()) {
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
        textMatchType: formData.textMatchType,
        textPattern: formData.textPattern.trim(),
        action: formData.action,
        replacement:
          ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)
            ? null
            : formData.replacement.trim() || "",
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
        renderRow={(rule, index) => (
          <tr
            key={rule.id || index}
            onContextMenu={(e) => handleContextMenu(e, rule)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 cursor-context-menu transition-colors"
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
        )}
      />

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

            <Input
              label="Priority (Evaluation Order)"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              min={1}
              max={99999}
              required
            />
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

          {/* Pattern Input */}
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
              required
            />
          </div>

          {/* Action & Replacement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Action"
              value={formData.action}
              onChange={(val) => setFormData({ ...formData, action: val as TextAction })}
              options={[
                { value: "STRING_REPLACE", label: "String Replace (First Match)" },
                { value: "REPLACE_ALL", label: "Replace All Matches" },
                { value: "REGEX_REPLACE", label: "Regex Replace (Supports $1, $2)" },
                { value: "APPEND", label: "Append to End" },
                { value: "PREPEND", label: "Prepend to Beginning" },
                { value: "LIST_SEQUENTIAL", label: "Replacement List (Sequential)" },
                { value: "LIST_RANDOM", label: "Replacement List (Random)" },
              ]}
            />

            {["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) ? (
              <Select
                label="Text Replacement List"
                value={formData.replacementList ? String(formData.replacementList) : ""}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    replacementList: val ? Number(val) : null,
                  })
                }
                options={replacementLists.map((l) => ({
                  value: String(l.id),
                  label: `${l.name} (${l.selectionMode || "RANDOM"})`,
                }))}
                placeholder="Select Replacement List"
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

          {/* Macro Quick-Insert Helper Pills */}
          {!["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) && (
            <div className="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary dark:text-white">
                <Sparkles size={14} className="text-primary" />
                <span>Controlled Random Macro Quick-Insert:</span>
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

          {/* Validation Feedback & Warnings */}
          {isValidating && (
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              <span>Checking regex safety and macro expansion limits...</span>
            </div>
          )}

          {validationResult && !validationResult.isValid && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <div>
                <strong className="block font-semibold">Validation Error / ReDoS Warning:</strong>
                <span>{validationResult.error}</span>
              </div>
            </div>
          )}

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
