import React, { useState, useEffect, useRef } from "react";
import { Home, Eye, Edit } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getImportRowsApi,
  type ImportRowData,
} from "../../../api/rateApi/ImportVendor/importRowApi";
import { ImportRowModal } from "../../../components/modals/Rate/ImportVendor/ImportRowModal";

import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DatePicker from "../../../components/ui/DatePicker";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";
import { formatDateTime } from "../../../helper/dateFormatter";
import { StatusBadge } from "../../../components/ui/StatusBadge";

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
  render?: (data: ImportRowData) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = [
  "vendorProfileName",
  "rowStatus",
  "diffType",
  "rawDestination",
];
const DEFAULT_TABLE_COLUMNS = [
  "rowNo",
  "rawDestination",
  "importedRate",
  "rowStatus",
  "diffType",
  "createdAt",
];

const ImportRow: React.FC = () => {
  const [data, setData] = useState<ImportRowData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ImportRowData | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowData, setSelectedRowData] =
    useState<ImportRowData | null>(null);

  // Filters & Pagination
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("import_row_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "import_row_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("import_row_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "import_row_table_columns",
      JSON.stringify(tableColumns)
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/")[1] || "vendor";
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const activeLinks = document.querySelectorAll(
      "aside a.active, nav a.active"
    );
    const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
    const moduleLabel =
      activeItem?.innerText?.split("\n")[0].trim() || "Import Row";
    actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
  }, []);

  const statusOptions: Option[] = [
    { label: "Valid", value: "VALID" },
    { label: "Invalid", value: "INVALID" },
    { label: "Unmapped", value: "UNMAPPED" },
    { label: "Unchanged", value: "UNCHANGED" },
    { label: "Updated", value: "UPDATED" },
    { label: "New", value: "NEW" },
  ];

  const getStatusProps = (val: string | null | undefined) => {
    if (!val) return { status: "PENDING", customText: "-" };

    let colorKey = "PENDING";
    if (val === "VALID" || val === "NEW" || val === "UPDATED")
      colorKey = "ACTIVE";
    if (val === "INVALID") colorKey = "EXPIRED";
    if (val === "UNMAPPED") colorKey = "SUSPENDED";
    if (val === "UNCHANGED") colorKey = "UNKNOWN";

    const option = statusOptions.find((o) => o.value === val);
    const fallbackText =
      val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();

    return {
      status: colorKey,
      customText: option ? option.label : fallbackText,
    };
  };

  const allColumns: ColumnConfig[] = [
    {
      key: "vendorProfileName",
      label: "Vendor Profile (Search)",
      type: "text",
      filterKey: "batch__vendor__profileName__icontains",
      isSearchOnly: true,
    },
    {
      key: "rowNo",
      label: "Row No",
      type: "number",
      filterKey: "rowNo",
    },
    {
      key: "rawDestination",
      label: "Raw Destination",
      type: "text",
      filterKey: "rawDestination__icontains",
    },
    {
      key: "rawOperator",
      label: "Raw Operator",
      type: "text",
      filterKey: "rawOperator__icontains",
    },
    {
      key: "rawMcc",
      label: "Raw MCC",
      type: "text",
      filterKey: "rawMcc__icontains",
    },
    {
      key: "rawMnc",
      label: "Raw MNC",
      type: "text",
      filterKey: "rawMnc__icontains",
    },
    {
      key: "rawTimeZone",
      label: "Raw Timezone",
      type: "text",
      filterKey: "rawTimeZone__icontains",
      isSearchOnly: true,
    },
    {
      key: "rawCountryCode",
      label: "Raw Country Code",
      type: "text",
      filterKey: "rawCountryCode__icontains",
    },
    {
      key: "importedCountryCode",
      label: "Imported Country Code",
      type: "text",
      filterKey: "importedCountryCode__icontains",
      isSearchOnly: true,
    },
    {
      key: "normalizedCountryId",
      label: "Normalized Country ID",
      type: "text",
      filterKey: "normalizedCountryId__icontains",
      isSearchOnly: true,
    },
    {
      key: "destinationKey",
      label: "Destination Key",
      type: "text",
      filterKey: "destinationKey__icontains",
    },
    {
      key: "importedRate",
      label: "Imported Rate",
      type: "number",
      filterKey: "importedRate",
    },
    {
      key: "currency",
      label: "Currency",
      type: "text",
      filterKey: "currency__icontains",
    },
    {
      key: "rowStatus",
      label: "Row Status",
      type: "text",
      options: statusOptions,
      filterKey: "rowStatus__icontains",
      render: (c) => {
        const props = getStatusProps(c.rowStatus);
        return (
          <StatusBadge
            status={props.status}
            customText={props.customText}
          />
        );
      },
    },
    {
      key: "diffType",
      label: "Diff Type",
      type: "text",
      options: statusOptions,
      filterKey: "diffType__icontains",
      render: (c) => {
        const props = getStatusProps(c.diffType);
        return (
          <StatusBadge
            status={props.status}
            customText={props.customText}
          />
        );
      },
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "text",
      filterKey: "createdBy__username__icontains",
      render: (c: any) => c.createdByName || c.createdBy || "-",
    },
    {
      key: "updatedBy",
      label: "Updated By",
      type: "text",
      filterKey: "updatedBy__username__icontains",
      render: (c: any) => c.updatedByName || c.updatedBy || "-",
    },
    {
      key: "createdAt",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "createdAt",
      render: (c) => (c.createdAt ? formatDateTime(c.createdAt) : "-"),
    },
    {
      key: "createdAt__gt_lt",
      label: "Created At (After / Before)",
      type: "date_gt_lt",
      filterKey: "createdAt",
      isSearchOnly: true,
    },
  ];

  const searchableColumns = allColumns.filter(
    (col) => col.isSearchable !== false
  );
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key)
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
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchData = async (
    filters: Record<string, string> | null = null
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    setIsLoading(true);

    try {
      const activeFilters = filters || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (value) {
          const columnDef = allColumns.find((c) => c.key === key);

          if (columnDef?.options) {
            const selectedOption = columnDef.options.find(
              (opt) => opt.value === value
            );
            currentSearchParams[columnDef.filterKey || key] = selectedOption
              ? selectedOption.value
              : value;
          } else if (columnDef?.type === "date") {
            // Converts single date input into 24-hour range query (e.g. createdAt__range=2026-08-18T00:00:00,2026-08-18T23:59:59)
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            currentSearchParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          } else if (columnDef?.type === "date_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__gt_lt$/, "")
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = `${gt}T00:00:00`;
            if (lt) currentSearchParams[`${baseKey}__lte`] = `${lt}T23:59:59`;
          } else if (columnDef?.type === "number_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__gt_lt$/, "")
              .replace(/__exact$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = gt;
            if (lt) currentSearchParams[`${baseKey}__lte`] = lt;
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

      if (sortConfig) {
        const columnDef = allColumns.find((c: any) => c.key === sortConfig.key);
        let sortKey = sortConfig.key;
        if (columnDef && columnDef.filterKey) {
          sortKey = columnDef.filterKey.replace(/__(icontains|exact|range|gt_lt|gte|lte)$/, "");
        }
        currentSearchParams["ordering"] = sortConfig.direction === "desc" ? `-${sortKey}` : sortKey;
      }

      const response: any = await getImportRowsApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setData(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setData(response);
        setTotalItems(response.length);
      } else {
        setData([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError")
        toast.error("Failed to fetch import rows.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
  };
  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchData({});
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

  const handleEdit = (item: ImportRowData) => {
    setEditingData(item);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (item: ImportRowData) => {
    setEditingData(item);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: ImportRowData
  ) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowData(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowData
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => handleView(selectedRowData),
        },
        {
          label: "Edit Status",
          icon: <Edit size={16} />,
          onClick: () => handleEdit(selectedRowData),
        },
      ]
    : [];

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];
  const getBaseLabel = (label: string) =>
    label ? label.split(" (")[0].trim() : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Import Rows
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={(cols: string[]) => setTableColumns(cols)}
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
              onFilter={(newCols: string[]) => {
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
          <span className="text-text-primary dark:text-white">
            Import Row
          </span>
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
                  filterValues[col.key]
                    ? new Date(filterValues[col.key])
                    : null
                }
                onChange={(val: Date | null) =>
                  handleFilterChange(
                    col.key,
                    val ? formatLocalDate(val) : ""
                  )
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
                      newGt || currentLt ? `${newGt},${currentLt}` : ""
                    );
                  }}
                  placeholder={`> After`}
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    handleFilterChange(
                      col.key,
                      currentGt || newLt ? `${currentGt},${newLt}` : ""
                    );
                  }}
                  placeholder={`< Before`}
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
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        headers={tableHeaders}
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
        renderRow={(item, index) => (
          <tr
            key={item.id || index}
            onContextMenu={(e) => handleContextMenu(e, item)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (item as any)[col.key];
              if (col.render)
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(item)}
                  </td>
                );
              if (col.options) {
                const match = col.options.find(
                  (opt) => opt.value === String(cellData)
                );
                cellData = match ? match.label : cellData;
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

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <ImportRowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        moduleName={routeName}
        editingData={editingData}
        isViewMode={isViewMode}
      />
    </div>
  );
};

export default ImportRow;