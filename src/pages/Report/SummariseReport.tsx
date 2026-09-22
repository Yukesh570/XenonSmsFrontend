import React, { useState, useEffect, useRef } from "react";
import { Home, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getSummariseSummaryApi,
  downloadSummariseReportCsvApi,
  type SummariseSummaryData,
  type SummariseTotals,
  type SummariseReportFilters,
} from "../../api/reportApi/summariseReportApi";

import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import MultiSelectDropdown, {
  type MultiSelectOption,
} from "../../components/ui/MultiSelectDropdown";
import DatePicker, { parseDateValue, type DatePickerMode } from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import {
  getPresetDateRange,
  formatLocalDate,
  formatLocalDateTime,
} from "../../helper/dateFormatter";



type DatePresetKey =
  | "today"
  | "yesterday"
  | "2days"
  | "7days"
  | "15days"
  | "30days"
  | "custom";

interface DatePresetOption {
  key: DatePresetKey;
  label: string;
}

const DATE_PRESETS: DatePresetOption[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "2days", label: "2 Days" },
  { key: "7days", label: "7 Days" },
  { key: "15days", label: "15 Days" },
  { key: "30days", label: "30 Days" },
];



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
  { label: "Destination", value: "destination" },
];

const SummariseReport: React.FC = () => {
  const [summaryData, setSummaryData] = useState<SummariseSummaryData[]>([]);
  const [totals, setTotals] = useState<SummariseTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  const [activePreset, setActivePreset] = useState<DatePresetKey>("today");

  const [filterValues, setFilterValues] = useState<SummariseReportFilters>({});
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [appliedGroupBy, setAppliedGroupBy] = useState<string[]>([]);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [clientOptions, setClientOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [vendorOptions, setVendorOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [countryOptions, setCountryOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const calculateHeight = () => {
      if (tableContainerRef.current) {
        const rect = tableContainerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 16;
        setTableMaxHeight(Math.max(260, Math.floor(availableHeight)));
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    const resizeObserver = new ResizeObserver(() => {
      calculateHeight();
    });

    if (tableContainerRef.current?.parentElement) {
      resizeObserver.observe(tableContainerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener("resize", calculateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clientsRes, vendorsRes, countriesRes] = await Promise.all([
          getClientsApi("client", 1, 1000),
          getVendorsApi("vendor", 1, 1000),
          getCountriesApi("country", 1, 1000),
        ]);

        const cOpts =
          clientsRes.results?.map((item: any) => ({
            label: item.name,
            value: item.name,
          })) || [];
        const vOpts =
          vendorsRes.results?.map((item: any) => ({
            label: item.profileName,
            value: item.profileName,
          })) || [];
        const cntOpts =
          countriesRes.results?.map((item: any) => ({
            label: item.name,
            value: item.name,
          })) || [];

        setClientOptions(cOpts);
        setVendorOptions(vOpts);
        setCountryOptions(cntOpts);
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    };
    fetchOptions();
  }, []);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper(
          "Summarise Report",
          `Opened Summarise Report Module`,
          false,
        );
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    if (key === "start_date" || key === "end_date") {
      setActivePreset("custom");
    }
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handlePresetClick = (presetKey: DatePresetKey) => {
    const nextPreset: DatePresetKey =
      activePreset === presetKey ? "custom" : presetKey;
    setActivePreset(nextPreset);

    const nextFilters = { ...filterValues };
    delete nextFilters.start_date;
    delete nextFilters.end_date;
    setFilterValues(nextFilters);

    fetchReports(nextFilters, undefined, nextPreset);
  };

  const fetchReports = async (
    overrideFilters?: SummariseReportFilters,
    overrideGroupBy?: string[],
    presetOverride?: DatePresetKey,
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    setIsLoading(true);

    try {
      const activeFilters: SummariseReportFilters = {
        ...(overrideFilters || filterValues),
      };
      const currentPreset =
        presetOverride !== undefined ? presetOverride : activePreset;

      if (
        (!activeFilters.start_date || !activeFilters.end_date) &&
        currentPreset &&
        currentPreset !== "custom"
      ) {
        const range = getPresetDateRange(currentPreset);
        if (range) {
          if (!activeFilters.start_date) activeFilters.start_date = range.start;
          if (!activeFilters.end_date) activeFilters.end_date = range.end;
        }
      }

      const finalFilters = { ...activeFilters };
      if (finalFilters.start_date && !finalFilters.start_date.includes("T")) {
        finalFilters.start_date = `${finalFilters.start_date}T00:00:00`;
      }
      if (finalFilters.end_date && !finalFilters.end_date.includes("T")) {
        finalFilters.end_date = `${finalFilters.end_date}T23:59:59`;
      }

      const payload = {
        filters: finalFilters,
        group_by: overrideGroupBy || groupBy,
      };

      const summaryResponse = await getSummariseSummaryApi(payload);

      if (newController.signal.aborted) return;

      if (summaryResponse) {
        setAppliedGroupBy(overrideGroupBy || groupBy);
        setSummaryData(summaryResponse.summary || []);
        setTotals(summaryResponse.totals || null);
        if (summaryResponse.currency?.symbol) {
          setCurrencySymbol(summaryResponse.currency.symbol);
        }
      } else {
        setSummaryData([]);
        setTotals(null);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to fetch summarise report.");
        setSummaryData([]);
      }
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchReports();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const handleTimezoneChange = () => {
      fetchReports();
    };
    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
  }, []);

  const handleDownloadCSV = async () => {
    try {
      const toastId = toast.loading("Downloading CSV...");
      const activeFilters: SummariseReportFilters = { ...filterValues };
      if (
        (!activeFilters.start_date || !activeFilters.end_date) &&
        activePreset &&
        activePreset !== "custom"
      ) {
        const range = getPresetDateRange(activePreset);
        if (range) {
          if (!activeFilters.start_date) activeFilters.start_date = range.start;
          if (!activeFilters.end_date) activeFilters.end_date = range.end;
        }
      }
      const finalFilters = { ...activeFilters };
      if (finalFilters.start_date && !finalFilters.start_date.includes("T")) {
        finalFilters.start_date = `${finalFilters.start_date}T00:00:00`;
      }
      if (finalFilters.end_date && !finalFilters.end_date.includes("T")) {
        finalFilters.end_date = `${finalFilters.end_date}T23:59:59`;
      }

      const payload = {
        filters: finalFilters,
        group_by: groupBy,
      };

      const blob = await downloadSummariseReportCsvApi(payload);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `summarise_report_${formatLocalDateTime(new Date())}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.update(toastId, {
        render: "Export successful!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
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
    fetchReports();
  };

  const handleClearFilters = () => {
    setActivePreset("today");
    setFilterValues({});
    setGroupBy([]);
    fetchReports({}, [], "today");
  };

  const summaryHeaders = [
    ...(appliedGroupBy.length > 0
      ? appliedGroupBy.map(
          (gb) => groupByOptions.find((o) => o.value === gb)?.label || gb,
        )
      : ["Total"]),
    `Revenue (${currencySymbol})`,
    `Vendor Cost (${currencySymbol})`,
    `Margin (${currencySymbol})`,
  ];

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      {/* Top Header */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Summarise Report
          </h1>
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

      {/* Filter Card */}
      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        <DatePicker
          label="Start Date & Time"
          showTimeSelect={true}
          selected={
            filterValues.start_date ? parseDateValue(filterValues.start_date) : null
          }
          dateMode={filterValues.start_date ? (filterValues.start_date.includes("T") ? "specific_time" : "whole_day") : undefined}
          onChange={(val: Date | null, mode?: DatePickerMode) =>
            handleFilterChange(
              "start_date",
              val ? (mode === "specific_time" ? formatLocalDateTime(val) : formatLocalDate(val)) : "",
            )
          }
          placeholder="Select Start Date"
        />
        <DatePicker
          label="End Date & Time"
          showTimeSelect={true}
          selected={
            filterValues.end_date ? parseDateValue(filterValues.end_date) : null
          }
          dateMode={filterValues.end_date ? (filterValues.end_date.includes("T") ? "specific_time" : "whole_day") : undefined}
          onChange={(val: Date | null, mode?: DatePickerMode) =>
            handleFilterChange(
              "end_date",
              val ? (mode === "specific_time" ? formatLocalDateTime(val) : formatLocalDate(val)) : "",
            )
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
        <MultiSelectDropdown
          label="Group By"
          selected={groupBy}
          onChange={(val) => {
            setGroupBy(val);
            fetchReports(filterValues, val);
          }}
          options={groupByOptions}
          placeholder="Group By..."
        />
      </FilterCard>

      {/* Reusable DataTable for Aggregated Summary */}
      <div ref={tableContainerRef} className="mt-3">
        <DataTable
          headers={summaryHeaders}
          data={summaryData.map((row, idx) => ({ ...row, id: idx }))}
          totalItems={summaryData.length}
          showCountOnly={true}
          isLoading={isLoading}
          emptyMessage="No summary data found."
          density="compact"
          tableMaxHeight={tableMaxHeight}
          headerActions={
            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center justify-end">
              {DATE_PRESETS.map((preset) => {
                const isActive = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetClick(preset.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all duration-200 focus:outline-none shadow-xs ${
                      isActive
                        ? "bg-primary text-white border-primary dark:bg-primary dark:border-primary"
                        : "bg-white text-text-secondary border-gray-200 hover:border-primary hover:text-primary dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          }
          renderRow={(row, idx) => {
            const margin = Number(row.profit_margin || 0);
            return (
              <tr
                key={idx}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onContextMenu={handleContextMenu}
              >
                {appliedGroupBy.map((gb) => (
                  <td
                    key={gb}
                    className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap"
                  >
                    {(row as any)[gb] || "-"}
                  </td>
                ))}
                {appliedGroupBy.length === 0 && (
                  <td className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-semibold whitespace-nowrap">
                    Grand Total
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">
                  {currencySymbol}
                  {Number(row.revenue || 0).toFixed(4)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">
                  {currencySymbol}
                  {Number(row.vendor_cost || 0).toFixed(4)}
                </td>
                <td
                  className={`px-4 py-3 text-sm whitespace-nowrap font-mono font-semibold ${
                    margin >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {currencySymbol}
                  {margin.toFixed(4)}
                </td>
              </tr>
            );
          }}
          footerContent={
            totals && !isLoading && summaryData.length > 0 && appliedGroupBy.length > 0
              ? (
                <tr className="bg-gray-50 dark:bg-gray-800 border-none">
                  {/* Group-by label cells */}
                  {appliedGroupBy.map((gb, i) => (
                    <td
                      key={gb}
                      className="px-4 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20"
                    >
                      {i === 0 ? (
                        <span className="font-bold text-primary dark:text-primary/90 text-sm">Grand Total</span>
                      ) : ""}
                    </td>
                  ))}
                  {/* Metric cells */}
                  <td className="px-4 py-3 text-sm font-bold font-mono text-text-primary dark:text-white whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20">
                    {currencySymbol}{Number(totals.revenue).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold font-mono text-text-primary dark:text-white whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20">
                    {currencySymbol}{Number(totals.vendor_cost).toFixed(4)}
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold font-mono whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20 ${
                    totals.profit_margin >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400"
                  }`}>
                    {currencySymbol}{Number(totals.profit_margin).toFixed(4)}
                  </td>
                </tr>
              )
              : undefined
          }
        />
      </div>

      {/* Context Menu for right-click download */}
      <ContextMenu
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        items={menuItems}
      />
    </div>
  );
};

export default SummariseReport;
