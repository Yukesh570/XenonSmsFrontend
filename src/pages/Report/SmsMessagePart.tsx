import React, { useState, useEffect, useRef } from "react";
import { Home, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getSmsMessagePartApi,
  type SmsMessagePartData,
} from "../../api/reportApi/smsMessagePartApi";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { SmsMessagePartModal } from "../../components/modals/Report/SmsMessagePartModal";
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

const DLR_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PENDING: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B", label: "Pending" },
  QUEUED: { bg: "#F3F4F6", text: "#374151", border: "#6B7280", label: "Queued" },
  SUBMITTING: { bg: "#F3E8FF", text: "#6B21A8", border: "#9333EA", label: "Submitting" },
  SENT_TO_VENDOR: { bg: "#E0E7FF", text: "#3730A3", border: "#4F46E5", label: "Sent to Vendor" },
  UNCERTAIN: { bg: "#FEF9C3", text: "#854D0E", border: "#EAB308", label: "Uncertain" },
  DELIVERED: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Delivered" },
  SUBMITTED: { bg: "#DBEAFE", text: "#1E40AF", border: "#2563EB", label: "Submitted" },
  FAILED: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626", label: "Failed" },
  REJECTED: { bg: "#FEE2E2", text: "#7F1D1D", border: "#991B1B", label: "Rejected" },
  UNDELIVERED: { bg: "#FFEDD5", text: "#9A3412", border: "#EA580C", label: "Undelivered" },
  EXPIRED: { bg: "#FEF3C7", text: "#78350F", border: "#92400E", label: "Expired" },
  UNKNOWN: { bg: "#E2E8F0", text: "#334155", border: "#475569", label: "Unknown" },
};

const statusOptions: Option[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Queued", value: "QUEUED" },
  { label: "Submitting", value: "SUBMITTING" },
  { label: "Sent to Vendor", value: "SENT_TO_VENDOR" },
  { label: "Uncertain", value: "UNCERTAIN" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Failed", value: "FAILED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Undelivered", value: "UNDELIVERED" },
  { label: "Expired", value: "EXPIRED" },
];

const booleanOptions: Option[] = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const renderStatusBadge = (status?: string | number) => {
  if (status === null || status === undefined || status === "") return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">-</span>;

  const statusStr = String(status);
  const statusKey = statusStr.toUpperCase();
  const config = DLR_STATUS_COLORS[statusKey] || DLR_STATUS_COLORS.UNKNOWN;

  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      {config.label || statusStr}
    </span>
  );
};

const renderBooleanBadge = (value?: boolean) => {
  if (value === undefined || value === null) return "-";
  const statusKey = value ? "DELIVERED" : "PENDING";
  const labelText = value ? "Yes" : "No";
  return <StatusBadge status={statusKey} customText={labelText} />;
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

const DEFAULT_SEARCH_COLUMNS = ["parent_message_destination", "submit_status", "vendor_msg_id"];
const DEFAULT_TABLE_COLUMNS = ["id", "client_msg_id", "vendor_msg_id", "parent_message_destination", "part_no", "part_total", "submit_status", "created_at"];

const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const SmsMessagePart: React.FC = () => {
  const [segments, setSegments] = useState<SmsMessagePartData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<SmsMessagePartData | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLog, setViewLog] = useState<SmsMessagePartData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("sms_segment_search_columns_v4");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "sms_segment_search_columns_v4",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("sms_segment_columns_v4");
    try { return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS; } catch (e) { return DEFAULT_TABLE_COLUMNS; }
  });

  useEffect(() => { localStorage.setItem("sms_segment_columns_v4", JSON.stringify(tableColumns)); }, [tableColumns]);

  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const routeName = pathParts[pathParts.length - 1] || "smsMessagePart";

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const allColumns: ColumnConfig[] = [
    { key: "client_msg_id", label: "Message ID", type: "text", isSearchable: false },
    { key: "parent_message_destination", label: "Destination", type: "text", filterKey: "message__destination__icontains" },
    {
      key: "text",
      label: "Text",
      type: "text",
      isSearchable: false,
      render: (data: any) => {
        if (!data.text) return "-";
        const strippedContent = data.text.replace(/<[^>]*>/g, "");
        const limit = 50;
        return strippedContent.length > limit ? (
          <span title={strippedContent}>{strippedContent.substring(0, limit)}...</span>
        ) : (
          strippedContent
        );
      }
    },
    { key: "part_no", label: "Part No", type: "text", filterKey: "part_no__icontains" },
    { key: "part_total", label: "Part Total", type: "text", filterKey: "part_total__icontains" },
    { key: "udh_ref", label: "UDH Ref", type: "text", filterKey: "udh_ref__icontains" },
    { key: "udh_hex", label: "UDH Hex", type: "text", filterKey: "udh_hex__icontains" },
    { key: "esm_class", label: "ESM Class", type: "text", isSearchable: false },
    {
      key: "submit_status",
      label: "Submit Status",
      type: "text",
      options: statusOptions,
      filterKey: "submit_status__icontains",
      render: (log) => renderStatusBadge(log.submit_status)
    },
    {
      key: "vendor_submit_status",
      label: "Vendor Submit Status",
      type: "text",
      options: statusOptions,
      filterKey: "vendor_submit_status__icontains",
      isSearchOnly: true
    },
    { key: "vendor_msg_id", label: "Vendor Msg ID", type: "text", filterKey: "vendor_msg_id__icontains" },
    { key: "submit_attempts", label: "Submit Attempts", type: "text", filterKey: "submit_attempts__icontains" },
    {
      key: "clientDlrPushed",
      label: "Client DLR Pushed",
      type: "text",
      options: booleanOptions,
      filterKey: "clientDlrPushed__icontains",
      render: (log) => renderBooleanBadge(log.clientDlrPushed)
    },
    {
      key: "clientDlrSuppressed",
      label: "Client DLR Suppressed",
      type: "text",
      options: booleanOptions,
      filterKey: "clientDlrSuppressed__icontains",
      render: (log) => renderBooleanBadge(log.clientDlrSuppressed)
    },
    {
      key: "clientDlrSuppressionReason",
      label: "Client DLR Suppression Reason",
      type: "text",
      isSearchable: false
    },
    {
      key: "clientDlrSuppressedAt",
      label: "Client DLR Suppressed At (Exact)",
      tableLabel: "Client DLR Suppressed At",
      type: "date",
      filterKey: "clientDlrSuppressedAt",
      render: (data: any) => data.clientDlrSuppressedAt ? formatDateTime(data.clientDlrSuppressedAt) : "-"
    },
    {
      key: "clientDlrSuppressedAt__gt_lt",
      label: "Client DLR Suppressed At (After / Before)",
      type: "date_gt_lt",
      filterKey: "clientDlrSuppressedAt",
      isSearchOnly: true
    },
    {
      key: "submitted_at",
      label: "Submitted At (Exact)",
      tableLabel: "Submitted At",
      type: "date",
      filterKey: "submitted_at",
      render: (data: any) => data.submitted_at ? formatDateTime(data.submitted_at) : "-"
    },
    {
      key: "submitted_at__gt_lt",
      label: "Submitted At (After / Before)",
      type: "date_gt_lt",
      filterKey: "submitted_at",
      isSearchOnly: true
    },
    {
      key: "sent_at",
      label: "Sent At (Exact)",
      tableLabel: "Sent At",
      type: "date",
      filterKey: "sent_at",
      render: (data: any) => data.sent_at ? formatDateTime(data.sent_at) : "-"
    },
    {
      key: "sent_at__gt_lt",
      label: "Sent At (After / Before)",
      type: "date_gt_lt",
      filterKey: "sent_at",
      isSearchOnly: true
    },
    {
      key: "delivered_at",
      label: "Delivered At (Exact)",
      tableLabel: "Delivered At",
      type: "date",
      filterKey: "delivered_at",
      render: (data: any) => data.delivered_at ? formatDateTime(data.delivered_at) : "-"
    },
    {
      key: "delivered_at__gt_lt",
      label: "Delivered At (After / Before)",
      type: "date_gt_lt",
      filterKey: "delivered_at",
      isSearchOnly: true
    },
    {
      key: "failed_at",
      label: "Failed At (Exact)",
      tableLabel: "Failed At",
      type: "date",
      filterKey: "failed_at",
      render: (data: any) => data.failed_at ? formatDateTime(data.failed_at) : "-"
    },
    {
      key: "failed_at__gt_lt",
      label: "Failed At (After / Before)",
      type: "date_gt_lt",
      filterKey: "failed_at",
      isSearchOnly: true
    },
    {
      key: "created_at",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "created_at",
      render: (data: any) => data.created_at ? formatDateTime(data.created_at) : "-"
    },
    {
      key: "created_at__gt_lt",
      label: "Created At (After / Before)",
      type: "date_gt_lt",
      filterKey: "created_at",
      isSearchOnly: true
    },
    {
      key: "updated_at",
      label: "Updated At (Exact)",
      tableLabel: "Updated At",
      type: "date",
      filterKey: "updated_at",
      render: (data: any) => data.updated_at ? formatDateTime(data.updated_at) : "-"
    },
    {
      key: "updated_at__gt_lt",
      label: "Updated At (After / Before)",
      type: "date_gt_lt",
      filterKey: "updated_at",
      isSearchOnly: true
    },
    {
      key: "last_submit_at",
      label: "Last Submit At (Exact)",
      tableLabel: "Last Submit At",
      type: "date",
      filterKey: "last_submit_at",
      render: (data: any) => data.last_submit_at ? formatDateTime(data.last_submit_at) : "-"
    },
    {
      key: "last_submit_at__gt_lt",
      label: "Last Submit At (After / Before)",
      type: "date_gt_lt",
      filterKey: "last_submit_at",
      isSearchOnly: true
    },
    { key: "failure_reason", label: "Failure Reason", type: "text", isSearchable: false },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns.filter((c) => !c.isSearchOnly).map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type as FilterColumnType }));

  const fetchSegments = async (
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
        if (value) {
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
          } else if (colDef?.type === "text" || colDef?.type === "number" || colDef?.type === "boolean") {
            const filterKey = colDef.filterKey || `${key}__icontains`;
            cleanParams[filterKey] = value;
          } else {
            cleanParams[colDef?.filterKey || key] = value;
          }
        }
      });

      const response: any = await getSmsMessagePartApi(routeName, page, BATCH_SIZE, cleanParams);
      if (response && response.results) {
        setSegments((prev) => (append ? [...prev, ...response.results] : response.results));
        setTotalItems(response.count);
        setHasMore(Boolean(response.next));
        setLoadedPage(page);
      } else {
        if (!append) setSegments([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error) {
      toast.error("Failed to fetch message segments.");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => { fetchSegments(undefined, 1, false); }, [searchColumns]);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar",
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchSegments(filterValues, loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, segments.length]);

  const handleContextMenu = (e: React.MouseEvent, item: SmsMessagePartData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow ? [
    { label: "View Segment Details", icon: <Eye size={16} />, onClick: () => { setViewLog(selectedRow); setIsModalOpen(true); } },
  ] : [];

  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => { actionHelper("Message Segments", `Opened SMS Message Parts Report`, false); }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Message Segments</h1>
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
          <span>/</span><span className="text-text-primary dark:text-white">Segments</span>
        </div>
      </div>

      <FilterCard onSearch={() => { fetchSegments(undefined, 1, false); }} onClear={() => { setFilterValues({}); fetchSegments({}, 1, false); }}>
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
          data={segments}
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
          renderRow={(segment, index) => (
            <tr
              key={segment.id || index}
              onContextMenu={(e) => handleContextMenu(e, segment)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
            >
              <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {index + 1}
              </td>
              {visibleTableFields.map((col) => {
                const rawValue = (segment as any)[col.key];
                const cellContent = col.render ? col.render(segment) : (rawValue ?? "-");
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

      <SmsMessagePartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        viewLog={viewLog}
      />
    </div>
  );
};

export default SmsMessagePart;