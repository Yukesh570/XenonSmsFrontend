import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  Settings,
  List,
  RotateCcw,
  Info,
  RefreshCw,
  Lock,
  Power,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import DataTable from "../../../../components/ui/DataTable";
import FilterCard from "../../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../../components/modals/DeleteModal";
import { VendorTransformRuleModal } from "../../../../components/modals/RouteManager/VendorTransform/VendorTransformRuleModal";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../../components/ui/ContextMenu";
import { CountryFlag } from "../../../../components/ui/CountryFlag";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import ToggleSwitch from "../../../../components/ui/ToggleSwitch";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { usePagePermissions } from "../../../../hooks/usePagePermissions";
import { formatDateTime } from "../../../../helper/dateFormatter";

import type {
  VendorTransformPolicy,
  VendorTransformRule,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import {
  getVendorTransformPoliciesApi,
  createVendorTransformPolicyApi,
  updateVendorTransformPolicyApi,
  getVendorTransformRulesApi,
  updateVendorTransformRuleApi,
  deleteVendorTransformRuleApi,
  getVendorTransformCacheStatusApi,
  rebuildVendorTransformCacheApi,
  getClientRouteVendorsApi,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import { getVendorsApi } from "../../../../api/connectivityApi/vendorApi";
import { getSenderPoolsApi, type SenderPool } from "../../../../api/authorizationApi/senderPoolApi";

interface VendorTransformRulesTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (rule: VendorTransformRule) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const DEFAULT_SEARCH_COLUMNS = [
  "name",
  "targetEntity",
  "vendor",
  "country",
  "matchType",
  "action",
  "status",
];

const DEFAULT_TABLE_COLUMNS = [
  "id",
  "priority",
  "name",
  "targetEntity",
  "vendor",
  "country",
  "matchType",
  "action",
  "replacement",
  "status",
];

export const VendorTransformRulesTab: React.FC<VendorTransformRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();

  const [innerTab, setInnerTab] = useState<"policy" | "rules">("rules");
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<VendorTransformPolicy | null>(null);
  const [rules, setRules] = useState<VendorTransformRule[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [clientVendors, setClientVendors] = useState<{ id: number; profileName: string }[]>([]);
  const [pools, setPools] = useState<SenderPool[]>([]);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Column persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vendor_transform_rules_table_columns_v2");
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
      const saved = localStorage.getItem("vendor_transform_rules_search_columns_v2");
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
    localStorage.setItem("vendor_transform_rules_table_columns_v2", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("vendor_transform_rules_search_columns_v2", JSON.stringify(searchColumns));
  }, [searchColumns]);

  // Filters State
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  // Rule Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<VendorTransformRule | null>(null);

  // Context Menu & Delete Modal
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowRule, setSelectedRowRule] = useState<VendorTransformRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache state
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [isRebuildingCache, setIsRebuildingCache] = useState(false);

  // Load vendors once
  useEffect(() => {
    getVendorsApi(undefined, 1, 1000)
      .then((res: any) => {
        const vList = res?.results || (Array.isArray(res) ? res : []);
        setVendors(vList);
      })
      .catch((e: any) => console.error("Failed to load vendors", e));
  }, []);

  // Load client data when selected
  const loadClientData = async (cId: number) => {
    setLoading(true);
    try {
      const [policiesRes, rulesRes, poolsRes, clientVendorsRes] = await Promise.all([
        getVendorTransformPoliciesApi(cId).catch(() => []),
        getVendorTransformRulesApi({ client: cId }).catch(() => []),
        getSenderPoolsApi(cId).catch(() => []),
        getClientRouteVendorsApi(cId).catch(() => []),
      ]);

      const foundPolicy = Array.isArray(policiesRes) && policiesRes.length > 0 ? policiesRes[0] : null;
      setPolicy(foundPolicy);
      setRules(rulesRes);
      setPools(poolsRes);
      setClientVendors(clientVendorsRes);

      // Cache status
      getVendorTransformCacheStatusApi({ client: cId })
        .then((cs: any) => setCacheStatus(cs))
        .catch(() => setCacheStatus(null));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load vendor transformation rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let effectiveId = selectedClientId;
    if (!effectiveId) {
      const params = new URLSearchParams(window.location.search);
      const cId = params.get("clientId") || params.get("client");
      if (cId) {
        const parsed = Number(cId);
        if (!isNaN(parsed) && parsed > 0) {
          effectiveId = parsed;
          setSelectedClientId(parsed);
        }
      }
    }

    if (effectiveId) {
      loadClientData(effectiveId);
    } else {
      setPolicy(null);
      setRules([]);
      setClientVendors([]);
      setCacheStatus(null);
    }
  }, [selectedClientId]);

  // Handle Policy update or create (LOCKED if !canUpdate)
  const handleSavePolicy = async (updates: Partial<VendorTransformPolicy>) => {
    if (!canUpdate) {
      toast.error("Modification locked. You do not have permission to update policy.");
      return;
    }
    if (!selectedClientId) return;
    try {
      if (policy && policy.id) {
        const updated = await updateVendorTransformPolicyApi(policy.id, updates);
        setPolicy(updated);
        toast.success("Vendor transform policy updated successfully");
      } else {
        const created = await createVendorTransformPolicyApi({
          client: selectedClientId,
          isActive: true,
          failureMode: "FAIL_CLOSED",
          allowSenderRewrite: true,
          maxCandidates: 10,
          ...updates,
        });
        setPolicy(created);
        toast.success("Vendor transform policy created successfully");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to save policy");
    }
  };

  // Cache Rebuild (LOCKED if !canUpdate)
  const handleRebuildCache = async () => {
    if (!canUpdate) {
      toast.error("Operation locked. You do not have permission to flush cache.");
      return;
    }
    if (!selectedClientId) return;
    setIsRebuildingCache(true);
    try {
      await rebuildVendorTransformCacheApi({ client: selectedClientId });
      toast.success("Redis cache invalidated and generation bumped!");
      const cs = await getVendorTransformCacheStatusApi({ client: selectedClientId });
      setCacheStatus(cs);
    } catch (e) {
      toast.error("Failed to invalidate cache");
    } finally {
      setIsRebuildingCache(false);
    }
  };

  // Open Add Rule
  const handleOpenAdd = () => {
    if (!canCreate) {
      toast.error("Action locked. You do not have permission to add vendor rules.");
      return;
    }
    setEditingRule(null);
    setShowModal(true);
  };

  // Open Edit Rule
  const handleEditRule = (rule: VendorTransformRule) => {
    if (!canUpdate) {
      toast.error("Action locked. You do not have permission to edit vendor rules.");
      return;
    }
    setEditingRule(rule);
    setShowModal(true);
    setContextMenuPos(null);
  };

  // Delete Rule (LOCKED check)
  const handleDeleteRule = async () => {
    if (!canDelete) {
      toast.error("Action locked. You do not have permission to delete vendor rules.");
      return;
    }
    if (!deleteRuleId || !selectedClientId) return;
    setIsDeleting(true);
    try {
      await deleteVendorTransformRuleApi(deleteRuleId);
      toast.success("Vendor transform rule deleted successfully");
      setDeleteRuleId(null);
      setSelectedRowRule(null);
      loadClientData(selectedClientId);
    } catch (e) {
      toast.error("Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Rule Status (LOCKED check)
  const handleToggleStatus = async (rule: VendorTransformRule) => {
    if (!canUpdate) {
      toast.error("Action locked: No permission to modify rule status.");
      return;
    }
    if (!rule.id) return;
    const newStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateVendorTransformRuleApi(rule.id, {
        status: newStatus,
        isActive: newStatus === "ACTIVE",
      });
      toast.success(
        `Rule "${rule.name}" ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`
      );
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? { ...r, status: newStatus, isActive: newStatus === "ACTIVE" }
            : r
        )
      );
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // Dropdown Options
  const targetEntityOptions: Option[] = [
    { label: "Sender ID", value: "SENDER_ID" },
    { label: "Destination", value: "DESTINATION" },
    { label: "Message Text", value: "MESSAGE_TEXT" },
  ];

  const matchTypeOptions: Option[] = [
    { label: "Exact Match", value: "EXACT" },
    { label: "Prefix Match", value: "PREFIX" },
    { label: "Substring Contains", value: "CONTAINS" },
    { label: "Regex Match", value: "REGEX" },
    { label: "Any (*)", value: "ANY" },
  ];

  const actionOptions: Option[] = [
    { label: "Fixed Replace", value: "FIXED_REPLACE" },
    { label: "Prefix Add", value: "PREFIX_ADD" },
    { label: "Prefix Remove", value: "PREFIX_REMOVE" },
    { label: "Prefix Replace", value: "PREFIX_REPLACE" },
    { label: "Regex Replace", value: "REGEX_REPLACE" },
    { label: "E.164 Normalize", value: "NORMALIZE" },
    { label: "Truncate Length", value: "TRUNCATE" },
    { label: "Pool (Sequential)", value: "APPROVED_POOL_SEQUENTIAL" },
    { label: "Pool (Random)", value: "APPROVED_POOL_RANDOM" },
    { label: "No Change (Pass-Through)", value: "NO_CHANGE" },
    { label: "Strip Special Chars", value: "STRIP" },
  ];

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const vendorOptions: Option[] = [
    { label: "All Vendors", value: "ALL" },
    ...(clientVendors.length > 0 ? clientVendors : vendors).map((v) => ({
      value: String(v.id),
      label: v.profileName || `Vendor ${v.id}`,
    })),
  ];

  const countryOptions: Option[] = [
    { label: "Global (All Countries)", value: "GLOBAL" },
    ...countries.map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];

  // Column definitions for AdvancedFilter & DataTable
  const allColumns: ColumnConfig[] = [
    {
      key: "id",
      label: "ID",
      tableLabel: "ID",
      type: "number",
      isSearchable: false,
      render: (rule) => (
        <span
          className="font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleEditRule(rule)}
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
      render: (rule) => <span className="font-medium">{rule.priority}</span>,
    },
    {
      key: "name",
      label: "Rule Name",
      tableLabel: "Rule Name",
      type: "text",
      filterKey: "name",
      render: (rule) => (
        <div>
          <span
            className="font-semibold text-primary cursor-pointer hover:underline"
            onClick={() => handleEditRule(rule)}
          >
            {rule.name}
          </span>
          {rule.remarks && (
            <span className="block text-xs text-text-secondary dark:text-gray-400 font-normal mt-0.5">
              {rule.remarks}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "targetEntity",
      label: "Target",
      tableLabel: "Target",
      type: "text",
      options: targetEntityOptions,
      filterKey: "targetEntity",
      render: (rule) => (
        <StatusBadge
          status={
            rule.targetEntity === "DESTINATION"
              ? "SUBMITTED"
              : rule.targetEntity === "MESSAGE_TEXT"
              ? "PENDING"
              : "ACTIVE"
          }
          customText={
            rule.targetEntity === "DESTINATION"
              ? "Destination"
              : rule.targetEntity === "MESSAGE_TEXT"
              ? "Message Text"
              : "Sender ID"
          }
        />
      ),
    },
    {
      key: "vendor",
      label: "Vendor",
      tableLabel: "Vendor",
      type: "text",
      options: vendorOptions,
      filterKey: "vendor",
      render: (rule) =>
        rule.vendor__profileName ? (
          <span>{rule.vendor__profileName}</span>
        ) : (
          <span className="text-gray-400 italic">All Vendors</span>
        ),
    },
    {
      key: "country",
      label: "Country",
      tableLabel: "Country",
      type: "text",
      options: countryOptions,
      filterKey: "country",
      render: (rule) => {
        const countryObj = countries.find((c: any) => c.id === rule.country);
        return countryObj ? (
          <div className="flex items-center gap-1.5">
            <CountryFlag iso2={countryObj.iso2} />
            <span>{countryObj.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic">Global</span>
        );
      },
    },
    {
      key: "matchType",
      label: "Match Criteria",
      tableLabel: "Match Criteria",
      type: "text",
      options: matchTypeOptions,
      filterKey: "matchType",
      render: (rule) => (
        <span>
          <span className="text-text-secondary dark:text-gray-400">{rule.matchType}: </span>
          <span className="font-semibold text-text-primary dark:text-white">
            {rule.pattern || "*"}
          </span>
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      tableLabel: "Action",
      type: "text",
      options: actionOptions,
      filterKey: "action",
      render: (rule) => (
        <StatusBadge status="SENT_TO_VENDOR" customText={rule.action} />
      ),
    },
    {
      key: "replacement",
      label: "Replacement / Output",
      tableLabel: "Replacement / Output",
      type: "text",
      isSearchable: false,
      render: (rule) => {
        if (
          ["FIXED_REPLACE", "PREFIX_ADD", "PREFIX_REMOVE", "PREFIX_REPLACE", "REGEX_REPLACE"].includes(
            rule.action
          )
        ) {
          return (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {rule.action === "PREFIX_REPLACE"
                ? `${rule.pattern || rule.prefixValue || ""} → ${rule.replacement}`
                : rule.replacement}
            </span>
          );
        }
        if (rule.action === "NORMALIZE") {
          return <span className="text-purple-600 dark:text-purple-400 font-medium">E.164 Normalize</span>;
        }
        if (rule.action === "TRUNCATE") {
          return (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Cut to {rule.truncateLength} chars
            </span>
          );
        }
        if (rule.action === "APPROVED_POOL_SEQUENTIAL") {
          return (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Pool Seq (#{rule.senderPool})
            </span>
          );
        }
        if (rule.action === "APPROVED_POOL_RANDOM") {
          return (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Pool Rand (#{rule.senderPool})
            </span>
          );
        }
        if (rule.action === "NO_CHANGE") return <span className="text-gray-400">-</span>;
        if (rule.action === "STRIP") return <span className="text-rose-500 font-medium">Strip</span>;
        return <span>{rule.replacement || "-"}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      tableLabel: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "status",
      render: (rule) => <StatusBadge status={rule.status} />,
    },
    {
      key: "createdAt",
      label: "Created At",
      tableLabel: "Created At",
      type: "date",
      isSearchable: false,
      render: (rule: any) => (rule.createdAt ? formatDateTime(rule.createdAt) : "-"),
    },
    {
      key: "updatedAt",
      label: "Updated At",
      tableLabel: "Updated At",
      type: "date",
      isSearchable: false,
      render: (rule: any) => (rule.updatedAt ? formatDateTime(rule.updatedAt) : "-"),
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

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
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
    if (colIndex >= 0 && colIndex < visibleTableFields.length) {
      const col = visibleTableFields[colIndex];
      if (col.key === "actions") return;
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

  // Filter & Sort Rules Client-Side for Selected Client
  const filteredAndSortedRules = useMemo(() => {
    let result = rules.filter((r) => {
      for (const [colKey, rawVal] of Object.entries(appliedFilters)) {
        const val = rawVal?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "vendor") {
          if (val === "all") continue;
          if (String(r.vendor) !== val) return false;
        } else if (colKey === "country") {
          if (val === "global") {
            if (r.country !== null && r.country !== undefined) return false;
          } else if (String(r.country) !== val) {
            return false;
          }
        } else if (colKey === "targetEntity") {
          if (r.targetEntity?.toLowerCase() !== val) return false;
        } else if (colKey === "matchType") {
          if (r.matchType?.toLowerCase() !== val) return false;
        } else if (colKey === "action") {
          if (r.action?.toLowerCase() !== val) return false;
        } else if (colKey === "status") {
          if (r.status?.toLowerCase() !== val) return false;
        } else if (colKey === "name") {
          if (!r.name?.toLowerCase().includes(val) && !r.remarks?.toLowerCase().includes(val)) {
            return false;
          }
        } else if (colKey === "priority") {
          if (String(r.priority) !== val) return false;
        }
      }
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rules, appliedFilters, sortConfig]);

  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedRules.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRules, currentPage, rowsPerPage]);

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  // Context Menu Items
  const contextMenuItems: ContextMenuItem[] = selectedRowRule
    ? [
        {
          label: canUpdate ? "Edit Rule" : "Edit Locked (Read-Only)",
          icon: <Edit size={16} />,
          onClick: () => {
            if (canUpdate) handleEditRule(selectedRowRule);
            else toast.error("Action locked: No permission to edit.");
          },
        },
        {
          label: selectedRowRule.status === "ACTIVE" ? "Deactivate Rule" : "Activate Rule",
          icon: <Power size={16} />,
          onClick: () => {
            if (canUpdate) {
              handleToggleStatus(selectedRowRule);
            } else {
              toast.error("Action locked: No permission to modify rule status.");
            }
          },
        },
        {
          label: canDelete ? "Delete Rule" : "Delete Locked (No Permission)",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => {
            if (canDelete) {
              setDeleteRuleId(selectedRowRule.id!);
            } else {
              toast.error("Action locked: No permission to delete.");
            }
          },
        },
      ]
    : [];

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Client Selector Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val: string) => setSelectedClientId(val ? Number(val) : null)}
              options={clients.map((c: any) => ({
                value: String(c.id),
                label: c.name,
              }))}
              allowCustomValue={true}
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

      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to configure vendor transformation policies, rules, and cache settings.
          </p>
        </div>
      )}

      {selectedClientId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Sub Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-2 gap-6 bg-white dark:bg-gray-800">
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                innerTab === "rules"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setInnerTab("rules")}
            >
              <List size={15} />
              <span>Vendor Rules ({rules.length})</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                innerTab === "policy"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setInnerTab("policy")}
            >
              <Settings size={15} />
              <span>Policy & Cache</span>
            </button>
          </div>

          {/* TAB 1: RULES TABLE */}
          {innerTab === "rules" && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Top Controls: AdvancedFilter Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative z-20">
                    <AdvancedFilter
                      columns={tableFilterColumns}
                      selectedColumns={tableColumns}
                      defaultColumns={DEFAULT_TABLE_COLUMNS}
                      onFilter={setTableColumns}
                      onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
                      buttonLabel="Columns"
                      enableReorder={true}
                    />
                  </div>

                  <div className="relative z-20">
                    <AdvancedFilter
                      columns={searchableColumns}
                      selectedColumns={searchColumns}
                      defaultColumns={DEFAULT_SEARCH_COLUMNS}
                      onFilter={(newCols) => {
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

                {!canCreate && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800">
                    <Lock size={13} />
                    <span>Create locked (Read-Only)</span>
                  </div>
                )}
              </div>

              {/* Dynamic FilterCard */}
              <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
                {visibleSearchFields.map((col) => {
                  const baseLabel = getBaseLabel(col.label || "");
                  if (col.options) {
                    return (
                      <Select
                        key={col.key}
                        label={`Search ${baseLabel}`}
                        value={filterValues[col.key] || ""}
                        onChange={(val: string) => handleFilterChange(col.key, val)}
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
                      label={`Search ${baseLabel}`}
                      value={filterValues[col.key] || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange(col.key, e.target.value)}
                      placeholder={`Search ${baseLabel}`}
                    />
                  );
                })}
              </FilterCard>

              {/* Reusable DataTable */}
              <DataTable
                density="compact"
                headers={tableHeaders}
                data={paginatedRules}
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
                      Add Vendor Rule
                    </Button>
                  ) : null
                }
                renderRow={(rule, index) => (
                  <tr
                    key={rule.id || index}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                      setSelectedRowRule(rule);
                    }}
                    onDoubleClick={() => handleEditRule(rule)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
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
            </div>
          )}

          {/* TAB 2: POLICY & CACHE SETTINGS */}
          {innerTab === "policy" && (
            <div className="p-4 sm:p-6 space-y-6 w-full">
              {!canUpdate && (
                <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center space-x-2.5 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
                  <Lock size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>
                    <span className="font-semibold">Locked:</span> Settings and cache operations are locked in read-only mode. You do not have permission to modify gateway policies or flush Redis caches.
                  </p>
                </div>
              )}

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-transparent space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-text-primary dark:text-white flex items-center gap-2">
                      Vendor Transformation Engine Status
                      {!canUpdate && <Lock size={14} className="text-gray-400" />}
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      When enabled, routes are validated for vendor compatibility and transformed dynamically.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.isActive || false}
                    onChange={(checked: boolean) => handleSavePolicy({ isActive: checked })}
                    disabled={!canUpdate}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                      Failure Mode
                    </label>
                    <Select
                      value={policy?.failureMode || "FAIL_CLOSED"}
                      onChange={(v: string) => handleSavePolicy({ failureMode: v as any })}
                      disabled={!canUpdate}
                      options={[
                        { value: "FAIL_CLOSED", label: "FAIL_CLOSED (Strict - Exclude incompatible route)" },
                        { value: "FAIL_OPEN", label: "FAIL_OPEN (Send effective payload as-is)" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                      Max Candidate Routes to Evaluate
                    </label>
                    <Input
                      type="number"
                      value={policy?.maxCandidates || 10}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSavePolicy({ maxCandidates: Number(e.target.value) || 10 })}
                      disabled={!canUpdate}
                    />
                    <span className="text-xs text-gray-400">
                      Upper bound for route preflight checks (default 10).
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Sender ID Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to rewrite Sender IDs to match downstream vendor format.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowSenderRewrite ?? true}
                    onChange={(checked: boolean) => handleSavePolicy({ allowSenderRewrite: checked })}
                    disabled={!canUpdate}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Destination Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to adapt destination numbers (e.g. vendor-specific prefixes 00/+).
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowDestinationRewrite ?? true}
                    onChange={(checked: boolean) => handleSavePolicy({ allowDestinationRewrite: checked })}
                    disabled={!canUpdate}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Message Text Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to adapt message content (e.g. append vendor opt-out footers or regex).
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowTextRewrite ?? true}
                    onChange={(checked: boolean) => handleSavePolicy({ allowTextRewrite: checked })}
                    disabled={!canUpdate}
                  />
                </div>
              </div>

              {/* Cache Management Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
                    <RefreshCw size={15} className="text-primary" />
                    <span>Redis Warm-Cache & Generation Status</span>
                  </h4>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-3">
                    <span>
                      Generation: <strong>{cacheStatus?.generation ?? 1}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      Cached:{" "}
                      <strong className={cacheStatus?.cached ? "text-emerald-600" : "text-amber-500"}>
                        {cacheStatus?.cached ? "YES" : "NO"}
                      </strong>
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRebuildCache}
                  disabled={!canUpdate || isRebuildingCache}
                  leftIcon={
                    isRebuildingCache ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw size={14} className={isRebuildingCache ? "animate-spin" : ""} />
                    )
                  }
                  title={canUpdate ? "Invalidate & Rebuild Cache" : "Operation locked"}
                >
                  {isRebuildingCache ? "Invalidating..." : "Invalidate & Rebuild Cache"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        position={contextMenuPos}
        items={contextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Delete Rule Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteRuleId}
        onClose={() => {
          setDeleteRuleId(null);
          setSelectedRowRule(null);
        }}
        onConfirm={handleDeleteRule}
        title="Delete Vendor Transform Rule"
        message={`Are you sure you want to permanently delete the rule "${selectedRowRule?.name || ""}"? This may affect real-time vendor transformations.`}
        isDeleting={isDeleting}
      />

      {/* Add / Edit Vendor Transform Rule Modal */}
      <VendorTransformRuleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRule(null);
        }}
        onSuccess={() => {
          if (selectedClientId) {
            loadClientData(selectedClientId);
          }
        }}
        editingRule={editingRule}
        selectedClientId={selectedClientId}
        vendors={vendors}
        clientVendors={clientVendors}
        countries={countries}
        pools={pools}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
};
