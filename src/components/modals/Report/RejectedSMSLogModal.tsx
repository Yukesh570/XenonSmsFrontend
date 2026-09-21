import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Row 1 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Log ID</label>
            <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.id || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Timestamp</label>
            <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.timestamp)}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client</label>
            <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.client_name || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">System ID</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.system_id || "-"}</div>
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Source Addr</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.source_addr || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Destination Addr</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.destination_addr || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Message ID</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.message_id || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">SMPP Status Code</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.smpp_command_status ?? "-"}</div>
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Required Amount</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.required_amount ?? "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Available Credit</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.available_credit ?? "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Credit Limit</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.credit_limit ?? "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Used Credit</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.used_credit ?? "-"}</div>
          </div>
        </div>

        {/* Reason Area */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
            Rejection Reason
          </label>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewLog.reason || <span className="text-gray-400 italic">No reason available.</span>}
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
