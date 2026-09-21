import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import type { MessageAttemptData } from "../../../api/reportApi/messageAttemptApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface MessageAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: MessageAttemptData | null;
}

export const MessageAttemptModal: React.FC<MessageAttemptModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Attempt Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Attempt Overview & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Attempt Overview & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Attempt ID</label>
              <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Message ID</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.message || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Status</label>
              <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.status || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Attempt Number</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.attempt_number || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Provider & Routing Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Provider & Routing Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Provider</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.provider || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Message ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendorMessageId || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Segment ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.segment || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Started At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.started_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Completed At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.completed_at)}</div>
            </div>
          </div>
        </fieldset>

        {/* Error Message */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Error Details
          </legend>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewLog.error_message || <span className="text-gray-400 italic">No error message available.</span>}
          </div>
        </fieldset>

        {/* Payloads */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Payloads
          </legend>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Request Payload
              </label>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                {viewLog.request_payload ? JSON.stringify(viewLog.request_payload, null, 2) : <span className="text-gray-400 italic">No payload available.</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Response Payload
              </label>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                {viewLog.response_payload ? JSON.stringify(viewLog.response_payload, null, 2) : <span className="text-gray-400 italic">No payload available.</span>}
              </div>
            </div>
          </div>
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

export default MessageAttemptModal;