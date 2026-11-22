import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  PhoneCall,
  AlertTriangle,
  RotateCcw,
  Info,
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
  type MessageFilterRule,
  type DestinationAction,
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

interface DestinationRulesTabProps {
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
  "destinationMatchType",
  "action",
  "countryWarning",
  "On Match",
  "isActive",
];

export const DestinationRulesTab: React.FC<DestinationRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [rules, setRules] = useState<MessageFilterRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Dynamic Column Persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("destination_rules_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes("id")) return ["id", ...parsed];
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading saved table columns", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("destination_rules_search_columns_v2");
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
    localStorage.setItem("destination_rules_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("destination_rules_search_columns_v2", JSON.stringify(searchColumns));
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
    destinationMatchType: "EXACT" | "PREFIX" | "REGEX";
    destinationPattern: string;
    action: DestinationAction | "PREFIX_REPLACE";
    prefixValue: string;
    replacement: string;
    normalizationMode: string;
    stopProcessing: boolean;
    isActive: boolean;
  }>({
    name: "",
    priority: 100,
    country: null,
    destinationMatchType: "PREFIX",
    destinationPattern: "",
    action: "PREFIX_REPLACE",
    prefixValue: "",
    replacement: "",
    normalizationMode: "E164",
    stopProcessing: false,
    isActive: true,
  });

  // Real-time Regex Validation
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load Rules
  const loadRules = async (customFilters?: Record<string, string>) => {
    if (!selectedClientId) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeFilters = customFilters !== undefined ? customFilters : appliedFilters;
      const params: Record<string, any> = {
        targetEntity: "DESTINATION",
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

      const res = await getMessageFilterRulesApi(params);
      const data = Array.isArray(res) ? res : (res as any)?.results || [];
      setRules(
        data.sort(
          (a: MessageFilterRule, b: MessageFilterRule) => a.priority - b.priority
        )
      );
    } catch (err: any) {
      console.error("Failed to load destination rules", err);
      toast.error(err.response?.data?.detail || "Failed to load destination rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      loadRules();
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [selectedClientId]);

  // Debounced Regex Validation
  useEffect(() => {
    if (
      formData.destinationMatchType !== "REGEX" ||
      !formData.destinationPattern
    ) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "DESTINATION",
          destinationMatchType: "REGEX",
          destinationPattern: formData.destinationPattern,
          action: formData.action === "PREFIX_REPLACE" ? "REGEX_REPLACE" : formData.action,
          replacement: formData.replacement,
        });

        setValidationResult({
          isValid: res.valid,
          error: res.error || undefined,
        });
      } catch (e: any) {
        setValidationResult({
          isValid: false,
          error: e.response?.data?.error || "Regex validation failed",
        });
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    formData.destinationPattern,
    formData.destinationMatchType,
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
    { label: "Prefix Match", value: "PREFIX" },
    { label: "Exact Match", value: "EXACT" },
    { label: "Regex Pattern", value: "REGEX" },
  ];

  const actionOptions: Option[] = [
    { label: "Prefix Replace", value: "PREFIX_REPLACE" },
    { label: "Prefix Add", value: "PREFIX_ADD" },
    { label: "Prefix Remove", value: "PREFIX_REMOVE" },
    { label: "Fixed Replace", value: "FIXED_REPLACE" },
    { label: "Normalize", value: "NORMALIZE" },
    { label: "Regex Replace", value: "REGEX_REPLACE" },
  ];

  const booleanOptions: Option[] = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
  ];

  // Set of priorities that are shared by more than 1 rule (table duplicate detection)
  const duplicatePriorities = useMemo(() => {
    const counts = new Map<number, number>();
    rules.forEach((r) => {
      counts.set(r.priority, (counts.get(r.priority) || 0) + 1);
    });
    return new Set(
      [...counts.entries()].filter(([_, count]) => count > 1).map(([p]) => p)
    );
  }, [rules]);

  // Modal priority collision detection
  const conflictingRule = useMemo(() => {
    if (!formData.priority) return null;
    return rules.find(
      (r) =>
        r.priority === Number(formData.priority) &&
        r.id !== editingRuleId
    );
  }, [rules, formData.priority, editingRuleId]);

  // All Column Definitions for Dynamic Table & Search
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
      render: (rule) => {
        const isDuplicate = duplicatePriorities.has(rule.priority);
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-sm text-text-secondary dark:text-gray-300 font-mono">
              {rule.priority}
            </span>
            {isDuplicate && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                title="Duplicate priority: Another rule shares this priority order"
              >
                Duplicate
              </span>
            )}
          </div>
        );
      },
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
      key: "destinationMatchType",
      label: "Match Criteria",
      tableLabel: "Match Type",
      type: "text",
      filterKey: "destinationMatchType",
      options: matchTypeOptions,
      render: (rule) => {
        const patternMatch =
          rule.action === "REGEX_REPLACE" && rule.destinationPattern
            ? rule.destinationPattern.match(/^\^([a-zA-Z0-9+]+)\(\.\*\)\$$/)
            : null;
        const replacementMatch =
          rule.action === "REGEX_REPLACE" && rule.replacement
            ? rule.replacement.match(/^([a-zA-Z0-9+]+)\$1$/)
            : null;

        if (patternMatch && replacementMatch) {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusBadge status="SUBMITTED" customText="PREFIX" />
              <span className="text-sm font-mono text-text-secondary dark:text-gray-300">
                {patternMatch[1]}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusBadge status="SUBMITTED" customText={rule.destinationMatchType || "ANY"} />
            {rule.destinationPattern && (
              <span
                className="text-sm text-text-secondary dark:text-gray-300 max-w-[140px] truncate"
                title={rule.destinationPattern}
              >
                {rule.destinationPattern}
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
        if (rule.action === "PREFIX_REPLACE") {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusBadge status="SENT_TO_VENDOR" customText="PREFIX_REPLACE" />
              <span className="text-sm font-mono text-text-secondary dark:text-gray-300">
                {rule.destinationPattern || rule.prefixValue} → {rule.replacement}
              </span>
            </div>
          );
        }

        const patternMatch =
          rule.action === "REGEX_REPLACE" && rule.destinationPattern
            ? rule.destinationPattern.match(/^\^([a-zA-Z0-9+]+)\(\.\*\)\$$/)
            : null;
        const replacementMatch =
          rule.action === "REGEX_REPLACE" && rule.replacement
            ? rule.replacement.match(/^([a-zA-Z0-9+]+)\$1$/)
            : null;

        if (patternMatch && replacementMatch) {
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <StatusBadge status="SENT_TO_VENDOR" customText="PREFIX_REPLACE" />
              <span className="text-sm font-mono text-text-secondary dark:text-gray-300">
                {patternMatch[1]} → {replacementMatch[1]}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusBadge status="SENT_TO_VENDOR" customText={rule.action} />
            {rule.prefixValue && (
              <span className="text-sm text-text-secondary dark:text-gray-300">
                {rule.prefixValue}
              </span>
            )}
            {rule.replacement && (
              <span className="text-sm text-text-secondary dark:text-gray-300">
                {rule.replacement}
              </span>
            )}
            {rule.action === "NORMALIZE" && (
              <span className="text-sm text-text-secondary dark:text-gray-400">
                ({rule.normalizationMode || "E.164"})
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
      key: "destinationPattern",
      label: "Destination Pattern",
      filterKey: "destinationPattern__icontains",
      type: "text",
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
      key: "senderPattern",
      label: "Sender Pattern",
      filterKey: "senderPattern__icontains",
      type: "text",
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
      key: "countryWarning",
      label: "Country Warning",
      tableLabel: "Warning",
      isSearchable: false,
      render: (rule) => {
        const isPotentialCountryCross = [
          "PREFIX_ADD",
          "FIXED_REPLACE",
          "REGEX_REPLACE",
        ].includes(rule.action);
        return isPotentialCountryCross ? (
          <StatusBadge status="PENDING" customText="Monitored" />
        ) : (
          <span className="text-sm text-text-secondary dark:text-gray-400">Safe</span>
        );
      },
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
    loadRules(filterValues);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
    if (selectedClientId) {
      loadRules({});
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
        } else if (colKey === "destinationMatchType") {
          if (r.destinationMatchType !== val.toUpperCase()) return false;
        } else if (colKey === "destinationPattern") {
          if (!r.destinationPattern?.toLowerCase().includes(val)) return false;
        } else if (colKey === "senderPattern") {
          if (!r.senderPattern?.toLowerCase().includes(val)) return false;
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
      destinationMatchType: "PREFIX",
      destinationPattern: "",
      action: "PREFIX_REPLACE",
      prefixValue: "",
      replacement: "",
      normalizationMode: "E164",
      stopProcessing: false,
      isActive: true,
    });
    setValidationResult(null);
    setShowHint(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: MessageFilterRule) => {
    setEditingRuleId(rule.id || null);

    const patternMatch =
      rule.action === "REGEX_REPLACE" && rule.destinationPattern
        ? rule.destinationPattern.match(/^\^([a-zA-Z0-9+]+)\(\.\*\)\$$/)
        : null;
    const replacementMatch =
      rule.action === "REGEX_REPLACE" && rule.replacement
        ? rule.replacement.match(/^([a-zA-Z0-9+]+)\$1$/)
        : null;

    if (rule.action === "PREFIX_REPLACE") {
      setFormData({
        name: rule.name,
        priority: rule.priority,
        country: rule.country,
        destinationMatchType:
          (rule.destinationMatchType as "EXACT" | "PREFIX" | "REGEX") || "PREFIX",
        destinationPattern: rule.destinationPattern || rule.prefixValue || "",
        action: "PREFIX_REPLACE",
        prefixValue: "",
        replacement: rule.replacement || "",
        normalizationMode: rule.normalizationMode || "E164",
        stopProcessing: rule.stopProcessing,
        isActive: rule.isActive,
      });
    } else if (patternMatch && replacementMatch) {
      setFormData({
        name: rule.name,
        priority: rule.priority,
        country: rule.country,
        destinationMatchType: "PREFIX",
        destinationPattern: patternMatch[1],
        action: "PREFIX_REPLACE",
        prefixValue: "",
        replacement: replacementMatch[1],
        normalizationMode: rule.normalizationMode || "E164",
        stopProcessing: rule.stopProcessing,
        isActive: rule.isActive,
      });
    } else {
      setFormData({
        name: rule.name,
        priority: rule.priority,
        country: rule.country,
        destinationMatchType:
          (rule.destinationMatchType as "EXACT" | "PREFIX" | "REGEX") || "PREFIX",
        destinationPattern: rule.destinationPattern || "",
        action: (rule.action as DestinationAction) || "PREFIX_ADD",
        prefixValue: rule.prefixValue || "",
        replacement: rule.replacement || "",
        normalizationMode: rule.normalizationMode || "E164",
        stopProcessing: rule.stopProcessing,
        isActive: rule.isActive,
      });
    }
    setValidationResult(null);
    setShowHint(false);
    setShowModal(true);
  };

  // Static reference preview for destination transformation actions
  const getTransformationPreview = () => {
    const action = formData.action || "PREFIX_REPLACE";

    if (action === "PREFIX_REPLACE") {
      return {
        input: "07412345678",
        output: "447412345678",
        note: "Prefix Replace (0 ➔ 44)",
        explanation:
          "Replaces leading domestic prefix '0' with international prefix '44' and preserves subscriber digits.",
      };
    }

    if (action === "PREFIX_ADD") {
      return {
        input: "412345678",
        output: "+44412345678",
        note: "Prefix Addition (+44)",
        explanation:
          "Prepends carrier country code or international exit digits to the destination number.",
      };
    }

    if (action === "PREFIX_REMOVE") {
      return {
        input: "0447309692",
        output: "447309692",
        note: "Prefix Stripping (0)",
        explanation:
          "Strips leading domestic trunk prefix '0' to standardize destination for vendor delivery.",
      };
    }

    if (action === "FIXED_REPLACE") {
      return {
        input: "0412345678",
        output: "447700900000",
        note: "Fixed Destination Reroute",
        explanation:
          "Reroutes all matching destination numbers to a designated fixed termination number.",
      };
    }

    if (action === "REGEX_REPLACE") {
      return {
        input: "07412345678",
        output: "447412345678",
        note: "Regex Group Substitution",
        explanation:
          "Matches regex capture groups (^0(.*)$) and substitutes groups into replacement template (44$1).",
      };
    }

    if (action === "NORMALIZE") {
      return {
        input: "+(61) 0412-345-678",
        output: "61412345678",
        note: "E.164 Standardization",
        explanation:
          "Strips non-digit characters (spaces, brackets, hyphens) to format the destination into standard international digits.",
      };
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!formData.priority || Number(formData.priority) < 1) {
      toast.error("A valid priority number (1 or greater) is required");
      return;
    }
    if (conflictingRule) {
      toast.error(
        `Priority ${formData.priority} is already used by rule "${conflictingRule.name}" (#${conflictingRule.id}). Priority must be unique.`
      );
      return;
    }
    if (
      formData.action !== "NORMALIZE" &&
      !formData.destinationPattern.trim()
    ) {
      toast.error(
        formData.destinationMatchType === "EXACT"
          ? "Exact destination number is required"
          : formData.destinationMatchType === "REGEX"
            ? "Destination regex pattern is required"
            : "Destination prefix is required"
      );
      return;
    }
    if (formData.action === "PREFIX_REPLACE" && !formData.replacement.trim()) {
      toast.error("Replacement prefix is required");
      return;
    }
    if (validationResult && !validationResult.isValid) {
      toast.error(`Rule validation failed: ${validationResult.error}`);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMatchType = formData.destinationMatchType;
      let finalPattern = formData.destinationPattern.trim() || null;
      let finalAction: DestinationAction = formData.action as DestinationAction;
      let finalReplacement: string | null = null;
      let finalPrefixValue: string | null = null;

      if (formData.action === "PREFIX_REPLACE") {
        finalMatchType = formData.destinationMatchType || "PREFIX";
        finalPattern = formData.destinationPattern.trim();
        finalAction = "PREFIX_REPLACE";
        finalReplacement = formData.replacement.trim();
        finalPrefixValue = formData.destinationPattern.trim();
      } else {
        finalPrefixValue = ["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action)
          ? formData.prefixValue.trim()
          : null;
        finalReplacement = ["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action)
          ? formData.replacement.trim()
          : null;
      }

      const payload: Partial<MessageFilterRule> = {
        client: selectedClientId || (filterValues.client ? Number(filterValues.client) : 0),
        targetEntity: "DESTINATION",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        destinationMatchType: finalMatchType,
        destinationPattern: finalPattern,
        action: finalAction,
        prefixValue: finalPrefixValue,
        replacement: finalReplacement,
        normalizationMode:
          formData.action === "NORMALIZE" ? formData.normalizationMode : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRuleId) {
        await updateMessageFilterRuleApi(editingRuleId, payload);
        toast.success("Destination rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Destination rule created successfully");
      }
      setShowModal(false);
      loadRules();
    } catch (err: any) {
      const detail =
        err.response?.data?.destinationPattern?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save destination rule";
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
      toast.success("Destination rule deleted");
      setDeletingRule(null);
      setSelectedRowRule(null);
      loadRules();
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
      toast.success(
        `Rule "${rule.name}" ${!rule.isActive ? "activated" : "deactivated"}`
      );
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? { ...r, isActive: !r.isActive, status: !r.isActive ? "ACTIVE" : "INACTIVE" }
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
        icon: <PhoneCall size={16} />,
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
            <span className="font-semibold">Instruction:</span> Please select a client to configure and manage its destination phone number translation rules.
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
                Add Destination Rule
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

      {/* Add / Edit Destination Rule Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-xl"
        title={
          editingRuleId ? "Update Destination Rule" : "Add Destination Rule"
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. UK Domestic 0-Prefix Normalization"
              required
            />

            <div>
              <Input
                label="Priority (Evaluation Order)"
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: Number(e.target.value) })
                }
                min={1}
                max={99999}
                required
              />
              {conflictingRule && (
                <p className="text-[11px] mt-1 text-text-secondary dark:text-gray-400">
                  Priority {formData.priority} is also assigned to rule "{conflictingRule.name}" (#{conflictingRule.id})
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country Scope"
              value={formData.country ? String(formData.country) : ""}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  country: val ? Number(val) : null,
                })
              }
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
              value={formData.destinationMatchType}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  destinationMatchType: val as "EXACT" | "PREFIX" | "REGEX",
                })
              }
              options={[
                { value: "PREFIX", label: "Prefix Match (e.g. ^07 or 0)" },
                { value: "EXACT", label: "Exact Match" },
                { value: "REGEX", label: "Regex Pattern" },
              ]}
            />
          </div>

          {/* Pattern Input */}
          <div>
            <Input
              label={
                formData.destinationMatchType === "REGEX"
                  ? "Destination Regex Pattern"
                  : formData.destinationMatchType === "EXACT"
                    ? "Exact Destination Number"
                    : "Destination Prefix"
              }
              value={formData.destinationPattern}
              onChange={(e) => {
                const nextVal = e.target.value;
                setFormData((prev) => {
                  const shouldSync =
                    prev.destinationMatchType === "PREFIX" &&
                    prev.action === "PREFIX_REMOVE" &&
                    (!prev.prefixValue || prev.prefixValue === prev.destinationPattern);
                  return {
                    ...prev,
                    destinationPattern: nextVal,
                    prefixValue: shouldSync ? nextVal : prev.prefixValue,
                  };
                });
              }}
              placeholder={
                formData.destinationMatchType === "REGEX"
                  ? "^0([7-9]\\d{9})$"
                  : formData.destinationMatchType === "EXACT"
                    ? "61412345678"
                    : "0"
              }
              required={formData.action !== "NORMALIZE"}
            />
          </div>

          {/* Action Select & Dynamic Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Translation Action"
              value={formData.action}
              onChange={(val) => {
                const nextAction = val as DestinationAction | "PREFIX_REPLACE";
                setFormData((prev) => {
                  let nextPrefix = prev.prefixValue;
                  if (
                    nextAction === "PREFIX_REMOVE" &&
                    prev.destinationMatchType === "PREFIX" &&
                    (!nextPrefix || nextPrefix === "44")
                  ) {
                    nextPrefix = prev.destinationPattern || "0";
                  } else if (
                    nextAction === "PREFIX_ADD" &&
                    (!nextPrefix || nextPrefix === "0" || nextPrefix === prev.destinationPattern)
                  ) {
                    nextPrefix = "+44";
                  }
                  return {
                    ...prev,
                    action: nextAction,
                    prefixValue: nextPrefix,
                  };
                });
              }}
              options={[
                { value: "PREFIX_REPLACE", label: "Prefix Replace (e.g. 0 → 44)" },
                { value: "PREFIX_ADD", label: "Prefix Add (e.g. +44)" },
                { value: "PREFIX_REMOVE", label: "Prefix Remove (e.g. 0)" },
                { value: "FIXED_REPLACE", label: "Fixed Replace (Reroute Number)" },
                { value: "NORMALIZE", label: "E.164 Normalization Only" },
                { value: "REGEX_REPLACE", label: "Advanced: Regex Replace (Groups $1)" },
              ]}
            />

            {formData.action === "PREFIX_REPLACE" && (
              <Input
                label="Replacement Prefix"
                value={formData.replacement}
                onChange={(e) =>
                  setFormData({ ...formData, replacement: e.target.value })
                }
                placeholder="e.g. 44"
                required
              />
            )}

            {["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action) && (
              <div>
                <Input
                  label={
                    formData.action === "PREFIX_ADD"
                      ? "Prefix to Add"
                      : "Prefix to Remove"
                  }
                  value={formData.prefixValue}
                  onChange={(e) =>
                    setFormData({ ...formData, prefixValue: e.target.value })
                  }
                  placeholder={
                    formData.action === "PREFIX_ADD"
                      ? "+44"
                      : formData.destinationMatchType === "PREFIX"
                        ? formData.destinationPattern || "0"
                        : "0"
                  }
                  required
                />
                {(() => {
                  if (
                    formData.action !== "PREFIX_REMOVE" ||
                    !formData.destinationPattern ||
                    !formData.prefixValue
                  ) {
                    return null;
                  }

                  const hasMismatch =
                    formData.destinationMatchType === "PREFIX"
                      ? formData.prefixValue !== formData.destinationPattern
                      : !formData.destinationPattern.startsWith(formData.prefixValue);

                  if (!hasMismatch) return null;

                  return (
                    <div className="flex items-center justify-between text-[11px] mt-1 text-amber-600 dark:text-amber-400">
                      <span>
                        {formData.destinationMatchType === "PREFIX"
                          ? `Differs from match prefix (${formData.destinationPattern})`
                          : `Number does not begin with "${formData.prefixValue}"`}
                      </span>
                      {formData.destinationMatchType === "PREFIX" && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              prefixValue: prev.destinationPattern,
                            }))
                          }
                          className="text-primary hover:underline font-medium"
                        >
                          Reset to match
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action) && (
              <Input
                label="Replacement Value"
                value={formData.replacement}
                onChange={(e) =>
                  setFormData({ ...formData, replacement: e.target.value })
                }
                placeholder={
                  formData.action === "REGEX_REPLACE" ? "44$1" : "447700900000"
                }
                required
              />
            )}
          </div>

          {/* Live Translation Preview with Toggle */}
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

          {/* Validation Feedback */}
          {isValidating && (
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              <span>Validating regex safety...</span>
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
          title="Delete Destination Rule"
          message={`Are you sure you want to permanently delete rule "${deletingRule.name}"? Active message flows matching this pattern will no longer be modified.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
