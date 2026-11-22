import React from "react";
import { Layers } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import RuleBadge from "../../ui/RuleBadge";
import { type DetailedReportData } from "../../../api/reportApi/detailedReportApi";
import { formatDateTime } from "../../../helper/dateFormatter";

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
  const destRules = formatRuleList(viewLog.destinationTranslationRuleIds ?? (viewLog as any).destination_translation_rule_ids);
  const textRules = formatRuleList(viewLog.textTranslationRuleIds ?? (viewLog as any).text_translation_rule_ids);
  const vendorRules = formatRuleList(viewLog.vendorTransformRuleIds ?? (viewLog as any).vendor_transform_rule_ids);

  const hasEffectiveRules = senderRules.length > 0 || destRules.length > 0 || textRules.length > 0;
  const hasVendorRules = vendorRules.length > 0;

  // Normalized values across Ingress, Effective, and Vendor Wire
  const rawSender = viewLog.source_addr || viewLog.senderId || "-";
  const effectiveSender = viewLog.effectiveSenderId || rawSender;
  const vendorSender = viewLog.finalVendorSenderId || (viewLog as any).final_vendor_sender_id || effectiveSender;

  const rawDestination = viewLog.originalDestination || (viewLog as any).original_destination || viewLog.destination || "-";
  const effectiveDestination = viewLog.effectiveDestination || (viewLog as any).effective_destination || viewLog.destination || "-";
  const vendorDestination = viewLog.finalVendorDestination || (viewLog as any).final_vendor_destination || effectiveDestination;

  const rawSegments = viewLog.originalSegmentCount ?? (viewLog as any).original_segment_count ?? viewLog.part_total ?? "-";
  const effectiveSegments = viewLog.effectiveSegmentCount ?? (viewLog as any).effective_segment_count ?? viewLog.part_total ?? "-";
  const vendorSegments = viewLog.finalVendorSegmentCount ?? (viewLog as any).final_vendor_segment_count ?? effectiveSegments;

  const rawText = viewLog.originalMessageText || (viewLog as any).original_text || viewLog.content || "";
  const effectiveText = viewLog.effectiveMessageText || (viewLog as any).effective_text || (viewLog as any).effectiveText || viewLog.content || "";
  const vendorText = viewLog.finalVendorMessageText || (viewLog as any).final_vendor_text || effectiveText;

  const hasTextTransform =
    (rawText && effectiveText && rawText !== effectiveText) ||
    (effectiveText && vendorText && effectiveText !== vendorText) ||
    (vendorText && vendorText !== viewLog.content);

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
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{rawDestination}</div>
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
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Company</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.company || "-"}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendor || "-"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Vendor Msg ID</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.vendor_msg_id || "-"}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Vendor Charge</label>
              <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.base_vendor_charge ?? viewLog.vendor_charge ?? "0"}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Country</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{viewLog.countryName || (viewLog as any).country || "-"}</div>
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
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{formatDateTime(viewLog.request_time)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Queued At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{formatDateTime(viewLog.message_queued_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Delivered At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{formatDateTime(viewLog.message_delivered_at)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Failed At</label>
              <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 truncate">{formatDateTime(viewLog.message_failed_at)}</div>
            </div>
          </div>
        </fieldset>

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
                    {rawSender}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {effectiveSender}
                    {viewLog.senderTranslationRuleId ? (
                      <span className="ml-1.5 inline-flex items-center">
                        <RuleBadge id={viewLog.senderTranslationRuleId} type="sender" labelPrefix="Rule" size="xs" />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {vendorSender}
                  </td>
                </tr>

                {/* DESTINATION */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Destination
                  </td>
                  <td className="px-4 py-2.5 text-text-primary dark:text-white">
                    {rawDestination}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {effectiveDestination}
                    {destRules.length > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-1">
                        {destRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="destination" labelPrefix="Rule" size="xs" />
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {vendorDestination}
                  </td>
                </tr>

                {/* SEGMENTS */}
                <tr>
                  <td className="px-4 py-2.5 font-sans font-medium text-text-secondary dark:text-gray-400">
                    Segments
                  </td>
                  <td className="px-4 py-2.5 text-text-primary dark:text-white">
                    {rawSegments}
                  </td>
                  <td className="px-4 py-2.5 text-primary font-semibold">
                    {effectiveSegments}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {vendorSegments}
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
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        None (Unmodified)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {hasVendorRules ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {vendorRules.map((rid) => (
                          <RuleBadge key={rid} id={rid} type="vendor" />
                        ))}
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

        {/* Message Text Area */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Message Text
          </legend>
          {hasTextTransform ? (
            <div className="space-y-3">
              {rawText && rawText !== (effectiveText || viewLog.content) && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary dark:text-gray-400 mb-1">
                    1. Ingress Text (Client Raw)
                  </label>
                  <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                    {rawText}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
                  2. Effective Text (Phase 4 Ingress Filter)
                  {textRules.map((rid) => (
                    <RuleBadge key={rid} id={rid} type="text" labelPrefix="Rule" size="xs" />
                  ))}
                </label>
                <div className="w-full bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                  {effectiveText || viewLog.content}
                </div>
              </div>

              {vendorText && vendorText !== (effectiveText || viewLog.content) && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    3. Final Vendor Wire Text (Phase 5 Egress Adapt)
                  </label>
                  <div className="w-full bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-3 text-xs text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
                    {vendorText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words font-mono">
              {viewLog.content || <span className="text-gray-400 italic">No message content available.</span>}
            </div>
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

export default DetailedReportModal;
