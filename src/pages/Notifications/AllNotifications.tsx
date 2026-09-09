import React, { useState, useEffect, useRef } from "react";
import { Home, Trash } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getNotificationApi,
  deleteNotificationApi,
  type NotificationData,
} from "../../api/userActionApi/notificationApi";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../components/modals/DeleteModal";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";

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
  render?: (notification: any) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SEARCH_COLUMNS = ["title"];
const DEFAULT_TABLE_COLUMNS = ["title", "description", "createdAt"];

const AllNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<NotificationData | null>(null);

  // --- Dynamic Search & Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("allnotifications_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "allnotifications_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Column Order State & Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("allnotifications_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("allnotifications_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Notifications", "Opened All Notifications Module", false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  // Column definitions for dynamic rendering, filtering, & visibility
  const allColumns: ColumnConfig[] = [
    {
      key: "title",
      label: "Title",
      type: "text",
      filterKey: "title__icontains",
      render: (n) => (
        <span className="font-medium text-text-primary dark:text-white">
          {n.title || "-"}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      filterKey: "description__icontains",
      render: (n) => (
        <span className="max-w-xl truncate block">
          {n.description || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date (Exact)",
      tableLabel: "Date",
      type: "date",
      filterKey: "createdAt",
      render: (n) => (n.createdAt ? formatDateTime(n.createdAt) : "-"),
    },
    {
      key: "createdAt__gt_lt",
      label: "Date (After / Before)",
      type: "date_gt_lt",
      filterKey: "createdAt",
      isSearchOnly: true,
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const headers = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type as FilterColumnType,
    }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchNotifications = async (overrideParams?: Record<string, string>) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    setIsLoading(true);

    try {
      const activeFilters = overrideParams || filterValues;
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
            const baseKey = rawKey.replace(/__exact$/, "").replace(/__range$/, "");
            currentSearchParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          } else if (columnDef?.type === "date_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "").replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = `${gt}T00:00:00`;
            if (lt) currentSearchParams[`${baseKey}__lte`] = `${lt}T23:59:59`;
          } else if (columnDef?.type === "number_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = gt;
            if (lt) currentSearchParams[`${baseKey}__lte`] = lt;
          } else if (columnDef?.type === "text" || columnDef?.type === "boolean" || columnDef?.type === "number") {
            const filterKey = columnDef.filterKey || `${key}__icontains`;
            currentSearchParams[filterKey] = value;
          } else {
            currentSearchParams[columnDef?.filterKey || key] = value;
          }
        }
      });

      if (sortConfig) {
        const columnDef = allColumns.find((c: any) => c.key === sortConfig.key);
        let sortKey = sortConfig.key;
        if (columnDef && columnDef.filterKey) {
          sortKey = columnDef.filterKey.replace(/__(icontains|exact|range|gt_lt|gte|lte)$/, "");
        }
        currentSearchParams["ordering"] = sortConfig.direction === "desc" ? `-${sortKey}` : sortKey;
      }

      const response: any = await getNotificationApi(
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setNotifications(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setNotifications(response);
        setTotalItems(response.length);
      } else {
        setNotifications([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Fetch error:", error);
        toast.error("Failed to fetch notifications.");
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchNotifications();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchNotifications({});
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
    if (colIndex >= 0 && colIndex < visibleTableFields.length) {
      const col = visibleTableFields[colIndex];
      setCurrentPage(1);
      setSortConfig((prev) => {
        if (prev?.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteNotificationApi(deleteId);
        toast.success("Notification deleted.");
        fetchNotifications();
      } catch (error) {
        toast.error("Failed to delete notification.");
      }
      setDeleteId(null);
      setSelectedRow(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: NotificationData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow ? [
    { label: "Delete Notification", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRow.id!) },
  ] : [];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            All Notifications
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
          <span className="text-text-primary dark:text-white">Notifications</span>
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
                selected={
                  filterValues[col.key] ? new Date(filterValues[col.key]) : null
                }
                onChange={(val: Date | null) =>
                  handleFilterChange(col.key, val ? formatLocalDate(val) : "")
                }
                placeholder={`Select ${baseLabel}`}
              />
            );
          if (col.type === "date_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (> After)`}
                  selected={gtStr ? new Date(gtStr) : null}
                  onChange={(val: Date | null) => {
                    const newGt = val ? formatLocalDate(val) : "";
                    const currentLt = ltStr || "";
                    handleFilterChange(
                      col.key,
                      newGt || currentLt ? `${newGt},${currentLt}` : "",
                    );
                  }}
                  placeholder="> After"
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    handleFilterChange(
                      col.key,
                      currentGt || newLt ? `${currentGt},${newLt}` : "",
                    );
                  }}
                  placeholder="< Before"
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

      <DataTable
        serverSide={true}
        data={notifications}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        headers={headers}
        isLoading={isLoading}
        onSort={handleSort}
        sortColumnIndex={sortConfig ? visibleTableFields.findIndex(c => c.key === sortConfig.key) + 1 : null}
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            const validKeys = prev.filter(key => allColumns.some(c => c.key === key));
            const next = [...validKeys];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
        }}
        renderRow={(notification, index) => (
          <tr
            key={notification.id || index}
            onContextMenu={(e) => handleContextMenu(e, notification)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (notification as any)[col.key];
              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(notification)}
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

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRow(null);
        }}
        onConfirm={handleDelete}
        title="Delete Notification"
        message={`Are you sure you want to delete notification "${selectedRow?.title || ""}"? It will be permanently removed from your history.`}
      />
    </div>
  );
};

export default AllNotifications;