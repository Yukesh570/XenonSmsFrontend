import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
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
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Stream ID
              </label>
              <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                {viewLog.stream_id}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Message ID
              </label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                {viewLog.message_id || "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Status
              </label>
              <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">
                {viewLog.status || "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Delivery Count at Terminal
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewLog.delivery_count_at_terminal}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Association & Timing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identifiers & Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Raw Client ID
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewLog.raw_client_id ?? "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Raw Vendor ID
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewLog.raw_vendor_id ?? "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Created At
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {formatDateTime(viewLog.created_at)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Resolved At
              </label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {viewLog.resolved_at ? formatDateTime(viewLog.resolved_at) : "-"}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Reason */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Failure Reason
          </legend>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewLog.reason || <span className="text-gray-400 italic">No reason provided.</span>}
          </div>
        </fieldset>

        {/* Preserved Accept-Time Payload */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Preserved Accept-Time Payload
          </legend>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-text-primary dark:text-gray-200 max-h-60">
            {viewLog.payload ? JSON.stringify(viewLog.payload, null, 2) : <span className="text-gray-400 italic">No payload recorded.</span>}
          </pre>
        </fieldset>

        {/* Resolution Note if any */}
        {viewLog.resolution_note && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Resolution Note
            </legend>
            <p className="text-sm text-text-primary dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {viewLog.resolution_note}
            </p>
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
