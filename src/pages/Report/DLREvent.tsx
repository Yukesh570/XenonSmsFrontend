import React, { useState, useEffect, useRef } from "react";
import { Home, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getDLREventApi,
  type DLREventData,
} from "../../api/reportApi/dlrEventApi";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { DLREventModal } from "../../components/modals/Report/DLREventModal";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";

interface Option {
  label: string;
  value: string;
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
  render?: (data: any) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchable?: boolean;
  isSearchOnly?: boolean;
  tableLabel?: string;
}

const statusOptions: Option[] = [
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Queued", value: "QUEUED" },
  { label: "Failed", value: "FAILED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Undelivered", value: "UNDELIVERED" },
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

const DEFAULT_SEARCH_COLUMNS = ["destination", "event_type", "vendorMessageId"];
const DEFAULT_TABLE_COLUMNS = ["id", "client_msg_id", "vendorMessageId", "event_type", "segment_number", "status_code", "received_at"];

const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const DLREvent: React.FC = () => {
  const [events, setEvents] = useState<DLREventData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<DLREventData | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLog, setViewLog] = useState<DLREventData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("dlr_event_search_columns_v3");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "dlr_event_search_columns_v3",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("dlr_event_columns_v3");
    try { return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS; } catch (e) { return DEFAULT_TABLE_COLUMNS; }
  });

  useEffect(() => { localStorage.setItem("dlr_event_columns_v3", JSON.stringify(tableColumns)); }, [tableColumns]);

  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const routeName = pathParts[pathParts.length - 1] || "dlr-event";

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const allColumns: ColumnConfig[] = [
    { key: "client_msg_id", label: "Message ID", type: "text", isSearchable: false, render: (data: any) => data.client_msg_id },
    { key: "destination", label: "Destination", type: "text", filterKey: "message__destination__icontains" },
    { key: "segment", label: "Segment ID", type: "text", isSearchable: false, render: (data: any) => data.segment || "-" },
    { key: "vendorMessageId", label: "Vendor Message ID", type: "text", filterKey: "vendorMessageId__icontains" },
    {
      key: "event_type",
      label: "Event Type",
      type: "text",
      options: statusOptions,
      filterKey: "event_type__icontains",
      render: (log) => <StatusBadge status={log.event_type} />
    },
    { key: "segment_number", label: "Segment Number", type: "text", filterKey: "segment_number__icontains" },
    { key: "status_code", label: "Status Code", type: "text", filterKey: "status_code__icontains" },
    { key: "status_description", label: "Status Description", type: "text", isSearchable: false },

    {
      key: "received_at",
      label: "Received At (Exact)",
      tableLabel: "Received At",
      type: "date",
      filterKey: "received_at",
      render: (data: any) => data.received_at ? formatDateTime(data.received_at) : "-"
    },
    {
      key: "received_at__gt_lt",
      label: "Received At (After / Before)",
      type: "date_gt_lt",
      filterKey: "received_at",
      isSearchOnly: true
    },

    { key: "raw_payload", label: "Raw Payload", type: "text", render: (data: any) => data.raw_payload ? "{...}" : "-", isSearchable: false },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns.filter((c) => !c.isSearchOnly).map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type as FilterColumnType }));

  const fetchEvents = async (
    filters: Record<string, string> | null = null,
    page: number = 1,
    append: boolean = false,
  ) => {
    if (append) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const activeFilters = filters || filterValues;
      const cleanParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (!value) return;
        const colDef = allColumns.find((c) => c.key === key);

        if (colDef?.options) {
          const selectedOption = colDef.options.find((opt) => opt.value === value);
          cleanParams[colDef.filterKey || key] = selectedOption ? selectedOption.value : value;
        } else if (colDef?.type === "date") {
          const rawKey = colDef.filterKey || key;
          const baseKey = rawKey.replace(/__exact$/, "").replace(/__range$/, "");
          if (value.includes("T")) {
            const [datePart, timePart] = value.split("T");
            if (timePart === "00:00:00") {
              cleanParams[`${baseKey}__range`] = `${datePart}T00:00:00,${datePart}T23:59:59`;
            } else {
              const [hh, mm] = timePart.split(":");
              cleanParams[`${baseKey}__range`] = `${datePart}T${hh}:${mm}:00,${datePart}T${hh}:${mm}:59`;
            }
          } else {
            cleanParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          }
        } else if (colDef?.type === "date_gt_lt") {
          const rawKey = colDef.filterKey || key;
          const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "").replace(/__range$/, "");
          const [gt, lt] = value.split(",");
          if (gt && gt.trim() !== "") {
            cleanParams[`${baseKey}__gte`] = gt.includes("T") ? gt : `${gt}T00:00:00`;
          }
          if (lt && lt.trim() !== "") {
            cleanParams[`${baseKey}__lte`] = lt.includes("T") ? lt : `${lt}T23:59:59`;
          }
        } else if (colDef?.type === "text" || colDef?.type === "number") {
          const filterKey = colDef.filterKey || `${key}__icontains`;
          cleanParams[filterKey] = value;
        } else {
          cleanParams[colDef?.filterKey || key] = value;
        }
      });

      const response: any = await getDLREventApi(routeName, page, BATCH_SIZE, cleanParams);
      if (response && response.results) {
        setEvents((prev) => (append ? [...prev, ...response.results] : response.results));
        setTotalItems(response.count);
        setHasMore(Boolean(response.next));
        setLoadedPage(page);
      } else {
        if (!append) setEvents([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error) {
      toast.error("Failed to fetch DLR events.");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => { fetchEvents(undefined, 1, false); }, [searchColumns]);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar",
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchEvents(filterValues, loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, events.length]);

  const handleContextMenu = (e: React.MouseEvent, item: DLREventData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => { setViewLog(selectedRow); setIsModalOpen(true); } },
  ] : [];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => { actionHelper("DLR Events", `Opened DLR Events Report`, false); }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">DLR Events</h1>
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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span><span className="text-text-primary dark:text-white">DLR Events</span>
        </div>
      </div>

      <FilterCard onSearch={() => { fetchEvents(undefined, 1, false); }} onClear={() => { setFilterValues({}); fetchEvents({}, 1, false); }}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");

          if (col.options) {
            return (
              <Select
                key={col.key}
                label={baseLabel}
                value={filterValues[col.key] || ""}
                onChange={(val) => setFilterValues(p => ({ ...p, [col.key]: val }))}
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
                selected={filterValues[col.key] ? new Date(filterValues[col.key]) : null}
                onChange={(val: Date | null) =>
                  setFilterValues((p) => ({
                    ...p,
                    [col.key]: val ? formatLocalDateTime(val) : "",
                  }))
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
                    setFilterValues((p) => ({
                      ...p,
                      [col.key]: newGt || currentLt ? `${newGt},${currentLt}` : "",
                    }));
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
                    setFilterValues((p) => ({
                      ...p,
                      [col.key]: currentGt || newLt ? `${currentGt},${newLt}` : "",
                    }));
                  }}
                  placeholder="Select Date & Time"
                />
              </React.Fragment>
            );
          }
          return (
            <Input
              key={col.key}
              label={`Search ${baseLabel}`}
              value={filterValues[col.key] || ""}
              onChange={(e) => setFilterValues(p => ({ ...p, [col.key]: e.target.value }))}
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <div ref={tableWrapperRef}>
        <DataTable
          serverSide={true}
          data={events}
          totalItems={totalItems}
          rowsPerPage={BATCH_SIZE}
          headers={["S.N", ...visibleTableFields.map(c => c.tableLabel || c.label)]}
          isLoading={isLoading}
          showCountOnly={true}
          density="compact"
          onReorderColumns={(fromIdx, toIdx) => {
            setTableColumns((prev) => {
              const validKeys = prev.filter(key => allColumns.some(c => c.key === key));
            const next = [...validKeys];
              const [moved] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, moved);
              return next;
            });
          }}
          renderRow={(event, index) => (
            <tr
              key={event.id || index}
              onContextMenu={(e) => handleContextMenu(e, event)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
            >
              <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {index + 1}
              </td>
              {visibleTableFields.map((col) => {
                const rawValue = (event as any)[col.key];
                const cellContent = col.render ? col.render(event) : (rawValue || "-");
                return (
                  <td key={col.key} className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap`}>
                    {cellContent}
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

      <DLREventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        viewLog={viewLog}
      />
    </div>
  );
};

export default DLREvent;