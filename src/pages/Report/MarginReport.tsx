import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getMarginSummaryApi,
  downloadMarginReportCsvApi,
  type MarginSummaryData,
  type MarginTotals,
  type MarginReportFilters,
} from "../../api/reportApi/marginReportApi";

import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { getCompaniesApi } from "../../api/companyApi/companyApi";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import MultiSelectDropdown, {
  type MultiSelectOption,
} from "../../components/ui/MultiSelectDropdown";
import DatePicker, { parseDateValue, type DatePickerMode } from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import { CountryFlag } from "../../components/ui/CountryFlag";
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
  { label: "Company", value: "client_company" },
  { label: "Vendor", value: "vendor" },
  { label: "Country", value: "country" },
  { label: "MCC", value: "countryMCC" },
  { label: "MNC", value: "operatorMNC" },
  { label: "Status", value: "submitStatus" },
  { label: "Sender ID", value: "senderId" },
  { label: "Destination", value: "destination" },
];

const normalizeCountryName = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const COUNTRY_ALIASES: Record<string, string> = {
  cotedivoire: "ci",
  ivorycoast: "ci",
  antarctica: "aq",
  colombia: "co",
  australia: "au",
  unitedstates: "us",
  usa: "us",
  unitedkingdom: "gb",
  uk: "gb",
  greatbritain: "gb",
  unitedarabemirates: "ae",
  uae: "ae",
  russia: "ru",
  russianfederation: "ru",
  southkorea: "kr",
  northkorea: "kp",
  vietnam: "vn",
};

const MarginReport: React.FC = () => {
  const [summaryData, setSummaryData] = useState<MarginSummaryData[]>([]);
  const [totals, setTotals] = useState<MarginTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  const [activePreset, setActivePreset] = useState<DatePresetKey>("today");

  const [filterValues, setFilterValues] = useState<MarginReportFilters>({});
  const filterValuesRef = useRef<MarginReportFilters>(filterValues);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [appliedGroupBy, setAppliedGroupBy] = useState<string[]>([]);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [companyOptions, setCompanyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [clientOptions, setClientOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [vendorOptions, setVendorOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [countryOptions, setCountryOptions] = useState<
    { label: string; value: string; iso2?: string; icon?: React.ReactNode }[]
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
        const [clientsRes, vendorsRes, countriesRes, companiesRes] = await Promise.all([
          getClientsApi("client", 1, 1000),
          getVendorsApi("vendor", 1, 1000),
          getCountriesApi("country", 1, 1000),
          getCompaniesApi("company", 1, 1000),
        ]);

        const compOpts =
          companiesRes.results?.map((item: any) => ({
            label: item.name,
            value: item.name,
          })) ||
          (Array.isArray(companiesRes)
            ? companiesRes.map((item: any) => ({
                label: item.name,
                value: item.name,
              }))
            : []);
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
        const countryList: any[] =
          countriesRes?.results ||
          (Array.isArray(countriesRes) ? countriesRes : (countriesRes as any)?.data || []);
        const cntOpts = countryList.map((item: any) => ({
          label: item.name || "Unknown",
          value: item.name || String(item.id),
          iso2: item.iso2,
          icon: item.iso2 ? <CountryFlag iso2={item.iso2} /> : undefined,
        }));

        setCompanyOptions(compOpts);
        setClientOptions(cOpts);
        setVendorOptions(vOpts);
        setCountryOptions(cntOpts);
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    };
    fetchOptions();
  }, []);

  const getCountryIso = (countryVal: any, row?: any): string | null => {
    if (row?.iso2) return row.iso2;
    if (row?.country_iso) return row.country_iso;
    if (row?.country_iso2) return row.country_iso2;
    if (!countryVal || countryVal === "-") return null;

    const valStr = String(countryVal).trim();
    if (valStr.length === 2 && /^[a-zA-Z]{2}$/.test(valStr)) {
      return valStr.toLowerCase();
    }

    const normVal = normalizeCountryName(valStr);

    const match = countryOptions.find((opt) => {
      if (!opt) return false;
      if (opt.iso2 && opt.iso2.toLowerCase() === valStr.toLowerCase()) return true;
      if (opt.label && normalizeCountryName(opt.label) === normVal) return true;
      if (opt.value && normalizeCountryName(opt.value) === normVal) return true;
      return false;
    });

    if (match?.iso2) return match.iso2;
    if (COUNTRY_ALIASES[normVal]) return COUNTRY_ALIASES[normVal];

    return null;
  };

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper(
          "Margin Report",
          `Opened Margin Report Module`,
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
    setFilterValues((prev) => {
      const updated = { ...prev, [key]: value };
      filterValuesRef.current = updated;
      return updated;
    });
  };

  const handlePresetClick = (presetKey: DatePresetKey) => {
    if (activePreset === presetKey) return;
    setActivePreset(presetKey);

    const nextFilters = { ...filterValuesRef.current };
    delete nextFilters.start_date;
    delete nextFilters.end_date;
    filterValuesRef.current = nextFilters;
    setFilterValues(nextFilters);

    fetchReports(nextFilters, undefined, presetKey);
  };

  const fetchReports = async (
    overrideFilters?: MarginReportFilters,
    overrideGroupBy?: string[],
    presetOverride?: DatePresetKey,
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    setIsLoading(true);

    try {
      const activeFilters: MarginReportFilters = {
        ...(overrideFilters || filterValuesRef.current),
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

      const summaryResponse = await getMarginSummaryApi(payload);

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
        toast.error("Failed to fetch margin report.");
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
      const activeFilters: MarginReportFilters = { ...(filterValuesRef.current || filterValues) };
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

      const blob = await downloadMarginReportCsvApi(payload);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `margin_report_${formatLocalDateTime(new Date())}.xlsx`,
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
    filterValuesRef.current = {};
    setGroupBy([]);
    setSortConfig(null);
    fetchReports({}, [], "today");
  };

  // Dynamic Column Setup for Reordering, Resizing & Sorting
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    const defaultKeys = [
      ...(appliedGroupBy.length > 0 ? appliedGroupBy.map((gb) => `gb_${gb}`) : ["total"]),
      "revenue",
      "vendor_cost",
      "profit_margin",
      "margin_percent",
    ];
    setColumnOrder((prev) => {
      if (prev.length === 0) return defaultKeys;
      const kept = prev.filter((k) => defaultKeys.includes(k));
      const added = defaultKeys.filter((k) => !kept.includes(k));
      const gbAdded = added.filter((k) => k.startsWith("gb_") || k === "total");
      const metricAdded = added.filter((k) => !k.startsWith("gb_") && k !== "total");
      return [...gbAdded, ...kept, ...metricAdded];
    });
    setSortConfig((prev) => {
      if (!prev) return null;
      if (!defaultKeys.includes(prev.key)) return null;
      return prev;
    });
  }, [appliedGroupBy]);

  const columnMap = useMemo(() => {
    const map: Record<string, { label: string }> = {};
    if (appliedGroupBy.length > 0) {
      appliedGroupBy.forEach((gb) => {
        map[`gb_${gb}`] = {
          label: groupByOptions.find((o) => o.value === gb)?.label || gb,
        };
      });
    } else {
      map["total"] = { label: "Total" };
    }
    map["revenue"] = { label: `Revenue (${currencySymbol})` };
    map["vendor_cost"] = { label: `Vendor Cost (${currencySymbol})` };
    map["profit_margin"] = { label: `Margin (${currencySymbol})` };
    map["margin_percent"] = { label: "Margin %" };
    return map;
  }, [appliedGroupBy, groupByOptions, currencySymbol]);

  const activeHeaders = useMemo(() => {
    return ["S.N.", ...columnOrder.map((k) => columnMap[k]?.label || k)];
  }, [columnOrder, columnMap]);

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // S.N. is at index 0
    if (colIndex >= 0 && colIndex < columnOrder.length) {
      const colKey = columnOrder[colIndex];
      setSortConfig((prev) => {
        if (prev?.key === colKey) {
          if (prev.direction === "asc") return { key: colKey, direction: "desc" };
          return null;
        }
        return { key: colKey, direction: "asc" };
      });
    }
  };

  const getRowVal = (row: any, key: string) => {
    if (key.startsWith("gb_")) {
      const gb = key.replace("gb_", "");
      let val = row[gb];
      if (gb === "client_company" && val === undefined) val = row["company"];
      if (val === null || val === undefined || val === "Unknown" || val === "-") return "";
      if (typeof val === "number") return val;
      const strVal = String(val).trim();
      const num = Number(strVal);
      if (!isNaN(num) && strVal !== "") return num;
      return strVal.toLowerCase();
    }
    if (key === "total") return "grand total";
    return Number(row[key] ?? 0);
  };

  const sortedSummaryData = useMemo(() => {
    if (!sortConfig) return summaryData;
    return [...summaryData].sort((a, b) => {
      const valA = getRowVal(a, sortConfig.key);
      const valB = getRowVal(b, sortConfig.key);
      if (valA === "" && valB !== "") return 1;
      if (valA !== "" && valB === "") return -1;
      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [summaryData, sortConfig]);

  const renderCell = (colKey: string, row: any) => {
    if (colKey.startsWith("gb_")) {
      const gb = colKey.replace("gb_", "");
      let val = (row as any)[gb];
      if (gb === "client_company" && val === undefined) {
        val = (row as any)["company"];
      }
      if (val === "Unknown") {
        val = "-";
      } else {
        val = val || "-";
      }
      const isCountry = gb.toLowerCase() === "country";
      const iso2 = isCountry ? getCountryIso(val, row) : null;

      return (
        <td
          key={colKey}
          className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap"
        >
          {isCountry && val !== "-" ? (
            <div className="flex items-center gap-2">
              {iso2 && <CountryFlag iso2={iso2} name={String(val)} />}
              <span>{val}</span>
            </div>
          ) : (
            val
          )}
        </td>
      );
    }

    if (colKey === "total") {
      return (
        <td
          key={colKey}
          className="px-4 py-3 text-sm text-text-primary dark:text-gray-200 font-semibold whitespace-nowrap"
        >
          Grand Total
        </td>
      );
    }

    if (colKey === "revenue") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">
          {currencySymbol}{Number(row.revenue || 0).toFixed(4)}
        </td>
      );
    }
    if (colKey === "vendor_cost") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">
          {currencySymbol}{Number(row.vendor_cost || 0).toFixed(4)}
        </td>
      );
    }
    if (colKey === "profit_margin") {
      const margin = Number(row.profit_margin || 0);
      return (
        <td
          key={colKey}
          className={`px-4 py-3 text-sm whitespace-nowrap font-mono font-semibold ${margin >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
            }`}
        >
          {currencySymbol}{margin.toFixed(4)}
        </td>
      );
    }
    if (colKey === "margin_percent") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap font-mono">
          {Number(row.margin_percent || 0).toFixed(2)}%
        </td>
      );
    }

    return <td key={colKey} className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">-</td>;
  };

  const firstGbKey = columnOrder.find((k) => k.startsWith("gb_") || k === "total") || "total";

  const renderFooterCell = (colKey: string) => {
    if (colKey.startsWith("gb_") || colKey === "total") {
      return (
        <td
          key={colKey}
          className="px-4 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20"
        >
          {colKey === firstGbKey ? (
            <span className="font-bold text-primary dark:text-primary/90 text-sm">Grand Total</span>
          ) : ""}
        </td>
      );
    }
    if (colKey === "revenue") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm font-bold font-mono text-text-primary dark:text-white whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20">
          {currencySymbol}{Number(totals?.revenue || 0).toFixed(4)}
        </td>
      );
    }
    if (colKey === "vendor_cost") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm font-bold font-mono text-text-primary dark:text-white whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20">
          {currencySymbol}{Number(totals?.vendor_cost || 0).toFixed(4)}
        </td>
      );
    }
    if (colKey === "profit_margin") {
      const margin = totals?.profit_margin || 0;
      return (
        <td
          key={colKey}
          className={`px-4 py-3 text-sm font-bold font-mono whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20 ${margin >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400"
            }`}
        >
          {currencySymbol}{Number(margin).toFixed(4)}
        </td>
      );
    }
    if (colKey === "margin_percent") {
      return (
        <td key={colKey} className="px-4 py-3 text-sm font-bold font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap tabular-nums bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20">
          {Number(totals?.margin_percent || 0).toFixed(2)}%
        </td>
      );
    }
    return <td key={colKey} className="px-4 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20"></td>;
  };

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      {/* Top Header */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Margin Report
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
          label="Company"
          value={filterValues.client_company || ""}
          onChange={(val) => handleFilterChange("client_company", val)}
          options={companyOptions}
          placeholder="Select Company"
          clearable={true}
          allowCustomValue={true}
        />
        <Select
          label="Client"
          value={filterValues.client || ""}
          onChange={(val) => handleFilterChange("client", val)}
          options={clientOptions}
          placeholder="Select Client"
          clearable={true}
          allowCustomValue={true}
        />
        <Select
          label="Vendor"
          value={filterValues.vendor || ""}
          onChange={(val) => handleFilterChange("vendor", val)}
          options={vendorOptions}
          placeholder="Select Vendor"
          clearable={true}
          allowCustomValue={true}
        />
        <Select
          label="Status"
          value={filterValues.status || ""}
          onChange={(val) => handleFilterChange("status", val)}
          options={statusOptions}
          placeholder="Select Status"
          clearable={true}
          allowCustomValue={true}
        />
        <Select
          label="Country"
          value={filterValues.country || ""}
          onChange={(val) => handleFilterChange("country", val)}
          options={countryOptions}
          placeholder="Select Country"
          clearable={true}
          allowCustomValue={true}
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
          headers={activeHeaders}
          data={sortedSummaryData.map((row, idx) => ({ ...row, id: idx, sn: idx + 1 }))}
          totalItems={sortedSummaryData.length}
          isLoading={isLoading}
          emptyMessage="No summary data found."
          density="compact"
          tableMaxHeight={tableMaxHeight}
          storageKey="margin_report_table_widths"
          resizableColumns={true}
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          sortColumnIndex={
            sortConfig && columnOrder.indexOf(sortConfig.key) >= 0
              ? columnOrder.indexOf(sortConfig.key) + 1
              : null
          }
          sortDirection={sortConfig?.direction || null}
          rowsPerPageOptions={[
            { value: "25", label: "25" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
            { value: "250", label: "250" },
            { value: "500", label: "500" },
            { value: "1000", label: "1000" },
          ]}
          headerActions={
            <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center justify-end">
              {DATE_PRESETS.map((preset) => {
                const isActive = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetClick(preset.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all duration-200 focus:outline-none shadow-xs ${isActive
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
            const sn = (row as any).sn ?? idx + 1;
            return (
              <tr
                key={idx}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onContextMenu={handleContextMenu}
              >
                <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-400 font-medium whitespace-nowrap">
                  {sn}
                </td>
                {columnOrder.map((colKey) => renderCell(colKey, row))}
              </tr>
            );
          }}
          footerContent={
            totals && !isLoading && sortedSummaryData.length > 0 && appliedGroupBy.length > 0
              ? (
                <tr className="bg-gray-50 dark:bg-gray-800 border-none">
                  {/* S.N. column empty cell in footer */}
                  <td className="px-4 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border-none sticky bottom-0 z-20"></td>
                  {/* Dynamically aligned footer cells */}
                  {columnOrder.map((colKey) => renderFooterCell(colKey))}
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

export default MarginReport;
