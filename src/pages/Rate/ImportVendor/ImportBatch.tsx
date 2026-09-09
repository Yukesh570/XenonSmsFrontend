import React, { useState, useEffect, useRef } from "react";
import { Home, Eye, Edit, CheckCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getImportBatchesApi,
  approveAndPublishBatchApi,
  type ImportBatchData,
} from "../../../api/rateApi/ImportVendor/importBatchApi";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";
import { ImportBatchModal } from "../../../components/modals/Rate/ImportVendor/ImportBatchModal";

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
  render?: (data: ImportBatchData) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = ["vendor", "batchStatus"];
const DEFAULT_TABLE_COLUMNS = [
  "vendor",
  "batchStatus",
  "totalRows",
  "validRows",
  "currency",
  "createdAt",
];

const ImportBatch: React.FC = () => {
  const [data, setData] = useState<ImportBatchData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  // Mappings
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [vendorMap, setVendorMap] = useState<Record<string, string>>({});

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ImportBatchData | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowData, setSelectedRowData] =
    useState<ImportBatchData | null>(null);

  // Filters & Pagination
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("import_batch_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "import_batch_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("import_batch_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "import_batch_table_columns",
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
      activeItem?.innerText?.split("\n")[0].trim() || "Import Batch";
    actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);

    // Fetch mappings
    getVendorsApi("vendor", 1, 1000)
      .then((res: any) => {
        const list = res.results || (Array.isArray(res) ? res : []);
        const map: Record<string, string> = {};
        const options: Option[] = [];
        list.forEach((v: any) => {
          const name = v.profileName || v.name || `Vendor ${v.id}`;
          map[String(v.id)] = name;
          options.push({ label: name, value: name });
        });
        setVendorMap(map);
        setVendorOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(console.error);
  }, []);

  const batchStatusOptions: Option[] = [
    { label: "Parsing", value: "PARSING" },
    { label: "Parsed", value: "PARSED" },
    { label: "Ready For Review", value: "READY_FOR_REVIEW" },
    { label: "Auto Approved", value: "AUTO_APPROVED" },
    { label: "Manual Approved", value: "MANUAL_APPROVED" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Rolled Back", value: "ROLLED_BACK" },
  ];

  const approvalStatusOptions: Option[] = [
    { label: "Pending", value: "PENDING" },
    { label: "Auto Approved", value: "AUTO_APPROVED" },
    { label: "Manual Approved", value: "MANUAL_APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const allColumns: ColumnConfig[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      options: vendorOptions,
      filterKey: "vendor__profileName__icontains",
    },
    {
      key: "batchStatus",
      label: "Batch Status",
      type: "text",
      options: batchStatusOptions,
      filterKey: "batchStatus__icontains",
      render: (c) => {
        const val = c.batchStatus || "PARSING";
        const label =
          batchStatusOptions.find((o) => o.value === val)?.label || val;

        let colorKey = "PENDING";
        if (
          ["PARSED", "AUTO_APPROVED", "MANUAL_APPROVED", "PUBLISHED"].includes(
            val
          )
        )
          colorKey = "ACTIVE";
        if (val === "READY_FOR_REVIEW") colorKey = "SUBMITTING";
        if (["ROLLED_BACK"].includes(val)) colorKey = "EXPIRED";

        return <StatusBadge status={colorKey} customText={label} />;
      },
    },
    {
      key: "approvalStatus",
      label: "Approval Status",
      type: "text",
      options: approvalStatusOptions,
      filterKey: "approvalStatus__icontains",
      render: (c: any) => c.approvalStatus || "-",
    },
    {
      key: "sourceType",
      label: "Source Type",
      type: "text",
      filterKey: "sourceType__icontains",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "text",
      filterKey: "mail__messageId__icontains",
      isSearchOnly: true,
    },
    {
      key: "attachmentFileName",
      label: "Attachment File Name",
      type: "text",
      filterKey: "attachment__fileName__icontains",
      isSearchOnly: true,
    },
    {
      key: "parserProfileId",
      label: "Parser Profile ID",
      type: "text",
      filterKey: "parserProfileId__icontains",
      isSearchOnly: true,
    },
    {
      key: "currency",
      label: "Currency",
      type: "text",
      filterKey: "currency__icontains",
    },
    {
      key: "totalRows",
      label: "Total Rows",
      type: "number",
      filterKey: "totalRows",
    },
    {
      key: "validRows",
      label: "Valid Rows",
      type: "number",
      filterKey: "validRows",
    },
    {
      key: "invalidRows",
      label: "Invalid Rows",
      type: "number",
      filterKey: "invalidRows",
    },
    {
      key: "newRows",
      label: "New Rows",
      type: "number",
      filterKey: "newRows",
    },
    {
      key: "unmappedRows",
      label: "Unmapped Rows",
      type: "number",
      filterKey: "unmappedRows",
    },
    {
      key: "updatedRows",
      label: "Updated Rows",
      type: "number",
      filterKey: "updatedRows",
    },
    {
      key: "failureReason",
      label: "Failure Reason",
      type: "text",
      isSearchable: false,
    },
    {
      key: "effectiveDate",
      label: "Effective Date (Exact)",
      tableLabel: "Effective Date",
      type: "date",
      filterKey: "effectiveDate",
      render: (c) =>
        c.effectiveDate ? formatDateTime(c.effectiveDate) : "-",
    },
    {
      key: "effectiveDate__gt_lt",
      label: "Effective Date (After / Before)",
      type: "date_gt_lt",
      filterKey: "effectiveDate",
      isSearchOnly: true,
    },
    {
      key: "publishedAt",
      label: "Published At (Exact)",
      tableLabel: "Published At",
      type: "date",
      filterKey: "publishedAt",
      render: (c: any) =>
        c.publishedAt ? formatDateTime(c.publishedAt) : "-",
    },
    {
      key: "publishedAt__gt_lt",
      label: "Published At (After / Before)",
      type: "date_gt_lt",
      filterKey: "publishedAt",
      isSearchOnly: true,
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
    filters: Record<string, string> | null = null,
    silent: boolean = false
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    if (!silent) setIsLoading(true);

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

      const response: any = await getImportBatchesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setData(response.results);
        setTotalItems(response.count);
        const needsPolling = response.results.some((batch: ImportBatchData) => {
          return !["PUBLISHED", "ROLLED_BACK", "FAILED", "READY_FOR_REVIEW", "IDENTIFIED"].includes(batch.batchStatus || "");
        });
        setIsPolling(needsPolling);
      } else if (Array.isArray(response)) {
        setData(response);
        setTotalItems(response.length);
        const needsPolling = response.some((batch: ImportBatchData) => {
          return !["PUBLISHED", "ROLLED_BACK", "FAILED", "READY_FOR_REVIEW", "IDENTIFIED"].includes(batch.batchStatus || "");
        });
        setIsPolling(needsPolling);
      } else {
        setData([]);
        setTotalItems(0);
        setIsPolling(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError")
        toast.error("Failed to fetch import batches.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    let intervalId: ReturnType<typeof setInterval>;
    if (isPolling) {
      intervalId = setInterval(() => {
        fetchData(null, true);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, isPolling, sortConfig]);

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

  const handleEdit = (item: ImportBatchData) => {
    setEditingData(item);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (item: ImportBatchData) => {
    setEditingData(item);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: ImportBatchData
  ) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowData(item);
  };

  const handleApprove = async (item: ImportBatchData) => {
    if (!item.id) return;
    try {
      await approveAndPublishBatchApi(item.id);
      toast.success("Batch approved! Publishing in background...");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Failed to approve batch."
      );
    }
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
      ...(selectedRowData.batchStatus === "READY_FOR_REVIEW"
        ? [
          {
            label: "Approve Batch",
            icon: (
              <CheckCircle size={16} className="text-green-500" />
            ),
            onClick: () => handleApprove(selectedRowData),
          },
        ]
        : []),
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
            Import Batches
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
            Import Batch
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
              if (col.key === "vendor")
                cellData =
                  vendorMap[String(item.vendor)] ||
                  String(item.vendor || "-");
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

      <ImportBatchModal
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

export default ImportBatch;