import React from "react";
import { Layers } from "lucide-react";
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
              Sender ID
            </label>
            <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.source_addr || viewLog.effectiveSenderId || "-"}
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
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Country
            </label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.countryName || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              MCCMNC
            </label>
            <div className="text-sm font-mono text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {viewLog.mcc && viewLog.mnc
                ? `${String(viewLog.mcc).padStart(3, "0")}${String(viewLog.mnc).padStart(3, "0")}`
                : viewLog.mcc || viewLog.mnc || "-"}
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

        {/* 3-Layer Transformation Lifecycle (Ingress -> Effective -> Vendor Wire) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-white">
                Payload Transformation Lifecycle (3 Layers)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] uppercase text-text-secondary dark:text-gray-400 font-semibold">
                  <th className="px-4 py-2 w-32">Entity</th>
                  <th className="px-4 py-2">1. Ingress (Raw Client)</th>
                  <th className="px-4 py-2">2. Effective</th>
                  <th className="px-4 py-2">3. Vendor Wire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono">
                {/* SENDER ID */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Sender ID
                  </td>
                  <td className="px-4 py-2.5 text-text-primary dark:text-white">
                    {viewLog.source_addr || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {viewLog.effectiveSenderId || viewLog.source_addr || "-"}
                    {viewLog.senderTranslationRuleId ? (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-sans font-normal bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                        Rule #{viewLog.senderTranslationRuleId}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {viewLog.finalVendorSenderId || viewLog.effectiveSenderId || viewLog.source_addr || "-"}
                  </td>
                </tr>

                {/* DESTINATION */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Destination
                  </td>
                  <td className="px-4 py-2.5 text-text-primary dark:text-white">
                    {viewLog.originalDestination || viewLog.destination || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {viewLog.effectiveDestination || viewLog.destination || "-"}
                    {destRules.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-sans font-normal bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                        Rule {destRules.join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {viewLog.finalVendorDestination || viewLog.effectiveDestination || viewLog.destination || "-"}
                  </td>
                </tr>

                {/* SEGMENTS */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Segments
                  </td>
                  <td className="px-4 py-2.5 text-text-primary dark:text-white">
                    {viewLog.originalSegmentCount ?? viewLog.segmentNumber ?? "-"}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {viewLog.effectiveSegmentCount ?? viewLog.segmentNumber ?? "-"}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {viewLog.finalVendorSegmentCount ?? viewLog.effectiveSegmentCount ?? viewLog.segmentNumber ?? "-"}
                  </td>
                </tr>

                {/* APPLIED RULES */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Applied Rules
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary dark:text-gray-400 font-sans text-[11px]">
                    — <span className="text-[10px] text-gray-400 dark:text-gray-500">(Raw Client)</span>
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {hasEffectiveRules ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {destRules.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Destination Rule {destRules.join(", ")}
                          </span>
                        )}
                        {senderRules.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Sender Rule {senderRules.join(", ")}
                          </span>
                        )}
                        {textRules.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Text Rule {textRules.join(", ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        None (Unmodified)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {hasVendorRules ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Vendor Rule {vendorRules.join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        None (Pass-Through)
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Message Text Area (with Phase 4 & Phase 5 transformation awareness) */}
        <div className="mt-4 space-y-3">
          {((viewLog.originalMessageText && viewLog.effectiveMessageText && viewLog.originalMessageText !== viewLog.effectiveMessageText) ||
            (viewLog.effectiveMessageText && viewLog.finalVendorMessageText && viewLog.effectiveMessageText !== viewLog.finalVendorMessageText) ||
            (viewLog.finalVendorMessageText && viewLog.finalVendorMessageText !== viewLog.text)) ? (
            <div className="space-y-3">
              {viewLog.originalMessageText && viewLog.originalMessageText !== (viewLog.effectiveMessageText || viewLog.text) && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary dark:text-gray-400 mb-1">
                    1. Ingress Text (Client Raw)
                  </label>
                  <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words">
                    {viewLog.originalMessageText}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
                  2. Effective Text (Phase 4 Ingress Filter)
                  {textRules.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                      Rules {textRules.join(', ')}
                    </span>
                  )}
                </label>
                <div className="w-full bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words">
                  {viewLog.effectiveMessageText || viewLog.text}
                </div>
              </div>

              {viewLog.finalVendorMessageText && viewLog.finalVendorMessageText !== (viewLog.effectiveMessageText || viewLog.text) && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    3. Final Vendor Wire Text (Phase 5 Egress Adapt)
                  </label>
                  <div className="w-full bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words">
                    {viewLog.finalVendorMessageText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-text-secondary dark:text-gray-400">
                  Message Text
                </label>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  Unmodified Pass-Through
                </span>
              </div>
              <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
                {viewLog.text || <span className="text-gray-400 italic">No message text available.</span>}
              </div>
            </div>
          )}
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