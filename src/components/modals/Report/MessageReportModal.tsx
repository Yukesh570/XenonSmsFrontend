import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { type MessageLogData } from "../../../api/reportApi/messageReportApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface MessageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: MessageLogData | null;
}

export const MessageReportModal: React.FC<MessageReportModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Details"
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Row 1 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Message ID
            </label>
            <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.message_id || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Destination
            </label>
            <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.destination || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Status
            </label>
            <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.status || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Created At
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {formatDateTime(viewLog.createdAt)}
            </div>
          </div>

          {/* Timestamps Row */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Queued At
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {formatDateTime(viewLog.queued_at)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Submitted At
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {formatDateTime(viewLog.submitted_at)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Delivered At
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {formatDateTime(viewLog.delivered_at)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Failed At
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {formatDateTime(viewLog.failed_at)}
            </div>
          </div>


          {/* Account Details */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Client
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.clientName || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Vendor
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.vendorName || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              SMPP
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.smppName || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              System ID
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.systemId || "-"}
            </div>
          </div>

          {/* Payload Meta */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Encoding
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.encoding || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Segment
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.segmentNumber || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Characters
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.characterCount || "-"}
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Failure Reason
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.failure_reason || "-"}
            </div>
          </div>
        </div>

        {/* Message Text Area */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
            Message Text
          </label>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewLog.text || <span className="text-gray-400 italic">No message text available.</span>}
          </div>
        </div>

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