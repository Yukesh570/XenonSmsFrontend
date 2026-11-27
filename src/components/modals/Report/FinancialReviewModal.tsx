import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import { formatDateTime } from "../../../helper/dateFormatter";

export interface TerminalFailureRow {
  id: number;
  stream_id: string;
  message_id: string | null;
  raw_client_id: number | null;
  raw_vendor_id: number | null;
  reason: string;
  payload: Record<string, unknown> | null;
  status: string;
  delivery_count_at_terminal: number;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

interface FinancialReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: TerminalFailureRow | null;
}

export const FinancialReviewModal: React.FC<FinancialReviewModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terminal Failure Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Overview & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Overview & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Stream ID" value={viewLog.stream_id || "-"} disabled />
            <Input label="Message ID" value={viewLog.message_id || "-"} disabled />
            <Input label="Status" value={viewLog.status || "-"} disabled className="capitalize" />
            <Input label="Delivery Count at Terminal" value={String(viewLog.delivery_count_at_terminal ?? "-")} disabled />
          </div>
        </fieldset>

        {/* Association & Timing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identifiers & Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Raw Client ID" value={String(viewLog.raw_client_id ?? "-")} disabled />
            <Input label="Raw Vendor ID" value={String(viewLog.raw_vendor_id ?? "-")} disabled />
            <Input label="Created At" value={formatDateTime(viewLog.created_at)} disabled />
            <Input label="Resolved At" value={viewLog.resolved_at ? formatDateTime(viewLog.resolved_at) : "-"} disabled />
          </div>
        </fieldset>

        {/* Reason */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Failure Reason
          </legend>
          <TextArea
            label=""
            value={viewLog.reason || "No reason provided."}
            disabled
            rows={3}
          />
        </fieldset>

        {/* Preserved Accept-Time Payload */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Preserved Accept-Time Payload
          </legend>
          <TextArea
            label=""
            value={viewLog.payload ? JSON.stringify(viewLog.payload, null, 2) : "No payload recorded."}
            disabled
            rows={6}
            className="font-mono text-xs"
          />
        </fieldset>

        {/* Resolution Note if any */}
        {viewLog.resolution_note && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Resolution Note
            </legend>
            <TextArea
              label=""
              value={viewLog.resolution_note}
              disabled
              rows={3}
            />
          </fieldset>
        )}

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

export default FinancialReviewModal;
