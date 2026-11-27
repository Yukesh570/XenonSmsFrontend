import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Eye, Copy } from "lucide-react";
import { toast } from "react-toastify";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import DataTable from "../../../../components/ui/DataTable";
import FilterCard from "../../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../../components/ui/AdvancedFilter";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../../components/ui/ContextMenu";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../../helper/dateFormatter";
import { VendorTransformTraceModal } from "../../../../components/modals/RouteManager/VendorTransform/VendorTransformTraceModal";
import {
  getVendorTransformTracesApi,
  type VendorTransformTraceDto,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import { getVendorsApi } from "../../../../api/connectivityApi/vendorApi";

interface VendorTransformTracesTabProps {
  selectedClientId?: number | null;
  clients?: any[];
}

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  tableLabel?: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (trace: VendorTransformTraceDto) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
}

const DEFAULT_TABLE_COLUMNS = [
  "messageId",
  "selectedVendor",
  "sender",
  "destination",
  "appliedRules",
  "skippedVendors",
  "latencyUs",
  "createdAt",
];

const DEFAULT_SEARCH_COLUMNS = [
  "search",
  "sender",
  "vendor",
  "client",
  "hasExclusions",
];

export const VendorTransformTracesTab: React.FC<VendorTransformTracesTabProps> = ({
  selectedClientId,
  clients = [],
}) => {
  const [traces, setTraces] = useState<VendorTransformTraceDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Column persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vendor_transform_traces_table_columns_v3");
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
      const saved = localStorage.getItem("vendor_transform_traces_search_columns_v3");
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
    localStorage.setItem("vendor_transform_traces_table_columns_v3", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("vendor_transform_traces_search_columns_v3", JSON.stringify(searchColumns));
  }, [searchColumns]);

  // Filters State
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

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowTrace, setSelectedRowTrace] = useState<VendorTransformTraceDto | null>(null);

  // Detail Modal State
  const [inspectTrace, setInspectTrace] = useState<VendorTransformTraceDto | null>(null);

  // Sync selectedClientId prop if changed from parent
  useEffect(() => {
    if (selectedClientId) {
      setFilterValues((prev) => ({ ...prev, client: String(selectedClientId) }));
      setAppliedFilters((prev) => ({ ...prev, client: String(selectedClientId) }));
      setCurrentPage(1);
    }
  }, [selectedClientId]);

  // Load vendors list
  useEffect(() => {
    getVendorsApi(undefined, 1, 1000)
      .then((res: any) => {
        const list = res?.results || (Array.isArray(res) ? res : []);
        setVendors(list);
      })
      .catch(() => setVendors([]));
  }, []);

  // Dropdown options
  const vendorOptions: Option[] = useMemo(
    () => [
      { value: "", label: "All Vendors" },
      ...vendors.map((v) => ({
        value: String(v.id),
        label: v.profileName || `Vendor #${v.id}`,
      })),
    ],
    [vendors]
  );

  const clientOptions: Option[] = useMemo(
    () => [
      { value: "", label: "All Clients" },
      ...clients.map((c) => ({
        value: String(c.id),
        label: c.name || c.smppUsername || `Client #${c.id}`,
      })),
    ],
    [clients]
  );

  const exclusionOptions: Option[] = [
    { label: "All Traces", value: "false" },
    { label: "Skipped / Failover Only", value: "true" },
  ];

  // Column definitions
  const allColumns: ColumnConfig[] = [
    {
      key: "messageId",
      label: "Message ID",
      tableLabel: "Message ID",
      type: "text",
      render: (trace) => (
        <span
          className="font-mono font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => setInspectTrace(trace)}
          title="Click to view trace details"
        >
          {trace.messageId}
        </span>
      ),
    },
    {
      key: "selectedVendor",
      label: "Selected Vendor",
      tableLabel: "Selected Vendor",
      type: "text",
      options: vendorOptions,
      render: (trace) => (
        <span className="font-medium text-text-primary dark:text-white">
          {trace.selectedVendor__profileName ||
            (trace.selectedVendor ? `Vendor #${trace.selectedVendor}` : "-")}
        </span>
      ),
    },
    {
      key: "selectedRoute",
      label: "Selected Route",
      tableLabel: "Selected Route",
      type: "text",
      render: (trace) => (
        <span>
          {trace.selectedRoute
            ? `Route #${trace.selectedRoute}${
                trace.selectedRoute__name ? ` (${trace.selectedRoute__name})` : ""
              }`
            : "-"}
        </span>
      ),
    },
    {
      key: "client",
      label: "Client",
      tableLabel: "Client",
      type: "text",
      options: clientOptions,
      render: (trace) => <span>{trace.client__name || "-"}</span>,
    },
    {
      key: "sender",
      label: "Sender (Orig → Phase 4 → Final)",
      tableLabel: "Sender (Orig → Phase 4 → Final)",
      type: "text",
      render: (trace) => {
        const senderChanged = trace.finalVendorSender !== trace.originalSender;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-mono">
            <span>{trace.originalSender || "(blank)"}</span>
            <ArrowRight size={14} className="text-gray-400 shrink-0" />
            <span className="text-blue-600 dark:text-blue-400">
              {trace.phase4Sender || "(blank)"}
            </span>
            <ArrowRight size={14} className="text-gray-400 shrink-0" />
            <span
              className={
                senderChanged
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : ""
              }
            >
              {trace.finalVendorSender || "(blank)"}
            </span>
          </div>
        );
      },
    },
    {
      key: "destination",
      label: "Destination & Segments",
      tableLabel: "Destination & Segs",
      type: "text",
      render: (trace) => {
        const destChanged =
          Boolean(trace.originalDestination) &&
          Boolean(trace.finalVendorDestination) &&
          trace.originalDestination !== trace.finalVendorDestination;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-mono">
            {destChanged ? (
              <>
                <span className="text-gray-400">{trace.originalDestination}</span>
                <ArrowRight size={14} className="text-gray-400 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {trace.finalVendorDestination}
                </span>
              </>
            ) : (
              <span>
                {trace.finalVendorDestination || trace.originalDestination || "-"}
              </span>
            )}
            <span className="text-xs text-gray-400 font-sans">
              ({trace.segmentsBefore} → {trace.segmentsAfter} segs)
            </span>
          </div>
        );
      },
    },
    {
      key: "appliedRules",
      label: "Applied Rules",
      tableLabel: "Applied Rules",
      type: "text",
      isSearchable: false,
      render: (trace) => {
        const rules = Array.isArray(trace.appliedRuleIds) ? trace.appliedRuleIds : [];
        return rules.length > 0 ? (
          <div className="flex items-center gap-1">
            {rules.map((rid) => (
              <StatusBadge key={rid} status="SUBMITTED" customText={`#${rid}`} />
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "skippedVendors",
      label: "Skipped Vendors",
      tableLabel: "Skipped Vendors",
      type: "text",
      isSearchable: false,
      render: (trace) => {
        const exclusions = Array.isArray(trace.exclusionsSummary)
          ? trace.exclusionsSummary
          : [];
        return exclusions.length > 0 ? (
          <StatusBadge
            status="FAILED"
            customText={`${exclusions.length} Skipped`}
          />
        ) : (
          <StatusBadge status="ACTIVE" customText="Primary OK" />
        );
      },
    },
    {
      key: "latencyUs",
      label: "Latency",
      tableLabel: "Latency",
      type: "number",
      isSearchable: false,
      render: (trace) => (
        <span className="font-mono text-sm">
          {trace.latencyUs != null ? `${trace.latencyUs.toLocaleString()} µs` : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Timestamp",
      tableLabel: "Timestamp",
      type: "date",
      isSearchable: false,
      render: (trace) => (
        <span>{trace.createdAt ? formatDateTime(trace.createdAt) : "-"}</span>
      ),
    },

    // Search-Only Fields
    {
      key: "search",
      label: "Message ID / Destination",
      type: "text",
      isSearchOnly: true,
      isSearchable: true,
    },
    {
      key: "dateFrom",
      label: "From Date",
      type: "date",
      isSearchOnly: true,
      isSearchable: true,
    },
    {
      key: "dateTo",
      label: "To Date",
      type: "date",
      isSearchOnly: true,
      isSearchable: true,
    },
    {
      key: "hasExclusions",
      label: "Skipped Vendors Only",
      type: "boolean",
      options: exclusionOptions,
      isSearchOnly: true,
      isSearchable: true,
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
  };

  const handleClearFilters = () => {
    const resetValues: Record<string, string> = {};
    if (selectedClientId) {
      resetValues.client = String(selectedClientId);
    }
    setFilterValues(resetValues);
    setAppliedFilters(resetValues);
    setCurrentPage(1);
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // 0 is S.N.
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

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: rowsPerPage,
      };

      if (appliedFilters.search?.trim()) params.search = appliedFilters.search.trim();
      if (appliedFilters.sender?.trim()) params.sender = appliedFilters.sender.trim();
      if (appliedFilters.vendor?.trim()) params.vendor = Number(appliedFilters.vendor);
      if (appliedFilters.client?.trim()) params.client = Number(appliedFilters.client);
      if (appliedFilters.hasExclusions === "true") params.hasExclusions = true;
      if (appliedFilters.dateFrom) {
        params.dateFrom = new Date(`${appliedFilters.dateFrom}T00:00:00`).toISOString();
      }
      if (appliedFilters.dateTo) {
        params.dateTo = new Date(`${appliedFilters.dateTo}T23:59:59`).toISOString();
      }

      if (sortConfig) {
        const sortKeyMap: Record<string, string> = {
          messageId: "message_id",
          selectedVendor: "selected_vendor__profile_name",
          sender: "original_sender",
          destination: "original_destination",
          latencyUs: "latency_us",
          createdAt: "created_at",
        };
        const orderField = sortKeyMap[sortConfig.key] || sortConfig.key;
        params.ordering = sortConfig.direction === "desc" ? `-${orderField}` : orderField;
      }

      const res = await getVendorTransformTracesApi(params);
      setTraces(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to fetch vendor transform traces:", err);
      toast.error("Failed to load vendor transform traces");
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, appliedFilters, sortConfig]);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  const handleContextMenu = (e: React.MouseEvent, trace: VendorTransformTraceDto) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowTrace(trace);
  };

  const contextMenuItems: ContextMenuItem[] = selectedRowTrace
    ? [
        {
          label: "Inspect Trace Details",
          icon: <Eye size={16} />,
          onClick: () => {
            setInspectTrace(selectedRowTrace);
            setContextMenuPos(null);
          },
        },
        {
          label: "Copy Message ID",
          icon: <Copy size={16} />,
          onClick: () => {
            navigator.clipboard.writeText(selectedRowTrace.messageId);
            toast.success("Message ID copied to clipboard");
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
              type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
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
        data={traces}
        totalItems={totalCount}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={loading}
        serverSide={true}
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
        emptyMessage="No vendor transformation traces found"
        renderRow={(trace: VendorTransformTraceDto, index: number) => (
          <tr
            key={trace.id || index}
            onContextMenu={(e) => handleContextMenu(e, trace)}
            onDoubleClick={() => setInspectTrace(trace)}
            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-context-menu transition-colors"
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
                    {col.render(trace)}
                  </td>
                );
              }
              const cellData = (trace as any)[col.key];
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

      {/* Trace Detail Modal */}
      <VendorTransformTraceModal
        isOpen={Boolean(inspectTrace)}
        onClose={() => setInspectTrace(null)}
        trace={inspectTrace}
      />
    </div>
  );
};

export default VendorTransformTracesTab;
