import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Home, RefreshCw, Eye } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getFinancialReviewApi,
} from "../../api/reportApi/r4MonitoringApi";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";
import {
  FinancialReviewModal,
  type TerminalFailureRow,
} from "../../components/modals/Report/FinancialReviewModal";

const STATUS_OPTIONS = [
  { value: "FINANCIAL_REVIEW_PENDING", label: "Pending Review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ALL", label: "All" },
];

interface TableColumnConfig {
  key: string;
  label: string;
}

const ALL_TABLE_COLUMNS: TableColumnConfig[] = [
  { key: "stream_id", label: "Stream ID" },
  { key: "message_id", label: "Message ID" },
  { key: "reason", label: "Reason" },
  { key: "exposure", label: "Potential Exposure" },
  { key: "retries", label: "Retries" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created At" },
];

const DEFAULT_TABLE_COLUMNS = [
  "stream_id",
  "message_id",
  "reason",
  "exposure",
  "retries",
  "status",
  "created_at",
];

const FinancialReviewCenter: React.FC = () => {
  const [rows, setRows] = useState<TerminalFailureRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("FINANCIAL_REVIEW_PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewRow, setViewRow] = useState<TerminalFailureRow | null>(null);

  // Column management (Drag, Toggle, Lock)
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("financial_review_table_columns_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((k: string) => k !== "actions");
        }
      } catch {
        /* fallback */
      }
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("financial_review_table_columns_v2", JSON.stringify(tableColumns));
  }, [tableColumns]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<TerminalFailureRow | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeStatus = statusFilter || "FINANCIAL_REVIEW_PENDING";
      const res = await getFinancialReviewApi(currentPage, rowsPerPage, activeStatus);
      setRows(res.results as TerminalFailureRow[]);
      setTotalItems(res.total);
    } catch {
      toast.error("Failed to load the financial review queue.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, rowsPerPage, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const estimateExposure = (payload: Record<string, unknown> | null | undefined): string | null => {
    if (!payload) return null;
    const candidates = ["amount", "debit_amount", "charge_amount", "value"];
    for (const key of candidates) {
      if (payload[key] !== undefined) return String(payload[key]);
    }
    return null;
  };

  const handleContextMenu = (e: React.MouseEvent, item: TerminalFailureRow) => {
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

  // Active columns configuration
  const visibleColumns = useMemo(() => {
    return tableColumns
      .map((key) => ALL_TABLE_COLUMNS.find((c) => c.key === key))
      .filter((c): c is TableColumnConfig => !!c);
  }, [tableColumns]);

  const headers = useMemo(() => {
    return ["S.N.", ...visibleColumns.map((c) => c.label)];
  }, [visibleColumns]);

  // Column sorting logic
  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // index 0 is S.N.
    if (colIndex >= 0 && colIndex < visibleColumns.length) {
      const col = visibleColumns[colIndex];
      if (col.key === "exposure") return;
      setSortConfig((prev) => {
        if (prev && prev.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const sorted = [...rows].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;
      if (sortConfig.key === "retries") {
        aVal = a.delivery_count_at_terminal;
        bVal = b.delivery_count_at_terminal;
      } else {
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

  const renderCell = (item: TerminalFailureRow, colKey: string) => {
    switch (colKey) {
      case "stream_id":
        return (
          <td
            key={colKey}
            className="px-4 py-3 text-sm font-mono font-semibold text-primary cursor-pointer hover:underline whitespace-nowrap"
            onClick={() => setViewRow(item)}
          >
            {item.stream_id}
          </td>
        );
      case "message_id":
        return (
          <td key={colKey} className="px-4 py-3 text-sm whitespace-nowrap">
            {item.message_id ? (
              <NavLink
                to={`/messageLifecycleExplorer?id=${encodeURIComponent(item.message_id)}`}
                className="font-mono text-primary hover:underline font-medium"
                title="View in Message Lifecycle Explorer"
              >
                {item.message_id}
              </NavLink>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
        );
      case "reason":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.reason}
          </td>
        );
      case "exposure":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {estimateExposure(item.payload) ?? <span className="text-gray-400 italic">not captured</span>}
          </td>
        );
      case "retries":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            {item.delivery_count_at_terminal}
          </td>
        );
      case "status":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.status} />
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
            Financial Review Center
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Review and audit unwritten stream entries requiring financial verification.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary shrink-0 pt-1">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Financial Review Center</span>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard
        onSearch={fetchRows}
        onClear={() => {
          setStatusFilter("FINANCIAL_REVIEW_PENDING");
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
          label="Review Status"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v || "FINANCIAL_REVIEW_PENDING");
            setCurrentPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="Select Status"
          clearable={false}
        />
      </FilterCard>

      {/* Data Table */}
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
        storageKey="financial_review_table_widths_v2"
        resizableColumns={true}
        onSort={handleSort}
        sortColumnIndex={
          sortConfig
            ? visibleColumns.findIndex((c) => c.key === sortConfig.key) + 1
            : null
        }
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
        }}
        renderRow={(item, index) => (
          <tr
            key={item.id}
            onContextMenu={(e) => handleContextMenu(e, item)}
            onDoubleClick={() => setViewRow(item)}
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

      <FinancialReviewModal
        isOpen={!!viewRow}
        onClose={() => setViewRow(null)}
        viewLog={viewRow}
      />
    </div>
  );
};

export default FinancialReviewCenter;
