import React, { useState } from "react";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import type { VendorTransformPreviewResponse } from "../../../api/authorizationApi/vendorTransformApi";
import { previewVendorTransformApi } from "../../../api/authorizationApi/vendorTransformApi";

interface VendorRouteTestConsoleTabProps {
  clients: any[];
  countries: any[];
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
}

export const VendorRouteTestConsoleTab: React.FC<VendorRouteTestConsoleTabProps> = ({
  clients,
  countries,
  selectedClientId,
  setSelectedClientId,
}) => {
  const [senderId, setSenderId] = useState("YANGO");
  const [destination, setDestination] = useState("9779801111111");
  const [countryId, setCountryId] = useState<string>("");
  const [messageText, setMessageText] = useState("Your verification code is 123456");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VendorTransformPreviewResponse | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error("Please select a Client");
      return;
    }
    if (!senderId.trim()) {
      toast.error("Please enter a Sender ID");
      return;
    }
    if (!destination.trim()) {
      toast.error("Please enter a Destination Phone Number");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await previewVendorTransformApi({
        client: selectedClientId,
        sender: senderId.trim(),
        destination: destination.trim(),
        text: messageText,
        country: countryId ? Number(countryId) : null,
      });
      setResult(res);
      toast.success("Candidate routes preflight simulation complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Simulation Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Vendor & Route-Aware Candidate Preflight Simulator
            </h2>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              Simulate candidate route discovery, test vendor compatibility profiles, and verify real-time rule rewrites.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                Client *
              </label>
              <Select
                placeholder="Select Client"
                value={selectedClientId ? String(selectedClientId) : ""}
                onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
                options={clients.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                Destination Country
              </label>
              <Select
                placeholder="Auto-detect from prefix"
                value={countryId}
                onChange={(c) => setCountryId(c)}
                options={[
                  { value: "", label: "Auto-detect from prefix" },
                  ...countries.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                Sender ID (Phase 4 Input) *
              </label>
              <Input
                placeholder="e.g. YANGO"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                Destination Phone Number *
              </label>
              <Input
                placeholder="e.g. 9779801111111"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                Message Content (Optional)
              </label>
              <Input
                placeholder="Message text to verify encoding and segments"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSenderId("YANGO");
                setDestination("9779801111111");
                setCountryId("");
                setResult(null);
              }}
              leftIcon={<RotateCcw size={14} />}
            >
              Reset
            </Button>
            <Button type="submit" isLoading={loading} leftIcon={<Play size={14} />}>
              Run Preflight Simulation
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Evaluating candidate routes against vendor compatibility matrix..." />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sender Transformation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">Sender ID Evolution</span>
              <div className="flex items-center gap-2 mt-2 font-mono">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-semibold">
                  {result.original_sender}
                </span>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded text-xs font-bold">
                  {result.final_sender}
                </span>
              </div>
            </div>

            {/* Winning Candidate Route */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">Selected Winning Route</span>
              <div className="mt-2 flex items-center gap-1.5">
                {result.selected_candidate ? (
                  <span className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                    Vendor #{result.selected_candidate.vendor_id} (Route #{result.selected_candidate.route_id})
                  </span>
                ) : (
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <XCircle size={16} />
                    No Compatible Route Found
                  </span>
                )}
              </div>
            </div>

            {/* Evaluation Latency */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">Preflight Latency</span>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-sm font-bold text-text-primary dark:text-white">
                <Clock size={16} className="text-blue-500" />
                <span>{result.latency_us} µs ({((result.latency_us || 0) / 1000).toFixed(2)} ms)</span>
              </div>
            </div>

            {/* Applied Rules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">Triggered Phase 5 Rules</span>
              <div className="mt-2 font-mono text-xs">
                {result.applied_rule_ids && result.applied_rule_ids.length > 0 ? (
                  result.applied_rule_ids.map((id) => (
                    <span key={id} className="mr-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold">
                      Rule #{id}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">No rewrite rules applied</span>
                )}
              </div>
            </div>
          </div>

          {/* Destination & Text Transformation Callout (if rewritten) */}
          {((result.final_destination && result.original_destination && result.final_destination !== result.original_destination) ||
            (result.final_text && result.original_text && result.final_text !== result.original_text)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.final_destination && result.original_destination && result.final_destination !== result.original_destination && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Destination Address Rewritten
                  </span>
                  <div className="flex items-center gap-2 mt-2 font-mono text-xs">
                    <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      {result.original_destination}
                    </span>
                    <ArrowRight size={14} className="text-amber-600 dark:text-amber-400" />
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/60 font-bold text-amber-900 dark:text-amber-200 rounded">
                      {result.final_destination}
                    </span>
                  </div>
                </div>
              )}

              {result.final_text && result.original_text && result.final_text !== result.original_text && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Message Content Rewritten
                  </span>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-500 line-through">
                      {result.original_text}
                    </div>
                    <div className="font-mono bg-blue-100/70 dark:bg-blue-900/50 p-2 rounded text-blue-950 dark:text-blue-100 font-semibold">
                      {result.final_text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Candidate Evaluations Matrix Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                Candidate Routes Evaluation Matrix ({result.evaluated_candidates?.length || 0} Routes Evaluated)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-text-secondary dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Vendor / Route</th>
                    <th className="px-4 py-3">Compatibility</th>
                    <th className="px-4 py-3">Projected Sender ID</th>
                    <th className="px-4 py-3">Exclusion / Selection Reason</th>
                    <th className="px-4 py-3">Applied Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(!result.evaluated_candidates || result.evaluated_candidates.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                        No candidate routes configured for this destination or country.
                      </td>
                    </tr>
                  ) : (
                    result.evaluated_candidates.map((cand, idx) => {
                      const isWinning =
                        result.selected_candidate &&
                        cand.vendor_id === result.selected_candidate.vendor_id &&
                        cand.route_id === result.selected_candidate.route_id;

                      return (
                        <tr
                          key={idx}
                          className={`${
                            isWinning
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold"
                              : "hover:bg-gray-50/60 dark:hover:bg-gray-750"
                          } transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isWinning && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-bold uppercase">
                                  WINNER
                                </span>
                              )}
                              <span className="font-medium text-text-primary dark:text-white">
                                {cand.vendor_name || `Vendor #${cand.vendor_id}`}
                              </span>
                            </div>
                            {cand.route_name && (
                              <span className="block text-xs text-gray-400 font-normal">
                                {cand.route_name}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {cand.compatible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle2 size={13} />
                                Compatible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                <XCircle size={13} />
                                Incompatible
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="font-semibold text-text-primary dark:text-white">
                              {cand.projected_sender}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs">
                            {cand.exclusion_reason ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                {cand.exclusion_reason}
                              </span>
                            ) : isWinning ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Selected by Priority / Percentage Engine
                              </span>
                            ) : (
                              <span className="text-gray-400">Eligible backup</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            {cand.applied_rule_ids && cand.applied_rule_ids.length > 0 ? (
                              cand.applied_rule_ids.map((rid) => (
                                <span key={rid} className="mr-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                                  #{rid}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
