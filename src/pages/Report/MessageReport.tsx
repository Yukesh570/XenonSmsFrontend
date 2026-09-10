import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, Eye, Route, Download } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// --- API ---
import {
  getMessageLogsApi,
  type MessageLogData,
} from "../../api/reportApi/messageReportApi";
import {
  getGroupedCustomRoutesApi,
  getCustomRoutesApi,
} from "../../api/routeManagerApi/customRouteApi";
import { CountryFlag } from "../../components/ui/CountryFlag";

// --- Dropdown APIs ---
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getSmppApi } from "../../api/connectivityApi/smppApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

// --- Components & Modals ---
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { MessageReportModal } from "../../components/modals/Report/MessageReportModal";
import { SubRouteTableModal } from "../../components/modals/RouteManager/SubRouteTableModal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import { DownloadReportModal } from "../../components/modals/Report/DownloadModalCSV";

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
  render?: (data: any) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchable?: boolean;
  isSearchOnly?: boolean;
  tableLabel?: string;
  type: FilterColumnType;
}

const statusOptions: Option[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Queued", value: "QUEUED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Failed", value: "FAILED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Undelivered", value: "UNDELIVERED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Partially Delivered", value: "PARTIALLY_DELIVERED" },
  { label: "No Route", value: "NO_ROUTE" },
  { label: "Retry Pending", value: "RETRY_PENDING" },
  { label: "Uncertain", value: "UNCERTAIN" },
];

const encodingOptions: Option[] = [
  { label: "GSM-7", value: "GSM-7" },
  { label: "UCS-2", value: "UCS-2" },
];

const DEFAULT_SEARCH_COLUMNS = [
  "message_id",
  "destination",
  "clientName",
  "countryName",
  "status",
  "source_addr",
];
const DEFAULT_TABLE_COLUMNS = [
  "message_id",
  "destination",
  "source_addr",
  "effectiveSenderId",
  "senderTranslationAction",
  "senderTranslationRuleId",
  "countryName",
  "status",
  "segmentNumber",
  "clientName",
  "vendorName",
  "systemId",
  "createdAt",
];

const formatLocalDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const MessageReport: React.FC = () => {
  const { canUpdate, canDelete } = usePagePermissions();
  const [logs, setLogs] = useState<MessageLogData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [clientOptions, setClientOptions] = useState<Option[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [smppOptions, setSmppOptions] = useState<Option[]>([]);
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("msg_search_columns");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "msg_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("msg_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Message Log Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLog, setViewLog] = useState<MessageLogData | null>(null);

  // Manage Route Group Modal (In-place)
  const [activeRouteGroup, setActiveRouteGroup] = useState<string | null>(null);
  const [activeRouteGroupId, setActiveRouteGroupId] = useState<number | null>(null);
  const [activeCountryName, setActiveCountryName] = useState<string | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowLog, setSelectedRowLog] = useState<MessageLogData | null>(null);

  const location = useLocation();
  const moduleName = location.pathname.split("/").pop() || "messageReport";
  const abortControllerRef = useRef<AbortController | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef(true);

  const extractOptions = (
    response: any,
    labelKey: string,
    valueKey: string,
  ) => {
    let data = [];
    if (response && response.results) data = response.results;
    else if (Array.isArray(response)) data = response;
    else if (response && Array.isArray(response.data)) data = response.data;

    return data.map((item: any) => ({
      label: item[labelKey] || item.name || "Unknown",
      value: item[valueKey] || item.name || String(item.id),
      ...(item.iso2 ? { icon: <CountryFlag iso2={item.iso2} /> } : {}),
    }));
  };

  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [clientsRes, vendorsRes, smppRes, countriesRes] = await Promise.all([
          getClientsApi("client", 1, 1000),
          getVendorsApi("vendor", 1, 1000),
          typeof getSmppApi === "function"
            ? getSmppApi("smpp", 1, 1000)
            : Promise.resolve([]),
          getCountriesApi("country", 1, 1000),
        ]);

        setClientOptions(extractOptions(clientsRes, "name", "name"));
        setVendorOptions(
          extractOptions(vendorsRes, "profileName", "profileName"),
        );
        setSmppOptions(extractOptions(smppRes, "systemID", "systemID"));
        setCountryOptions(extractOptions(countriesRes, "name", "name"));
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    fetchAllOptions();
  }, []);

  const filterOptionsConfig: ColumnConfig[] = useMemo(
    () => [
      { key: "message_id", label: "Message ID", type: "text", filterKey: "message_id__icontains" },
      { key: "source_addr", label: "Sender ID", type: "text", filterKey: "source_addr__icontains" },
      { key: "effectiveSenderId", label: "Effective Sender ID", type: "text", filterKey: "effectiveSenderId__icontains" },
      { key: "senderTranslationAction", label: "Translation Action", type: "text", filterKey: "senderTranslationAction__icontains" },
      { key: "senderTranslationRuleId", label: "Translation Rule ID", type: "text", filterKey: "senderTranslationRuleId" },
      {
        key: "countryName",
        label: "Country",
        type: "text",
        options: countryOptions,
        filterKey: "country__name__icontains",
      },
      { key: "destination", label: "Destination", type: "text", filterKey: "destination__icontains" },
      {
        key: "clientName",
        label: "Client",
        type: "text",
        options: clientOptions,
        filterKey: "client__name__icontains",
      },
      {
        key: "vendorName",
        label: "Vendor",
        type: "text",
        options: vendorOptions,
        filterKey: "vendor__profileName__icontains",
      },
      {
        key: "smppName",
        label: "SMPP",
        type: "text",
        options: smppOptions,
        filterKey: "smpp__smppHost__icontains",
      },
      { key: "systemId", label: "System ID", type: "text", filterKey: "systemId__icontains" },
      { key: "status", label: "Status", type: "text", options: statusOptions, filterKey: "status__icontains" },
      { key: "failure_reason", label: "Failure Reason", type: "text", filterKey: "failure_reason__icontains" },
      {
        key: "encoding",
        label: "Encoding",
        type: "text",
        options: encodingOptions,
        isSearchable: false,
      },
      { key: "segmentNumber", label: "Segment Number", type: "text", isSearchable: false },
      { key: "characterCount", label: "Character Count", type: "text", isSearchable: false },

      { key: "createdAt", label: "Created At (Exact)", tableLabel: "Created At", type: "date", filterKey: "createdAt" },
      { key: "createdAt__gt_lt", label: "Created At (After / Before)", type: "date_gt_lt", filterKey: "createdAt", isSearchOnly: true },

      { key: "queued_at", label: "Queued At (Exact)", tableLabel: "Queued At", type: "date", filterKey: "queued_at" },
      { key: "queued_at__gt_lt", label: "Queued At (After / Before)", type: "date_gt_lt", filterKey: "queued_at", isSearchOnly: true },

      { key: "submitted_at", label: "Submitted At (Exact)", tableLabel: "Submitted At", type: "date", filterKey: "submitted_at" },
      { key: "submitted_at__gt_lt", label: "Submitted At (After / Before)", type: "date_gt_lt", filterKey: "submitted_at", isSearchOnly: true },

      { key: "sent_at", label: "Sent At (Exact)", tableLabel: "Sent At", type: "date", filterKey: "sent_at" },
      { key: "sent_at__gt_lt", label: "Sent At (After / Before)", type: "date_gt_lt", filterKey: "sent_at", isSearchOnly: true },

      { key: "delivered_at", label: "Delivered At (Exact)", tableLabel: "Delivered At", type: "date", filterKey: "delivered_at" },
      { key: "delivered_at__gt_lt", label: "Delivered At (After / Before)", type: "date_gt_lt", filterKey: "delivered_at", isSearchOnly: true },

      { key: "failed_at", label: "Failed At (Exact)", tableLabel: "Failed At", type: "date", filterKey: "failed_at" },
      { key: "failed_at__gt_lt", label: "Failed At (After / Before)", type: "date_gt_lt", filterKey: "failed_at", isSearchOnly: true },
    ],
    [clientOptions, vendorOptions, smppOptions, countryOptions],
  );

  const searchableColumns = filterOptionsConfig.filter((col) => col.isSearchable !== false);

  const tableColumnsConfig: ColumnConfig[] = useMemo(
    () => [
      {
        key: "message_id",
        label: "Message ID",
        type: "text",
        render: (log: any) => (
          <span className="font-mono text-xs text-primary">
            {log.message_id}
          </span>
        ),
      },
      {
        key: "source_addr",
        label: "Sender ID",
        type: "text",
        render: (log: any) => (
          <span className="text-sm">
            {log.source_addr}
          </span>
        ),
      },
      {
        key: "effectiveSenderId",
        label: "Effective Sender ID",
        type: "text",
        render: (log: any) => (
          <span className="text-sm">
            {log.effectiveSenderId || "-"}
          </span>
        ),
      },
      {
        key: "senderTranslationAction",
        label: "Translation Action",
        type: "text",
        render: (log: any) => (
          <span className="text-sm">
            {log.senderTranslationAction || "-"}
          </span>
        ),
      },
      {
        key: "senderTranslationRuleId",
        label: "Translation Rule ID",
        type: "text",
        render: (log: any) => (
          <span className="text-sm">
            {log.senderTranslationRuleId || "-"}
          </span>
        ),
      },
      {
        key: "countryName",
        label: "Country",
        type: "text",
        render: (log: any) => {
          const match = countryOptions.find((opt) => opt.label === log.countryName);
          return (
            <div className="flex items-center gap-1.5 text-sm">
              {match?.icon}
              <span>{log.countryName}</span>
            </div>
          );
        },
      },
      {
        key: "destination",
        label: "Destination",
        type: "text",
        render: (log: any) => (
          <span className="text-sm font-medium text-text-primary dark:text-white">
            {log.destination}
          </span>
        ),
      },
      {
        key: "text",
        label: "Text",
        type: "text",
        render: (log: any) => (
          <div
            className="max-w-xs truncate text-sm text-text-secondary cursor-pointer hover:text-primary transition-colors"
            title="Click to view full message"
            onClick={(e) => {
              e.stopPropagation();
              setViewLog(log);
              setIsModalOpen(true);
            }}
          >
            {log.text}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        render: (log: any) => <StatusBadge status={log.status} />,
      },
      { key: "encoding", label: "Encoding", type: "text" },
      { key: "segmentNumber", label: "Segment", type: "text" },
      { key: "characterCount", label: "Chars", type: "text" },
      { key: "clientName", label: "Client", type: "text" },
      { key: "vendorName", label: "Vendor", type: "text" },
      { key: "smppName", label: "SMPP", type: "text" },
      { key: "systemId", label: "System ID", type: "text" },
      { key: "failure_reason", label: "Failure Reason", type: "text" },
      {
        key: "createdAt",
        label: "Created At",
        type: "date",
        render: (log: any) => (
          <span>
            {log.createdAt ? formatDateTime(log.createdAt) : "-"}
          </span>
        ),
      },
      {
        key: "queued_at",
        label: "Queued At",
        type: "date",
        render: (log: any) => (
          <span>
            {log.queued_at ? formatDateTime(log.queued_at) : "-"}
          </span>
        ),
      },
      {
        key: "submitted_at",
        label: "Submitted At",
        type: "date",
        render: (log: any) => (
          <span>
            {log.submitted_at ? formatDateTime(log.submitted_at) : "-"}
          </span>
        ),
      },
      {
        key: "sent_at",
        label: "Sent At",
        type: "date",
        render: (log: any) => (
          <span>
            {(log as any).sent_at ? formatDateTime((log as any).sent_at) : "-"}
          </span>
        ),
      },
      {
        key: "delivered_at",
        label: "Delivered At",
        type: "date",
        render: (log: any) => (
          <span>
            {log.delivered_at ? formatDateTime(log.delivered_at) : "-"}
          </span>
        ),
      },
      {
        key: "failed_at",
        label: "Failed At",
        type: "date",
        render: (log: any) => (
          <span>
            {log.failed_at ? formatDateTime(log.failed_at) : "-"}
          </span>
        ),
      },
    ],
    [countryOptions],
  );

  useEffect(() => {
    localStorage.setItem("msg_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  const visibleTableFields = tableColumns
    .map((key) => tableColumnsConfig.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const fetchLogs = async (
    overrideParams?: Record<string, any>,
    page: number = 1,
    append: boolean = false,
    silent: boolean = false,
  ) => {
    if (silent && (isLoading || isFetchingMore)) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (!silent) {
      if (append) setIsFetchingMore(true);
      else setIsLoading(true);
    }

    try {
      const currentSearchParams: Record<string, any> = {};
      const sourceFilters = overrideParams || filterValues;

      searchColumns.forEach((key) => {
        const value = sourceFilters[key];
        if (value) {
          const colDef = filterOptionsConfig.find((c) => c.key === key);

          if (colDef?.options) {
            const selectedOption = colDef.options.find((opt) => opt.value === value);
            currentSearchParams[colDef.filterKey || key] = selectedOption
              ? selectedOption.value
              : value;
          } else if (colDef?.type === "date") {
            const rawKey = colDef.filterKey || key;
            const baseKey = rawKey.replace(/__exact$/, "").replace(/__range$/, "");
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
          } else if (colDef?.type === "date_gt_lt") {
            const rawKey = colDef.filterKey || key;
            const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "").replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt && gt.trim() !== "") {
              currentSearchParams[`${baseKey}__gte`] = gt.includes("T") ? gt : `${gt}T00:00:00`;
            }
            if (lt && lt.trim() !== "") {
              currentSearchParams[`${baseKey}__lte`] = lt.includes("T") ? lt : `${lt}T23:59:59`;
            }
          } else if (colDef?.type === "text") {
            const filterKey = colDef.filterKey || `${key}__icontains`;
            currentSearchParams[filterKey] = value;
          } else {
            currentSearchParams[colDef?.filterKey || key] = value;
          }
        }
      });

      const response = await getMessageLogsApi(
        moduleName,
        page,
        BATCH_SIZE,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setLogs((prev) => (append ? [...prev, ...response.results] : response.results));
        setTotalItems(response.count);
        setHasMore(Boolean(response.next));
        setLoadedPage(page);
      } else {
        if (!append) setLogs([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error(error);
        if (!silent) toast.error("Failed to fetch message logs.");
      }
    } finally {
      if (abortControllerRef.current === newController) {
        if (!silent) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    }
  };

  useEffect(() => {
    fetchLogs(undefined, 1, false);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [moduleName, searchColumns]);

  useEffect(() => {
    const liveUpdateTimer = setInterval(() => {
      const isFiltering = Object.values(filterValues).some((val) => val !== "");

      const currentGlobalPath = window.location.pathname === "/" ? "/dashboard" : window.location.pathname;
      const isTabActive = currentGlobalPath === location.pathname || currentGlobalPath.startsWith(`${location.pathname}/`);

      if (isAtTopRef.current && !isFiltering && isTabActive) {
        fetchLogs(undefined, 1, false, true);
      }
    }, 5000);

    return () => clearInterval(liveUpdateTimer);
  }, [filterValues, isLoading, isFetchingMore, location.pathname]);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar",
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      isAtTopRef.current = scrollEl.scrollTop === 0;

      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchLogs(filterValues, loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, logs.length]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchLogs(undefined, 1, false);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    fetchLogs({}, 1, false);
  };

  const handleContextMenu = (e: React.MouseEvent, log: MessageLogData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowLog(log);
  };

  const handleOpenRouteModal = async (log: MessageLogData) => {
    const clientName = log.clientName || "";
    const vendorName = log.vendorName || "";
    const targetName = clientName || vendorName;
    const countryName = log.countryName || "";

    setActiveCountryName(countryName || null);

    if (!targetName) {
      toast.error("No Client or Vendor associated with this route.");
      return;
    }

    try {
      let groupRes: any = await getGroupedCustomRoutesApi("customRoute", 1, 10, { name: targetName });
      let groupList = groupRes?.results || (Array.isArray(groupRes) ? groupRes : []);

      if (groupList.length === 0) {
        groupRes = await getGroupedCustomRoutesApi("customRoute", 1, 10, { name__icontains: targetName });
        groupList = groupRes?.results || (Array.isArray(groupRes) ? groupRes : []);
      }

      if (groupList.length > 0) {
        setActiveRouteGroup(groupList[0].name);
        setActiveRouteGroupId(groupList[0].id);
        setIsRouteModalOpen(true);
        return;
      }

      if (clientName) {
        const clientRes: any = await getClientsApi("client", 1, 10, { name__icontains: clientName });
        const clientList = clientRes?.results || (Array.isArray(clientRes) ? clientRes : []);
        if (clientList.length > 0) {
          const c = clientList[0];
          const matchedRouteGroup = c.routeGroup || c.customRoute || c.routeGroupName || c.customRouteName;
          if (typeof matchedRouteGroup === "number") {
            const rgRes: any = await getGroupedCustomRoutesApi("customRoute", 1, 1, { id: matchedRouteGroup });
            const rgList = rgRes?.results || (Array.isArray(rgRes) ? rgRes : []);
            if (rgList.length > 0) {
              setActiveRouteGroup(rgList[0].name);
              setActiveRouteGroupId(rgList[0].id);
              setIsRouteModalOpen(true);
              return;
            }
          } else if (typeof matchedRouteGroup === "string") {
            setActiveRouteGroup(matchedRouteGroup);
            setActiveRouteGroupId(null);
            setIsRouteModalOpen(true);
            return;
          }
        }
      }

      if (vendorName) {
        const subRouteRes: any = await getCustomRoutesApi("customRoute", 1, 10, {
          terminatingVendorProfileName__icontains: vendorName,
        });
        const subList = subRouteRes?.results || (Array.isArray(subRouteRes) ? subRouteRes : []);
        if (subList.length > 0 && subList[0].routeGroup) {
          setActiveRouteGroup(subList[0].routeGroupName || targetName);
          setActiveRouteGroupId(Number(subList[0].routeGroup));
          setIsRouteModalOpen(true);
          return;
        }
      }

      setActiveRouteGroup(targetName);
      setActiveRouteGroupId(null);
      setIsRouteModalOpen(true);
    } catch (e) {
      console.error("Failed to resolve route group", e);
      setActiveRouteGroup(targetName);
      setActiveRouteGroupId(null);
      setIsRouteModalOpen(true);
    }
  };

  const connectedRouteTarget = selectedRowLog
    ? (selectedRowLog.clientName || selectedRowLog.vendorName)
    : null;

  const menuItems: ContextMenuItem[] = selectedRowLog ? [
    {
      label: "View Full Message",
      icon: <Eye size={16} />,
      onClick: () => {
        setViewLog(selectedRowLog);
        setIsModalOpen(true);
      },
    },
    ...(connectedRouteTarget ? [
      {
        label: `View Custom Route (${connectedRouteTarget})`,
        icon: <Route size={16} />,
        onClick: () => handleOpenRouteModal(selectedRowLog),
      },
    ] : []),
    {
      label: "Download CSV Report",
      icon: <Download size={16} />,
      onClick: () => {
        setIsDownloadModalOpen(true);
      },
    },
  ] : [];

  const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll("aside a.active, nav a.active");
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = activeItem?.innerText?.split("\n")[0].trim() || "Module";

        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);

      hasLoggedOpening.current = true;
    }
  }, []);

  const tableHeaders = ["S.N", ...visibleTableFields.map((col) => col.label)];
  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  return (
    <div className="w-full" onClick={() => setContextMenuPos(null)}>
      <div className="mb-2.5 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Live Report
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableColumnsConfig}
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
              columns={searchableColumns}
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
          <span className="text-text-primary dark:text-white">Report</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");

          if (col.options) {
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
          }
          if (col.type === "date") {
            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                showTimeSelect={true}
                selected={
                  filterValues[col.key] ? new Date(filterValues[col.key]) : null
                }
                onChange={(val: Date | null) =>
                  handleFilterChange(col.key, val ? formatLocalDateTime(val) : "")
                }
                placeholder="Select Date & Time"
              />
            );
          }
          if (col.type === "date_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (> After)`}
                  showTimeSelect={true}
                  selected={gtStr ? new Date(gtStr) : null}
                  onChange={(val: Date | null) => {
                    const newGt = val ? formatLocalDateTime(val) : "";
                    const currentLt = ltStr || "";
                    handleFilterChange(
                      col.key,
                      newGt || currentLt ? `${newGt},${currentLt}` : "",
                    );
                  }}
                  placeholder="Select Date & Time"
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  showTimeSelect={true}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDateTime(val) : "";
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
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <div ref={tableWrapperRef}>
        <DataTable
          serverSide={true}
          data={logs}
          totalItems={totalItems}
          rowsPerPage={BATCH_SIZE}
          headers={tableHeaders}
          isLoading={isLoading}
          showCountOnly={true}
          density="compact"
          onReorderColumns={(fromIdx, toIdx) => {
            setTableColumns((prev) => {
              const validKeys = prev.filter(key => tableColumnsConfig.some(c => c.key === key));
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
              className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors cursor-context-menu"
            >
              <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {index + 1}
              </td>
              {visibleTableFields.map((col) => {
                const cellData = (log as any)[col.key];
                if (col.render) {
                  return (
                    <td
                      key={col.key}
                      className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                    >
                      {col.render(log)}
                    </td>
                  );
                }
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

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <MessageReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        viewLog={viewLog}
      />

      <SubRouteTableModal
        isOpen={isRouteModalOpen}
        onClose={() => {
          setIsRouteModalOpen(false);
          setActiveRouteGroup(null);
          setActiveRouteGroupId(null);
          setActiveCountryName(null);
        }}
        routeGroup={activeRouteGroup}
        routeGroupId={activeRouteGroupId}
        initialCountryName={activeCountryName}
        moduleName="customRoute"
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <DownloadReportModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        moduleName={moduleName}
      />
    </div>
  );
};

export default MessageReport;