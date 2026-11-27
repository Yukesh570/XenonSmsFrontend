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
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import DataTable from "../../../../components/ui/DataTable";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import type { VendorTransformPreviewResponse } from "../../../../api/routeManagerApi/vendorTransformApi";
import { previewVendorTransformApi } from "../../../../api/routeManagerApi/vendorTransformApi";

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

  const handleReset = () => {
    setSenderId("YANGO");
    setDestination("9779801111111");
    setCountryId("");
    setMessageText("Your verification code is 123456");
    setResult(null);
  };

  const candidateTableHeaders = [
    "Vendor / Route",
    "Compatibility",
    "Projected Sender ID",
    "Exclusion / Selection Reason",
    "Applied Rules",
  ];

  return (
    <div className="w-full space-y-5">
      {/* Simulation Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Candidate Route Simulator
            </h2>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Select
                label="Client"
                required={true}
                placeholder="Select Client"
                value={selectedClientId ? String(selectedClientId) : ""}
                onChange={(val: string) => setSelectedClientId(val ? Number(val) : null)}
                options={clients.map((c: any) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                allowCustomValue={true}
              />
            </div>

            <div>
              <Select
                label="Destination Country"
                placeholder="Auto-detect from prefix"
                value={countryId}
                onChange={(c: string) => setCountryId(c)}
                options={[
                  { value: "", label: "Auto-detect from prefix" },
                  ...countries.map((c: any) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>

            <div>
              <Input
                label="Sender ID"
                value={senderId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSenderId(e.target.value)}
                placeholder="e.g. MYBANK or 447123"
                required
              />
            </div>

            <div>
              <Input
                label="Destination Phone Number"
                value={destination}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDestination(e.target.value)}
                placeholder="e.g. 9779801111111"
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Message Content (Optional)"
              value={messageText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
              placeholder="e.g. Your verification code is 123456"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              leftIcon={<RotateCcw size={15} />}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              leftIcon={loading ? <LoadingSpinner size="sm" /> : <Play size={15} />}
            >
              {loading ? "Simulating..." : "Run Preflight Simulation"}
            </Button>
          </div>
        </form>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Evaluating candidate routes and testing compatibility..." />
        </div>
      )}

      {/* Simulation Results Display */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Winning Candidate Route */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                Selected Winning Route
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {result.selected_candidate ? (
                  <span className="text-sm font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
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
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                Preflight Latency
              </span>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-sm font-bold text-text-primary dark:text-white">
                <Clock size={16} className="text-blue-500" />
                <span>
                  {result.latency_us} µs ({((result.latency_us || 0) / 1000).toFixed(2)} ms)
                </span>
              </div>
            </div>

            {/* Applied Rules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <span className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                Triggered Transform Rules
              </span>
              <div className="mt-2 font-mono text-xs">
                {result.applied_rule_ids && result.applied_rule_ids.length > 0 ? (
                  result.applied_rule_ids.map((id) => (
                    <span
                      key={id}
                      className="mr-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold"
                    >
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
          {((result.final_destination &&
            result.original_destination &&
            result.final_destination !== result.original_destination) ||
            (result.final_text &&
              result.original_text &&
              result.final_text !== result.original_text)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.final_destination &&
                result.original_destination &&
                result.final_destination !== result.original_destination && (
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

              {result.final_text &&
                result.original_text &&
                result.final_text !== result.original_text && (
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

          {/* Candidate Evaluations Matrix DataTable */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white px-1">
              Candidate Routes Evaluation Matrix ({result.evaluated_candidates?.length || 0} Routes Evaluated)
            </h3>
            <DataTable
              density="compact"
              headers={candidateTableHeaders}
              data={result.evaluated_candidates || []}
              totalItems={result.evaluated_candidates?.length || 0}
              serverSide={false}
              renderRow={(cand: any, idx: number) => {
                const isWinning =
                  result.selected_candidate &&
                  cand.vendor_id === result.selected_candidate.vendor_id &&
                  cand.route_id === result.selected_candidate.route_id;

                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 dark:border-gray-700 transition-colors ${
                      isWinning
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                  >
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {isWinning && (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-600 text-white font-bold uppercase">
                            Winner
                          </span>
                        )}
                        <span className="font-semibold text-text-primary dark:text-white">
                          {cand.vendor_name || `Vendor #${cand.vendor_id}`}
                        </span>
                        <span className="text-gray-400 text-xs">
                          (Route #{cand.route_id})
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      <StatusBadge
                        status={cand.compatible ? "OK" : "FAILED"}
                        customText={cand.compatible ? "COMPATIBLE" : "INCOMPATIBLE"}
                      />
                    </td>

                    <td className="px-4 py-4 text-sm text-text-primary dark:text-white font-semibold whitespace-nowrap">
                      {cand.projected_sender || "-"}
                    </td>

                    <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-400">
                      {cand.exclusion_reason || (isWinning ? "Selected by cost & priority" : "Viable candidate")}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {cand.applied_rules && cand.applied_rules.length > 0 ? (
                        cand.applied_rules.map((ruleName: string, rIdx: number) => (
                          <span
                            key={rIdx}
                            className="mr-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium"
                          >
                            {ruleName}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-sm">None</span>
                      )}
                    </td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
