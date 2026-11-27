import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import RuleBadge from "../../ui/RuleBadge";
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

  // Helper to extract rule ID strings from array, number, or string (filtering out empty arrays/values)
  const formatRuleList = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((id) => id != null && String(id).trim() !== "").map((id) => `#${id}`);
    }
    const str = String(raw).trim();
    if (!str || str.toLowerCase() === "none") return [];
    return [str.startsWith("#") ? str : `#${str}`];
  };

  const senderRules = viewLog.senderTranslationRuleId
    ? [`#${viewLog.senderTranslationRuleId}`]
    : [];
  const destRules = formatRuleList(viewLog.destinationTranslationRuleIds);
  const textRules = formatRuleList(viewLog.textTranslationRuleIds);
  const vendorRules = formatRuleList(viewLog.vendorTransformRuleIds);

  const hasEffectiveRules = senderRules.length > 0 || destRules.length > 0 || textRules.length > 0;
  const hasVendorRules = vendorRules.length > 0;

  // Normalized values across Ingress, Effective, and Vendor Wire
  const rawSender = viewLog.source_addr || "-";
  const effectiveSender = viewLog.effectiveSenderId || rawSender;
  const vendorSender = viewLog.finalVendorSenderId || effectiveSender;

  const rawDestination = viewLog.originalDestination || viewLog.destination || "-";
  const effectiveDestination = viewLog.effectiveDestination || viewLog.destination || "-";
  const vendorDestination = viewLog.finalVendorDestination || effectiveDestination;

  const rawSegments = viewLog.originalSegmentCount ?? viewLog.segmentNumber ?? "-";
  const effectiveSegments = viewLog.effectiveSegmentCount ?? viewLog.segmentNumber ?? "-";
  const vendorSegments = viewLog.finalVendorSegmentCount ?? effectiveSegments;

  const rawText = viewLog.originalMessageText || viewLog.text || "";
  const effectiveText = viewLog.effectiveMessageText || viewLog.text || "";
  const vendorText = viewLog.finalVendorMessageText || effectiveText;

  const hasTextTransform =
    (rawText && effectiveText && rawText !== effectiveText) ||
    (effectiveText && vendorText && effectiveText !== vendorText) ||
    (vendorText && vendorText !== viewLog.text);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Details"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Message Identity & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Identity & Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Message ID" value={viewLog.message_id || "-"} disabled />
            <Input label="Destination" value={rawDestination} disabled />
            <Input label="Status" value={viewLog.status || "-"} disabled className="capitalize" />
            <Input label="Sender ID" value={rawSender} disabled />
          </div>
        </fieldset>

        {/* Client & Account */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Client & Account
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Client" value={viewLog.clientName || "-"} disabled />
            <Input label="SMPP" value={viewLog.smppName || "-"} disabled />
            <Input label="System ID" value={viewLog.systemId || "-"} disabled />
          </div>
        </fieldset>

        {/* Vendor & Routing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Vendor & Routing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Vendor" value={viewLog.vendorName || "-"} disabled />
            <Input label="Country" value={viewLog.countryName || "-"} disabled />
            <Input
              label="MCCMNC"
              value={
                viewLog.mcc && viewLog.mnc
                  ? `${String(viewLog.mcc).padStart(3, "0")}${String(viewLog.mnc).padStart(3, "0")}`
                  : viewLog.mcc || viewLog.mnc || "-"
              }
              disabled
            />
          </div>
        </fieldset>

        {/* Transmission & Timestamps */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Transmission & Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input label="Encoding" value={viewLog.encoding || "-"} disabled />
            <Input label="Segment" value={String(viewLog.segmentNumber || "-")} disabled />
            <Input label="Character Count" value={String(viewLog.characterCount || "-")} disabled />
            <Input label="Failure Reason" value={viewLog.failure_reason || "-"} disabled />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Input label="Created At" value={formatDateTime(viewLog.createdAt)} disabled />
            <Input label="Queued At" value={formatDateTime(viewLog.queued_at)} disabled />
            <Input label="Submitted At" value={formatDateTime(viewLog.submitted_at)} disabled />
            <Input label="Delivered At" value={formatDateTime(viewLog.delivered_at)} disabled />
            <Input label="Failed At" value={formatDateTime(viewLog.failed_at)} disabled />
          </div>
        </fieldset>

        {/* Transformation Lifecycle */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Transformation Lifecycle
          </legend>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                  <th className="px-4 py-2.5 w-32">Entity</th>
                  <th className="px-4 py-2.5">Ingress (Client)</th>
                  <th className="px-4 py-2.5">Effective</th>
                  <th className="px-4 py-2.5">Vendor Wire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900/40 text-text-primary dark:text-gray-200">
                {/* SENDER ID */}
                <tr>
                  <td className="px-4 py-2.5 font-medium text-text-secondary dark:text-gray-400">
                    Sender ID
                  </td>
                  <td className="px-4 py-2.5">
                    {rawSender}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {effectiveSender}
                    {viewLog.senderTranslationRuleId ? (
                      <span className="ml-2 inline-flex items-center">
                        <RuleBadge id={viewLog.senderTranslationRuleId} type="sender" labelPrefix="Rule" />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    {vendorSender}
                  </td>
                </tr>

                {/* DESTINATION */}
                <tr>
                  <td className="px-4 py-2.5 font-medium text-text-secondary dark:text-gray-400">
                    Destination
                  </td>
                  <td className="px-4 py-2.5">
                    {rawDestination}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {effectiveDestination}
                    {destRules.length > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        {destRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="destination" labelPrefix="Rule" />
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {vendorDestination}
                  </td>
                </tr>

                {/* SEGMENTS */}
                <tr>
                  <td className="px-4 py-2.5 font-medium text-text-secondary dark:text-gray-400">
                    Segments
                  </td>
                  <td className="px-4 py-2.5">
                    {rawSegments}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {effectiveSegments}
                  </td>
                  <td className="px-4 py-2.5">
                    {vendorSegments}
                  </td>
                </tr>

                {/* APPLIED RULES */}
                <tr>
                  <td className="px-4 py-2.5 font-medium text-text-secondary dark:text-gray-400">
                    Applied Rules
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary dark:text-gray-400">
                    —
                  </td>
                  <td className="px-4 py-2.5">
                    {hasEffectiveRules ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {destRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="destination" />
                        ))}
                        {senderRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="sender" />
                        ))}
                        {textRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="text" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        None
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {hasVendorRules ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {vendorRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="vendor" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        None
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>

        {/* Message Content */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Content
          </legend>
          {hasTextTransform ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextArea
                label="Ingress Text (Client)"
                value={rawText}
                disabled
                rows={4}
              />
              <TextArea
                label="Effective Text"
                value={effectiveText || viewLog.text || ""}
                disabled
                rows={4}
              />
              <TextArea
                label="Vendor Wire Text"
                value={vendorText || effectiveText || viewLog.text || ""}
                disabled
                rows={4}
              />
            </div>
          ) : (
            <TextArea
              label="Message Text"
              value={viewLog.text || "No message text available."}
              disabled
              rows={4}
            />
          )}
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

export default MessageReportModal;


