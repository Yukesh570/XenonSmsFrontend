import React, { useState, useEffect, useCallback } from "react";
import { Home, RefreshCw, Eye } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getFinancialReviewApi,
} from "../../api/reportApi/r4MonitoringApi";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";

const STATUS_OPTIONS = [
  { value: "FINANCIAL_REVIEW_PENDING", label: "Pending Review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ALL", label: "All" },
];

interface TerminalFailureRow {
  id: number;
  stream_id: string;
  message_id: string | null;
  raw_client_id: number | null;
  raw_vendor_id: number | null;
  reason: string;
  payload: any;
  status: string;
  delivery_count_at_terminal: number;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

// Workstream B R4.1 (Monitoring, Stage 2 Section 21/27.6): read-only view
// of AcceptedTerminalFailure. "Potential exposure" below is the accept-time
// debit captured at the moment of terminal failure, not a confirmed loss --
// labeled as such, never relabeled. No write path exists on this screen:
// no note/owner/status change, no refund/adjustment -- that boundary is by
// design, not a missing feature (deferred to a future stage if ever wanted).
const FinancialReviewCenter: React.FC = () => {
  const [rows, setRows] = useState<TerminalFailureRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("FINANCIAL_REVIEW_PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewRow, setViewRow] = useState<TerminalFailureRow | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFinancialReviewApi(currentPage, rowsPerPage, statusFilter);
      setRows(res.results as TerminalFailureRow[]);
      setTotalItems(res.total);
    } catch (err) {
      toast.error("Failed to load the financial review queue.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, rowsPerPage, statusFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const estimateExposure = (payload: any): string | null => {
    if (!payload) return null;
    const candidates = ["amount", "debit_amount", "charge_amount", "value"];
    for (const key of candidates) {
      if (payload[key] !== undefined) return String(payload[key]);
    }
    return null;
  };

  return (
    <div className="container mx-auto pb-4 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
            Financial Review Center
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Accepted-stream entries that could never be written to a real message, awaiting manual financial review. View/filter only -- no status change or refund happens here.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              options={STATUS_OPTIONS}
              placeholder="Status"
            />
          </div>
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-text-secondary">
            <Home size={14} className="text-gray-400" />
            <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
            <span>/</span><span className="text-text-primary dark:text-white font-medium">Financial Review Center</span>
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
        headers={["ID", "Stream ID", "Message ID", "Reason", "Potential Exposure", "Retries", "Status", "Created At", ""]}
        emptyMessage="No entries in this filter."
        renderRow={(item) => (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors">
            <td className="px-4 py-3 text-sm text-text-primary dark:text-white">{item.id}</td>
            <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.stream_id}</td>
            <td className="px-4 py-3 text-sm text-text-primary dark:text-white whitespace-nowrap">{item.message_id || "-"}</td>
            <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{item.reason}</td>
            <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
              {estimateExposure(item.payload) ?? <span className="text-gray-400 italic">not captured</span>}
            </td>
            <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">{item.delivery_count_at_terminal}</td>
            <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
            <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
            <td className="px-4 py-3">
              <button onClick={() => setViewRow(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                <Eye size={13} /> View
              </button>
            </td>
          </tr>
        )}
      />

      <Modal isOpen={!!viewRow} onClose={() => setViewRow(null)} title="Terminal Failure Detail" className="max-w-3xl">
        {viewRow && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-semibold text-primary px-2">Overview</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-secondary dark:text-gray-400">Stream ID:</span> <span className="font-mono">{viewRow.stream_id}</span></div>
                <div><span className="text-text-secondary dark:text-gray-400">Reason:</span> {viewRow.reason}</div>
                <div><span className="text-text-secondary dark:text-gray-400">Message ID:</span> {viewRow.message_id || "-"}</div>
                <div><span className="text-text-secondary dark:text-gray-400">Status:</span> <StatusBadge status={viewRow.status} /></div>
                <div><span className="text-text-secondary dark:text-gray-400">Raw Client ID:</span> {viewRow.raw_client_id ?? "-"}</div>
                <div><span className="text-text-secondary dark:text-gray-400">Raw Vendor ID:</span> {viewRow.raw_vendor_id ?? "-"}</div>
                <div><span className="text-text-secondary dark:text-gray-400">Delivery Count at Terminal:</span> {viewRow.delivery_count_at_terminal}</div>
                <div><span className="text-text-secondary dark:text-gray-400">Created:</span> {formatDateTime(viewRow.created_at)}</div>
              </div>
            </fieldset>
            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-semibold text-primary px-2">Preserved Accept-Time Payload</legend>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(viewRow.payload, null, 2)}
              </pre>
            </fieldset>
            {viewRow.resolution_note && (
              <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <legend className="text-sm font-semibold text-primary px-2">Resolution Note</legend>
                <p className="text-sm whitespace-pre-wrap">{viewRow.resolution_note}</p>
              </fieldset>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinancialReviewCenter;
