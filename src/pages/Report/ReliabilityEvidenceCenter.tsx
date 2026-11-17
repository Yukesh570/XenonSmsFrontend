import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Home, RefreshCw, Eye, Info } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getReliabilityEvidenceApi,
  type EvidenceSource,
} from "../../api/reportApi/r4MonitoringApi";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";
import {
  ReliabilityEvidenceModal,
  type ReliabilityEvidenceRecord,
} from "../../components/modals/Report/ReliabilityEvidenceModal";

const SOURCE_OPTIONS: { value: EvidenceSource; label: string }[] = [
  { value: "unmatched_resp", label: "Unmatched Vendor Submit Responses" },
  { value: "unmatched_dlr", label: "Unmatched Vendor DLRs" },
  { value: "protocol_conflict", label: "Protocol Outcome Conflicts" },
  { value: "dlr_conflict", label: "DLR Conflicts" },
  { value: "deadletter_inbound", label: "Inbound Dead-Letter Stream" },
];

const STATUS_FILTERABLE_SOURCES: EvidenceSource[] = ["unmatched_resp", "unmatched_dlr"];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "FINAL_UNMATCHED", label: "Final Unmatched" },
];

interface TableColumnConfig {
  key: string;
  label: string;
}

const COLUMNS_BY_SOURCE: Record<EvidenceSource, TableColumnConfig[]> = {
  deadletter_inbound: [
    { key: "stream_id", label: "Stream ID" },
    { key: "reason", label: "Reason" },
    { key: "vendor", label: "Vendor" },
    { key: "dead_lettered_at", label: "Dead-Lettered At" },
  ],
  protocol_conflict: [
    { key: "segment", label: "Segment" },
    { key: "vendor_msg_id", label: "Vendor Msg ID" },
    { key: "existing", label: "Existing Source" },
    { key: "incoming", label: "Incoming Source" },
    { key: "detected_at", label: "Detected At" },
  ],
  dlr_conflict: [
    { key: "segment", label: "Segment" },
    { key: "vendor_msg_id", label: "Vendor Msg ID" },
    { key: "winner_status", label: "Winner Status" },
    { key: "loser_status", label: "Loser Status" },
    { key: "created_at", label: "Created At" },
    { key: "resolved_at", label: "Resolved At" },
  ],
  unmatched_resp: [
    { key: "vendor", label: "Vendor" },
    { key: "vendor_msg_id", label: "Vendor Msg ID" },
    { key: "outcome", label: "Outcome / Status" },
    { key: "retries", label: "Retries" },
    { key: "created_at", label: "Created At" },
  ],
  unmatched_dlr: [
    { key: "vendor", label: "Vendor" },
    { key: "vendor_msg_id", label: "Vendor Msg ID" },
    { key: "outcome", label: "Outcome / Status" },
    { key: "retries", label: "Retries" },
    { key: "created_at", label: "Created At" },
  ],
};

const ReliabilityEvidenceCenter: React.FC = () => {
  const [source, setSource] = useState<EvidenceSource>("unmatched_resp");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<ReliabilityEvidenceRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewRow, setViewRow] = useState<ReliabilityEvidenceRecord | null>(null);

  // Column management per source
  const allColumnsForSource = useMemo(
    () => COLUMNS_BY_SOURCE[source] || COLUMNS_BY_SOURCE.unmatched_resp,
    [source]
  );
  const defaultKeysForSource = useMemo(() => allColumnsForSource.map((c) => c.key), [allColumnsForSource]);

  const [tableColumns, setTableColumns] = useState<string[]>(defaultKeysForSource);

  useEffect(() => {
    const activeSource = source || "unmatched_resp";
    const saved = localStorage.getItem(`reliability_evidence_cols_${activeSource}_v2`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTableColumns(parsed.filter((k: string) => k !== "actions"));
          return;
        }
      } catch {
        /* fallback */
      }
    }
    setTableColumns(defaultKeysForSource);
  }, [source, defaultKeysForSource]);

  const updateTableColumns = (newCols: string[]) => {
    const activeSource = source || "unmatched_resp";
    setTableColumns(newCols);
    localStorage.setItem(`reliability_evidence_cols_${activeSource}_v2`, JSON.stringify(newCols));
  };

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<ReliabilityEvidenceRecord | null>(null);

  const fetchRows = useCallback(async () => {
    const activeSource = source || "unmatched_resp";
    setIsLoading(true);
    try {
      const res = await getReliabilityEvidenceApi(
        activeSource,
        currentPage,
        rowsPerPage,
        STATUS_FILTERABLE_SOURCES.includes(activeSource) ? statusFilter || undefined : undefined,
      );
      setRows(res.results);
      setTotalItems(res.total);
    } catch {
      toast.error("Failed to load reliability evidence.");
    } finally {
      setIsLoading(false);
    }
  }, [source, statusFilter, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleSourceChange = (v: string) => {
    if (!v) return;
    setSource(v as EvidenceSource);
    setStatusFilter("");
    setCurrentPage(1);
    setSortConfig(null);
  };

  const isDeadLetter = source === "deadletter_inbound";

  const visibleColumns = useMemo(() => {
    return tableColumns
      .map((k) => allColumnsForSource.find((c) => c.key === k))
      .filter((c): c is TableColumnConfig => !!c);
  }, [tableColumns, allColumnsForSource]);

  const headers = useMemo(() => {
    return ["S.N.", ...visibleColumns.map((c) => c.label)];
  }, [visibleColumns]);

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // S.N. offset
    if (colIndex >= 0 && colIndex < visibleColumns.length) {
      const col = visibleColumns[colIndex];
      setSortConfig((prev) => {
        if (prev && prev.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const sorted = [...rows].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      switch (sortConfig.key) {
        case "stream_id":
          aVal = a.stream_id;
          bVal = b.stream_id;
          break;
        case "reason":
          aVal = a.payload?.reason || "";
          bVal = b.payload?.reason || "";
          break;
        case "vendor":
          aVal = a.vendor_name || a.vendor_profile_name || a.connection_id || a.vendor_id || "";
          bVal = b.vendor_name || b.vendor_profile_name || b.connection_id || b.vendor_id || "";
          break;
        case "vendor_msg_id":
          aVal = a.vendor_msg_id || (a.payload?.vendor_msg_id as string) || "";
          bVal = b.vendor_msg_id || (b.payload?.vendor_msg_id as string) || "";
          break;
        case "outcome":
          aVal = a.outcome || a.status || "";
          bVal = b.outcome || b.status || "";
          break;
        case "retries":
          aVal = a.retry_count || 0;
          bVal = b.retry_count || 0;
          break;
        case "segment":
          aVal = a.segment_id || 0;
          bVal = b.segment_id || 0;
          break;
        case "created_at":
          aVal = a.created_at || "";
          bVal = b.created_at || "";
          break;
        default:
          aVal = (a as unknown as Record<string, unknown>)[sortConfig.key];
          bVal = (b as unknown as Record<string, unknown>)[sortConfig.key];
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [rows, sortConfig]);

  const handleContextMenu = (e: React.MouseEvent, item: ReliabilityEvidenceRecord) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => {
            setViewRow(selectedRow);
          },
        },
      ]
    : [];

  const renderCell = (item: ReliabilityEvidenceRecord, colKey: string) => {
    switch (colKey) {
      case "stream_id":
        return (
          <td key={colKey} className="px-4 py-3 text-sm font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.stream_id}
          </td>
        );
      case "reason":
        return (
          <td
            key={colKey}
            className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 max-w-md truncate"
            title={item.payload?.reason}
          >
            {item.payload?.reason || "-"}
          </td>
        );
      case "vendor": {
        let parsedData: { vendor_id?: string | number } | null = null;
        try {
          parsedData = JSON.parse((item.payload?.data as string) || "{}");
        } catch {
          /* undecodable payload */
        }
        return (
          <td key={colKey} className="px-4 py-3 text-sm font-medium text-text-primary dark:text-white whitespace-nowrap">
            {item.vendor_name || item.vendor_profile_name || item.connection_id || item.vendor_id || parsedData?.vendor_id || "-"}
          </td>
        );
      }
      case "dead_lettered_at":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.payload?.dead_lettered_at
              ? formatDateTime(new Date(Number(item.payload.dead_lettered_at)).toISOString())
              : "-"}
          </td>
        );
      case "segment":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            {item.segment_id ?? "-"}
          </td>
        );
      case "vendor_msg_id":
        return (
          <td key={colKey} className="px-4 py-3 text-sm font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.vendor_msg_id || (item.payload?.vendor_msg_id as string) || "-"}
          </td>
        );
      case "existing":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.existingSource}: <StatusBadge status={item.existingStatus} />
          </td>
        );
      case "incoming":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.incomingSource}: <StatusBadge status={item.incomingStatus} />
          </td>
        );
      case "detected_at":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(item.detectedAt)}
          </td>
        );
      case "winner_status":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.winner_status} />
          </td>
        );
      case "loser_status":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.loser_status} />
          </td>
        );
      case "resolved_at":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.resolved_at ? formatDateTime(item.resolved_at) : "-"}
          </td>
        );
      case "outcome":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.outcome || item.status} />
          </td>
        );
      case "retries":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            {item.retry_count ?? "-"}
          </td>
        );
      case "created_at":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(item.created_at)}
          </td>
        );
      default:
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            {String((item as unknown as Record<string, unknown>)[colKey] ?? "-")}
          </td>
        );
    }
  };

  return (
    <div className="container mx-auto pb-6" onClick={() => setContextMenuPos(null)}>
      {/* Top Header */}
      <div className="mb-4 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Reliability Evidence Center
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            View reconciliation records, delivery conflicts, and correlation evidence.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary shrink-0 pt-1">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Reliability Evidence Center</span>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard
        onSearch={fetchRows}
        onClear={() => {
          setSource("unmatched_resp");
          setStatusFilter("");
          setCurrentPage(1);
        }}
        extraActions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchRows}
            leftIcon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>
        }
      >
        <Select
          label="Evidence Source"
          value={source}
          onChange={handleSourceChange}
          options={SOURCE_OPTIONS}
          placeholder="Select Evidence Source"
          clearable={false}
        />
        {STATUS_FILTERABLE_SOURCES.includes(source) && (
          <Select
            label="Filter Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            clearable
          />
        )}
      </FilterCard>

      {/* Dead-Letter Notice Banner */}
      {isDeadLetter && (
        <div className="mb-4 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-900/20 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            This source reads the Redis stream directly (paginated by walking forward from the oldest retained entry) -- a different access pattern than the Postgres-backed sources above, and one that cannot be sorted or filtered the same way.
          </span>
        </div>
      )}

      {/* Data Table with Resizing, Sorting, and Drag Reorder */}
      <DataTable
        serverSide={true}
        data={sortedRows}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        isLoading={isLoading}
        headers={headers}
        storageKey={`reliability_evidence_table_widths_${source}_v2`}
        resizableColumns={true}
        onSort={handleSort}
        sortColumnIndex={
          sortConfig
            ? visibleColumns.findIndex((c) => c.key === sortConfig.key) + 1
            : null
        }
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          updateTableColumns((() => {
            const next = [...tableColumns];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          })());
        }}
        renderRow={(item, index) => (
          <tr
            key={item.id || item.stream_id || index}
            onContextMenu={(e) => handleContextMenu(e, item)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors cursor-context-menu"
          >
            <td className="px-4 py-3 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleColumns.map((col) => renderCell(item, col.key))}
          </tr>
        )}
      />

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <ReliabilityEvidenceModal
        isOpen={!!viewRow}
        onClose={() => setViewRow(null)}
        viewRow={viewRow}
        source={source}
      />
    </div>
  );
};

export default ReliabilityEvidenceCenter;
