import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import type { SmsMessagePartData } from "../../../api/reportApi/smsMessagePartApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface SmsMessagePartModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: SmsMessagePartData | null;
}

export const SmsMessagePartModal: React.FC<SmsMessagePartModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Segment Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar px-1">
        
        {/* Segment Identity & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Segment Identity & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Segment ID</label>
              <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Message ID</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.message || "-"}</div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Destination</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.parent_message_destination || "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Transmission & Metrics */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Transmission & Metrics
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Submit Status</label>
              <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.submit_status || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Part / Total</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.part_no} / {viewLog.part_total}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Submit Attempts</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.submit_attempts || "0"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">ESM Class</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.esm_class !== undefined ? viewLog.esm_class : "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* Vendor & Protocol Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Vendor & Protocol Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Msg ID</label>
              <div className="text-sm font-mono text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendor_msg_id || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">UDH Ref</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.udh_ref !== undefined ? viewLog.udh_ref : "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Submit Status</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.vendor_submit_status !== null ? viewLog.vendor_submit_status : "-"}</div>
            </div>
          </div>
        </fieldset>

        {/* DLR Push & Suppression */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            DLR Push & Suppression
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client DLR Pushed</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.clientDlrPushed ? "Yes" : "No"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client DLR Suppressed</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewLog.clientDlrSuppressed ? "Yes" : "No"}</div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client DLR Suppressed At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.clientDlrSuppressedAt)}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Client DLR Suppression Reason
            </label>
            <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[60px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
              {viewLog.clientDlrSuppressionReason || <span className="text-gray-400 italic">No suppression reason available.</span>}
            </div>
          </div>
        </fieldset>

        {/* Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Submitted At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.submitted_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Sent At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.sent_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Delivered At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.delivered_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Failed At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.failed_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Created At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.created_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Updated At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.updated_at)}</div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Last Submit At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{formatDateTime(viewLog.last_submit_at)}</div>
            </div>
          </div>
        </fieldset>

        {/* Content & Failure Information */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Content & Failure Information
          </legend>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Failure Reason
              </label>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
                {viewLog.failure_reason || <span className="text-gray-400 italic">No failure reason available.</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Text
              </label>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
                {viewLog.text ? viewLog.text.replace(/<[^>]*>/g, "") : <span className="text-gray-400 italic">No text decoded.</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                UDH Hex
              </label>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[60px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                {viewLog.udh_hex || <span className="text-gray-400 italic">None</span>}
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

export default SmsMessagePartModal;