import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Modal from "../../../components/ui/Modal";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import {
  getVendorTransformTracesApi,
  type VendorTransformTraceDto,
} from "../../../api/authorizationApi/vendorTransformApi";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";

interface VendorTransformTracesTabProps {
  selectedClientId?: number | null;
  clients?: any[];
}

const formatTimestamp = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const VendorTransformTracesTab: React.FC<VendorTransformTracesTabProps> = ({
  selectedClientId,
  clients = [],
}) => {
  const [traces, setTraces] = useState<VendorTransformTraceDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterVendorId, setFilterVendorId] = useState<string>("");
  const [filterClientId, setFilterClientId] = useState<string>(
    selectedClientId ? String(selectedClientId) : ""
  );
  const [filterSender, setFilterSender] = useState("");
  const [debouncedSender, setDebouncedSender] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyExclusions, setOnlyExclusions] = useState(false);

  // Detail Drawer / Modal
  const [inspectTrace, setInspectTrace] = useState<VendorTransformTraceDto | null>(null);

  useEffect(() => {
    if (selectedClientId) {
      setFilterClientId(String(selectedClientId));
      setPage(1);
    }
  }, [selectedClientId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSender(filterSender.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [filterSender]);

  useEffect(() => {
    getVendorsApi(undefined, 1, 1000)
      .then((res: any) => {
        const list = res?.results || (Array.isArray(res) ? res : []);
        setVendors(list);
      })
      .catch(() => setVendors([]));
  }, []);

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedSender) params.sender = debouncedSender;
      if (filterVendorId) params.vendor = Number(filterVendorId);
      if (filterClientId) params.client = Number(filterClientId);
      if (onlyExclusions) params.hasExclusions = true;
      if (dateFrom) params.dateFrom = new Date(`${dateFrom}T00:00:00`).toISOString();
      if (dateTo) params.dateTo = new Date(`${dateTo}T23:59:59`).toISOString();

      const res = await getVendorTransformTracesApi(params);
      setTraces(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to fetch vendor transform traces:", err);
      toast.error("Failed to load vendor transform traces");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    debouncedSender,
    filterVendorId,
    filterClientId,
    onlyExclusions,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  const handleResetFilters = () => {
    setSearchText("");
    setDebouncedSearch("");
    setFilterSender("");
    setDebouncedSender("");
    setFilterVendorId("");
    setFilterClientId("");
    setDateFrom("");
    setDateTo("");
    setOnlyExclusions(false);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const exclusionsOnPage = traces.filter(
    (t) => Array.isArray(t.exclusionsSummary) && t.exclusionsSummary.length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <span>Phase 5 Vendor Transform & Failover Traces</span>
            </h2>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              Read-only audit log of every SMS that triggered a Phase 5 rule or skipped an incompatible vendor route.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={loadTraces}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Message ID / Search
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                type="text"
                value={searchText}
                onChange={(e: any) => setSearchText(e.target.value)}
                placeholder="Search messageId, destination, vendor..."
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Sender ID
            </label>
            <Input
              type="text"
              value={filterSender}
              onChange={(e: any) => setFilterSender(e.target.value)}
              placeholder="Orig / Phase 4 / Final"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              Selected Vendor
            </label>
            <Select
              value={filterVendorId}
              onChange={(val: any) => {
                const v = typeof val === "object" && val?.target ? val.target.value : val;
                setFilterVendorId(v ? String(v) : "");
                setPage(1);
              }}
              options={[
                { value: "", label: "All Vendors" },
                ...vendors.map((v) => ({
                  value: String(v.id),
                  label: v.profileName || `Vendor #${v.id}`,
                })),
              ]}
              placeholder="All Vendors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e: any) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e: any) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex flex-wrap items-center gap-4">
            {clients.length > 0 && (
              <div className="w-56">
                <Select
                  value={filterClientId}
                  onChange={(val: any) => {
                    const v = typeof val === "object" && val?.target ? val.target.value : val;
                    setFilterClientId(v ? String(v) : "");
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "All Clients" },
                    ...clients.map((c) => ({
                      value: String(c.id),
                      label: c.name || c.smppUsername || `Client #${c.id}`,
                    })),
                  ]}
                  placeholder="All Clients"
                />
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-xs font-medium text-text-primary dark:text-gray-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyExclusions}
                onChange={(e) => {
                  setOnlyExclusions(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>Only show traces with skipped/incompatible vendors</span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary dark:text-gray-400">
            <span>
              Total: <strong className="text-text-primary dark:text-white">{totalCount.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              Skipped-vendor failovers on page:{" "}
              <strong className={exclusionsOnPage > 0 ? "text-amber-600 dark:text-amber-400" : "text-text-primary dark:text-white"}>
                {exclusionsOnPage}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : traces.length === 0 ? (
          <div className="py-14 text-center px-4">
            <Activity size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-text-primary dark:text-gray-200">
              No vendor transformation traces found
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
              Traces are logged whenever a Phase 5 rule transforms an SMS or skips an incompatible vendor route.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Timestamp & Message ID</th>
                  <th className="py-3 px-4 font-semibold">Selected Vendor / Route</th>
                  <th className="py-3 px-4 font-semibold">Sender (Orig → Phase 4 → Final)</th>
                  <th className="py-3 px-4 font-semibold">Destination & Segs</th>
                  <th className="py-3 px-4 font-semibold">Applied Rules</th>
                  <th className="py-3 px-4 font-semibold">Skipped Vendors</th>
                  <th className="py-3 px-4 font-semibold text-right">Latency</th>
                  <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {traces.map((trace) => {
                  const senderChanged = trace.finalVendorSender !== trace.originalSender;
                  const destChanged =
                    Boolean(trace.originalDestination) &&
                    Boolean(trace.finalVendorDestination) &&
                    trace.originalDestination !== trace.finalVendorDestination;
                  const segsChanged = trace.segmentsBefore !== trace.segmentsAfter;
                  const exclusions = Array.isArray(trace.exclusionsSummary)
                    ? trace.exclusionsSummary
                    : [];
                  const rules = Array.isArray(trace.appliedRuleIds)
                    ? trace.appliedRuleIds
                    : [];

                  return (
                    <tr
                      key={trace.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-text-primary dark:text-white">
                          {trace.messageId}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{formatTimestamp(trace.createdAt)}</span>
                        </div>
                        {trace.client__name && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Client: {trace.client__name}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-text-primary dark:text-white">
                          <Server size={13} className="text-emerald-500 shrink-0" />
                          <span>
                            {trace.selectedVendor__profileName ||
                              (trace.selectedVendor ? `Vendor #${trace.selectedVendor}` : "-")}
                          </span>
                        </div>
                        {trace.selectedRoute && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Route #{trace.selectedRoute}
                            {trace.selectedRoute__name ? ` (${trace.selectedRoute__name})` : ""}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            {trace.originalSender || "(blank)"}
                          </span>
                          <ArrowRight size={11} className="text-gray-400" />
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {trace.phase4Sender || "(blank)"}
                          </span>
                          <ArrowRight size={11} className="text-gray-400" />
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              senderChanged
                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {trace.finalVendorSender || "(blank)"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-text-primary dark:text-gray-200">
                          {destChanged ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-400">{trace.originalDestination}</span>
                              <ArrowRight size={10} className="text-gray-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {trace.finalVendorDestination}
                              </span>
                            </span>
                          ) : (
                            <span>{trace.finalVendorDestination || trace.originalDestination || "-"}</span>
                          )}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              segsChanged
                                ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            Segs: {trace.segmentsBefore} → {trace.segmentsAfter}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {rules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {rules.map((rid) => (
                              <span
                                key={rid}
                                className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 font-mono text-[11px]"
                              >
                                #{rid}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {exclusions.length > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium text-[11px]">
                              <AlertTriangle size={11} />
                              <span>{exclusions.length} skipped</span>
                            </span>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
                              {exclusions
                                .map((ex) => `${ex.vendor_name || `V#${ex.vendor_id}`}: ${ex.reason || "INCOMPATIBLE"}`)
                                .join(" | ")}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 size={12} />
                            <span>Primary OK</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {trace.latencyUs != null ? `${trace.latencyUs} µs` : "-"}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setInspectTrace(trace)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          title="Inspect full Phase 5 trace"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700 text-xs">
          <div className="flex items-center gap-2 text-text-secondary dark:text-gray-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-text-primary dark:text-white"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2">
              Page <strong className="text-text-primary dark:text-white">{page}</strong> of{" "}
              <strong className="text-text-primary dark:text-white">{totalPages}</strong> ({totalCount.toLocaleString()} total)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Trace Detail Modal */}
      {inspectTrace && (
        <Modal
          isOpen={Boolean(inspectTrace)}
          onClose={() => setInspectTrace(null)}
          title={`Vendor Transform Trace — ${inspectTrace.messageId}`}
          className="max-w-2xl"
          closeOnBackdropClick={true}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-[11px] text-gray-500">Message ID</div>
                <div className="font-mono font-semibold text-text-primary dark:text-white mt-0.5">
                  {inspectTrace.messageId}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Selected Vendor</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {inspectTrace.selectedVendor__profileName ||
                    (inspectTrace.selectedVendor ? `Vendor #${inspectTrace.selectedVendor}` : "-")}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Selected Route</div>
                <div className="font-medium text-text-primary dark:text-white mt-0.5">
                  {inspectTrace.selectedRoute
                    ? `#${inspectTrace.selectedRoute}${inspectTrace.selectedRoute__name ? ` (${inspectTrace.selectedRoute__name})` : ""}`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Eval Latency</div>
                <div className="font-mono font-medium text-text-primary dark:text-white mt-0.5">
                  {inspectTrace.latencyUs} µs
                </div>
              </div>
            </div>

            {/* Pipeline Progression */}
            <div className="space-y-2">
              <h4 className="font-semibold text-text-primary dark:text-white">Sender ID Progression</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="text-[10px] uppercase text-gray-500">1. Original (Client)</div>
                  <div className="font-mono text-sm font-semibold mt-1 text-text-primary dark:text-white">
                    {inspectTrace.originalSender || "(blank)"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/20">
                  <div className="text-[10px] uppercase text-blue-600 dark:text-blue-400">2. After Phase 2–4</div>
                  <div className="font-mono text-sm font-semibold mt-1 text-blue-800 dark:text-blue-200">
                    {inspectTrace.phase4Sender || "(blank)"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/20">
                  <div className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400">3. Final Vendor (Wire)</div>
                  <div className="font-mono text-sm font-semibold mt-1 text-emerald-800 dark:text-emerald-200">
                    {inspectTrace.finalVendorSender || "(blank)"}
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
                <div className="font-mono flex items-center gap-1.5">
                  <span className="text-gray-500">{inspectTrace.originalDestination || "-"}</span>
                  <ArrowRight size={12} className="text-gray-400" />
                  <span className="font-semibold text-text-primary dark:text-white">
                    {inspectTrace.finalVendorDestination || inspectTrace.originalDestination || "-"}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-[11px] font-semibold text-text-primary dark:text-white mb-1">
                  Segments & Applied Rules
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
                    {inspectTrace.segmentsBefore} → {inspectTrace.segmentsAfter} segs
                  </span>
                  {inspectTrace.appliedRuleIds && inspectTrace.appliedRuleIds.length > 0 ? (
                    inspectTrace.appliedRuleIds.map((rid) => (
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
                Skipped / Incompatible Candidates ({inspectTrace.exclusionsSummary?.length || 0})
              </h4>
              {inspectTrace.exclusionsSummary && inspectTrace.exclusionsSummary.length > 0 ? (
                <div className="divide-y divide-amber-100 dark:divide-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
                  {inspectTrace.exclusionsSummary.map((ex, idx) => (
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
          </div>
        </Modal>
      )}
    </div>
  );
};
