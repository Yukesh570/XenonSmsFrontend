import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
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
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Message ID</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.client_msg_id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Segment ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.segment || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Message ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendorMessageId || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Event Type</label>
              <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.event_type || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Segment & Timestamp Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Segment & Timestamp Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Segment Number</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.segment_number || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Status Code</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.status_code || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Received At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{formatDateTime(viewLog.received_at)}</div>
            </div>
          </div>
        </fieldset>

        {/* Status Description */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Status Description
          </legend>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewLog.status_description || <span className="text-gray-400 italic">No description available.</span>}
          </div>
        </fieldset>

        {/* Raw Payload */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Raw Payload
          </legend>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
            {viewLog.raw_payload ? JSON.stringify(viewLog.raw_payload, null, 2) : <span className="text-gray-400 italic">No payload available.</span>}
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

export default DLREventModal;