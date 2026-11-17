import React, { useState, useEffect } from "react";
import {
  Home,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getMessageLifecycleApi,
  type MessageLifecycleResponse,
} from "../../api/reportApi/r4MonitoringApi";
import Input from "../../components/ui/Input";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";

const DLR_EVIDENCE_ICON: Record<string, React.ReactNode> = {
  DLR_EVENT_RECORDED: <CheckCircle2 size={15} className="text-green-500 shrink-0" />,
  DELIVERY_RECORDED_NO_DLR_EVENT: <AlertTriangle size={15} className="text-amber-500 shrink-0" />,
  DELIVERY_FAILED: <AlertTriangle size={15} className="text-red-500 shrink-0" />,
  DELIVERY_UNKNOWN: <Circle size={15} className="text-gray-400 shrink-0" />,
};

interface MessagePartItem {
  id: number;
  part_no: number;
  part_total: number;
  submit_status: string;
  failure_reason?: string;
  last_submit_at?: string;
  submitted_at?: string;
  lifecycle: {
    accepted: boolean;
    submitted_to_vendor: boolean;
    vendor_ack_received: boolean;
  };
  dlr_evidence?: {
    status: string;
    label: string;
  };
}

interface MessageAttemptItem {
  id: number;
  attempt_number: number;
  segment_id: number | string;
  status: string;
  vendorMessageId?: string;
  started_at: string;
  error_message?: string;
}

interface DlrEventItem {
  id: number;
  segment_id?: number | string;
  event_type: string;
  status_code?: string;
  received_at: string;
}

interface DlrConflictItem {
  id: number;
  segment_id: number | string;
  winner_status: string;
  loser_status: string;
  created_at: string;
}

interface TerminalFailureItem {
  id: number;
  reason: string;
  status: string;
}

const ATTEMPT_COLUMNS = [
  { key: "segment_id", label: "Segment" },
  { key: "status", label: "Status" },
  { key: "vendorMessageId", label: "Vendor Msg ID" },
  { key: "started_at", label: "Started" },
  { key: "error_message", label: "Error" },
];

const DLR_COLUMNS = [
  { key: "segment_id", label: "Segment" },
  { key: "event_type", label: "Event" },
  { key: "status_code", label: "Status Code" },
  { key: "received_at", label: "Received" },
];

const MessageLifecycleExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("id") || "");
  const [data, setData] = useState<MessageLifecycleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Column management for attempts & DLR events (data columns only, S.N. is fixed at index 0)
  const [attemptCols, setAttemptCols] = useState<string[]>(ATTEMPT_COLUMNS.map((c) => c.key));
  const [dlrCols, setDlrCols] = useState<string[]>(DLR_COLUMNS.map((c) => c.key));

  // Sorting state for attempts & DLR events
  const [attemptSort, setAttemptSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [dlrSort, setDlrSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const search = async (ref?: string) => {
    const value = (ref ?? query).trim();
    if (!value) return;
    setIsLoading(true);
    setNotFound(false);
    setData(null);
    try {
      const res = await getMessageLifecycleApi(value);
      setData(res);
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number } };
      if (errorObj?.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Failed to load message lifecycle.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get("id");
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAttemptSort = (columnIndex: number) => {
    // S.N. is at index 0, so data columns start at index 1
    const dataIndex = columnIndex - 1;
    if (dataIndex >= 0 && dataIndex < attemptCols.length) {
      const colKey = attemptCols[dataIndex];
      setAttemptSort((prev) => {
        if (prev?.key === colKey) {
          if (prev.direction === "asc") return { key: colKey, direction: "desc" };
          return null;
        }
        return { key: colKey, direction: "asc" };
      });
    }
  };

  const handleDlrSort = (columnIndex: number) => {
    // S.N. is at index 0, so data columns start at index 1
    const dataIndex = columnIndex - 1;
    if (dataIndex >= 0 && dataIndex < dlrCols.length) {
      const colKey = dlrCols[dataIndex];
      setDlrSort((prev) => {
        if (prev?.key === colKey) {
          if (prev.direction === "asc") return { key: colKey, direction: "desc" };
          return null;
        }
        return { key: colKey, direction: "asc" };
      });
    }
  };

  const sortedAttempts = React.useMemo(() => {
    if (!data?.attempts) return [];
    const list = data.attempts as MessageAttemptItem[];
    if (!attemptSort) return list;
    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[attemptSort.key];
      const bVal = (b as unknown as Record<string, unknown>)[attemptSort.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return attemptSort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return attemptSort.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data?.attempts, attemptSort]);

  const sortedDlrEvents = React.useMemo(() => {
    if (!data?.dlr_events) return [];
    const list = data.dlr_events as DlrEventItem[];
    if (!dlrSort) return list;
    return [...list].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[dlrSort.key];
      const bVal = (b as unknown as Record<string, unknown>)[dlrSort.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return dlrSort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return dlrSort.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data?.dlr_events, dlrSort]);

  const renderAttemptCell = (a: MessageAttemptItem, key: string) => {
    switch (key) {
      case "segment_id":
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {a.segment_id}
          </td>
        );
      case "status":
        return (
          <td key={key} className="px-4 py-3 whitespace-nowrap">
            <StatusBadge status={a.status} />
          </td>
        );
      case "vendorMessageId":
        return (
          <td key={key} className="px-4 py-3 text-sm font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {a.vendorMessageId || "-"}
          </td>
        );
      case "started_at":
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(a.started_at)}
          </td>
        );
      case "error_message":
        return (
          <td
            key={key}
            className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-mono max-w-xs truncate"
            title={a.error_message || undefined}
          >
            {a.error_message || "-"}
          </td>
        );
      default:
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            -
          </td>
        );
    }
  };

  const renderDlrCell = (e: DlrEventItem, key: string) => {
    switch (key) {
      case "segment_id":
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {e.segment_id ?? "-"}
          </td>
        );
      case "event_type":
        return (
          <td key={key} className="px-4 py-3 whitespace-nowrap">
            <StatusBadge status={e.event_type} />
          </td>
        );
      case "status_code":
        return (
          <td key={key} className="px-4 py-3 text-sm font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {e.status_code || "-"}
          </td>
        );
      case "received_at":
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
            {formatDateTime(e.received_at)}
          </td>
        );
      default:
        return (
          <td key={key} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
            -
          </td>
        );
    }
  };

  return (
    <div className="container mx-auto pb-6">
      {/* Top Header */}
      <div className="mb-4 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Message Lifecycle Explorer
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Track end-to-end message delivery progress, vendor attempts, and DLR events.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary shrink-0 pt-1">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Message Lifecycle Explorer</span>
        </div>
      </div>

      {/* Search / Filter Card */}
      <FilterCard
        title="Search Message"
        onSearch={() => search()}
        onClear={() => {
          setQuery("");
          setData(null);
          setNotFound(false);
        }}
      >
        <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2 max-w-md">
          <Input
            label="Message ID or External UUID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="e.g. 2447597 or 42f4db50-08c8-..."
          />
        </div>
      </FilterCard>

      {/* Loading State */}
      {isLoading && (
        <LoadingSpinner size="md" text="Searching message lifecycle..." />
      )}

      {/* Not Found Banner */}
      {notFound && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="font-semibold text-sm">No message found</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              No SMSMessage matches that ID or external UUID.
            </p>
          </div>
        </div>
      )}

      {/* Message Lifecycle Data View */}
      {data && (
        <div className="space-y-4 sm:space-y-5">
          {/* Section 1: Message Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card p-4 sm:p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Message #{data.message.id}
                </h2>
                {data.message.message_id && (
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                    {data.message.message_id}
                  </span>
                )}
              </div>
              <StatusBadge status={data.message.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Message ID</span>
                <span className="font-mono text-sm text-primary font-medium">{data.message.message_id || "-"}</span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">External UUID</span>
                <span className="font-mono text-sm text-text-primary dark:text-white break-all">{data.message.external_id || "-"}</span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Destination</span>
                <span className="text-sm font-medium text-text-primary dark:text-white">{data.message.destination}</span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Client</span>
                <span className="text-sm font-medium text-text-primary dark:text-white">
                  {data.message.client_name || data.message.clientName || (data.message.client_id ? `ID: ${data.message.client_id}` : "-")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Vendor</span>
                <span className="text-sm font-medium text-text-primary dark:text-white">
                  {data.message.vendor_name || data.message.vendorName || (data.message.vendor_id ? `ID: ${data.message.vendor_id}` : "-")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Created</span>
                <span className="text-sm text-text-secondary dark:text-gray-300">{formatDateTime(data.message.createdAt)}</span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Submitted</span>
                <span className="text-sm text-text-secondary dark:text-gray-300">
                  {data.message.submitted_at ? formatDateTime(data.message.submitted_at) : "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs text-text-secondary dark:text-gray-400 mb-1 font-medium">Delivered</span>
                <span className="text-sm text-text-secondary dark:text-gray-300">
                  {data.message.delivered_at ? formatDateTime(data.message.delivered_at) : "-"}
                </span>
              </div>
              <div className="sm:col-span-2 md:col-span-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
                <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">Terminal Failure:</span>
                {data.message.terminal_failure_recorded ? (
                  <StatusBadge status="WARNING" customText="Recorded" />
                ) : (
                  <StatusBadge status="OK" customText="None" />
                )}
                {data.message.terminal_failure_recorded && data.message.terminal_failure_categories?.length > 0 && (
                  <span className="text-text-secondary dark:text-gray-400 text-xs">
                    ({data.message.terminal_failure_categories.join(", ")})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Segments & Lifecycle - Vertical Box Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              Segments & Lifecycle
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.parts.map((part: MessagePartItem) => (
                <div
                  key={part.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div>
                    {/* Header: Part number + ID badge + Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary dark:text-white">
                          Part {part.part_no}/{part.part_total}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                          ID: {part.id}
                        </span>
                      </div>
                      <StatusBadge status={part.submit_status} />
                    </div>

                    {/* Clean Key-Value Stages */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60 py-1 text-sm">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-text-secondary dark:text-gray-400">Accepted</span>
                        {part.lifecycle.accepted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 size={14} /> Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                            <Circle size={14} /> Pending
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-text-secondary dark:text-gray-400">Submitted to Vendor</span>
                        <span className="text-xs font-medium text-text-primary dark:text-white">
                          {part.last_submit_at ? (
                            formatDateTime(part.last_submit_at)
                          ) : part.lifecycle.submitted_to_vendor ? (
                            <span className="text-green-600 dark:text-green-400">Submitted</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-text-secondary dark:text-gray-400">Vendor Ack Received</span>
                        <span className="text-xs font-medium text-text-primary dark:text-white">
                          {part.submitted_at ? (
                            formatDateTime(part.submitted_at)
                          ) : part.lifecycle.vendor_ack_received ? (
                            <span className="text-green-600 dark:text-green-400">Received</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-text-secondary dark:text-gray-400">DLR Evidence</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary dark:text-white">
                          {DLR_EVIDENCE_ICON[part.dlr_evidence?.status ?? "DELIVERY_UNKNOWN"]}
                          <span>{part.dlr_evidence?.label ?? "Outcome unknown"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Failure detail if present */}
                  {part.failure_reason && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-start gap-2">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">Failure:</span>
                      <span className="text-xs font-mono text-red-600 dark:text-red-400 break-all">{part.failure_reason}</span>
                    </div>
                  )}
                </div>
              ))}
              {data.parts.length === 0 && (
                <p className="col-span-full text-xs text-text-secondary dark:text-gray-400 italic py-2">
                  No records found.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Vendor Attempts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white uppercase tracking-wider mb-4">
              Vendor Attempts ({data.attempts.length})
            </h2>
            <DataTable
              hideTopBar={true}
              density="compact"
              data={sortedAttempts}
              headers={["S.N.", ...attemptCols.map((k) => ATTEMPT_COLUMNS.find((c) => c.key === k)?.label || k)]}
              storageKey="msg_explorer_attempts_table_v4"
              resizableColumns={true}
              onSort={handleAttemptSort}
              sortColumnIndex={
                attemptSort ? attemptCols.indexOf(attemptSort.key) + 1 : null
              }
              sortDirection={attemptSort?.direction || null}
              onReorderColumns={(fromIdx, toIdx) => {
                setAttemptCols((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(toIdx, 0, moved);
                  return next;
                });
              }}
              renderRow={(a: MessageAttemptItem, index: number) => (
                <tr
                  key={a.id || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                    {index + 1}
                  </td>
                  {attemptCols.map((colKey) => renderAttemptCell(a, colKey))}
                </tr>
              )}
            />
          </div>

          {/* Section 4: DLR Events */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white uppercase tracking-wider mb-4">
              DLR Events ({data.dlr_events.length})
            </h2>
            <DataTable
              hideTopBar={true}
              density="compact"
              data={sortedDlrEvents}
              headers={["S.N.", ...dlrCols.map((k) => DLR_COLUMNS.find((c) => c.key === k)?.label || k)]}
              storageKey="msg_explorer_dlr_table_v4"
              resizableColumns={true}
              onSort={handleDlrSort}
              sortColumnIndex={
                dlrSort ? dlrCols.indexOf(dlrSort.key) + 1 : null
              }
              sortDirection={dlrSort?.direction || null}
              onReorderColumns={(fromIdx, toIdx) => {
                setDlrCols((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(toIdx, 0, moved);
                  return next;
                });
              }}
              renderRow={(e: DlrEventItem, index: number) => (
                <tr
                  key={e.id || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                    {index + 1}
                  </td>
                  {dlrCols.map((colKey) => renderDlrCell(e, colKey))}
                </tr>
              )}
            />
          </div>

          {/* Section 5: Restricted Financial Details Note */}
          {data.message.terminal_failure_recorded && data.financial_review_restricted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-primary dark:text-white">Financial Review Details</h4>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                  Restricted -- contact an ADMIN or FINANCE user for full financial exposure and resolution details.
                </p>
              </div>
              <span className="px-3 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 text-xs font-medium">
                Restricted Access
              </span>
            </div>
          )}

          {/* Section 6: Conflict & Terminal Evidence */}
          {(data.protocol_outcome_conflicts.length > 0 ||
            data.dlr_conflicts.length > 0 ||
            data.terminal_failures.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> Conflict & Terminal-Failure Evidence
              </h2>
              <div className="space-y-3">
                {data.protocol_outcome_conflicts.map((c: DlrConflictItem & { existingSource?: string; existingStatus?: string; incomingSource?: string; incomingStatus?: string; detectedAt?: string }) => (
                  <div
                    key={`poc-${c.id}`}
                    className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 text-sm text-text-secondary dark:text-gray-300"
                  >
                    <span className="font-medium text-text-primary dark:text-white">Protocol conflict</span> on segment {c.segment_id}: {c.existingSource} reported <StatusBadge status={c.existingStatus || ""} /> but {c.incomingSource} reported <StatusBadge status={c.incomingStatus || ""} /> ({formatDateTime(c.detectedAt || "")})
                  </div>
                ))}
                {data.dlr_conflicts.map((c: DlrConflictItem) => (
                  <div
                    key={`dlrc-${c.id}`}
                    className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 text-sm text-text-secondary dark:text-gray-300"
                  >
                    <span className="font-medium text-text-primary dark:text-white">DLR conflict</span> on segment {c.segment_id}: winner <StatusBadge status={c.winner_status} /> over loser <StatusBadge status={c.loser_status} /> ({formatDateTime(c.created_at)})
                  </div>
                ))}
                {data.terminal_failures.map((t: TerminalFailureItem) => (
                  <div
                    key={`tf-${t.id}`}
                    className="p-3 rounded-lg bg-red-50/70 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 text-sm text-text-secondary dark:text-gray-300"
                  >
                    <span className="font-medium text-text-primary dark:text-white">Terminal failure</span> ({t.reason}), status <StatusBadge status={t.status} /> &mdash; visit the Financial Review Center for full investigation.
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageLifecycleExplorer;
