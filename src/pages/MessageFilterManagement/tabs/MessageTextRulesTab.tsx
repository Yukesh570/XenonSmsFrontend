import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  FileText,
  RotateCcw,
  Info,
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
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import { MessageTextRuleModal } from "../../../components/modals/MessageFilter";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../helper/dateFormatter";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import {
  getMessageFilterRulesApi,
  deleteMessageFilterRuleApi,
  updateMessageFilterRuleApi,
  getMessageTextReplacementListsApi,
  type MessageFilterRule,
  type MessageTextReplacementList,
} from "../../../api/messageFilterApi/messageFilterApi";
import {
  decodeMaskRule,
  generateMaskRule,
  type ExtendedTextAction,
  type MaskDataType,
  type MaskFormat,
  type MaskConfig,
} from "../../../components/modals/MessageFilter";

export {
  decodeMaskRule,
  generateMaskRule,
  type ExtendedTextAction,
  type MaskDataType,
  type MaskFormat,
  type MaskConfig,
};

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

  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<MessageFilterRule | null>(null);

  // Delete State
  const [deletingRule, setDeletingRule] = useState<MessageFilterRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <span
          className="text-sm font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEdit(rule)}
        >
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
        <span
          className="text-sm font-medium text-text-primary dark:text-white cursor-pointer hover:underline hover:text-primary"
          onClick={() => handleOpenEdit(rule)}
        >
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
    if (!canCreate) {
      toast.error("Action locked. You do not have permission to create rules.");
      return;
    }
    setEditingRule(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: MessageFilterRule) => {
    setEditingRule(rule);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Action locked: No permission to delete rules.");
      return;
    }
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
    if (!canUpdate) {
      toast.error("Action locked: No permission to update rules.");
      return;
    }
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
        label: canUpdate ? "Edit Rule" : "Edit Locked (Read-Only)",
        icon: <Edit size={16} />,
        onClick: () => {
          if (!canUpdate) {
            toast.error("Action locked: No permission to edit rules.");
            return;
          }
          handleOpenEdit(selectedRowRule);
          setContextMenuPos(null);
        },
      },
      {
        label: canUpdate
          ? selectedRowRule.isActive ? "Deactivate Rule" : "Activate Rule"
          : "Status Locked",
        icon: <FileText size={16} />,
        onClick: () => {
          if (!canUpdate) {
            toast.error("Action locked: No permission to update rules.");
            return;
          }
          handleToggleStatus(selectedRowRule);
          setContextMenuPos(null);
        },
      },
      ...(canDelete
        ? [
            {
              label: "Delete Rule",
              icon: <Trash size={16} />,
              variant: "danger" as const,
              onClick: () => {
                setDeletingRule(selectedRowRule);
                setContextMenuPos(null);
              },
            },
          ]
        : []),
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
            storageKey="message_text_rules_main_table"
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
              canCreate ? (
                <Button
                  variant="primary"
                  onClick={handleOpenAdd}
                  leftIcon={<Plus size={16} />}
                >
                  Add Text Rule
                </Button>
              ) : undefined
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

      {/* Message Text Rule Modal */}
      <MessageTextRuleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => loadData()}
        editingRule={editingRule}
        selectedClientId={selectedClientId}
        countries={countries}
        replacementLists={replacementLists}
        existingRules={rules}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />

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
