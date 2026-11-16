import React, { useState } from "react";
import { Home, Search, CheckCircle2, Circle, AlertTriangle, HelpCircle, XCircle } from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getMessageLifecycleApi,
  type MessageLifecycleResponse,
} from "../../api/reportApi/r4MonitoringApi";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime } from "../../helper/dateFormatter";

const LifecycleStep: React.FC<{ label: string; reached: boolean; detail?: string }> = ({ label, reached, detail }) => (
  <div className="flex items-start gap-2.5">
    {reached ? (
      <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
    ) : (
      <Circle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
    )}
    <div>
      <div className={`text-xs font-medium ${reached ? "text-text-primary dark:text-white" : "text-text-secondary dark:text-gray-500"}`}>{label}</div>
      {detail && <div className="text-[11px] text-text-secondary dark:text-gray-500">{detail}</div>}
    </div>
  </div>
);

// F-R4.1-10: a DLREvent row is only one of four possible evidence states --
// collapsing it to a single reached/not-reached check (as the other three
// lifecycle steps do) would make "delivery is recorded but the DLREvent row
// is missing" look identical to "we have no idea what happened to this",
// which is exactly the misreading the review flagged. Four distinct icons
// instead of two.
const DLR_EVIDENCE_ICON: Record<string, React.ReactNode> = {
  DLR_EVENT_RECORDED: <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />,
  DELIVERY_RECORDED_NO_DLR_EVENT: <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />,
  DELIVERY_FAILED: <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />,
  DELIVERY_UNKNOWN: <HelpCircle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />,
};

const DlrEvidenceStep: React.FC<{ evidence?: { status: string; label: string } }> = ({ evidence }) => {
  const status = evidence?.status ?? "DELIVERY_UNKNOWN";
  const label = evidence?.label ?? "Delivery outcome unknown";
  return (
    <div className="flex items-start gap-2.5">
      {DLR_EVIDENCE_ICON[status] ?? DLR_EVIDENCE_ICON.DELIVERY_UNKNOWN}
      <div>
        <div className="text-xs font-medium text-text-primary dark:text-white">DLR evidence</div>
        <div className="text-[11px] text-text-secondary dark:text-gray-500">{label}</div>
      </div>
    </div>
  );
};

// Workstream B R4.1 (Monitoring, Stage 2 Section 19): search by message
// id/external_id, joins SMSMessage+SMSMessagePart+MessageAttempt+DLREvent+
// conflict evidence for ONE message. A lifecycle stage is only shown as
// reached when a real timestamped record backs it -- never inferred from
// the overall status field. UnmatchedVendorResp/UnmatchedVendorDlr are
// deliberately NOT shown here: by definition they could not be correlated
// to a specific message (no FK exists) -- see the Reliability Evidence
// Center for those instead.
const MessageLifecycleExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("id") || "");
  const [data, setData] = useState<MessageLifecycleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const search = async (ref?: string) => {
    const value = (ref ?? query).trim();
    if (!value) return;
    setIsLoading(true);
    setNotFound(false);
    setData(null);
    try {
      const res = await getMessageLifecycleApi(value);
      setData(res);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Failed to load message lifecycle.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const initial = searchParams.get("id");
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto pb-4 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
            Message Lifecycle Explorer
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Search one message by its internal id or external UUID to see every record this engagement's evidence tables hold for it, in one place.
          </p>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-text-secondary">
          <Home size={14} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span><span className="text-text-primary dark:text-white font-medium">Message Lifecycle Explorer</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm flex items-end gap-2.5">
        <div className="flex-1 max-w-md">
          <Input
            label="Message ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="e.g. 2447597 or 42f4db50-08c8-..."
          />
        </div>
        <Button onClick={() => search()} leftIcon={<Search size={14} />} disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {notFound && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center gap-3 text-amber-900 dark:text-amber-200">
          <AlertTriangle size={20} className="shrink-0" />
          <div>
            <h4 className="font-semibold text-xs sm:text-sm">No message found</h4>
            <p className="text-[11px] mt-0.5">No SMSMessage matches that id or external UUID.</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Message overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold text-text-primary dark:text-white">Message #{data.message.id}</h2>
                {data.message.message_id && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {data.message.message_id}
                  </span>
                )}
              </div>
              <StatusBadge status={data.message.status} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 text-xs">
              <div><span className="text-text-secondary dark:text-gray-400">Message ID:</span> <span className="font-mono text-primary">{data.message.message_id || "-"}</span></div>
              <div><span className="text-text-secondary dark:text-gray-400">External UUID:</span> <span className="font-mono">{data.message.external_id || "-"}</span></div>
              <div><span className="text-text-secondary dark:text-gray-400">Destination:</span> {data.message.destination}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Client:</span> <span className="font-medium text-text-primary dark:text-white">{data.message.client_name || data.message.clientName || (data.message.client_id ? `ID: ${data.message.client_id}` : "-")}</span></div>
              <div><span className="text-text-secondary dark:text-gray-400">Vendor:</span> <span className="font-medium text-text-primary dark:text-white">{data.message.vendor_name || data.message.vendorName || (data.message.vendor_id ? `ID: ${data.message.vendor_id}` : "-")}</span></div>
              <div><span className="text-text-secondary dark:text-gray-400">Created:</span> {formatDateTime(data.message.createdAt)}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Submitted:</span> {data.message.submitted_at ? formatDateTime(data.message.submitted_at) : "-"}</div>
              <div><span className="text-text-secondary dark:text-gray-400">Delivered:</span> {data.message.delivered_at ? formatDateTime(data.message.delivered_at) : "-"}</div>
              <div>
                <span className="text-text-secondary dark:text-gray-400">Terminal failure:</span>{" "}
                {data.message.terminal_failure_recorded ? <StatusBadge status="WARNING" customText="Recorded" /> : <StatusBadge status="OK" customText="None" />}
                {data.message.terminal_failure_recorded && data.message.terminal_failure_categories?.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-text-secondary dark:text-gray-500">
                    ({data.message.terminal_failure_categories.join(", ")})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Parts & lifecycle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm">
            <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-3">Segments & Lifecycle</h2>
            <div className="space-y-3">
              {data.parts.map((part: any) => (
                <div key={part.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-text-primary dark:text-white">Part {part.part_no}/{part.part_total} (id {part.id})</span>
                    <StatusBadge status={part.submit_status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                    <LifecycleStep label="Accepted" reached={part.lifecycle.accepted} />
                    <LifecycleStep label="Submitted to vendor" reached={part.lifecycle.submitted_to_vendor} detail={part.last_submit_at ? formatDateTime(part.last_submit_at) : undefined} />
                    <LifecycleStep label="Vendor ack received" reached={part.lifecycle.vendor_ack_received} detail={part.submitted_at ? formatDateTime(part.submitted_at) : undefined} />
                    <DlrEvidenceStep evidence={part.dlr_evidence} />
                  </div>
                  {part.failure_reason && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-2">{part.failure_reason}</p>
                  )}
                </div>
              ))}
              {data.parts.length === 0 && <p className="text-xs text-text-secondary dark:text-gray-500">No segments recorded.</p>}
            </div>
          </div>

          {/* Attempts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm">
            <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">Vendor Attempts ({data.attempts.length})</h2>
            {data.attempts.length === 0 ? (
              <p className="text-xs text-text-secondary dark:text-gray-500">No dispatch attempts recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-text-secondary dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-1.5 pr-3">#</th><th className="py-1.5 pr-3">Segment</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Vendor Msg ID</th><th className="py-1.5 pr-3">Started</th><th className="py-1.5 pr-3">Error</th>
                  </tr></thead>
                  <tbody>
                    {data.attempts.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-1.5 pr-3">{a.attempt_number}</td>
                        <td className="py-1.5 pr-3">{a.segment_id}</td>
                        <td className="py-1.5 pr-3"><StatusBadge status={a.status} /></td>
                        <td className="py-1.5 pr-3 font-mono">{a.vendorMessageId || "-"}</td>
                        <td className="py-1.5 pr-3">{formatDateTime(a.started_at)}</td>
                        <td className="py-1.5 pr-3 text-red-600 dark:text-red-400">{a.error_message || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DLR events */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm">
            <h2 className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">DLR Events ({data.dlr_events.length})</h2>
            {data.dlr_events.length === 0 ? (
              <p className="text-xs text-text-secondary dark:text-gray-500">No DLR events recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-text-secondary dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-1.5 pr-3">Segment</th><th className="py-1.5 pr-3">Event</th><th className="py-1.5 pr-3">Status Code</th><th className="py-1.5 pr-3">Received</th>
                  </tr></thead>
                  <tbody>
                    {data.dlr_events.map((e: any) => (
                      <tr key={e.id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-1.5 pr-3">{e.segment_id ?? "-"}</td>
                        <td className="py-1.5 pr-3"><StatusBadge status={e.event_type} /></td>
                        <td className="py-1.5 pr-3">{e.status_code || "-"}</td>
                        <td className="py-1.5 pr-3">{formatDateTime(e.received_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* F-R4.1-11: terminal_failures is redacted to [] for roles without
              Financial Review Center access -- this notice is the only thing
              that tells them a recorded issue exists without showing its
              financial-review detail (reason/status/resolution_note/etc). */}
          {data.message.terminal_failure_recorded && data.financial_review_restricted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm text-xs">
              <span className="font-semibold text-text-primary dark:text-white">Financial Review Details: </span>
              <span className="text-text-secondary dark:text-gray-400">Restricted -- contact an ADMIN or FINANCE user for details.</span>
            </div>
          )}

          {/* Conflict evidence */}
          {(data.protocol_outcome_conflicts.length > 0 || data.dlr_conflicts.length > 0 || data.terminal_failures.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800/50 p-3.5 shadow-sm">
              <h2 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Conflict / Terminal-Failure Evidence
              </h2>
              <div className="space-y-2 text-xs">
                {data.protocol_outcome_conflicts.map((c: any) => (
                  <div key={`poc-${c.id}`} className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    Protocol conflict on segment {c.segment_id}: {c.existingSource} said <StatusBadge status={c.existingStatus} /> but {c.incomingSource} said <StatusBadge status={c.incomingStatus} /> ({formatDateTime(c.detectedAt)})
                  </div>
                ))}
                {data.dlr_conflicts.map((c: any) => (
                  <div key={`dlrc-${c.id}`} className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    DLR conflict on segment {c.segment_id}: winner <StatusBadge status={c.winner_status} /> over loser <StatusBadge status={c.loser_status} /> ({formatDateTime(c.created_at)})
                  </div>
                ))}
                {data.terminal_failures.map((t: any) => (
                  <div key={`tf-${t.id}`} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                    Terminal failure ({t.reason}), status <StatusBadge status={t.status} /> -- see the Financial Review Center for details.
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
