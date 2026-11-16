import React, { useState, useEffect, useCallback } from "react";
import { Home, RefreshCw, Eye, Lock, UserCheck, User as UserIcon } from "lucide-react";
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
import TextArea from "../../components/ui/TextArea";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";

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

// Workstream B R4.2 (Critical-alert detection) + R4.3 (acknowledgment +
// ownership, scoped deliberately -- no investigation notes as a separate
// feature, no escalation timers, no role-based/email routing, no manual
// resolution). Reads AlertEvent directly, not Notification -- an open
// incident stays visible here even if its own Notification/WebSocket
// delivery failed, since AlertEvent is the durable source of truth and
// Notification is just one delivery path off of it. Resolution stays
// exclusively automatic (raise_alert/resolve_alert) -- acknowledging only
// ever moves OPEN->ACKNOWLEDGED, never ->RESOLVED.
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

  useEffect(() => {
    getAssignableUsersApi()
      .then((res) => setAssignableUsers(res.results))
      .catch(() => { /* picker just stays empty -- self-assignment via the default still works */ });
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
        currentPage, rowsPerPage, statusFilter || undefined, severityFilter || undefined,
      );
      setRows(res.results);
      setTotalItems(res.total);
    } catch (err) {
      toast.error("Failed to load operational alerts.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, severityFilter, currentPage, rowsPerPage]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const headers = [
    "Severity", "Event Type", "Category", "Subject", "Status", "Assigned To",
    "First Detected", "Last Detected", "Occurrences", "",
  ];

  const renderRow = (item: OperationalAlertRow) => (
    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
      <td className="px-4 py-3"><StatusBadge status={item.severity} /></td>
      <td className="px-4 py-3 text-sm text-text-primary dark:text-white whitespace-nowrap">{item.event_type}</td>
      <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300 whitespace-nowrap">
        {CATEGORY_LABELS[item.category] || item.category}
      </td>
      <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">
        {item.financial_review_restricted ? (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <Lock size={11} /> Restricted
          </span>
        ) : (
          item.subject_ref
        )}
      </td>
      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
      <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300 whitespace-nowrap">
        {item.assigned_to_username ? (
          <span className="inline-flex items-center gap-1"><UserCheck size={12} className="text-primary" /> {item.assigned_to_username}</span>
        ) : (
          <span className="text-text-secondary dark:text-gray-500">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.first_detected_at)}</td>
      <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.last_detected_at)}</td>
      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">{item.occurrence_count}</td>
      <td className="px-4 py-3">
        <button onClick={() => openDetail(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
          <Eye size={13} /> View
        </button>
      </td>
    </tr>
  );

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
      setViewRow({ ...viewRow, status: result.status as OperationalAlertRow["status"], assigned_to_id: result.assigned_to_id, assigned_to_username: result.assigned_to_username });
      loadHistory(viewRow.id);
      fetchRows();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Failed to acknowledge this alert.");
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className="container mx-auto pb-4 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
            Operational Alerts
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Critical/warning reliability incidents raised by the monitoring collectors. You can acknowledge and assign ownership here; nothing resolves an incident manually or touches SMS/financial state -- resolution stays automatic.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-40">
            <Select value={severityFilter} onChange={(v) => { setSeverityFilter(v); setCurrentPage(1); }} options={SEVERITY_OPTIONS} placeholder="Severity" clearable />
          </div>
          <div className="w-40">
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} options={STATUS_OPTIONS} placeholder="Status" clearable />
          </div>
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-text-secondary">
            <Home size={14} className="text-gray-400" />
            <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
            <span>/</span><span className="text-text-primary dark:text-white font-medium">Operational Alerts</span>
          </div>
        </div>
      </div>

      <DataTable
        serverSide
        data={rows}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        isLoading={isLoading}
        headers={headers}
        emptyMessage="No alerts for this filter -- a quiet result here is a healthy sign, not a loading problem."
        renderRow={renderRow}
      />

      <Modal isOpen={!!viewRow} onClose={() => setViewRow(null)} title="Alert Detail" className="max-w-2xl">
        {viewRow && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={viewRow.severity} />
              <StatusBadge status={viewRow.status} />
              <span className="text-text-secondary dark:text-gray-400">{CATEGORY_LABELS[viewRow.category] || viewRow.category}</span>
            </div>
            <div><span className="text-text-secondary dark:text-gray-400">Event type:</span> {viewRow.event_type}</div>
            <div><span className="text-text-secondary dark:text-gray-400">Subject:</span>{" "}
              {viewRow.financial_review_restricted ? (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Lock size={11} /> Restricted -- contact an ADMIN or FINANCE user for details.</span>
              ) : (
                <span className="font-mono">{viewRow.subject_ref}</span>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 whitespace-pre-wrap break-words">
              {viewRow.message}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-text-secondary dark:text-gray-400">First detected:</span> {formatDateTime(viewRow.first_detected_at)}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Last detected:</span> {formatDateTime(viewRow.last_detected_at)}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Occurrences:</span> {viewRow.occurrence_count}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Resolved at:</span> {viewRow.resolved_at ? formatDateTime(viewRow.resolved_at) : "-"}</div>
            </div>
            <div><span className="text-text-secondary dark:text-gray-400">Currently assigned to:</span>{" "}
              {viewRow.assigned_to_username || <span className="text-text-secondary dark:text-gray-500">Unassigned</span>}
            </div>

            {viewRow.status !== "RESOLVED" && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                  Acknowledge / Reassign
                </h3>
                <p className="text-[11px] text-text-secondary dark:text-gray-500">
                  Acknowledging records that you've taken responsibility -- it does not resolve the underlying condition. Resolution happens automatically once the condition actually clears.
                </p>
                <TextArea
                  label="Note (optional)"
                  rows={2}
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="What are you doing about this?"
                />
                <Select
                  value={ackAssignTo}
                  onChange={setAckAssignTo}
                  options={assignableUsers.map((u) => ({ value: String(u.id), label: u.username }))}
                  placeholder="Assign to (defaults to yourself)"
                  clearable
                />
                <Button onClick={handleAcknowledge} leftIcon={<UserCheck size={14} />} disabled={isAcknowledging}>
                  {isAcknowledging ? "Acknowledging..." : "Acknowledge"}
                </Button>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                History
              </h3>
              {isHistoryLoading ? (
                <p className="text-text-secondary dark:text-gray-500">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-text-secondary dark:text-gray-500">No acknowledgments yet.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/60">
                    <UserIcon size={12} className="text-text-secondary dark:text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-text-primary dark:text-white">{h.acknowledged_by || "unknown"}</span>
                        <span className="text-text-secondary dark:text-gray-500">{formatDateTime(h.acknowledged_at)}</span>
                      </div>
                      {h.note && <div className="text-text-secondary dark:text-gray-400 mt-0.5 break-words">{h.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OperationalAlerts;
