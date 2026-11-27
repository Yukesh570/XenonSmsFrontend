import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Home, RefreshCw, Eye, Lock, UserCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getOperationalAlertsApi,
  getAssignableUsersApi,
  getAlertAcknowledgmentsApi,
  acknowledgeAlertApi,
  type OperationalAlertRow,
  type AssignableUser,
  type AlertAcknowledgmentRow,
} from "../../api/reportApi/r4MonitoringApi";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";
import { OperationalAlertModal } from "../../components/modals/Report/OperationalAlertModal";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "RESOLVED", label: "Resolved" },
];

const SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
];

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL_INTEGRITY: "Financial Integrity",
  SMPP_RELIABILITY: "SMPP Reliability",
  INFRASTRUCTURE: "Infrastructure",
  RELIABILITY_ALERT: "Reliability Alert",
};

interface TableColumnConfig {
  key: string;
  label: string;
}

const ALL_TABLE_COLUMNS: TableColumnConfig[] = [
  { key: "severity", label: "Severity" },
  { key: "event_type", label: "Event Type" },
  { key: "category", label: "Category" },
  { key: "subject", label: "Subject" },
  { key: "status", label: "Status" },
  { key: "assigned_to", label: "Assigned To" },
  { key: "first_detected", label: "First Detected" },
  { key: "last_detected", label: "Last Detected" },
  { key: "occurrences", label: "Occurrences" },
];

const DEFAULT_TABLE_COLUMNS = [
  "severity",
  "event_type",
  "category",
  "subject",
  "status",
  "assigned_to",
  "first_detected",
  "last_detected",
  "occurrences",
];

const OperationalAlerts: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [rows, setRows] = useState<OperationalAlertRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewRow, setViewRow] = useState<OperationalAlertRow | null>(null);

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [history, setHistory] = useState<AlertAcknowledgmentRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [ackAssignTo, setAckAssignTo] = useState("");
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Column management (Drag, Toggle, Lock)
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("operational_alerts_table_columns_v2");
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
    localStorage.setItem("operational_alerts_table_columns_v2", JSON.stringify(tableColumns));
  }, [tableColumns]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<OperationalAlertRow | null>(null);

  useEffect(() => {
    getAssignableUsersApi()
      .then((res) => setAssignableUsers(res.results))
      .catch(() => {
        /* picker defaults to self-assignment */
      });
  }, []);

  const loadHistory = useCallback((alertId: number) => {
    setIsHistoryLoading(true);
    getAlertAcknowledgmentsApi(alertId)
      .then((res) => setHistory(res.results))
      .catch(() => toast.error("Failed to load acknowledgment history."))
      .finally(() => setIsHistoryLoading(false));
  }, []);

  const openDetail = (item: OperationalAlertRow) => {
    setViewRow(item);
    setAckNote("");
    setAckAssignTo("");
    setHistory([]);
    loadHistory(item.id);
  };

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getOperationalAlertsApi(
        currentPage,
        rowsPerPage,
        statusFilter || undefined,
        severityFilter || undefined,
      );
      setRows(res.results);
      setTotalItems(res.total);
    } catch {
      toast.error("Failed to load operational alerts.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, severityFilter, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const visibleColumns = useMemo(() => {
    return tableColumns
      .map((key) => ALL_TABLE_COLUMNS.find((c) => c.key === key))
      .filter((c): c is TableColumnConfig => !!c);
  }, [tableColumns]);

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
        case "severity":
          aVal = a.severity;
          bVal = b.severity;
          break;
        case "event_type":
          aVal = a.event_type;
          bVal = b.event_type;
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "subject":
          aVal = a.subject_ref;
          bVal = b.subject_ref;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "assigned_to":
          aVal = a.assigned_to_username || "";
          bVal = b.assigned_to_username || "";
          break;
        case "first_detected":
          aVal = a.first_detected_at;
          bVal = b.first_detected_at;
          break;
        case "last_detected":
          aVal = a.last_detected_at;
          bVal = b.last_detected_at;
          break;
        case "occurrences":
          aVal = a.occurrence_count;
          bVal = b.occurrence_count;
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

  const handleContextMenu = (e: React.MouseEvent, item: OperationalAlertRow) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow
    ? [
        {
          label: "View Alert Details",
          icon: <Eye size={16} />,
          onClick: () => {
            openDetail(selectedRow);
          },
        },
      ]
    : [];

  const handleAcknowledge = async () => {
    if (!viewRow) return;
    setIsAcknowledging(true);
    try {
      const payload: { note?: string; assign_to?: number } = {};
      if (ackNote.trim()) payload.note = ackNote.trim();
      if (ackAssignTo) payload.assign_to = Number(ackAssignTo);
      const result = await acknowledgeAlertApi(viewRow.id, payload);
      toast.success(`Acknowledged -- assigned to ${result.assigned_to_username}.`);
      setAckNote("");
      setAckAssignTo("");
      setViewRow({
        ...viewRow,
        status: result.status as OperationalAlertRow["status"],
        assigned_to_id: result.assigned_to_id,
        assigned_to_username: result.assigned_to_username,
      });
      loadHistory(viewRow.id);
      fetchRows();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const detail = errorObj?.response?.data?.detail;
      toast.error(detail || "Failed to acknowledge this alert.");
    } finally {
      setIsAcknowledging(false);
    }
  };

  const renderCell = (item: OperationalAlertRow, colKey: string) => {
    switch (colKey) {
      case "severity":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.severity} />
          </td>
        );
      case "event_type":
        return (
          <td
            key={colKey}
            className="px-4 py-3 text-sm font-semibold text-primary cursor-pointer hover:underline whitespace-nowrap"
            onClick={() => openDetail(item)}
          >
            {item.event_type}
          </td>
        );
      case "category":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {CATEGORY_LABELS[item.category] || item.category}
          </td>
        );
      case "subject":
        return (
          <td key={colKey} className="px-4 py-3 text-sm font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.financial_review_restricted ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Lock size={12} /> Restricted
              </span>
            ) : (
              item.subject_ref
            )}
          </td>
        );
      case "status":
        return (
          <td key={colKey} className="px-4 py-3">
            <StatusBadge status={item.status} />
          </td>
        );
      case "assigned_to":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {item.assigned_to_username ? (
              <span className="inline-flex items-center gap-1 font-medium text-text-primary dark:text-white">
                <UserCheck size={13} className="text-primary" /> {item.assigned_to_username}
              </span>
            ) : (
              <span className="text-gray-400 italic">Unassigned</span>
            )}
          </td>
        );
      case "first_detected":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(item.first_detected_at)}
          </td>
        );
      case "last_detected":
        return (
          <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(item.last_detected_at)}
          </td>
        );
      case "occurrences":
        return (
          <td key={colKey} className="px-4 py-3 text-sm font-semibold text-text-primary dark:text-white">
            {item.occurrence_count}
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
            Operational Alerts
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Monitor and manage system reliability incidents and active alerts.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary shrink-0 pt-1">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Operational Alerts</span>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard
        onSearch={fetchRows}
        onClear={() => {
          setSeverityFilter("");
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
          label="Filter Severity"
          value={severityFilter}
          onChange={(v) => {
            setSeverityFilter(v);
            setCurrentPage(1);
          }}
          options={SEVERITY_OPTIONS}
          placeholder="All Severities"
          clearable
        />
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
      </FilterCard>

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
        storageKey="operational_alerts_table_widths_v2"
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
            onDoubleClick={() => openDetail(item)}
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

      <OperationalAlertModal
        isOpen={!!viewRow}
        onClose={() => setViewRow(null)}
        viewRow={viewRow}
        assignableUsers={assignableUsers}
        history={history}
        isHistoryLoading={isHistoryLoading}
        ackNote={ackNote}
        setAckNote={setAckNote}
        ackAssignTo={ackAssignTo}
        setAckAssignTo={setAckAssignTo}
        isAcknowledging={isAcknowledging}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  );
};

export default OperationalAlerts;
