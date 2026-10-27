import React, { useState } from "react";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import TextArea from "../../../components/ui/TextArea";
import Select from "../../../components/ui/Select";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import {
  previewMessageFilterRuleApi,
  type PreviewResponse,
  type PreviewTraceEntry,
} from "../../../api/authorizationApi/messageFilterApi";

interface TestConsoleTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
}

export const TestConsoleTab: React.FC<TestConsoleTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
}) => {
  // Test Input State
  const [sender, setSender] = useState("AcmeBank");
  const [destination, setDestination] = useState("447700900077");
  const [text, setText] = useState(
    "Your verification code is [CODE]. Visit https://acme.com for details."
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);

  // Preset quick templates
  const presets = [
    {
      label: "OTP with Dynamic Random Token",
      sender: "VERIFY",
      destination: "12025550100",
      text: "Your security code is [CODE]. Do not share this with anyone.",
    },
    {
      label: "UK Zero-Prefix Strip (+44)",
      sender: "ALERTS",
      destination: "07700900077",
      text: "Your parcel is on its way. Track live at track.link",
    },
    {
      label: "Multi-Rule Chained Transformation",
      sender: "MYAPP",
      destination: "44712345678",
      text: "Welcome to AcmeBank! Use ref code REF_HERE for 10% off.",
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setSender(p.sender);
    setDestination(p.destination);
    setText(p.text);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.warn("Please select a client to test rules against");
      return;
    }
    if (!destination.trim()) {
      toast.error("Destination number is required");
      return;
    }
    if (!text.trim()) {
      toast.error("Message text is required");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await previewMessageFilterRuleApi({
        client: selectedClientId,
        sender: sender.trim() || "DEFAULT",
        destination: destination.trim(),
        text: text,
      });
      setResult(res);
      if (res.errors && res.errors.length > 0) {
        toast.warn(`Simulation generated warnings: ${res.errors.join(", ")}`);
      } else {
        const ms = res.latencyUs ? (res.latencyUs / 1000).toFixed(2) : "<1";
        toast.success(`Simulation completed in ${ms} ms`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Simulation failed to execute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sleek, Compact Selector Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
              options={clients.map((c) => ({
                value: String(c.id),
                label: c.name
                  ? c.companyName
                    ? `${c.name} (${c.companyName})`
                    : c.name
                  : c.companyName || `Client #${c.id}`,
              }))}
            />
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedClientId(null)}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Instruction Note if no client selected */}
      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to simulate ingress SMS traffic against its active Destination Rules and Message Text Rules.
          </p>
        </div>
      )}

      {selectedClientId && (
        <>
          {/* Simulator Card */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Interactive Message Filter & Translation Simulator
                </h2>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                  Simulate ingress traffic through the entire filter pipeline without sending live SMS messages.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                  Presets:
                </span>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-700/60 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-text-primary dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors shadow-2xs font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleRunSimulation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Source Sender ID"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="e.g. AcmeAlert or 12025550100"
                />

                <Input
                  label="Destination MSISDN / Number"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. 447700900077 or 07700900077"
                  required
                />
              </div>

              <div>
                <TextArea
                  label="Message Content Text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Enter SMS message payload to simulate..."
                  required
                />
                <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
                  <span>Length: {text.length} characters</span>
                  <span>Input Encoding: {/[^\u0000-\u007F]/.test(text) ? "UCS-2" : "GSM-7"}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  leftIcon={loading ? <LoadingSpinner size="sm" /> : <Play size={16} />}
                >
                  {loading ? "Evaluating Pipeline..." : "Run Pipeline Simulation"}
                </Button>
              </div>
            </form>
          </div>

          {/* Simulation Results Display */}
          {result && (
            <div className="space-y-4">
              {/* Top Status & Metrics Banner */}
              <div
                className={`p-4 sm:p-5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  result.errors && result.errors.length > 0
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                    : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-full shrink-0 ${
                      result.errors && result.errors.length > 0
                        ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300"
                        : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300"
                    }`}
                  >
                    {result.errors && result.errors.length > 0 ? (
                      <XCircle size={22} />
                    ) : (
                      <CheckCircle size={22} />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-sm sm:text-base font-bold ${
                        result.errors && result.errors.length > 0
                          ? "text-rose-900 dark:text-rose-200"
                          : "text-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      {result.errors && result.errors.length > 0
                        ? "Simulation Warning / Rule Rejection"
                        : result.matched
                        ? "Pipeline Rules MATCHED & Applied"
                        : "Pipeline Evaluation PASSED (No Rules Matched)"}
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                      {result.errors && result.errors.length > 0
                        ? result.errors.join("; ")
                        : result.matched
                        ? `${result.appliedRules?.length || 0} rule(s) executed successfully.`
                        : "Message payload passed through without transformation."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-text-secondary dark:text-gray-400">Latency:</span>
                    <span className="font-mono font-bold text-text-primary dark:text-white">
                      {result.latencyUs ? (result.latencyUs / 1000).toFixed(2) : "<1"} ms
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <Layers size={14} className="text-gray-400" />
                    <span className="text-text-secondary dark:text-gray-400">Rules Applied:</span>
                    <span className="font-mono font-bold text-text-primary dark:text-white">
                      {result.appliedRules?.length || 0}
                    </span>
                  </div>

                  {result.randomFunctionsUsed && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-2xs">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>Random Macro Expanded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Input Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                      Original Ingress Values
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Before Transformation
                    </span>
                  </div>

                  {/* Sender */}
                  <div className="space-y-1">
                    <span className="text-xs text-text-secondary dark:text-gray-400">Sender ID</span>
                    <div className="font-mono text-sm font-semibold text-text-primary dark:text-white p-2.5 bg-gray-50/80 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                      {result.original?.sender || "--"}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-1">
                    <span className="text-xs text-text-secondary dark:text-gray-400">Destination Number</span>
                    <div className="font-mono text-sm font-semibold text-text-primary dark:text-white p-2.5 bg-gray-50/80 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                      {result.original?.destination}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                      <span>Message Text</span>
                      <span className="font-mono">{result.original?.text?.length || 0} chars</span>
                    </div>
                    <div className="font-mono text-xs text-text-primary dark:text-gray-200 p-3 bg-gray-50/80 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700 whitespace-pre-wrap break-all min-h-[90px]">
                      {result.original?.text}
                    </div>
                  </div>

                  {/* SMS Segments & Encoding */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 bg-gray-50/80 dark:bg-gray-800/60 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                      <span className="block text-[11px] text-text-secondary dark:text-gray-400">Encoding</span>
                      <span className="font-semibold text-xs text-text-primary dark:text-white">
                        {result.original?.encoding || "GSM-7"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-50/80 dark:bg-gray-800/60 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                      <span className="block text-[11px] text-text-secondary dark:text-gray-400">Segments</span>
                      <span className="font-semibold text-xs text-text-primary dark:text-white">
                        {result.original?.segmentCount || 1} Part{(result.original?.segmentCount || 1) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Effective Output Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-primary/30 dark:border-primary/40 shadow-sm space-y-4 ring-1 ring-primary/20">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Effective Egress Output
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary">
                      Upstream Delivery Value
                    </span>
                  </div>

                  {/* Sender */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                      <span>Effective Sender ID</span>
                      {result.effective?.sender !== result.original?.sender && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                          Transformed
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold text-primary p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                      {result.effective?.sender || result.original?.sender}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                      <span>Normalized Destination</span>
                      {result.effective?.country_name && (
                        <span className="text-xs font-medium text-text-primary dark:text-white">
                          {result.effective.country_name}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold text-primary p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                      {result.effective?.destination}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                      <span>Transformed Message Text</span>
                      <span className="font-mono">
                        {result.effective?.text?.length || 0} chars (
                        {(result.effective?.text?.length || 0) - (result.original?.text?.length || 0) >= 0 ? "+" : ""}
                        {(result.effective?.text?.length || 0) - (result.original?.text?.length || 0)} diff)
                      </span>
                    </div>
                    <div className="font-mono text-xs text-text-primary dark:text-gray-200 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 whitespace-pre-wrap break-all min-h-[90px]">
                      {result.effective?.text}
                    </div>
                  </div>

                  {/* SMS Segments & Encoding */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg text-center border border-primary/20">
                      <span className="block text-[11px] text-text-secondary dark:text-gray-400">Encoding</span>
                      <span className="font-semibold text-xs text-text-primary dark:text-white">
                        {result.effective?.encoding || "GSM-7"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg text-center border border-primary/20">
                      <span className="block text-[11px] text-text-secondary dark:text-gray-400">Segments</span>
                      <span className="font-bold text-xs text-primary">
                        {result.effective?.segmentCount || 1} Part{(result.effective?.segmentCount || 1) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sequential Execution Trace Timeline */}
              <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  Sequential Rule Execution Trace (Priority Order)
                </h3>

                {!result.trace || result.trace.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-secondary dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    No matching rules triggered for this payload. Message passed through unchanged.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                    {result.trace.map((trace: PreviewTraceEntry, idx: number) => (
                      <div key={idx} className="relative group">
                        {/* Timeline Node Circle */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                          {idx + 1}
                        </div>

                        <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-700/60 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-text-primary dark:text-white">
                                {trace.rule_name}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                {trace.target}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                Action: {trace.action}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700/60 font-mono">
                              <span className="block text-[10px] text-gray-400 uppercase font-sans font-semibold mb-0.5">
                                Input Value
                              </span>
                              <span className="text-text-primary dark:text-gray-200 break-all">
                                {trace.before}
                              </span>
                            </div>

                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-primary/20 font-mono">
                              <span className="block text-[10px] text-primary uppercase font-sans font-semibold mb-0.5">
                                Transformed Output
                              </span>
                              <span className="text-primary font-semibold break-all">
                                {trace.after}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
