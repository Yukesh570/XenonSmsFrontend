import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, ArrowUp, ArrowDown, ArrowUpDown, GripVertical } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import FilterCard from "../../components/ui/FilterCard";
import DatePicker, { type DatePickerMode } from "../../components/ui/DatePicker";
import Input from "../../components/ui/Input";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import { actionHelper } from "../../helper/action";
import { getPresetDateRangeOnly as getPresetDateRange, formatLocalDate } from "../../helper/dateFormatter";

import { getAnalyticsDataApi } from "../../api/reportApi/analyticsReportApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { CountryFlag } from "../../components/ui/CountryFlag";
import { getHeaderFullWidth } from "../../components/ui/ModalDataTable";

type FilterColumnType =
  | "number"
  | "boolean"
  | "date"
  | "date_gt_lt"
  | "text"
  | "number_range"
  | "number_gt_lt";

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: FilterColumnType;
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}



const parseDateValue = (val?: string) => {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const formatLocalDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const DEFAULT_SEARCH_COLUMNS = ["account_manager", "date__gt_lt"];
const BATCH_SIZE = 50;
const LOAD_MORE_THRESHOLD_PX = 200;

const allColumns: ColumnConfig[] = [
  { key: "account_manager", label: "Account Manager", type: "text", filterKey: "account_manager__icontains" },
  { key: "date__gt_lt", label: "Date (From / To)", type: "date_gt_lt", isSearchOnly: true },
];

const ExpandButton: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => {
  return (
    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold leading-none shrink-0 border border-gray-200 dark:border-gray-600 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
      {isExpanded ? "-" : "+"}
    </span>
  );
};

const DataBarCell: React.FC<{
  value: number;
  max: number;
  type?: "volume" | "currency" | "danger" | "success";
  symbol?: string;
}> = ({ value = 0, max = 1, type = "volume", symbol = "$" }) => {
  const percentage = Math.min(Math.max((value / (max || 1)) * 100, 4), 100);

  let containerStyle = "";
  let fillStyle = "";

  if (type === "volume") {
    containerStyle = "bg-sky-50/60 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800";
    fillStyle = "bg-sky-200/90 dark:bg-sky-900/60 border-sky-400 dark:border-sky-700";
  } else if (type === "success") {
    containerStyle = "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800";
    fillStyle = "bg-emerald-200 dark:bg-emerald-900/70 border-emerald-400 dark:border-emerald-700";
  } else if (type === "danger") {
    containerStyle = "bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800";
    fillStyle = "bg-rose-200 dark:bg-rose-900/70 border-rose-400 dark:border-rose-700";
  } else if (type === "currency") {
    containerStyle = "bg-fuchsia-50/60 dark:bg-fuchsia-950/20 border-fuchsia-300 dark:border-fuchsia-800";
    fillStyle = "bg-fuchsia-200/90 dark:bg-fuchsia-900/60 border-fuchsia-400 dark:border-fuchsia-700";
  }

  return (
    <div className={`relative w-full h-7 flex items-center justify-end px-2 overflow-hidden rounded border shadow-xs ${containerStyle}`}>
      <div
        className={`absolute right-0 top-0 bottom-0 ${fillStyle} transition-all duration-300 rounded-r border-l`}
        style={{ width: `${percentage}%` }}
      />
      <span className="relative z-1 font-mono text-xs font-semibold text-text-primary dark:text-gray-100">
        {type === "currency" ? `${symbol}${Number(value || 0).toFixed(2)}` : Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
};

const DlrCell: React.FC<{ pct: number }> = ({ pct = 0 }) => {
  let boxStyle = "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700";
  if (pct < 85 && pct >= 60) {
    boxStyle = "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700";
  } else if (pct < 60) {
    boxStyle = "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700";
  }

  return (
    <div className={`w-full h-7 flex items-center justify-center rounded px-1.5 font-mono text-xs font-bold border shadow-xs ${boxStyle}`}>
      {Number(pct || 0).toFixed(2)}%
    </div>
  );
};

const MarginPctCell: React.FC<{ pct: number }> = ({ pct = 0 }) => {
  const percentage = Math.min(Math.max((pct / 100) * 100, 4), 100);

  let boxStyle = "bg-emerald-50/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700";
  let fillStyle = "bg-emerald-200/90 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-700";
  if (pct < 20 && pct >= 8) {
    boxStyle = "bg-amber-50/80 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700";
    fillStyle = "bg-amber-200/90 dark:bg-amber-900/60 border-amber-400 dark:border-amber-700";
  } else if (pct < 8) {
    boxStyle = "bg-red-50/80 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700";
    fillStyle = "bg-red-200/90 dark:bg-red-900/60 border-red-400 dark:border-red-700";
  }

  return (
    <div className={`relative w-full h-7 flex items-center justify-end px-2 overflow-hidden rounded border shadow-xs ${boxStyle}`}>
      <div
        className={`absolute right-0 top-0 bottom-0 ${fillStyle} transition-all duration-300 rounded-r border-l`}
        style={{ width: `${percentage}%` }}
      />
      <span className="relative z-1 font-mono text-xs font-bold">
        {Number(pct || 0).toFixed(2)}%
      </span>
    </div>
  );
};

export type AnalyticsColKey =
  | "entity"
  | "attempts"
  | "successful"
  | "submitted"
  | "asrPct"
  | "dlrPct"
  | "delivered"
  | "failed"
  | "rejected"
  | "revenue"
  | "vendorCost"
  | "marginUsd"
  | "marginPct";

const DEFAULT_ANALYTICS_COLUMNS: AnalyticsColKey[] = [
  "entity",
  "attempts",
  "successful",
  "submitted",
  "asrPct",
  "dlrPct",
  "delivered",
  "failed",
  "rejected",
  "revenue",
  "vendorCost",
  "marginUsd",
  "marginPct",
];

const ENTITY_COL_WIDTH = 280;

const DEFAULT_COL_WIDTHS: Record<AnalyticsColKey, number> = {
  entity: 280,
  attempts: 140,
  successful: 155,
  submitted: 150,
  asrPct: 130,
  dlrPct: 130,
  delivered: 150,
  failed: 130,
  rejected: 145,
  revenue: 165,
  vendorCost: 185,
  marginUsd: 160,
  marginPct: 140,
};

const getColumnLabel = (key: AnalyticsColKey, symbol: string): string => {
  switch (key) {
    case "entity": return "Entity";
    case "attempts": return "Attempts";
    case "successful": return "Successful";
    case "submitted": return "Submitted";
    case "asrPct": return "ASR %";
    case "dlrPct": return "DLR %";
    case "delivered": return "Delivered";
    case "failed": return "Failed";
    case "rejected": return "Rejected";
    case "revenue": return `Revenue (${symbol})`;
    case "vendorCost": return `Vendor Cost (${symbol})`;
    case "marginUsd": return `Margin (${symbol})`;
    case "marginPct": return "Margin %";
    default: return key;
  }
};

type DatePresetKey = "today" | "yesterday" | "last7" | "last30" | "last60" | "last90" | "lastMonth" | "custom";

interface DatePresetOption {
  key: DatePresetKey;
  label: string;
}

const DATE_PRESETS: DatePresetOption[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "last60", label: "Last 60 Days" },
  { key: "last90", label: "Last 90 Days" },
  { key: "lastMonth", label: "Last Month" },
];



const AnalyticsReport: React.FC = () => {
  const [companyRows, setCompanyRows] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [activePreset, setActivePreset] = useState<DatePresetKey>("today");
  const [dateMode, setDateMode] = useState<"whole_day" | "specific_time">("whole_day");

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("analytics_report_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "analytics_report_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [expandedAms, setExpandedAms] = useState<Record<string, boolean>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});

  const [companyData, setCompanyData] = useState<Record<string, any[]>>({});
  const [countryData, setCountryData] = useState<Record<string, any[]>>({});
  const [vendorData, setVendorData] = useState<Record<string, any[]>>({});

  const [nodeLoading, setNodeLoading] = useState<Record<string, boolean>>({});

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [currencySymbol, setCurrencySymbol] = useState<string>("$");
  const [countryOptions, setCountryOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getCountriesApi("country", 1, 1000);
        const data = res.results || (Array.isArray(res) ? res : []);
        setCountryOptions(
          data.map((item: any) => ({
            label: item.name || "Unknown",
            value: item.name || String(item.id),
            iso2: item.iso2,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch countries", error);
      }
    };
    fetchCountries();
  }, []);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Analytics", "Opened Analytics Report Module", false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const resetTreeState = () => {
    setExpandedAms({});
    setExpandedCompanies({});
    setExpandedCountries({});
    setCompanyData({});
    setCountryData({});
    setVendorData({});
  };

  const getActiveFilterParams = (
    customFilters?: Record<string, string>,
    presetOverride?: DatePresetKey
  ) => {
    const params: Record<string, any> = {};
    const activeFilters = customFilters || filterValues;
    const currentPreset = presetOverride !== undefined ? presetOverride : activePreset;

    searchColumns.forEach((key) => {
      const val = activeFilters[key];
      if (!val) return;
      const colDef = allColumns.find((c) => c.key === key);

      if (colDef?.type === "date") {
        const datePart = val.split("T")[0];
        if (dateMode === "specific_time" && val.includes("T")) {
          const timePart = val.split("T")[1] || "00:00:00";
          const [hh, mm] = timePart.split(":");
          params.start_date = `${datePart}T${hh || "00"}:${mm || "00"}:00`;
          params.end_date = `${datePart}T${hh || "00"}:${mm || "00"}:59`;
        } else {
          params.start_date = `${datePart}T00:00:00`;
          params.end_date = `${datePart}T23:59:59`;
        }
      } else if (colDef?.type === "date_gt_lt") {
        const [gt, lt] = val.split(",");
        if (gt && gt.trim() !== "") {
          params.start_date = gt.includes("T") ? gt : `${gt}T00:00:00`;
        }
        if (lt && lt.trim() !== "") {
          params.end_date = lt.includes("T") ? lt : `${lt}T23:59:59`;
        }
      } else {
        params[colDef?.filterKey || key] = val;
      }
    });

    const hasExplicitDateFilter = params.start_date || params.end_date;

    if (!hasExplicitDateFilter && currentPreset && currentPreset !== "custom") {
      const range = getPresetDateRange(currentPreset);
      params.start_date = range.start;
      params.end_date = range.end;
      if (currentPreset === "today") {
          params.today = "true";
      }
    }

    return params;
  };

  const fetchCompanyData = async (
    page: number = 1,
    append: boolean = false,
    customFilters?: Record<string, string>,
    presetOverride?: DatePresetKey
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (append) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const filterParams = getActiveFilterParams(customFilters, presetOverride);
      const searchParams: Record<string, any> = {
        group_by: "account_manager",
        page: page,
        page_size: BATCH_SIZE,
        ...filterParams,
      };

      const res = await getAnalyticsDataApi(searchParams);
      if (newController.signal.aborted) return;

      if (res.base_currency_symbol) {
        setCurrencySymbol(res.base_currency_symbol);
      } else if (res.base_currency) {
        setCurrencySymbol(res.base_currency);
      }

      const rawList: any[] = Array.isArray(res)
        ? res
        : res.results || [];
      const count = res.count ?? rawList.length;
      setTotalItems(count);
      setHasMore(Boolean(res.next));
      setLoadedPage(page);

      const newRows = rawList.map((m: any, idx: number) => {
        const amName = m.account_manager || m.accountManager || `Account Manager ${idx + 1}`;
        return {
          id: amName,
          account_manager: amName,
          attempts: m.attempts || 0,
          successful: m.successful || 0,
          submitted: m.submitted || 0,
          asrPct: m.asr_percent || 0,
          dlrPct: m.dlr_percent || 0,
          delivered: m.delivered || 0,
          failed: m.failed || 0,
          rejected: m.rejected || 0,
          revenue: m.revenue || 0,
          vendorCost: m.vendor_cost || 0,
          marginUsd: m.margin_usd || 0,
          marginPct: m.margin_percent || 0,
        };
      });

      setCompanyRows((prev) => (append ? [...prev, ...newRows] : newRows));
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch analytics company data:", error);
        toast.error("Failed to retrieve analytics data from backend.");
        if (!append) setCompanyRows([]);
      }
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchCompanyData(1, false);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const handleTimezoneChange = () => {
      fetchCompanyData(1, false);
    };
    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
  }, []);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>("div.overflow-auto");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchCompanyData(loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, companyRows.length]);

  const toggleAm = async (amName: string) => {
    const compositeKey = amName;
    const isCurrentlyExpanded = !!expandedAms[compositeKey];
    setExpandedAms((prev) => ({ ...prev, [compositeKey]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !companyData[compositeKey]) {
      setNodeLoading((prev) => ({ ...prev, [compositeKey]: true }));
      try {
        const filterParams = getActiveFilterParams();
        const res = await getAnalyticsDataApi({
          group_by: "client_company",
          account_manager: amName,
          ...filterParams,
        });
        const items = Array.isArray(res) ? res : res.results || [];
        setCompanyData((prev) => ({ ...prev, [compositeKey]: items }));
      } catch (err) {
        console.error("Failed to load companies", err);
        toast.error(`Failed to load companies for ${amName}`);
      } finally {
        setNodeLoading((prev) => ({ ...prev, [compositeKey]: false }));
      }
    }
  };

  const toggleCompany = async (amName: string, companyName: string) => {
    const compositeKey = `${amName}__${companyName}`;
    const isCurrentlyExpanded = !!expandedCompanies[compositeKey];
    setExpandedCompanies((prev) => ({ ...prev, [compositeKey]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !countryData[compositeKey]) {
      setNodeLoading((prev) => ({ ...prev, [compositeKey]: true }));
      try {
        const filterParams = getActiveFilterParams();
        const res = await getAnalyticsDataApi({
          group_by: "country",
          account_manager: amName,
          client_company: companyName,
          ...filterParams,
        });
        const items = Array.isArray(res) ? res : res.results || [];
        setCountryData((prev) => ({ ...prev, [compositeKey]: items }));
      } catch (err) {
        console.error("Failed to load countries", err);
        toast.error(`Failed to load countries for ${companyName}`);
      } finally {
        setNodeLoading((prev) => ({ ...prev, [compositeKey]: false }));
      }
    }
  };

  const toggleCountry = async (amName: string, companyName: string, countryName: string) => {
    const compositeKey = `${amName}__${companyName}__${countryName}`;
    const isCurrentlyExpanded = !!expandedCountries[compositeKey];
    setExpandedCountries((prev) => ({ ...prev, [compositeKey]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !vendorData[compositeKey]) {
      setNodeLoading((prev) => ({ ...prev, [compositeKey]: true }));
      try {
        const filterParams = getActiveFilterParams();
        const res = await getAnalyticsDataApi({
          group_by: "vendor_company",
          account_manager: amName,
          client_company: companyName,
          country_name: countryName,
          ...filterParams,
        });
        const items = Array.isArray(res) ? res : res.results || [];
        setVendorData((prev) => ({ ...prev, [compositeKey]: items }));
      } catch (err) {
        console.error("Failed to load vendor companies", err);
        toast.error(`Failed to load vendors for ${countryName}`);
      } finally {
        setNodeLoading((prev) => ({ ...prev, [compositeKey]: false }));
      }
    }
  };

  const handlePresetClick = (presetKey: DatePresetKey) => {
    if (activePreset === presetKey) return;
    setActivePreset(presetKey);
    const nextFilters = { ...filterValues };
    delete nextFilters.date;
    delete nextFilters.date__gt_lt;
    setFilterValues(nextFilters);

    resetTreeState();
    fetchCompanyData(1, false, nextFilters, presetKey);
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === "date" || key === "date__gt_lt") {
      setActivePreset("custom");
    }
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    resetTreeState();
    fetchCompanyData(1, false);
  };

  const handleClearFilters = () => {
    setActivePreset("today");
    setDateMode("whole_day");
    setFilterValues({});
    resetTreeState();
    fetchCompanyData(1, false, {}, "today");
  };

  const paginationLabel = `${totalItems === 0 ? 0 : 1}-${Math.min(companyRows.length, totalItems)} of ${totalItems}`;

  const maxAttempts = Math.max(...companyRows.map((d) => d.attempts || 1), 100);
  const maxRevenue = Math.max(...companyRows.map((d) => d.revenue || 1), 10);

  // Container width observer for responsive table column layout
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamic Column Resizing, Reordering & Sorting
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("table_col_widths_analytics_report");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  const [resizingColKey, setResizingColKey] = useState<AnalyticsColKey | null>(null);

  const getColMinWidth = (key: AnalyticsColKey): number => {
    if (key === "entity") return ENTITY_COL_WIDTH;
    const label = getColumnLabel(key, currencySymbol);
    return Math.max(getHeaderFullWidth(label), 100);
  };

  const getColWidth = (key: AnalyticsColKey): number => {
    if (key === "entity") return ENTITY_COL_WIDTH;
    const minW = getColMinWidth(key);
    const userW = columnWidths[key];
    if (userW && userW >= minW) return userW;
    return Math.max(DEFAULT_COL_WIDTHS[key] || 120, minW);
  };

  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const isResizingRef = useRef(false);

  const handleResizeStart = (e: React.MouseEvent, key: AnalyticsColKey) => {
    if (key === "entity") return; // Entity column is locked
    e.stopPropagation();
    e.preventDefault();
    const thEl = thRefs.current[key];
    if (!thEl) return;

    isResizingRef.current = true;
    setResizingColKey(key);
    const startX = e.clientX;
    const startWidth = thEl.getBoundingClientRect().width;
    const minWidth = getColMinWidth(key);

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + deltaX));
      setColumnWidths((prev) => ({
        ...prev,
        [key]: newWidth,
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizingColKey(null);

      setColumnWidths((prev) => {
        try {
          localStorage.setItem("table_col_widths_analytics_report", JSON.stringify(prev));
        } catch (err) {}
        return prev;
      });

      setTimeout(() => {
        isResizingRef.current = false;
      }, 100);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const [orderedColumnKeys, setOrderedColumnKeys] = useState<AnalyticsColKey[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("table_col_order_analytics_report");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === DEFAULT_ANALYTICS_COLUMNS.length) {
            const withoutEntity = parsed.filter((c: any) => c !== "entity");
            return ["entity", ...withoutEntity];
          }
        }
      } catch (e) {}
    }
    return DEFAULT_ANALYTICS_COLUMNS;
  });

  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0 || isResizingRef.current || resizingColKey) {
      e.preventDefault();
      return; // Entity is fixed at index 0
    }
    setDraggedColIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (index === 0 || draggedColIdx === null || draggedColIdx === index) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const side = e.clientX < midpoint ? "left" : "right";
    if (dragOverColIdx !== index || dropSide !== side) {
      setDragOverColIdx(index);
      setDropSide(side);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIdx !== null && targetIndex > 0 && draggedColIdx !== targetIndex) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const side = e.clientX < midpoint ? "left" : "right";

      let toIdx = targetIndex;
      if (draggedColIdx < targetIndex) {
        toIdx = side === "left" ? targetIndex - 1 : targetIndex;
      } else if (draggedColIdx > targetIndex) {
        toIdx = side === "left" ? targetIndex : targetIndex + 1;
      }

      // Entity is locked at index 0, so never place anything before index 1
      toIdx = Math.max(1, toIdx);

      if (toIdx !== draggedColIdx && toIdx > 0) {
        setOrderedColumnKeys((prev) => {
          const next = [...prev];
          const [moved] = next.splice(draggedColIdx, 1);
          next.splice(toIdx, 0, moved);
          try {
            localStorage.setItem("table_col_order_analytics_report", JSON.stringify(next));
          } catch (err) {}
          return next;
        });
      }
    }
    setDraggedColIdx(null);
    setDragOverColIdx(null);
    setDropSide(null);
  };

  const handleDragEnd = () => {
    setDraggedColIdx(null);
    setDragOverColIdx(null);
    setDropSide(null);
  };

  const [sortConfig, setSortConfig] = useState<{
    key: AnalyticsColKey;
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: AnalyticsColKey) => {
    if (isResizingRef.current || resizingColKey) return;
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const getColValue = (row: any, key: AnalyticsColKey): number | string => {
    if (key === "entity") {
      return String(
        row.account_manager ||
        row.accountManager ||
        row.client_company ||
        row.client ||
        row.country ||
        row.country_name ||
        row.vendor_company ||
        row.vendor ||
        ""
      ).toLowerCase();
    }
    if (key === "asrPct") return Number(row.asrPct ?? row.asr_percent ?? 0);
    if (key === "dlrPct") return Number(row.dlrPct ?? row.dlr_percent ?? 0);
    if (key === "vendorCost") return Number(row.vendorCost ?? row.vendor_cost ?? 0);
    if (key === "marginUsd") return Number(row.marginUsd ?? row.margin_usd ?? 0);
    if (key === "marginPct") return Number(row.marginPct ?? row.margin_percent ?? 0);
    return Number(row[key] ?? 0);
  };

  const sortedCompanyRows = useMemo(() => {
    if (!sortConfig) return companyRows;
    return [...companyRows].sort((a, b) => {
      const valA = getColValue(a, sortConfig.key);
      const valB = getColValue(b, sortConfig.key);
      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [companyRows, sortConfig]);

  const getSortedSubRows = (rows: any[]) => {
    if (!sortConfig || !rows || rows.length <= 1) return rows;
    return [...rows].sort((a, b) => {
      const valA = getColValue(a, sortConfig.key);
      const valB = getColValue(b, sortConfig.key);
      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

  const totalRequestedWidth = useMemo(() => {
    return orderedColumnKeys.reduce((sum, key) => sum + getColWidth(key), 0);
  }, [orderedColumnKeys, columnWidths, currencySymbol]);

  const getEffectiveColWidth = (key: AnalyticsColKey): number => {
    if (key === "entity") return ENTITY_COL_WIDTH;

    if (containerWidth && totalRequestedWidth < containerWidth) {
      const nonEntityCols = orderedColumnKeys.filter((k) => k !== "entity");
      const unresizedCols = nonEntityCols.filter((k) => !columnWidths[k]);
      const isExplicitlyResized = Boolean(columnWidths[key]);

      if (unresizedCols.length > 0) {
        if (isExplicitlyResized) {
          return getColWidth(key);
        }
        const explicitlyResizedSum = nonEntityCols.reduce((sum, k) => {
          return columnWidths[k] ? sum + getColWidth(k) : sum;
        }, 0);
        const spaceForUnresized = Math.max(0, containerWidth - ENTITY_COL_WIDTH - explicitlyResizedSum);
        const unresizedDefaultSum = unresizedCols.reduce((sum, k) => sum + getColMinWidth(k), 0);

        if (unresizedDefaultSum > 0) {
          const defaultW = getColMinWidth(key);
          return Math.max(defaultW, Math.round((defaultW / unresizedDefaultSum) * spaceForUnresized));
        }
      } else {
        const lastColKey = orderedColumnKeys[orderedColumnKeys.length - 1];
        if (key === lastColKey) {
          const otherColsSum = orderedColumnKeys.reduce((sum, k) => {
            if (k === lastColKey) return sum;
            return sum + (k === "entity" ? ENTITY_COL_WIDTH : getColWidth(k));
          }, 0);
          return Math.max(getColWidth(key), containerWidth - otherColsSum);
        }
        return getColWidth(key);
      }
    }

    return getColWidth(key);
  };

  const totalTableWidth = useMemo(() => {
    return orderedColumnKeys.reduce((sum, key) => sum + getEffectiveColWidth(key), 0);
  }, [orderedColumnKeys, columnWidths, containerWidth, totalRequestedWidth]);

  const renderMetricCell = (
    key: AnalyticsColKey,
    row: any,
    level: "am" | "company" | "country" | "vendor"
  ) => {
    const pad = level === "am" ? "px-2 py-2" : "px-2 py-1.5";
    switch (key) {
      case "attempts":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.attempts} max={maxAttempts} />
          </td>
        );
      case "successful":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.successful} max={maxAttempts} />
          </td>
        );
      case "submitted":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.submitted} max={maxAttempts} />
          </td>
        );
      case "asrPct":
        return (
          <td key={key} className={pad}>
            <DlrCell pct={row.asrPct ?? row.asr_percent} />
          </td>
        );
      case "dlrPct":
        return (
          <td key={key} className={pad}>
            <DlrCell pct={row.dlrPct ?? row.dlr_percent} />
          </td>
        );
      case "delivered":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.delivered} max={maxAttempts} type="success" />
          </td>
        );
      case "failed":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.failed} max={maxAttempts} type="danger" />
          </td>
        );
      case "rejected":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.rejected || 0} max={maxAttempts} type="danger" />
          </td>
        );
      case "revenue":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.revenue} max={maxRevenue} type="currency" symbol={currencySymbol} />
          </td>
        );
      case "vendorCost":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.vendorCost ?? row.vendor_cost} max={maxRevenue} type="currency" symbol={currencySymbol} />
          </td>
        );
      case "marginUsd":
        return (
          <td key={key} className={pad}>
            <DataBarCell value={row.marginUsd ?? row.margin_usd} max={maxRevenue} type="currency" symbol={currencySymbol} />
          </td>
        );
      case "marginPct":
        return (
          <td key={key} className={pad}>
            <MarginPctCell pct={row.marginPct ?? row.margin_percent} />
          </td>
        );
      default:
        return <td key={key} className={pad}>-</td>;
    }
  };

  const visibleSearchFields = allColumns.filter((col) => searchColumns.includes(col.key));
  const getBaseLabel = (label: string) => label.split(" (")[0].trim();

  return (
    <div className="container mx-auto pb-12">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Analytics Report
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={allColumns}
              selectedColumns={searchColumns}
              defaultColumns={DEFAULT_SEARCH_COLUMNS}
              onFilter={(newCols) => {
                setSearchColumns(newCols);
                setFilterValues((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    if (!newCols.includes(k)) delete next[k];
                  });
                  return next;
                });
              }}
              onClear={() => setSearchColumns(DEFAULT_SEARCH_COLUMNS)}
              isLoading={isLoading}
              buttonLabel="Search Fields"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Analytics</span>
        </div>
      </div>

      {/* Dynamic Filter Card */}
      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label);
          if (col.type === "date") {
            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                showTimeSelect={dateMode === "specific_time"}
                enableModeToggle={true}
                dateMode={dateMode}
                onDateModeChange={(newMode) => {
                  setDateMode(newMode);
                  if (newMode === "whole_day") {
                    if (filterValues[col.key]) {
                      const datePart = filterValues[col.key].split("T")[0];
                      handleFilterChange(col.key, datePart);
                    }
                  } else {
                    if (filterValues[col.key] && !filterValues[col.key].includes("T")) {
                      handleFilterChange(col.key, `${filterValues[col.key]}T00:00:00`);
                    }
                  }
                }}
                selected={
                  filterValues[col.key]
                    ? parseDateValue(filterValues[col.key])
                    : null
                }
                onChange={(val: Date | null) => {
                  if (!val) {
                    handleFilterChange(col.key, "");
                    return;
                  }
                  if (dateMode === "specific_time") {
                    handleFilterChange(col.key, formatLocalDateTime(val));
                  } else {
                    handleFilterChange(col.key, formatLocalDate(val));
                  }
                }}
                placeholder={
                  dateMode === "specific_time"
                    ? "Select Date & Time"
                    : "Select Date"
                }
              />
            );
          }
          if (col.type === "date_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (From)`}
                  showTimeSelect={true}
                  selected={gtStr ? parseDateValue(gtStr) : null}
                  dateMode={gtStr ? (gtStr.includes("T") ? "specific_time" : "whole_day") : undefined}
                  onChange={(val: Date | null, mode?: DatePickerMode) => {
                    const newGt = val ? (mode === "specific_time" ? formatLocalDateTime(val) : formatLocalDate(val)) : "";
                    const currentLt = ltStr || "";
                    handleFilterChange(
                      col.key,
                      newGt || currentLt ? `${newGt},${currentLt}` : "",
                    );
                  }}
                  placeholder="Select Date & Time"
                />
                <DatePicker
                  label={`Search ${baseLabel} (To)`}
                  showTimeSelect={true}
                  selected={ltStr ? parseDateValue(ltStr) : null}
                  dateMode={ltStr ? (ltStr.includes("T") ? "specific_time" : "whole_day") : undefined}
                  onChange={(val: Date | null, mode?: DatePickerMode) => {
                    const newLt = val ? (mode === "specific_time" ? formatLocalDateTime(val) : formatLocalDate(val)) : "";
                    const currentGt = gtStr || "";
                    handleFilterChange(
                      col.key,
                      currentGt || newLt ? `${currentGt},${newLt}` : "",
                    );
                  }}
                  placeholder="Select Date & Time"
                />
              </React.Fragment>
            );
          }
          return (
            <Input
              key={col.key}
              type={col.type || "text"}
              label={`Search ${baseLabel}`}
              value={filterValues[col.key] || ""}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              placeholder={`${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      {/* DataTable-Matching Container */}
      <div
        ref={tableWrapperRef}
        className="mt-6 rounded-xl bg-white shadow-card overflow-hidden dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col relative z-0 app-data-table table-density-compact"
      >
        {/* Top Bar: Pagination Count on Left & Date Pills Aligned to the Right */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white dark:bg-gray-800 relative z-10 gap-2">
          <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">
            {paginationLabel}
          </span>

          <div className="flex flex-wrap gap-1.5 items-center justify-end ml-auto">
            {DATE_PRESETS.map((preset) => {
              const isActive = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetClick(preset.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-200 focus:outline-none shadow-xs ${isActive
                    ? "bg-primary text-white border-primary dark:bg-primary dark:border-primary"
                    : "bg-white text-text-secondary border-gray-200 hover:border-primary hover:text-primary dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary"
                    }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Data Table with Sticky Header */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto max-h-[65vh] min-h-[300px] relative z-0 custom-scrollbar"
        >
          <table
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0"
            style={{
              tableLayout: "fixed",
              width: totalTableWidth < (containerWidth || 0)
                ? "100%"
                : `${totalTableWidth}px`,
              minWidth: "100%",
            }}
          >
            <colgroup>
              {orderedColumnKeys.map((colKey) => {
                const isEntity = colKey === "entity";
                const w = getEffectiveColWidth(colKey);
                return (
                  <col
                    key={colKey}
                    style={{
                      width: isEntity ? `${ENTITY_COL_WIDTH}px` : `${w}px`,
                      minWidth: isEntity ? `${ENTITY_COL_WIDTH}px` : `${getColMinWidth(colKey)}px`,
                      maxWidth: isEntity ? `${ENTITY_COL_WIDTH}px` : undefined,
                    }}
                  />
                );
              })}
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-30 shadow-xs">
              <tr className="h-9">
                {orderedColumnKeys.map((colKey, i) => {
                  const isEntity = colKey === "entity";
                  const isSorted = sortConfig?.key === colKey;
                  const isBeingDragged = draggedColIdx === i;
                  const isDragOver = dragOverColIdx === i;
                  const colWidth = getEffectiveColWidth(colKey);
                  const isBeingResized = resizingColKey === colKey;

                  return (
                    <th
                      key={colKey}
                      ref={(el) => {
                        thRefs.current[colKey] = el;
                      }}
                      draggable={!isEntity && !isBeingResized}
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragLeave={() => {
                        if (dragOverColIdx === i) {
                          setDragOverColIdx(null);
                          setDropSide(null);
                        }
                      }}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleSort(colKey)}
                      style={{
                        width: isEntity ? `${ENTITY_COL_WIDTH}px` : `${colWidth}px`,
                        minWidth: isEntity ? `${ENTITY_COL_WIDTH}px` : `${getColMinWidth(colKey)}px`,
                        maxWidth: isEntity ? `${ENTITY_COL_WIDTH}px` : undefined,
                      }}
                      className={`relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap select-none transition-colors group cursor-pointer h-9 ${
                        isEntity
                          ? "w-[280px] min-w-[280px] max-w-[280px] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                          : ""
                      } ${
                        isSorted
                          ? "text-primary dark:text-primary bg-primary/[0.03] dark:bg-primary/[0.06]"
                          : "text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-900"
                      } hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        isBeingDragged ? "opacity-40 bg-gray-200 dark:bg-gray-700" : ""
                      } ${
                        isDragOver
                          ? dropSide === "left"
                            ? "border-l-2 border-primary"
                            : "border-r-2 border-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 min-w-0 h-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!isEntity && (
                            <span
                              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-40 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Drag to reorder column"
                            >
                              <GripVertical size={13} />
                            </span>
                          )}
                          <span className="whitespace-nowrap font-medium text-xs">
                            {getColumnLabel(colKey, currencySymbol)}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center">
                          {isSorted ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp size={13} className="text-primary font-bold" />
                            ) : (
                              <ArrowDown size={13} className="text-primary font-bold" />
                            )
                          ) : (
                            <ArrowUpDown
                              size={12}
                              className="text-gray-400 opacity-0 group-hover:opacity-70 transition-opacity"
                            />
                          )}
                        </div>
                      </div>

                      {/* Single Boundary Line that acts as Column Resizer */}
                      {!isEntity && (
                        <div
                          onMouseDown={(e) => handleResizeStart(e, colKey)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-end group/resizer select-none"
                        >
                          <div
                            className={`w-px h-full transition-all ${
                              isBeingResized
                                ? "bg-primary w-[2px]"
                                : "bg-gray-200 dark:bg-gray-700/90 group-hover/resizer:bg-primary group-hover/resizer:w-[2px]"
                            }`}
                          />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={orderedColumnKeys.length}
                    className="px-4 py-12 text-center text-text-secondary dark:text-gray-400"
                  >
                    Loading analytics data...
                  </td>
                </tr>
              ) : companyRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedColumnKeys.length}
                    className="px-4 py-12 text-center text-text-secondary dark:text-gray-400"
                  >
                    No analytics records found.
                  </td>
                </tr>
              ) : (
                sortedCompanyRows.map((amRow: any, aIdx: number) => {
                  const amName = amRow.account_manager || amRow.accountManager || `Account Manager ${aIdx + 1}`;
                  const isAmExpanded = !!expandedAms[amName];
                  const isAmLoading = !!nodeLoading[amName];
                  const companies = companyData[amName] || [];
                  const sortedCompanies = getSortedSubRows(companies);

                  return (
                    <React.Fragment key={amName}>
                      {/* LEVEL 0: AM ROW */}
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-semibold">
                        {orderedColumnKeys.map((colKey) => {
                          if (colKey === "entity") {
                            return (
                              <td
                                key="entity"
                                style={{
                                  width: `${ENTITY_COL_WIDTH}px`,
                                  minWidth: `${ENTITY_COL_WIDTH}px`,
                                  maxWidth: `${ENTITY_COL_WIDTH}px`,
                                }}
                                className="px-4 py-2.5 whitespace-nowrap w-[280px] min-w-[280px] max-w-[280px] border-r border-gray-200 dark:border-gray-700"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleAm(amName)}
                                  className="inline-flex items-center space-x-2 text-text-primary dark:text-gray-200 hover:text-primary focus:outline-none group"
                                >
                                  <ExpandButton isExpanded={isAmExpanded} />
                                  <span className="text-xs font-semibold">{amName}</span>
                                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-1.5 py-0.5 rounded ml-1">
                                    AM
                                  </span>
                                </button>
                              </td>
                            );
                          }
                          return renderMetricCell(colKey, amRow, "am");
                        })}
                      </tr>

                      {/* LEVEL 1: COMPANY ROWS */}
                      {isAmExpanded && (
                        isAmLoading ? (
                          <tr>
                            <td colSpan={orderedColumnKeys.length} className="py-2 pl-10 text-xs text-gray-500 italic">Loading companies...</td>
                          </tr>
                        ) : sortedCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={orderedColumnKeys.length} className="py-2 pl-10 text-xs text-gray-400 italic">No company data found.</td>
                          </tr>
                        ) : (
                          sortedCompanies.map((companyRow: any, cIdx: number) => {
                            const companyName = companyRow.client_company || companyRow.client || `Company ${cIdx + 1}`;
                            const companyKey = `${amName}__${companyName}`;
                            const isCompanyExpanded = !!expandedCompanies[companyKey];
                            const isCompanyLoading = !!nodeLoading[companyKey];
                            const countries = countryData[companyKey] || [];
                            const sortedCountries = getSortedSubRows(countries);

                            return (
                              <React.Fragment key={companyKey}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300">
                                  {orderedColumnKeys.map((colKey) => {
                                    if (colKey === "entity") {
                                      return (
                                        <td
                                          key="entity"
                                          style={{
                                            width: `${ENTITY_COL_WIDTH}px`,
                                            minWidth: `${ENTITY_COL_WIDTH}px`,
                                            maxWidth: `${ENTITY_COL_WIDTH}px`,
                                          }}
                                          className="px-4 py-2 pl-10 whitespace-nowrap w-[280px] min-w-[280px] max-w-[280px] border-r border-gray-200 dark:border-gray-700"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleCompany(amName, companyName)}
                                            className="inline-flex items-center space-x-2 text-text-primary dark:text-gray-300 hover:text-indigo-600 focus:outline-none group"
                                          >
                                            <ExpandButton isExpanded={isCompanyExpanded} />
                                            <span className="text-xs font-semibold">{companyName}</span>
                                            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded ml-1">
                                              COMPANY
                                            </span>
                                          </button>
                                        </td>
                                      );
                                    }
                                    return renderMetricCell(colKey, companyRow, "company");
                                  })}
                                </tr>

                                {/* LEVEL 2: COUNTRY ROWS */}
                                {isCompanyExpanded && (
                                  isCompanyLoading ? (
                                    <tr>
                                      <td colSpan={orderedColumnKeys.length} className="py-2 pl-14 text-xs text-gray-500 italic">Loading countries...</td>
                                    </tr>
                                  ) : sortedCountries.length === 0 ? (
                                    <tr>
                                      <td colSpan={orderedColumnKeys.length} className="py-2 pl-14 text-xs text-gray-400 italic">No country data found.</td>
                                    </tr>
                                  ) : (
                                    sortedCountries.map((countryRow: any, coIdx: number) => {
                                      const countryName = countryRow.country || countryRow.country_name || `Country ${coIdx + 1}`;
                                      const countryKey = `${amName}__${companyName}__${countryName}`;
                                      const isCountryExpanded = !!expandedCountries[countryKey];
                                      const isCountryLoading = !!nodeLoading[countryKey];
                                      const vendors = vendorData[countryKey] || [];
                                      const sortedVendors = getSortedSubRows(vendors);
                                      const match = countryOptions.find((opt) => opt.label === countryName);

                                      return (
                                        <React.Fragment key={countryKey}>
                                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-400">
                                            {orderedColumnKeys.map((colKey) => {
                                              if (colKey === "entity") {
                                                return (
                                                  <td
                                                    key="entity"
                                                    style={{
                                                      width: `${ENTITY_COL_WIDTH}px`,
                                                      minWidth: `${ENTITY_COL_WIDTH}px`,
                                                      maxWidth: `${ENTITY_COL_WIDTH}px`,
                                                    }}
                                                    className="px-4 py-2 pl-14 whitespace-nowrap w-[280px] min-w-[280px] max-w-[280px] border-r border-gray-200 dark:border-gray-700"
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleCountry(amName, companyName, countryName)}
                                                      className="inline-flex items-center space-x-2 text-text-primary dark:text-gray-300 hover:text-amber-600 focus:outline-none group"
                                                    >
                                                      <ExpandButton isExpanded={isCountryExpanded} />
                                                      <div className="flex items-center gap-1.5">
                                                        {match?.iso2 && <CountryFlag iso2={match.iso2} />}
                                                        <span className="text-xs font-medium">{countryName}</span>
                                                      </div>
                                                      <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded ml-1">
                                                        COUNTRY
                                                      </span>
                                                    </button>
                                                  </td>
                                                );
                                              }
                                              return renderMetricCell(colKey, countryRow, "country");
                                            })}
                                          </tr>

                                          {/* LEVEL 3: VENDOR ROWS */}
                                          {isCountryExpanded && (
                                            isCountryLoading ? (
                                              <tr>
                                                <td colSpan={orderedColumnKeys.length} className="py-2 pl-20 text-xs text-gray-500 italic">Loading vendors...</td>
                                              </tr>
                                            ) : sortedVendors.length === 0 ? (
                                              <tr>
                                                <td colSpan={orderedColumnKeys.length} className="py-2 pl-20 text-xs text-gray-400 italic">No vendors found.</td>
                                              </tr>
                                            ) : (
                                              sortedVendors.map((vendorRow: any, vIdx: number) => {
                                                const vendorName = vendorRow.vendor_company || vendorRow.vendor || `Vendor ${vIdx + 1}`;
                                                return (
                                                  <tr
                                                    key={`${countryKey}__${vendorName}_${vIdx}`}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-xs text-text-secondary dark:text-gray-400"
                                                  >
                                                    {orderedColumnKeys.map((colKey) => {
                                                      if (colKey === "entity") {
                                                        return (
                                                          <td
                                                            key="entity"
                                                            style={{
                                                              width: `${ENTITY_COL_WIDTH}px`,
                                                              minWidth: `${ENTITY_COL_WIDTH}px`,
                                                              maxWidth: `${ENTITY_COL_WIDTH}px`,
                                                            }}
                                                            className="px-4 py-2 pl-20 whitespace-nowrap w-[280px] min-w-[280px] max-w-[280px] border-r border-gray-200 dark:border-gray-700"
                                                          >
                                                            <div className="inline-flex items-center space-x-2">
                                                              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                                                {vendorName}
                                                              </span>
                                                              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded ml-1">
                                                                VENDOR
                                                              </span>
                                                            </div>
                                                          </td>
                                                        );
                                                      }
                                                      return renderMetricCell(colKey, vendorRow, "vendor");
                                                    })}
                                                  </tr>
                                                );
                                              })
                                            )
                                          )}
                                        </React.Fragment>
                                      );
                                    })
                                  )
                                )}
                              </React.Fragment>
                            );
                          })
                        )
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {isFetchingMore && (
          <div className="text-center text-xs text-text-secondary dark:text-gray-400 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            Loading more...
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .table-density-compact th {
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          height: 36px !important;
          font-size: 0.75rem !important;
          line-height: 1rem !important;
        }
        .table-density-compact th * {
          font-size: 0.75rem !important;
        }
        .table-density-compact td {
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
        }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `,
        }}
      />
    </div>
  );
};

export default AnalyticsReport;