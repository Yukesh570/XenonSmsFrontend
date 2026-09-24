import React, { useState, useEffect, useRef } from "react";
import { Home, Eye, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getDetailedReportsApi,
  downloadDetailedReportCsvApi,
  type DetailedReportData,
} from "../../api/reportApi/detailedReportApi";
import { DetailedReportModal } from "../../components/modals/Report/DetailedReportModal";
import { handleCsvExportWithApi } from "../../helper/csvExport";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker, { parseDateValue, type DatePickerMode } from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import {
  formatDateTime,
  getPresetDateRange,
  formatLocalDate,
  formatLocalDateTime,
} from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CountryFlag } from "../../components/ui/CountryFlag";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getCompaniesApi } from "../../api/companyApi/companyApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

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
  render?: (data: DetailedReportData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const statusOptions: Option[] = [
  { label: "Queued", value: "QUEUED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Failed", value: "FAILED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Undelivered", value: "UNDELIVERED" },
];



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



const DEFAULT_SEARCH_COLUMNS = [
  "text_message_id",
  "destination",
  "countryMCC",
  "operatorMNC",
  "senderId",
  "countryName",
  "company",

  "submitStatus",
  "client",
  "vendor",
  "failure_reason",
  "request_time__gt_lt",
  "effectiveSenderId",
];
const DEFAULT_TABLE_COLUMNS = [
  "text_message_id",
  "destination",
  "countryMCC",
  "operatorMNC",
  "senderId",
  "countryName",
  "submitStatus",
  "content",
  "client",
  "company",
  "vendor",
  "failure_reason",
  "request_time",
  "message_delivered_at",
  "message_failed_at",
  "effectiveSenderId",
];

const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const DetailedReport: React.FC = () => {
  const [reports, setReports] = useState<DetailedReportData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLog, setViewLog] = useState<DetailedReportData | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowLog, setSelectedRowLog] =
    useState<DetailedReportData | null>(null);

  const [activePreset, setActivePreset] = useState<DatePresetKey>("today");

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("detailed_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "detailed_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("detailed_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSearchParamsRef = useRef<Record<string, string>>({});
  
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [clientOptions, setClientOptions] = useState<Option[]>([]);
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [countriesRes, clientsRes, companiesRes, vendorsRes] = await Promise.all([
          getCountriesApi("country", 1, 1000),
          getClientsApi("client", 1, 1000),
          getCompaniesApi("company", 1, 1000),
          getVendorsApi("vendor", 1, 1000)
        ]);

        const formatOptions = (res: any, extraFormat?: (item: any) => any) => {
          const data = res.results || (Array.isArray(res) ? res : []);
          return data.map((item: any) => ({
            label: item.name || "Unknown",
            value: item.name || String(item.id),
            ...(extraFormat ? extraFormat(item) : {})
          }));
        };

        setCountryOptions(
          formatOptions(countriesRes, (item) => (item.iso2 ? { icon: <CountryFlag iso2={item.iso2} /> } : {}))
        );
        setClientOptions(formatOptions(clientsRes));
        setCompanyOptions(formatOptions(companiesRes));
        setVendorOptions(formatOptions(vendorsRes, (item) => ({ 
          label: item.profileName || item.company_name || "Unknown", 
          value: item.profileName || String(item.id) 
        })));
      } catch (error) {
        console.error("Failed to fetch dropdown options", error);
      }
    };
    fetchOptions();
  }, []);

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(
      "detailed_table_columns",
      JSON.stringify(tableColumns),
    );
  }, [tableColumns]);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll(
          "aside a.active, nav a.active",
        );
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel =
          activeItem?.innerText?.split("\n")[0].trim() || "Detailed Report";
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const allColumns: ColumnConfig[] = [
    {
      key: "destination",
      label: "Destination",
      type: "text",
      filterKey: "destination__icontains",
      render: (log) => (
        <span className="text-sm font-medium text-text-primary dark:text-white">
          {log.destination}
        </span>
      ),
    },
    {
      key: "text_message_id",
      label: "Message ID",
      type: "text",
      filterKey: "text_message_id__icontains",
      render: (log) => (
        <span className="font-mono text-xs text-primary">
          {log.text_message_id || "-"}
        </span>
      ),
    },
    {
      key: "parent_message_id",
      label: "Parent Message ID",
      type: "text",
      filterKey: "message__message_id__icontains",
      isSearchOnly: true,
    },

    {
      key: "countryName",
      label: "Country",
      type: "text",
      options: countryOptions,
      filterKey: "message__country__name",
      render: (log) => {
        const match = countryOptions.find(
          (opt) => opt.label === log.countryName,
        );
        return (
          <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary dark:text-white">
            {match?.icon}
            <span>{log.countryName}</span>
          </div>
        );
      },
    },
    {
      key: "countryMCC",
      label: "Country MCC",
      type: "text",
      filterKey: "countryMCC__icontains",
    },
    {
      key: "operatorMNC",
      label: "Operator MNC",
      type: "text",
      filterKey: "operatorMNC__icontains",
    },
    {
      key: "client",
      label: "Client",
      type: "text",
      options: clientOptions,
      filterKey: "client__icontains",
    },
    {
      key: "company",
      label: "Company",
      type: "text",
      options: companyOptions,
      filterKey: "message__client__company__name__icontains",
    },
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      options: vendorOptions,
      filterKey: "vendor__icontains",
    },
    {
      key: "senderId",
      label: "Sender ID",
      type: "text",
      filterKey: "senderId__icontains",
    },
    {
      key: "effectiveSenderId",
      label: "Effective Sender ID",
      type: "text",
      filterKey: "effectiveSenderId__icontains",
    },
    {
      key: "senderTranslationAction",
      label: "Translation Action",
      type: "text",
      filterKey: "senderTranslationAction",
    },
    {
      key: "senderTranslationRuleId",
      label: "Translation Rule ID",
      type: "text",
      filterKey: "senderTranslationRuleId",
    },
    {
      key: "vendor_msg_id",
      label: "Vendor Msg ID",
      type: "text",
      filterKey: "vendor_msg_id__icontains",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      filterKey: "text__icontains",
      render: (log) => (
        <div
          className="max-w-xs truncate text-sm text-text-secondary cursor-pointer hover:text-primary transition-colors"
          title="Click to view full message"
          onClick={(e) => {
            e.stopPropagation();
            setViewLog(log);
            setIsModalOpen(true);
          }}
        >
          {log.content}
        </div>
      ),
    },
    {
      key: "submitStatus",
      label: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "submitStatus__icontains",
      render: (log) => <StatusBadge status={log.submitStatus} />,
    },

    {
      key: "base_client_charge",
      label: "Base Client Charge",
      tableLabel: `Base Client Charge (${currencySymbol})`,
      type: "number",
      filterKey: "base_client_charge__icontains",
      render: (log: any) => (
        <span className="font-mono">{Number(log.base_client_charge || 0).toFixed(6)}</span>
      ),
    },

    {
      key: "base_vendor_charge",
      label: "Base Vendor Charge",
      tableLabel: `Base Vendor Charge (${currencySymbol})`,
      type: "number",
      filterKey: "base_vendor_charge__icontains",
      render: (log: any) => (
        <span className="font-mono">{Number(log.base_vendor_charge || 0).toFixed(6)}</span>
      ),
    },
    {
      key: "part_total",
      label: "Parts",
      type: "number",
      filterKey: "part_total__icontains",
    },
    {
      key: "request_time",
      label: "Request Time",
      tableLabel: "Request Time",
      type: "date",
      filterKey: "request_time",
      isSearchable: false,
      render: (log) => (
        <span>
          {log.request_time ? formatDateTime(log.request_time) : "-"}
        </span>
      ),
    },
    {
      key: "request_time__gt_lt",
      label: "Request Time (From / To)",
      type: "date_gt_lt",
      filterKey: "request_time",
      isSearchOnly: true,
    },
    {
      key: "delivery_time",
      label: "Delivery Time",
      tableLabel: "Delivery Time",
      type: "date",
      filterKey: "delivery_time",
      isSearchable: false,
      render: (log: any) => (
        <span>
          {log.delivery_time ? formatDateTime(log.delivery_time) : "-"}
        </span>
      ),
    },
    {
      key: "delivery_time__gt_lt",
      label: "Delivery Time (From / To)",
      type: "date_gt_lt",
      filterKey: "delivery_time",
      isSearchOnly: true,
    },
    {
      key: "senderId",
      label: "Sender ID",
      type: "text",
      isSearchable: false,
    },
    {
      key: "effectiveSenderId",
      label: "Effective Sender ID",
      type: "text",
      isSearchable: false,
    },
    {
      key: "senderTranslationAction",
      label: "Translation Action",
      type: "text",
      isSearchable: false,
    },
    {
      key: "senderTranslationRuleId",
      label: "Translation Rule ID",
      type: "text",
      isSearchable: false,
    },
    {
      key: "encoding",
      label: "Encoding",
      type: "text",
      isSearchable: false,
    },
    {
      key: "characterCount",
      label: "Character Count",
      type: "text",
      isSearchable: false,
    },
    {
      key: "failure_reason",
      label: "Failure Reason",
      type: "text",
      isSearchable: false,
    },
    {
      key: "message_queued_at",
      label: "Queued At",
      tableLabel: "Queued At",
      type: "date",
      filterKey: "message__queued_at",
      isSearchable: false,
      render: (log) => (
        <span>
          {log.message_queued_at ? formatDateTime(log.message_queued_at) : "-"}
        </span>
      ),
    },
    {
      key: "message_queued_at__gt_lt",
      label: "Queued At (From / To)",
      type: "date_gt_lt",
      filterKey: "message__queued_at",
      isSearchOnly: true,
    },
    {
      key: "message_delivered_at",
      label: "Delivered At",
      tableLabel: "Delivered At",
      type: "date",
      filterKey: "message__delivered_at",
      isSearchable: false,
      render: (log) => (
        <span>
          {log.message_delivered_at ? formatDateTime(log.message_delivered_at) : "-"}
        </span>
      ),
    },
    {
      key: "message_delivered_at__gt_lt",
      label: "Delivered At (From / To)",
      type: "date_gt_lt",
      filterKey: "message__delivered_at",
      isSearchOnly: true,
    },
    {
      key: "message_failed_at",
      label: "Failed At",
      tableLabel: "Failed At",
      type: "date",
      filterKey: "message__failed_at",
      isSearchable: false,
      render: (log) => (
        <span>
          {log.message_failed_at ? formatDateTime(log.message_failed_at) : "-"}
        </span>
      ),
    },
    {
      key: "message_failed_at__gt_lt",
      label: "Failed At (From / To)",
      type: "date_gt_lt",
      filterKey: "message__failed_at",
      isSearchOnly: true,
    },
  ];

  const searchableColumns = allColumns.filter(
    (col) => col.isSearchable !== false,
  );
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type as FilterColumnType,
    }));

  const handleFilterChange = (key: string, value: string) => {
    if (key === "request_time" || key === "request_time__gt_lt") {
      setActivePreset("custom");
    }
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handlePresetClick = (presetKey: DatePresetKey) => {
    if (activePreset === presetKey) return;
    setActivePreset(presetKey);
    let updatedFilters: Record<string, string> = {};
    setFilterValues((prev) => {
      const next = { ...prev };
      delete next.request_time;
      delete next.request_time__gt_lt;
      updatedFilters = next;
      return next;
    });
    fetchReports(updatedFilters, 1, false, presetKey);
  };

  const fetchReports = async (
    filters: Record<string, string> | null = null,
    page: number = 1,
    append: boolean = false,
    presetOverride?: DatePresetKey,
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (append) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const activeFilters = filters || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (value) {
          const columnDef = allColumns.find((c) => c.key === key);

          if (columnDef?.options) {
            const selectedOption = columnDef.options.find(
              (opt) => opt.value === value,
            );
            currentSearchParams[columnDef.filterKey || key] = selectedOption
              ? selectedOption.value
              : value;
          } else if (columnDef?.type === "date") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            if (value.includes("T")) {
              const [datePart, timePart] = value.split("T");
              if (timePart === "00:00:00") {
                currentSearchParams[`${baseKey}__range`] = `${datePart}T00:00:00,${datePart}T23:59:59`;
              } else {
                const [hh, mm] = timePart.split(":");
                currentSearchParams[`${baseKey}__range`] = `${datePart}T${hh}:${mm}:00,${datePart}T${hh}:${mm}:59`;
              }
            } else {
              currentSearchParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
            }
          } else if (columnDef?.type === "date_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__gt_lt$/, "")
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt && gt.trim() !== "") {
              currentSearchParams[`${baseKey}__gte`] = gt.includes("T") ? gt : `${gt}T00:00:00`;
            }
            if (lt && lt.trim() !== "") {
              currentSearchParams[`${baseKey}__lte`] = lt.includes("T") ? lt : `${lt}T23:59:59`;
            }
          } else if (
            columnDef?.type === "text" ||
            columnDef?.type === "boolean" ||
            columnDef?.type === "number"
          ) {
            const filterKey = columnDef.filterKey || `${key}__icontains`;
            currentSearchParams[filterKey] = value;
          } else {
            currentSearchParams[columnDef?.filterKey || key] = value;
          }
        }
      });

      // Apply preset date range for request_time if no explicit date filter is active
      const currentPreset =
        presetOverride !== undefined ? presetOverride : activePreset;
      const hasExplicitRequestTime =
        currentSearchParams["request_time__range"] ||
        currentSearchParams["request_time__gte"] ||
        currentSearchParams["request_time__lte"] ||
        currentSearchParams["request_time"];

      if (!hasExplicitRequestTime && currentPreset && currentPreset !== "custom") {
        const range = getPresetDateRange(currentPreset);
        if (range) {
          currentSearchParams["request_time__range"] = `${range.start},${range.end}`;
        }
      }

      // Keep ref in sync so the Download button always has the latest params
      currentSearchParamsRef.current = currentSearchParams;

      const response: any = await getDetailedReportsApi(
        page,
        BATCH_SIZE,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;
      if (response && response.results) {
        setReports((prev) =>
          append ? [...prev, ...response.results] : response.results,
        );
        setTotalItems(response.count);
        setHasMore(Boolean(response.next));
        setLoadedPage(page);
        if (response.currency?.symbol) {
          setCurrencySymbol(response.currency.symbol);
        }
      } else {
        if (!append) setReports([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError")
        toast.error("Failed to fetch detailed reports.");
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchReports(undefined, 1, false);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [searchColumns]);

  useEffect(() => {
    const handleTimezoneChange = () => {
      fetchReports(undefined, 1, false);
    };
    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
  }, []);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar",
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchReports(filterValues, loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, reports.length]);

  const handleSearch = () => {
    fetchReports(undefined, 1, false);
  };
  const handleClearFilters = () => {
    setActivePreset("today");
    setFilterValues({});
    fetchReports({}, 1, false, "today");
  };

  const handleContextMenu = (e: React.MouseEvent, log: DetailedReportData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowLog(log);
  };

  const menuItems: ContextMenuItem[] = selectedRowLog
    ? [
      {
        label: "View Details",
        icon: <Eye size={16} />,
        onClick: () => {
          setViewLog(selectedRowLog);
          setIsModalOpen(true);
        },
      },
      {
        label: "Download CSV Report",
        icon: <Download size={16} />,
        onClick: () => {
          handleCsvExportWithApi(downloadDetailedReportCsvApi, currentSearchParamsRef.current);
        },
      },
    ]
    : [];

  const tableHeaders = [
    "S.N",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];
  const getBaseLabel = (label: string) =>
    label ? label.split(" (")[0].trim() : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Detailed Report
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={setTableColumns}
              onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
              buttonLabel="Columns"
              enableReorder={true}
            />
          </div>
          <div className="relative z-20">
            <AdvancedFilter
              columns={searchableColumns as any}
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
          <span className="text-text-primary dark:text-white">Reports</span>
        </div>
      </div>



      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options)
            return (
              <Select
                key={col.key}
                label={`Search ${baseLabel}`}
                value={filterValues[col.key] || ""}
                onChange={(val) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
                allowCustomValue={true}
              />
            );
          if (col.type === "date")
            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                showTimeSelect={true}
                selected={
                  filterValues[col.key] ? parseDateValue(filterValues[col.key]) : null
                }
                dateMode={
                  filterValues[col.key] ? (filterValues[col.key].includes("T") ? "specific_time" : "whole_day") : undefined
                }
                onChange={(val: Date | null, mode?: DatePickerMode) =>
                  handleFilterChange(col.key, val ? (mode === "specific_time" ? formatLocalDateTime(val) : formatLocalDate(val)) : "")
                }
                placeholder="Select Date & Time"
              />
            );
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

      <div ref={tableWrapperRef}>
        <DataTable
          serverSide={true}
          data={reports}
          totalItems={totalItems}
          rowsPerPage={BATCH_SIZE}
          headers={tableHeaders}
          isLoading={isLoading}
          showCountOnly={true}
          density="compact"
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
          onReorderColumns={(fromIdx, toIdx) => {
            setTableColumns((prev) => {
              const validKeys = prev.filter(key => allColumns.some(c => c.key === key));
              const next = [...validKeys];
              const [moved] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, moved);
              return next;
            });
          }}
          renderRow={(log, index) => (
            <tr
              key={log.id || index}
              onContextMenu={(e) => handleContextMenu(e, log)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
            >
              <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {index + 1}
              </td>
              {visibleTableFields.map((col) => {
                const cellData = (log as any)[col.key];
                if (col.render)
                  return (
                    <td
                      key={col.key}
                      className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                    >
                      {col.render(log)}
                    </td>
                  );
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {cellData || "-"}
                  </td>
                );
              })}
            </tr>
          )}
        />
        {isFetchingMore && (
          <div className="text-center text-xs text-text-secondary dark:text-gray-400 py-2">
            Loading more...
          </div>
        )}
      </div>

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <DetailedReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        viewLog={viewLog}
      />
    </div>
  );
};

export default DetailedReport;