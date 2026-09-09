import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Download, Upload, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getCountriesApi,
  deleteCountryApi,
  importCountryApi,
  getImportStatusApi,
  type CountryData,
} from "../../../api/settingApi/countryApi/countryApi";
import { CountryModal } from "../../../components/modals/Settings/CountryModal";
import { ImportModal } from "../../../components/modals/ImportModal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DatePicker from "../../../components/ui/DatePicker";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import {
  countryCsv,
  downloadStatus,
} from "../../../api/downloadApi/downloadApi";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";
import { CountryFlag } from "../../../components/ui/CountryFlag";
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
  render?: (country: any) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = ["name", "countryCode", "iso2"];
const DEFAULT_TABLE_COLUMNS = [
  "name",
  "countryCode",
  "iso2",
  "region",
  "subRegion",
  "createdAt",
];

const Country: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowCountry, setSelectedRowCountry] = useState<CountryData | null>(null);

  // --- Dynamic Search & Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("country_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "country_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Column Order State & Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("country_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("country_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const location = useLocation();
  const routeName = location.pathname.split("/")[1] || "country";
  const abortControllerRef = useRef<AbortController | null>(null);

  const booleanOptions: Option[] = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
  ];

  // Column definitions for dynamic rendering, filtering, & visibility
  const allColumns: ColumnConfig[] = [
    {
      key: "name",
      label: "Country",
      type: "text",
      filterKey: "name__icontains",
      render: (country) => (
        <span className="font-medium text-text-primary dark:text-white flex items-center gap-2">
          <CountryFlag iso2={country.iso2} name={country.name} />
          {country.name}
        </span>
      ),
    },
    {
      key: "countryCode",
      label: "Country Code",
      type: "text",
      filterKey: "countryCode__icontains",
      render: (country) => country.countryCode || "-",
    },
    {
      key: "iso2",
      label: "ISO2",
      type: "text",
      filterKey: "iso2__icontains",
      render: (country) => country.iso2 || "-",
    },
    {
      key: "region",
      label: "Region",
      type: "text",
      filterKey: "region__icontains",
      render: (country) => country.region || "-",
    },
    {
      key: "subRegion",
      label: "Sub Region",
      type: "text",
      filterKey: "subRegion__icontains",
      render: (country) => country.subRegion || "-",
    },
    {
      key: "isActive",
      label: "Status",
      type: "boolean",
      options: booleanOptions,
      filterKey: "isActive",
      render: (c: any) => (
        <StatusBadge
          status={c.isActive ? "ACTIVE" : "EXPIRED"}
          customText={c.isActive ? "Active" : "Inactive"}
        />
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
      render: (c: any) => (c.createdAt ? formatDateTime(c.createdAt) : "-"),
    },
    {
      key: "createdAt__gt_lt",
      label: "Created At (After / Before)",
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

  const handleExport = async () => {
    try {
      const data: any = await countryCsv(
        routeName,
        currentPage,
        rowsPerPage,
        filterValues.name || "",
        filterValues.countryCode || "",
        filterValues.iso2 || ""
      );

      if (!data || !data.task_id) {
        toast.error("Failed to start export process.");
        return;
      }

      const taskId = data.task_id;
      let attempts = 0;
      const maxAttempts = 5;

      toast.info("Export started. Please wait");

      const checkStatus = setInterval(async () => {
        attempts += 1;

        try {
          const res = await downloadStatus(routeName, taskId);

          if (res && res.ready) {
            clearInterval(checkStatus);

            if (res.download_url) {
              window.location.href = res.download_url;
              toast.success("Export successful!");
            } else {
              console.error("Download URL is missing from response:", res);
              toast.error("Export generated but URL is missing.");
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(checkStatus);
            toast.error(
              "Export timed out after 5 attempts. Please try again later."
            );
          }
        } catch (error) {
          console.error("Error checking CSV status:", error);
          if (attempts >= maxAttempts) {
            clearInterval(checkStatus);
            toast.error("Failed to check export status.");
          }
        }
      }, 2000);
    } catch (error) {
      console.error("Export API failed:", error);
      toast.error("Failed to initiate export.");
    }
  };

  const fetchCountries = async (overrideParams?: Record<string, string>) => {
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

      const response: any = await getCountriesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setCountries(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setCountries(response);
        setTotalItems(response.length);
      } else {
        setCountries([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Fetch error:", error);
        if (error.response && error.response.status !== 404) {
          toast.error("Failed to fetch countries.");
        }
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCountries();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchCountries({}); 
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
        await deleteCountryApi(deleteId, routeName);
        toast.success("Country deleted.");
        fetchCountries();
      } catch (error) {
        toast.error("Failed to delete country.");
      }
      setDeleteId(null);
      setSelectedRowCountry(null);
    }
  };

  const handleEdit = (country: CountryData) => { if (!canUpdate) return; setEditingCountry(country); setIsViewMode(false); setIsModalOpen(true); };
  const handleAdd = () => { if (!canCreate) return; setEditingCountry(null); setIsViewMode(false); setIsModalOpen(true); };
  const handleView = (country: CountryData) => { setEditingCountry(country); setIsViewMode(true); setIsModalOpen(true); };

  // --- Context Menu Handler ---
  const handleContextMenu = (e: React.MouseEvent, item: CountryData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowCountry(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowCountry ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => handleView(selectedRowCountry) },
    ...(canUpdate ? [{ label: "Edit Country", icon: <Edit size={16} />, onClick: () => handleEdit(selectedRowCountry) }] : []),
    ...(canDelete ? [{ label: "Delete Country", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRowCountry.id!) }] : []),
  ] : [];

  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");
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

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Country Settings
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={(cols) => setTableColumns(cols)}
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
          <span className="text-text-primary dark:text-white">Country</span>
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange(col.key, e.target.value)}
              placeholder={`${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={countries}
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
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleExport}
              leftIcon={<Download size={18} />}
            >
              Export
            </Button>
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
                Add Country
              </Button>
            )}
          </div>
        }
        renderRow={(country: CountryData, index: number) => (
          <tr
            key={country.id || index}
            onContextMenu={(e) => handleContextMenu(e, country)} 
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => (
              <td
                key={col.key}
                className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
              >
                {col.render ? col.render(country) : (country as any)[col.key] || "-"}
              </td>
            ))}
          </tr>
        )}
      />

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <CountryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCountries}
        moduleName={routeName}
        editingCountry={editingCountry}
        isViewMode={isViewMode}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchCountries}
        importApi={importCountryApi}
        checkStatusApi={getImportStatusApi}
        title="Import Countries"
        sampleFileLink="/country_sample.csv"
        sampleFileName="country_sample.csv"
        fileKey="file"
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRowCountry(null);
        }}
        onConfirm={handleDelete}
        title="Delete Country"
        message={`Are you sure you want to delete country "${selectedRowCountry?.name || ""}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Country;