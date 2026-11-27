import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import type { RejectedSMSLogData } from "../../../api/reportApi/rejectedSMSLogApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface RejectedSMSLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: RejectedSMSLogData | null;
}

export const RejectedSMSLogModal: React.FC<RejectedSMSLogModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rejected SMS Log Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Message Identity & Routing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Identity & Routing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Log ID" value={viewLog.id || "-"} disabled />
            <Input label="Message ID" value={viewLog.message_id || "-"} disabled />
            <Input label="Source Addr" value={viewLog.source_addr || "-"} disabled />
            <Input label="Destination Addr" value={viewLog.destination_addr || "-"} disabled />
          </div>
        </fieldset>

        {/* Client & Protocol */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Client & Protocol
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Client" value={viewLog.client_name || "-"} disabled />
            <Input label="System ID" value={viewLog.system_id || "-"} disabled />
            <Input label="SMPP Status Code" value={String(viewLog.smpp_command_status ?? "-")} disabled />
            <Input label="Timestamp" value={formatDateTime(viewLog.timestamp)} disabled />
          </div>
        </fieldset>

        {/* Credit & Billing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Credit & Billing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Required Amount" value={String(viewLog.required_amount ?? "-")} disabled />
            <Input label="Available Credit" value={String(viewLog.available_credit ?? "-")} disabled />
            <Input label="Credit Limit" value={String(viewLog.credit_limit ?? "-")} disabled />
            <Input label="Used Credit" value={String(viewLog.used_credit ?? "-")} disabled />
          </div>
        </fieldset>

        {/* Rejection Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Rejection Details
          </legend>
          <TextArea
            label=""
            value={viewLog.reason || "No reason available."}
            disabled
            rows={3}
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

export default RejectedSMSLogModal;
