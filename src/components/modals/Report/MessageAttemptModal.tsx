import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
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
            <Input label="Attempt ID" value={viewLog.id || "-"} disabled />
            <Input label="Message ID" value={viewLog.message || "-"} disabled />
            <Input label="Status" value={viewLog.status || "-"} disabled className="capitalize" />
            <Input label="Attempt Number" value={String(viewLog.attempt_number ?? "-")} disabled />
          </div>
        </fieldset>

        {/* Provider & Routing Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Provider & Routing Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Provider" value={viewLog.provider || "-"} disabled />
            <Input label="Vendor Message ID" value={viewLog.vendorMessageId || "-"} disabled />
            <Input label="Segment ID" value={viewLog.segment || "-"} disabled />
          </div>
        </fieldset>

        {/* Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Started At" value={formatDateTime(viewLog.started_at)} disabled />
            <Input label="Completed At" value={formatDateTime(viewLog.completed_at)} disabled />
          </div>
        </fieldset>

        {/* Error Message */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Error Details
          </legend>
          <TextArea
            label=""
            value={viewLog.error_message || "No error message available."}
            disabled
            rows={3}
          />
        </fieldset>

        {/* Payloads */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Payloads
          </legend>
          <div className="space-y-4">
            <TextArea
              label="Request Payload"
              value={viewLog.request_payload ? JSON.stringify(viewLog.request_payload, null, 2) : "No payload available."}
              disabled
              rows={5}
              className="font-mono text-xs"
            />
            <TextArea
              label="Response Payload"
              value={viewLog.response_payload ? JSON.stringify(viewLog.response_payload, null, 2) : "No payload available."}
              disabled
              rows={5}
              className="font-mono text-xs"
            />
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