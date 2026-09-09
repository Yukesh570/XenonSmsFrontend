import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye, Upload } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getOperatorNetworkCodesApi,
  deleteOperatorNetworkCodeApi,
  importOperatorNetworkCodeApi,
  getImportStatusApi,
  type OperatorNetworkCodeData,
} from "../../api/operatorNetworkCodeApi/operatorNetworkCodeApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

import { OperatorNetworkCodeModal } from "../../components/modals/Operator/OperatorNetworkCodeModal";
import { ImportModal } from "../../components/modals/ImportModal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../components/modals/DeleteModal";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";

import { StatusBadge } from "../../components/ui/StatusBadge";
import { CountryFlag } from "../../components/ui/CountryFlag";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render?: (data: OperatorNetworkCodeData) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = ["MCC", "MNC", "operator_name", "country_name"];
const DEFAULT_TABLE_COLUMNS = [
  "operator_name",
  "country_name",
  "MCC",
  "MNC",
  "status",
  "createdAt",
];

const OperatorNetworkCode: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [data, setData] = useState<OperatorNetworkCodeData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [countryOptions, setCountryOptions] = useState<Option[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingData, setEditingData] =
    useState<OperatorNetworkCodeData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRow, setSelectedRow] =
    useState<OperatorNetworkCodeData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("operatornetworkcode_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "operatornetworkcode_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("operatornetworkcode_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "operatornetworkcode_table_columns",
      JSON.stringify(tableColumns),
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/").pop() || "operatorNetworkCode";
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getCountriesApi("country", 1, 1000)
      .then((res: any) => {
        const list = res.results || (Array.isArray(res) ? res : []);
        const options: Option[] = list.map((c: any) => ({
          label: c.name,
          value: c.name,
          ...(c.iso2 ? { icon: <CountryFlag iso2={c.iso2} /> } : {}),
        }));
        setCountryOptions(
          options.sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch(console.error);
  }, []);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll(
          "aside a.active, nav a.active",
        );
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel =
          activeItem?.innerText?.split("\n")[0].trim() || "Module";
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const networkTypeOptions: Option[] = [
    { label: "GSM", value: "GSM" },
    { label: "LTE", value: "LTE" },
    { label: "5G", value: "5G" },
    { label: "CDMA", value: "CDMA" },
    { label: "UNKNOWN", value: "UNKNOWN" },
  ];

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const booleanOptions: Option[] = [
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
  ];

  const renderBadge = (val: string | boolean) => {
    if (typeof val === "boolean") {
      const statusKey = val ? "DELIVERED" : "PENDING";
      return <StatusBadge status={statusKey} customText={val ? "Yes" : "No"} />;
    }

    const stringVal = String(val).toUpperCase();
    if (stringVal === "ACTIVE" || stringVal === "TRUE") {
      return <StatusBadge status="DELIVERED" customText={String(val)} />;
    }
    return <StatusBadge status="PENDING" customText={String(val)} />;
  };

  const allColumns: ColumnConfig[] = [
    {
      key: "operator_name",
      label: "Operator",
      type: "text",
      filterKey: "operator__icontains",
    },
    {
      key: "country_name",
      label: "Country",
      type: "text",
      options: countryOptions,
      filterKey: "country__name__icontains",
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.country_iso && <CountryFlag iso2={item.country_iso} />}
          <span>{item.country_name}</span>
        </div>
      ),
    },
    { key: "MCC", label: "MCC", type: "text", filterKey: "MCC__icontains" },
    { key: "MNC", label: "MNC", type: "text", filterKey: "MNC__icontains" },
    {
      key: "networkType",
      label: "Network Type",
      type: "text",
      options: networkTypeOptions,
      filterKey: "networkType__icontains",
    },
    {
      key: "status",
      label: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "status__icontains",
      render: (c) => renderBadge(c.status),
    },
    {
      key: "isPrimary",
      label: "Is Primary",
      type: "boolean",
      options: booleanOptions,
      filterKey: "isPrimary",
      render: (c) => renderBadge(c.isPrimary),
    },
    {
      key: "effectiveFrom",
      label: "Effective From (Exact)",
      tableLabel: "Effective From",
      type: "date",
      filterKey: "effectiveFrom",
      render: (c) => (c.effectiveFrom ? formatDateTime(c.effectiveFrom) : "-"),
    },
    {
      key: "effectiveFrom__gt_lt",
      label: "Effective From (After / Before)",
      type: "date_gt_lt",
      filterKey: "effectiveFrom",
      isSearchOnly: true,
    },
    {
      key: "effectiveTo",
      label: "Effective To (Exact)",
      tableLabel: "Effective To",
      type: "date",
      filterKey: "effectiveTo",
      render: (c) => (c.effectiveTo ? formatDateTime(c.effectiveTo) : "-"),
    },
    {
      key: "effectiveTo__gt_lt",
      label: "Effective To (After / Before)",
      type: "date_gt_lt",
      filterKey: "effectiveTo",
      isSearchOnly: true,
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
      filterKey: "notes__icontains",
      render: (item) => (
        <div className="max-w-[150px] truncate" title={item.notes}>
          {item.notes || "-"}
        </div>
      ),
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

  const searchableColumns = allColumns.filter((col) =>
    col.isSearchable !== false,
  );
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchData = async (filters: Record<string, string> | null = null) => {
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

      const response: any = await getOperatorNetworkCodesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
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
        toast.error("Failed to fetch network codes.");
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

  const handleDelete = async () => {
    if (deleteId && canDelete) {
      try {
        await deleteOperatorNetworkCodeApi(deleteId, routeName);
        toast.success("Network code deleted.");
        fetchData();
      } catch (error) {
        toast.error("Failed to delete network code.");
      }
      setDeleteId(null);
      setSelectedRow(null);
    }
  };

  const handleEdit = (item: OperatorNetworkCodeData) => {
    if (!canUpdate) return;
    setEditingData(item);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingData(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (item: OperatorNetworkCodeData) => {
    setEditingData(item);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: OperatorNetworkCodeData,
  ) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(item);
  };

  const menuItems: ContextMenuItem[] = selectedRow
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => handleView(selectedRow),
        },
        ...(canUpdate
          ? [
              {
                label: "Edit Info",
                icon: <Edit size={16} />,
                onClick: () => handleEdit(selectedRow),
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete",
                icon: <Trash size={16} />,
                variant: "danger" as const,
                onClick: () => setDeleteId(selectedRow.id!),
              },
            ]
          : []),
      ]
    : [];

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  const operatorNetworkCodeIdentifier = selectedRow
    ? selectedRow.operator_name || selectedRow.operator || (selectedRow.MCC && selectedRow.MNC ? `${selectedRow.MCC}-${selectedRow.MNC}` : `Network Code #${selectedRow.id}`)
    : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Operator Network Codes
          </h1>
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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">
            Network Codes
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
                      currentGt || newLt ? `${currentGt},${newLt}` : "",
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
        headerActions={
          <div className="flex gap-2">
            {canCreate && (
              <Button
                variant="secondary"
                onClick={() => setIsImportModalOpen(true)}
                leftIcon={<Upload size={18} />}
              >
                Import
              </Button>
            )}
            {canCreate && (
              <Button
                variant="primary"
                onClick={handleAdd}
                leftIcon={<Plus size={18} />}
              >
                Add Network Code
              </Button>
            )}
          </div>
        }
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

              if (col.key === "operator_name") {
                cellData = item.operator_name || item.operator;
              } else if (col.key === "country_name") {
                cellData = item.country_name || item.country;
              }

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
                  (opt) => opt.value === String(cellData),
                );
                cellData = match ? match.label : cellData;
              }

              return (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap `}
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

      <OperatorNetworkCodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchData()}
        moduleName={routeName}
        editingData={editingData}
        isViewMode={isViewMode}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchData()}
        importApi={importOperatorNetworkCodeApi}
        checkStatusApi={getImportStatusApi}
        title="Import Operator Network Codes"
        sampleFileLink="/operator_network_code_sample.csv"
        sampleFileName="operator_network_code_sample.csv"
        fileKey="file"
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRow(null);
        }}
        onConfirm={handleDelete}
        title="Delete Network Code"
        message={`Are you sure you want to delete operator network code "${operatorNetworkCodeIdentifier}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default OperatorNetworkCode;