import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
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
            <Input label="Source Type" value={SOURCE_LABELS[source] || source} disabled />

            {isDeadLetter ? (
              <>
                <div className="lg:col-span-2">
                  <Input label="Stream ID" value={viewRow.stream_id || "-"} disabled />
                </div>
                <Input
                  label="Vendor"
                  value={String(viewRow.vendor_name || viewRow.payload?.vendor_id || "-")}
                  disabled
                />
              </>
            ) : (
              <>
                <Input label="ID" value={String(viewRow.id ?? "-")} disabled />
                <Input
                  label="Status / Outcome"
                  value={viewRow.outcome || viewRow.status || (isDlrConflict ? viewRow.winner_status : undefined) || "-"}
                  disabled
                  className="capitalize"
                />
                <Input
                  label={isProtocolConflict || isDlrConflict ? "Segment ID" : "Vendor"}
                  value={
                    isProtocolConflict || isDlrConflict
                      ? String(viewRow.segment_id ?? "-")
                      : String(viewRow.vendor_name || viewRow.vendor_profile_name || viewRow.connection_id || viewRow.vendor_id || "-")
                  }
                  disabled
                />
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
              <Input label="Vendor Message ID" value={viewRow.vendor_msg_id || "-"} disabled />
              {isProtocolConflict && (
                <>
                  <Input
                    label={`Existing (${viewRow.existingSource || ""})`}
                    value={viewRow.existingStatus || "-"}
                    disabled
                    className="capitalize"
                  />
                  <Input
                    label={`Incoming (${viewRow.incomingSource || ""})`}
                    value={viewRow.incomingStatus || "-"}
                    disabled
                    className="capitalize"
                  />
                </>
              )}
              {isDlrConflict && (
                <>
                  <Input
                    label="Winner Status"
                    value={viewRow.winner_status || "-"}
                    disabled
                    className="capitalize"
                  />
                  <Input
                    label="Loser Status"
                    value={viewRow.loser_status || "-"}
                    disabled
                    className="capitalize"
                  />
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
            <Input
              label={isDeadLetter ? "Dead-Lettered At" : isProtocolConflict ? "Detected At" : "Created At"}
              value={
                isDeadLetter && viewRow.payload?.dead_lettered_at
                  ? formatDateTime(new Date(Number(viewRow.payload.dead_lettered_at)).toISOString())
                  : viewRow.detectedAt
                  ? formatDateTime(viewRow.detectedAt)
                  : viewRow.created_at
                  ? formatDateTime(viewRow.created_at)
                  : "-"
              }
              disabled
            />
            <Input
              label="Resolved At"
              value={viewRow.resolved_at ? formatDateTime(viewRow.resolved_at) : "-"}
              disabled
            />
            <Input
              label="Retry Count"
              value={String(viewRow.retry_count ?? "-")}
              disabled
            />
          </div>
        </fieldset>

        {/* Dead-letter reason if available */}
        {isDeadLetter && viewRow.payload?.reason && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Dead-Letter Reason
            </legend>
            <TextArea
              label=""
              value={viewRow.payload.reason}
              disabled
              rows={3}
            />
          </fieldset>
        )}

        {/* Raw Payload / Record Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Raw Evidence Record
          </legend>
          <TextArea
            label=""
            value={JSON.stringify(viewRow, null, 2)}
            disabled
            rows={8}
            className="font-mono text-xs"
          />
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
