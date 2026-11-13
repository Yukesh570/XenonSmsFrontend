import React, { useState, useEffect, useCallback } from "react";
import { Home, RefreshCw, Eye } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getReliabilityEvidenceApi,
  type EvidenceSource,
} from "../../api/reportApi/r4MonitoringApi";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";

const SOURCE_OPTIONS: { value: EvidenceSource; label: string }[] = [
  { value: "unmatched_resp", label: "Unmatched Vendor Submit Responses" },
  { value: "unmatched_dlr", label: "Unmatched Vendor DLRs" },
  { value: "protocol_conflict", label: "Protocol Outcome Conflicts" },
  { value: "dlr_conflict", label: "DLR Conflicts" },
  { value: "deadletter_inbound", label: "Inbound Dead-Letter Stream" },
];

// Sources backed by Postgres with a real status/outcome field; the other
// two (protocol_conflict, dlr_conflict) have no resolution workflow at all
// -- nothing ever sets a status on them, so no status filter is offered.
const STATUS_FILTERABLE_SOURCES: EvidenceSource[] = ["unmatched_resp", "unmatched_dlr"];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "FINAL_UNMATCHED", label: "Final Unmatched" },
];

// Workstream B R4.1 (Monitoring, Stage 2 Section 20, corrected by Section 27.5
// and the 5th review's clarifications): standard filtered+paginated list for
// the four Postgres-backed evidence tables, plus a DIFFERENT access pattern
// (paginated XRANGE, no native offset) for the one real Redis-backed dead-
// letter stream. There is no second Redis dead-letter stream for the
// accepted-writer pipeline -- its terminal path is Postgres
// (AcceptedTerminalFailure), covered by the Financial Review Center instead.
const ReliabilityEvidenceCenter: React.FC = () => {
  const [source, setSource] = useState<EvidenceSource>("unmatched_resp");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [viewRow, setViewRow] = useState<any | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getReliabilityEvidenceApi(
        source, currentPage, rowsPerPage,
        STATUS_FILTERABLE_SOURCES.includes(source) ? statusFilter || undefined : undefined,
      );
      setRows(res.results);
      setTotalItems(res.total);
    } catch (err) {
      toast.error("Failed to load reliability evidence.");
    } finally {
      setIsLoading(false);
    }
  }, [source, statusFilter, currentPage, rowsPerPage]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSourceChange = (v: string) => {
    setSource(v as EvidenceSource);
    setStatusFilter("");
    setCurrentPage(1);
  };

  const isDeadLetter = source === "deadletter_inbound";

  const headers = isDeadLetter
    ? ["Stream ID", "Reason", "Vendor ID", "Dead-Lettered At", ""]
    : source === "protocol_conflict"
    ? ["ID", "Segment", "Vendor Msg ID", "Existing", "Incoming", "Detected At", ""]
    : source === "dlr_conflict"
    ? ["ID", "Segment", "Vendor Msg ID", "Winner Status", "Loser Status", "Created At", "Resolved", ""]
    : ["ID", "Connection/Vendor ID", "Vendor Msg ID", "Outcome/Status", "Retries", "Created At", ""];

  const renderRow = (item: any) => {
    if (isDeadLetter) {
      let parsedData: any = null;
      try { parsedData = JSON.parse(item.payload?.data || "{}"); } catch { /* raw/undecodable, show as-is */ }
      return (
        <tr key={item.stream_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.stream_id}</td>
          <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 max-w-md truncate" title={item.payload?.reason}>{item.payload?.reason || "-"}</td>
          <td className="px-4 py-3 text-sm text-text-primary dark:text-white">{parsedData?.vendor_id ?? "-"}</td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.payload?.dead_lettered_at ? formatDateTime(new Date(Number(item.payload.dead_lettered_at)).toISOString()) : "-"}</td>
          <td className="px-4 py-3"><button onClick={() => setViewRow(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs"><Eye size={13} /> View</button></td>
        </tr>
      );
    }
    if (source === "protocol_conflict") {
      return (
        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          <td className="px-4 py-3 text-sm text-text-primary dark:text-white">{item.id}</td>
          <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">{item.segment_id}</td>
          <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.vendor_msg_id}</td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300 whitespace-nowrap">{item.existingSource}: <StatusBadge status={item.existingStatus} /></td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300 whitespace-nowrap">{item.incomingSource}: <StatusBadge status={item.incomingStatus} /></td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.detectedAt)}</td>
          <td className="px-4 py-3"><button onClick={() => setViewRow(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs"><Eye size={13} /> View</button></td>
        </tr>
      );
    }
    if (source === "dlr_conflict") {
      return (
        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          <td className="px-4 py-3 text-sm text-text-primary dark:text-white">{item.id}</td>
          <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">{item.segment_id ?? "-"}</td>
          <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.vendor_msg_id}</td>
          <td className="px-4 py-3"><StatusBadge status={item.winner_status} /></td>
          <td className="px-4 py-3"><StatusBadge status={item.loser_status} /></td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
          <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400">{item.resolved_at ? formatDateTime(item.resolved_at) : "-"}</td>
          <td className="px-4 py-3"><button onClick={() => setViewRow(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs"><Eye size={13} /> View</button></td>
        </tr>
      );
    }
    // unmatched_resp / unmatched_dlr
    return (
      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <td className="px-4 py-3 text-sm text-text-primary dark:text-white">{item.id}</td>
        <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.connection_id || item.vendor_id || "-"}</td>
        <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-gray-400 whitespace-nowrap">{item.payload?.vendor_msg_id || "-"}</td>
        <td className="px-4 py-3"><StatusBadge status={item.outcome || item.status} /></td>
        <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">{item.retry_count}</td>
        <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
        <td className="px-4 py-3"><button onClick={() => setViewRow(item)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs"><Eye size={13} /> View</button></td>
      </tr>
    );
  };

  return (
    <div className="container mx-auto pb-4 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
            Reliability Evidence Center
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Correlation evidence recorded by the reconciliation/conflict-detection pipelines -- reconciliation state only, nothing here resubmits an SMS or changes financial state.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-64">
            <Select value={source} onChange={handleSourceChange} options={SOURCE_OPTIONS} placeholder="Evidence source" />
          </div>
          {STATUS_FILTERABLE_SOURCES.includes(source) && (
            <div className="w-40">
              <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} options={STATUS_OPTIONS} placeholder="Status" clearable />
            </div>
          )}
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-text-secondary">
            <Home size={14} className="text-gray-400" />
            <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
            <span>/</span><span className="text-text-primary dark:text-white font-medium">Reliability Evidence Center</span>
          </div>
        </div>
      </div>

      {isDeadLetter && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-3.5 py-2 rounded-xl text-[11px] text-blue-800 dark:text-blue-300">
          This source reads the Redis stream directly (paginated by walking forward from the oldest retained entry) -- a different access pattern than the Postgres-backed sources above, and one that can't be sorted or filtered the same way.
        </div>
      )}

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
        emptyMessage="No evidence rows for this source/filter."
        renderRow={renderRow}
      />

      <Modal isOpen={!!viewRow} onClose={() => setViewRow(null)} title="Evidence Detail" className="max-w-3xl">
        {viewRow && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-[70vh]">
            {JSON.stringify(viewRow, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
};

export default ReliabilityEvidenceCenter;
