import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import type { DLREventData } from "../../../api/reportApi/dlrEventApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface DLREventModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: DLREventData | null;
}

export const DLREventModal: React.FC<DLREventModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DLR Event Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Event Overview & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Event Overview & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Message ID" value={viewLog.client_msg_id || "-"} disabled />
            <Input label="Segment ID" value={viewLog.segment || "-"} disabled />
            <Input label="Vendor Message ID" value={viewLog.vendorMessageId || "-"} disabled />
            <Input label="Event Type" value={viewLog.event_type || "-"} disabled className="capitalize" />
          </div>
        </fieldset>

        {/* Segment & Timestamp Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Segment & Timestamp Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Segment Number" value={viewLog.segment_number || "-"} disabled />
            <Input label="Status Code" value={viewLog.status_code || "-"} disabled />
            <Input label="Received At" value={formatDateTime(viewLog.received_at)} disabled />
          </div>
        </fieldset>

        {/* Status Description */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Status Description
          </legend>
          <TextArea
            label=""
            value={viewLog.status_description || "No description available."}
            disabled
            rows={3}
          />
        </fieldset>

        {/* Raw Payload */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Raw Payload
          </legend>
          <TextArea
            label=""
            value={viewLog.raw_payload ? JSON.stringify(viewLog.raw_payload, null, 2) : "No payload available."}
            disabled
            rows={6}
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

export default DLREventModal;