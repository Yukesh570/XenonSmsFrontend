import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
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
            <Input label="Segment ID" value={viewLog.id || "-"} disabled />
            <Input label="Message ID" value={viewLog.message || "-"} disabled />
            <div className="lg:col-span-2">
              <Input label="Destination" value={viewLog.parent_message_destination || "-"} disabled />
            </div>
          </div>
        </fieldset>

        {/* Transmission & Metrics */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Transmission & Metrics
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Submit Status" value={viewLog.submit_status || "-"} disabled className="capitalize" />
            <Input label="Part / Total" value={`${viewLog.part_no ?? "-"} / ${viewLog.part_total ?? "-"}`} disabled />
            <Input label="Submit Attempts" value={String(viewLog.submit_attempts ?? "0")} disabled />
            <Input label="ESM Class" value={viewLog.esm_class !== undefined && viewLog.esm_class !== null ? String(viewLog.esm_class) : "-"} disabled />
          </div>
        </fieldset>

        {/* Vendor & Protocol Details */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Vendor & Protocol Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Input label="Vendor Msg ID" value={viewLog.vendor_msg_id || "-"} disabled />
            </div>
            <Input label="UDH Ref" value={viewLog.udh_ref !== undefined && viewLog.udh_ref !== null ? String(viewLog.udh_ref) : "-"} disabled />
            <Input label="Vendor Submit Status" value={viewLog.vendor_submit_status !== null && viewLog.vendor_submit_status !== undefined ? String(viewLog.vendor_submit_status) : "-"} disabled />
          </div>
        </fieldset>

        {/* DLR Push & Suppression */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            DLR Push & Suppression
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input label="Client DLR Pushed" value={viewLog.clientDlrPushed ? "Yes" : "No"} disabled />
            <Input label="Client DLR Suppressed" value={viewLog.clientDlrSuppressed ? "Yes" : "No"} disabled />
            <div className="lg:col-span-2">
              <Input label="Client DLR Suppressed At" value={formatDateTime(viewLog.clientDlrSuppressedAt)} disabled />
            </div>
          </div>
          <div>
            <TextArea
              label="Client DLR Suppression Reason"
              value={viewLog.clientDlrSuppressionReason || "No suppression reason available."}
              disabled
              rows={2}
            />
          </div>
        </fieldset>

        {/* Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Submitted At" value={formatDateTime(viewLog.submitted_at)} disabled />
            <Input label="Sent At" value={formatDateTime(viewLog.sent_at)} disabled />
            <Input label="Delivered At" value={formatDateTime(viewLog.delivered_at)} disabled />
            <Input label="Failed At" value={formatDateTime(viewLog.failed_at)} disabled />
            <Input label="Created At" value={formatDateTime(viewLog.created_at)} disabled />
            <Input label="Updated At" value={formatDateTime(viewLog.updated_at)} disabled />
            <div className="lg:col-span-2">
              <Input label="Last Submit At" value={formatDateTime(viewLog.last_submit_at)} disabled />
            </div>
          </div>
        </fieldset>

        {/* Content & Failure Information */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Content & Failure Information
          </legend>
          <div className="space-y-4">
            <TextArea
              label="Failure Reason"
              value={viewLog.failure_reason || "No failure reason available."}
              disabled
              rows={2}
            />
            <TextArea
              label="Text"
              value={viewLog.text ? viewLog.text.replace(/<[^>]*>/g, "") : "No text decoded."}
              disabled
              rows={3}
            />
            <TextArea
              label="UDH Hex"
              value={viewLog.udh_hex || "None"}
              disabled
              rows={2}
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

export default SmsMessagePartModal;