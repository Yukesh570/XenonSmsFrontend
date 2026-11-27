import React from "react";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import type { VendorTransformTraceDto } from "../../../../api/routeManagerApi/vendorTransformApi";

interface VendorTransformTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: VendorTransformTraceDto | null;
}

export const VendorTransformTraceModal: React.FC<VendorTransformTraceModalProps> = ({
  isOpen,
  onClose,
  trace,
}) => {
  if (!trace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vendor Transform Trace — ${trace.messageId}`}
      className="max-w-2xl"
      closeOnBackdropClick={true}
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-transparent p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-[11px] text-gray-500">Message ID</div>
            <div className="font-mono font-semibold text-text-primary dark:text-white mt-0.5 break-all">
              {trace.messageId}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Selected Vendor</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {trace.selectedVendor__profileName ||
                (trace.selectedVendor ? `Vendor #${trace.selectedVendor}` : "-")}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Selected Route</div>
            <div className="font-medium text-text-primary dark:text-white mt-0.5">
              {trace.selectedRoute
                ? `#${trace.selectedRoute}${
                    trace.selectedRoute__name ? ` (${trace.selectedRoute__name})` : ""
                  }`
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Eval Latency</div>
            <div className="font-mono font-medium text-text-primary dark:text-white mt-0.5">
              {trace.latencyUs != null ? `${trace.latencyUs} µs` : "-"}
            </div>
          </div>
        </div>

        {/* Pipeline Progression */}
        <div className="space-y-2">
          <h4 className="font-semibold text-text-primary dark:text-white">Sender ID Progression</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="text-[10px] uppercase text-gray-500">1. Original (Client)</div>
              <div className="font-mono text-sm font-semibold mt-1 text-text-primary dark:text-white break-all">
                {trace.originalSender || "(blank)"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/20">
              <div className="text-[10px] uppercase text-blue-600 dark:text-blue-400">
                2. After Phase 2–4
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-blue-800 dark:text-blue-200 break-all">
                {trace.phase4Sender || "(blank)"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/20">
              <div className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
                3. Final Vendor (Wire)
              </div>
              <div className="font-mono text-sm font-semibold mt-1 text-emerald-800 dark:text-emerald-200 break-all">
                {trace.finalVendorSender || "(blank)"}
              </div>
            </div>
          </div>
        </div>

        {/* Destination & Segments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-[11px] font-semibold text-text-primary dark:text-white mb-1">
              Destination
            </div>
            <div className="font-mono flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-500">{trace.originalDestination || "-"}</span>
              <ArrowRight size={12} className="text-gray-400 shrink-0" />
              <span className="font-semibold text-text-primary dark:text-white">
                {trace.finalVendorDestination || trace.originalDestination || "-"}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-[11px] font-semibold text-text-primary dark:text-white mb-1">
              Segments & Applied Rules
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
                {trace.segmentsBefore} → {trace.segmentsAfter} segs
              </span>
              {trace.appliedRuleIds && trace.appliedRuleIds.length > 0 ? (
                trace.appliedRuleIds.map((rid) => (
                  <span
                    key={rid}
                    className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 font-mono"
                  >
                    Rule #{rid}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">No transform rules applied</span>
              )}
            </div>
          </div>
        </div>

        {/* Skipped / Incompatible Vendors */}
        <div>
          <h4 className="font-semibold text-text-primary dark:text-white mb-2">
            Skipped / Incompatible Candidates ({trace.exclusionsSummary?.length || 0})
          </h4>
          {trace.exclusionsSummary && trace.exclusionsSummary.length > 0 ? (
            <div className="divide-y divide-amber-100 dark:divide-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 max-h-48 overflow-y-auto">
              {trace.exclusionsSummary.map((ex, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <span className="font-semibold text-text-primary dark:text-white">
                      {ex.vendor_name || `Vendor #${ex.vendor_id}`}
                    </span>
                    {ex.route_id && (
                      <span className="text-gray-500 font-mono">(Route #{ex.route_id})</span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-mono text-[11px]">
                    {ex.reason || "INCOMPATIBLE"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>Primary candidate vendor was compatible — no routes were skipped.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VendorTransformTraceModal;
