import React, { useState, useEffect, useRef } from "react";
import { Home } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getRejectedSMSLogApi,
  type RejectedSMSLogData,
} from "../../api/reportApi/rejectedSMSLogApi";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";

import { actionHelper } from "../../helper/action";
import { RejectedSMSLogModal } from "../../components/modals/Report/RejectedSMSLogModal";

interface Option { label: string; value: string; }
interface ColumnConfig extends FilterColumn { render?: (data: any) => React.ReactNode; options?: Option[]; filterKey?: string; isSearchable?: boolean; isSearchOnly?: boolean; tableLabel?: string; }



const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SEARCH_COLUMNS = ["client__name", "system_id", "destination_addr", "message_id"];
const DEFAULT_TABLE_COLUMNS = ["id", "timestamp", "client__name", "system_id", "destination_addr", "message_id", "reason", "required_amount", "available_credit"];

const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const RejectedSMSLog: React.FC = () => {
  const [events, setEvents] = useState<RejectedSMSLogData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<RejectedSMSLogData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLog, setViewLog] = useState<RejectedSMSLogData | null>(null); const [searchColumns, setSearchColumns] = useState<string[]>(DEFAULT_SEARCH_COLUMNS);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("rejected_sms_columns");
    try { return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS; } catch (e) { return DEFAULT_TABLE_COLUMNS; }
  });

  useEffect(() => { localStorage.setItem("rejected_sms_columns", JSON.stringify(tableColumns)); }, [tableColumns]);

  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const routeName = pathParts[pathParts.length - 1] || "dlr-event";

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const allColumns: ColumnConfig[] = [
    { key: "id", label: "Log ID", type: "text", isSearchable: false },
    { key: "client__name", label: "Client", tableLabel: "Client", type: "text", filterKey: "client__name__icontains", render: (log) => log.client_name || "-" },
    { key: "system_id", label: "System ID", type: "text", filterKey: "system_id__icontains" },
    { key: "source_addr", label: "Source Addr", type: "text", filterKey: "source_addr__icontains" },
    { key: "destination_addr", label: "Destination", type: "text", filterKey: "destination_addr__icontains" },
    { key: "message_id", label: "Message ID", type: "text", filterKey: "message_id__icontains" },
    { key: "reason", label: "Reason", type: "text", filterKey: "reason__icontains" },
    { key: "required_amount", label: "Required Amount", type: "text", isSearchable: false },
    { key: "available_credit", label: "Available Credit", type: "text", isSearchable: false },
    { key: "used_credit", label: "Used Credit", type: "text", isSearchable: false },
    { key: "smpp_command_status", label: "Status Code", type: "text", isSearchable: false },
    { key: "timestamp", label: "Timestamp (Single Day)", tableLabel: "Timestamp", type: "date", filterKey: "timestamp__range", render: (data: any) => data.timestamp ? new Date(data.timestamp).toLocaleString() : "-" },
    { key: "timestamp__range", label: "Timestamp (Range)", type: "date_range", filterKey: "timestamp__range", isSearchOnly: true },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns.filter((c) => !c.isSearchOnly).map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

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
        const baseKey = colDef?.filterKey || key;

        if (colDef?.options) {
          const selectedOption = colDef.options.find((opt) => opt.value === value);
          cleanParams[baseKey] = selectedOption ? selectedOption.value : value;
        } else {
          cleanParams[baseKey] = value;
        }
      });

      const response: any = await getRejectedSMSLogApi(routeName, page, BATCH_SIZE, cleanParams);
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

  const handleContextMenu = (e: React.MouseEvent, item: RejectedSMSLogData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow ? [
    {
      label: "View Details",
      onClick: () => {
        setViewLog(selectedRow);
        setIsModalOpen(true);
      },
    },
  ] : [];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => { actionHelper("Rejected SMS Log", `Opened Rejected SMS Log Report`, false); }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Rejected SMS Log</h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns}
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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span><span className="text-text-primary dark:text-white">Rejected SMS Log</span>
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
              allowCustomValue={true} />
            );
          }
          if (col.type === "date") {
            const rawVal = filterValues[col.key] || "";
            const datePart = rawVal.split("T")[0];

            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                selected={datePart ? new Date(datePart) : null}
                onChange={(val: Date | null) => {
                  if (val) {
                    const formatted = formatLocalDate(val);
                    setFilterValues(p => ({ ...p, [col.key]: `${formatted}T00:00:00,${formatted}T23:59:59` }));
                  } else {
                    setFilterValues(p => ({ ...p, [col.key]: "" }));
                  }
                }}
              />
            );
          }
          if (col.type === "date_range") {
            const [startRange, endRange] = (filterValues[col.key] || "").split(",");
            const startStr = startRange ? startRange.split("T")[0] : "";
            const endStr = endRange ? endRange.split("T")[0] : "";

            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (From)`}
                  selected={startStr ? new Date(startStr) : null}
                  onChange={(val: Date | null) => {
                    const newStart = val ? formatLocalDate(val) : "";
                    const currentEnd = endStr || "";
                    if (newStart || currentEnd) {
                      const startVal = newStart ? `${newStart}T00:00:00` : "";
                      const endVal = currentEnd ? `${currentEnd}T23:59:59` : "";
                      setFilterValues(p => ({ ...p, [col.key]: `${startVal},${endVal}` }));
                    } else {
                      setFilterValues(p => ({ ...p, [col.key]: "" }));
                    }
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (To)`}
                  selected={endStr ? new Date(endStr) : null}
                  onChange={(val: Date | null) => {
                    const newEnd = val ? formatLocalDate(val) : "";
                    const currentStart = startStr || "";
                    if (currentStart || newEnd) {
                      const startVal = currentStart ? `${currentStart}T00:00:00` : "";
                      const endVal = newEnd ? `${newEnd}T23:59:59` : "";
                      setFilterValues(p => ({ ...p, [col.key]: `${startVal},${endVal}` }));
                    } else {
                      setFilterValues(p => ({ ...p, [col.key]: "" }));
                    }
                  }}
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

      <RejectedSMSLogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setViewLog(null);
        }}
        viewLog={viewLog}
      />
    </div>
  );
};

export default RejectedSMSLog;