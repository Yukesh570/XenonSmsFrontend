import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { StatusBadge } from "../../ui/StatusBadge";
import { formatDateTime } from "../../../helper/dateFormatter";
import type { EvidenceSource } from "../../../api/reportApi/r4MonitoringApi";

export interface ReliabilityEvidenceRecord {
  id?: number;
  stream_id?: string;
  vendor_name?: string;
  vendor_profile_name?: string;
  connection_id?: string;
  vendor_id?: number | string;
  vendor_msg_id?: string;
  outcome?: string;
  status?: string;
  segment_id?: number | string;
  existingSource?: string;
  existingStatus?: string;
  incomingSource?: string;
  incomingStatus?: string;
  winner_status?: string;
  loser_status?: string;
  detectedAt?: string;
  created_at?: string;
  resolved_at?: string;
  retry_count?: number;
  payload?: {
    reason?: string;
    vendor_id?: string | number;
    dead_lettered_at?: string | number;
    data?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ReliabilityEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewRow: ReliabilityEvidenceRecord | null;
  source: EvidenceSource;
}

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  unmatched_resp: "Unmatched Vendor Submit Response",
  unmatched_dlr: "Unmatched Vendor DLR",
  protocol_conflict: "Protocol Outcome Conflict",
  dlr_conflict: "DLR Conflict",
  deadletter_inbound: "Inbound Dead-Letter Stream",
};

export const ReliabilityEvidenceModal: React.FC<ReliabilityEvidenceModalProps> = ({
  isOpen,
  onClose,
  viewRow,
  source,
}) => {
  if (!isOpen || !viewRow) return null;

  const isDeadLetter = source === "deadletter_inbound";
  const isProtocolConflict = source === "protocol_conflict";
  const isDlrConflict = source === "dlr_conflict";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reliability Evidence Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Evidence Overview */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Evidence Overview & Source
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Source Type
              </label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                {SOURCE_LABELS[source] || source}
              </div>
            </div>

            {isDeadLetter ? (
              <>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                    Stream ID
                  </label>
                  <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                    {viewRow.stream_id}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                    Vendor
                  </label>
                  <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                    {viewRow.vendor_name || viewRow.payload?.vendor_id || "-"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                    ID
                  </label>
                  <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                    {viewRow.id ?? "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                    Status / Outcome
                  </label>
                  <div className="p-1">
                    <StatusBadge status={viewRow.outcome || viewRow.status || (isDlrConflict ? viewRow.winner_status : undefined)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                    {isProtocolConflict || isDlrConflict ? "Segment ID" : "Vendor"}
                  </label>
                  <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                    {isProtocolConflict || isDlrConflict
                      ? (viewRow.segment_id ?? "-")
                      : (viewRow.vendor_name || viewRow.vendor_profile_name || viewRow.connection_id || viewRow.vendor_id || "-")}
                  </div>
                </div>
              </>
            )}
          </div>
        </fieldset>

        {/* Conflict / Protocol Details */}
        {(isProtocolConflict || isDlrConflict) && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Conflict Correlation
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Vendor Message ID
                </label>
                <div className="text-sm font-mono text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                  {viewRow.vendor_msg_id || "-"}
                </div>
              </div>
              {isProtocolConflict && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Existing ({viewRow.existingSource})
                    </label>
                    <div className="p-1">
                      <StatusBadge status={viewRow.existingStatus} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Incoming ({viewRow.incomingSource})
                    </label>
                    <div className="p-1">
                      <StatusBadge status={viewRow.incomingStatus} />
                    </div>
                  </div>
                </>
              )}
              {isDlrConflict && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Winner Status
                    </label>
                    <div className="p-1">
                      <StatusBadge status={viewRow.winner_status} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Loser Status
                    </label>
                    <div className="p-1">
                      <StatusBadge status={viewRow.loser_status} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </fieldset>
        )}

        {/* Timestamps & Counters */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps & Execution
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                {isDeadLetter ? "Dead-Lettered At" : isProtocolConflict ? "Detected At" : "Created At"}
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {isDeadLetter && viewRow.payload?.dead_lettered_at
                  ? formatDateTime(new Date(Number(viewRow.payload.dead_lettered_at)).toISOString())
                  : viewRow.detectedAt
                  ? formatDateTime(viewRow.detectedAt)
                  : viewRow.created_at
                  ? formatDateTime(viewRow.created_at)
                  : "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Resolved At
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewRow.resolved_at ? formatDateTime(viewRow.resolved_at) : "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Retry Count
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewRow.retry_count ?? "-"}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Dead-letter reason if available */}
        {isDeadLetter && viewRow.payload?.reason && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Dead-Letter Reason
            </legend>
            <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
              {viewRow.payload.reason}
            </div>
          </fieldset>
        )}

        {/* Raw Payload / Record Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Raw Evidence Record
          </legend>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-text-primary dark:text-gray-200 max-h-60">
            {JSON.stringify(viewRow, null, 2)}
          </pre>
        </fieldset>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
