import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { type DetailedReportData } from "../../../api/reportApi/detailedReportApi";

interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: DetailedReportData | null;
}

export const DetailedReportModal: React.FC<DetailedReportModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detailed Report Information"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Message Identity & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Identity & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Text Message ID</label>
              <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.text_message_id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Destination</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.destination || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Status</label>
              <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.submitStatus || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Sender ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.senderId || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Client & Billing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Client & Billing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.client || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Client Rate</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.base_clientRate ?? viewLog.clientRate ?? "0"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Client Charge</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.base_client_charge ?? viewLog.client_charge ?? "0"}</div>
            </div>
          </div>
        </fieldset>

        {/* Vendor & Routing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Vendor & Routing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendor || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Msg ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendor_msg_id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Vendor Rate</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.base_vendorRate ?? viewLog.vendorRate ?? "0"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Vendor Charge</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.base_vendor_charge ?? viewLog.vendor_charge ?? "0"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Country MCC</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.countryMCC || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Operator MNC</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.operatorMNC || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Transmission & Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Transmission & Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Encoding</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.encoding || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Character Count</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.characterCount || "-"}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Failure Reason</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.failure_reason || "-"}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Request Time</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.request_time || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Queued At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.message_queued_at || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Delivered At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.message_delivered_at || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Failed At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.message_failed_at || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Message Content */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Content
          </legend>
          <div className="flex justify-end text-xs font-medium text-text-secondary dark:text-gray-400 mb-2">
            <span>Parts: {viewLog.part_total || 0}</span>
          </div>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
            {viewLog.content || <span className="text-gray-400 italic">No message content available.</span>}
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

export default DetailedReportModal;