import React, { useState, useEffect, useRef } from "react";
import { Home, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getSummariseSummaryApi,
  getSummariseDetailedApi,
  downloadSummariseReportCsvApi,
  type SummariseSummaryData,
  type SummariseReportFilters,
} from "../../api/reportApi/summariseReportApi";

import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import MultiSelectDropdown, { type MultiSelectOption } from "../../components/ui/MultiSelectDropdown";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";

const formatLocalDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const BATCH_SIZE = 50;

const statusOptions = [
  { label: "Queued", value: "QUEUED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Failed", value: "FAILED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Undelivered", value: "UNDELIVERED" },
];

const groupByOptions: MultiSelectOption[] = [
  { label: "Client", value: "client" },
  { label: "Vendor", value: "vendor" },
  { label: "Country", value: "countryMCC" },
  { label: "Operator", value: "operatorMNC" },
  { label: "Status", value: "submitStatus" },
  { label: "Sender ID", value: "senderId" },
  { label: "Routing Basis", value: "routingBasis" },
  { label: "Destination", value: "destination" },
];

const ALL_TABLE_COLUMNS = [
  { key: "sn", label: "S.N" },
  { key: "message_id", label: "Message ID" },
  { key: "destination", label: "Destination" },
  { key: "country", label: "Country" },
  { key: "client", label: "Client" },
  { key: "vendor", label: "Vendor" },
  { key: "status", label: "Status" },
  { key: "client_charge", label: "Client Charge" },
  { key: "vendor_charge", label: "Vendor Charge" },
  { key: "margin", label: "Margin" },
  { key: "request_time", label: "Request Time" },
];

type ViewMode = "all" | "summary" | "detailed";

const SummariseReport: React.FC = () => {
  const [summaryData, setSummaryData] = useState<SummariseSummaryData[]>([]);
  const [detailedReports, setDetailedReports] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  const [filterValues, setFilterValues] = useState<SummariseReportFilters>({
    start_date: formatLocalDateTime(new Date(new Date().setHours(0, 0, 0, 0))),
    end_date: formatLocalDateTime(new Date(new Date().setHours(23, 59, 59, 999))),
  });
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [appliedGroupBy, setAppliedGroupBy] = useState<string[]>([]);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const [clientOptions, setClientOptions] = useState<{ label: string; value: string }[]>([]);
  const [vendorOptions, setVendorOptions] = useState<{ label: string; value: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clientsRes, vendorsRes, countriesRes] = await Promise.all([
          getClientsApi("client", 1, 1000),
          getVendorsApi("vendor", 1, 1000),
          getCountriesApi("country", 1, 1000),
        ]);

        const cOpts = clientsRes.results?.map((item: any) => ({ label: item.name, value: item.name })) || [];
        const vOpts = vendorsRes.results?.map((item: any) => ({ label: item.profileName, value: item.profileName })) || [];
        const cntOpts = countriesRes.results?.map((item: any) => ({ label: item.name, value: item.name })) || [];

        setClientOptions(cOpts);
        setVendorOptions(vOpts);
        setCountryOptions(cntOpts);
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    };
    fetchOptions();
  }, []);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("summarise_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        const validKeys = ALL_TABLE_COLUMNS.map(c => c.key);
        // Only use saved columns if they exactly match the currently available columns
        const isExactMatch = Array.isArray(parsed) && parsed.length === validKeys.length && parsed.every((k: string) => validKeys.includes(k));
        if (isExactMatch) return parsed;
      }
    } catch { }
    return ALL_TABLE_COLUMNS.map(c => c.key);
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Summarise Report", `Opened Summarise Report Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchReports = async (page: number = 1, append: boolean = false, overrideFilters?: SummariseReportFilters, overrideGroupBy?: string[]) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (append) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const payload = {
        filters: overrideFilters || filterValues,
        group_by: overrideGroupBy || groupBy,
      };

      const calls: Promise<any>[] = [];

      // Fetch summary if it's not a pagination append, AND the view mode isn't detailed-only
      // However, if we don't have access to viewMode directly we'll just fetch both unless appending.
      // Wait, viewMode is in state so we can access it here!
      if (!append && viewMode !== "detailed") {
        calls.push(
          getSummariseSummaryApi(payload).catch((err) => {
            if (err.name !== "AbortError") console.error(err);
            return null;
          })
        );
      } else {
        calls.push(Promise.resolve(null));
      }

      // Fetch detailed report if viewMode isn't summary-only
      if (viewMode !== "summary") {
        calls.push(
          getSummariseDetailedApi(page, BATCH_SIZE, payload).catch((err) => {
            if (err.name !== "AbortError") console.error(err);
            return null;
          })
        );
      } else {
        calls.push(Promise.resolve(null));
      }

      const [summaryResponse, detailedResponse] = await Promise.all(calls);

      if (newController.signal.aborted) return;

      if (!append && summaryResponse) {
        setAppliedGroupBy(overrideGroupBy || groupBy);
        setSummaryData(summaryResponse.summary || []);
        if (summaryResponse.currency?.symbol) {
          setCurrencySymbol(summaryResponse.currency.symbol);
        }
      } else if (!append && viewMode === "detailed") {
        // If we switched to detailed-only, we might want to still update applied groupBy to keep it in sync,
        // though it isn't rendered. Let's just keep it in sync.
        setAppliedGroupBy(overrideGroupBy || groupBy);
      }

      if (detailedResponse && detailedResponse.results) {
        setDetailedReports((prev) =>
          append ? [...prev, ...detailedResponse.results] : detailedResponse.results
        );
        setTotalItems(detailedResponse.count);
        setHasMore(Boolean(detailedResponse.next));
        setLoadedPage(page);
      } else if (!append) {
        setDetailedReports([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to fetch summarise report.");
      }
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchReports(1, false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Initial load

  const handleDownloadCSV = async () => {
    try {
      const toastId = toast.loading("Downloading CSV...");
      const payload = {
        filters: filterValues,
        group_by: groupBy,
      };
      
      const blob = await downloadSummariseReportCsvApi(payload);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `summarise_report_${formatLocalDateTime(new Date())}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.update(toastId, { render: "Export successful!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download CSV");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const menuItems: ContextMenuItem[] = [
    {
      label: "Download CSV Report",
      icon: <Download size={16} />,
      onClick: () => {
        handleDownloadCSV();
        setContextMenuPos(null);
      },
    },
  ];

  const handleSearch = () => {
    fetchReports(1, false);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      start_date: formatLocalDateTime(new Date(new Date().setHours(0, 0, 0, 0))),
      end_date: formatLocalDateTime(new Date(new Date().setHours(23, 59, 59, 999))),
    };
    setFilterValues(defaultFilters);
    setGroupBy([]);
    fetchReports(1, false, defaultFilters, []);
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setTableColumns((prev) => {
      const next = [...prev];
      // DataTable subtracts 1 for the S.N. column, but our state array includes it at index 0.
      // Therefore, we must add 1 back to accurately target the draggable columns.
      const actualFrom = fromIdx + 1;
      const actualTo = toIdx + 1;

      const [moved] = next.splice(actualFrom, 1);
      next.splice(actualTo, 0, moved);
      localStorage.setItem("summarise_table_columns", JSON.stringify(next));
      return next;
    });
  };

  // Detailed Report Table Headers dynamically generated
  const tableHeaders = tableColumns.map((key) => {
    const col = ALL_TABLE_COLUMNS.find((c) => c.key === key);
    return col ? col.label : key;
  });

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar"
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        fetchReports(loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, groupBy, detailedReports.length]);

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Summarise Report
          </h1>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary transition-colors"
            title="Download summary data as CSV"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Reports</span>
        </div>
      </div>


      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        <DatePicker
          label="Start Date & Time"
          showTimeSelect={true}
          selected={filterValues.start_date ? new Date(filterValues.start_date) : null}
          onChange={(val: Date | null) =>
            handleFilterChange("start_date", val ? formatLocalDateTime(val) : "")
          }
          placeholder="Select Start Date"
        />
        <DatePicker
          label="End Date & Time"
          showTimeSelect={true}
          selected={filterValues.end_date ? new Date(filterValues.end_date) : null}
          onChange={(val: Date | null) =>
            handleFilterChange("end_date", val ? formatLocalDateTime(val) : "")
          }
          placeholder="Select End Date"
        />
        <Select
          label="Client"
          value={filterValues.client || ""}
          onChange={(val) => handleFilterChange("client", val)}
          options={clientOptions}
          placeholder="Select Client"
          clearable={true}
        />
        <Select
          label="Vendor"
          value={filterValues.vendor || ""}
          onChange={(val) => handleFilterChange("vendor", val)}
          options={vendorOptions}
          placeholder="Select Vendor"
          clearable={true}
        />
        <Select
          label="Status"
          value={filterValues.status || ""}
          onChange={(val) => handleFilterChange("status", val)}
          options={statusOptions}
          placeholder="Select Status"
          clearable={true}
        />
        <Select
          label="Country"
          value={filterValues.country || ""}
          onChange={(val) => handleFilterChange("country", val)}
          options={countryOptions}
          placeholder="Select Country"
          clearable={true}
        />
        <Input
          label="Sender ID"
          value={filterValues.sender_id || ""}
          onChange={(e) => handleFilterChange("sender_id", e.target.value)}
          placeholder="Search Sender ID"
        />
        <Select
          label="View Mode"
          value={viewMode}
          onChange={(val) => setViewMode(val as ViewMode)}
          options={[
            { label: "All Reports", value: "all" },
            { label: "Summary Only", value: "summary" },
            { label: "Detailed Only", value: "detailed" },
          ]}
          clearable={false}
        />
        <MultiSelectDropdown
          label="Group By"
          selected={groupBy}
          onChange={(val) => {
            setGroupBy(val);
            fetchReports(1, false, filterValues, val);
          }}
          options={groupByOptions}
          placeholder="Group By..."
        />
      </FilterCard>

      {/* Summary Section */}
      {(viewMode === "all" || viewMode === "summary") && (
        <div className="mt-6 rounded-xl bg-white shadow-card overflow-hidden dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white">Aggregated Summary</h2>
            <div className="w-full sm:w-64">

            </div>
          </div>
          <div className="overflow-auto max-h-[40vh] custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
                <tr>
                  {appliedGroupBy.map(gb => {
                    const opt = groupByOptions.find(o => o.value === gb);
                    return (
                      <th key={gb} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">
                        {opt ? opt.label : gb}
                      </th>
                    );
                  })}
                  {appliedGroupBy.length === 0 && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Total</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Successful</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Delivered</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Vendor Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">Margin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">ASR %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap min-w-[120px]">DLR %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {isLoading && loadedPage === 1 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-text-secondary dark:text-gray-400">Loading summary...</td>
                  </tr>
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-text-secondary dark:text-gray-400">No summary data found.</td>
                  </tr>
                ) : (
                  summaryData.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onContextMenu={handleContextMenu}
                    >
                      {appliedGroupBy.map(gb => (
                        <td key={gb} className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap">
                          {row[gb] || "-"}
                        </td>
                      ))}
                      {appliedGroupBy.length === 0 && <td className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap">Grand Total</td>}
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{Number(row.attempts || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{Number(row.successful || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{Number(row.delivered || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{Number(row.failed || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">{currencySymbol}{Number(row.revenue || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">{currencySymbol}{Number(row.vendor_cost || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono font-semibold text-emerald-600 dark:text-emerald-400">{currencySymbol}{Number(row.profit_margin || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">{Number(row.asr_percent || 0).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">{Number(row.dlr_percent || 0).toFixed(2)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ContextMenu
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        items={menuItems}
      />
    </div>
  );
};

export default SummariseReport;
