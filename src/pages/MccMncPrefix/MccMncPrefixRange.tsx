import React, { useState, useEffect, useRef } from "react";
import { Home, Eye, Edit, Plus, Trash } from "lucide-react";
import Button from "../../components/ui/Button";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { 
  getMccMncPrefixRangesApi, 
  deleteMccMncPrefixRangeApi, 
  type MccMncPrefixRangeData 
} from "../../api/mccMncPrefixApi/mccMncPrefixRangeApi";
import { MccMncPrefixRangeModal } from "../../components/modals/MccMncPrefix/MccMncPrefixRangeModal";
import { DeleteModal } from "../../components/modals/DeleteModal";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { CountryFlag } from "../../components/ui/CountryFlag";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { usePagePermissions } from "../../hooks/usePagePermissions";

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

interface ColumnConfig extends Omit<FilterColumn, 'type' | 'key' | 'label'> {
  key: string;
  label: string;
  type?: FilterColumnType;
  render?: (data: MccMncPrefixRangeData) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = ["countryName", "mccmnc", "status"];
const DEFAULT_TABLE_COLUMNS = [
  "countryName",
  "mccmnc",
  "externalPrefixId",
  "operatorPrefixStartRange",
  "operatorPrefixEndRange",
  "status",
  "sourceFileName",
];

const MccMncPrefixRange: React.FC = () => {
  const { canUpdate, canDelete } = usePagePermissions();
  const [data, setData] = useState<MccMncPrefixRangeData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<MccMncPrefixRangeData | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowData, setSelectedRowData] = useState<MccMncPrefixRangeData | null>(null);

  // Filters & Pagination
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("mcc_mnc_range_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "mcc_mnc_range_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("mcc_mnc_range_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  const [countryOptions, setCountryOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getCountriesApi("country", 1, 1000);
        const list = res.results || (Array.isArray(res) ? res : []);
        setCountryOptions(
          list.map((item: any) => ({
            label: item.name || "Unknown",
            value: item.name || String(item.id),
            iso2: item.iso2,
            icon: item.iso2 ? <CountryFlag iso2={item.iso2} /> : undefined,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch countries", error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    localStorage.setItem("mcc_mnc_range_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/")[1] || "mccMncPrefix";
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const activeLinks = document.querySelectorAll("aside a.active, nav a.active");
    const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
    const moduleLabel = activeItem?.innerText?.split("\n")[0].trim() || "Prefix Range";
    actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
  }, []);

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const allColumns: ColumnConfig[] = [
    { 
      key: "countryName", 
      label: "Country Name", 
      type: "text", 
      filterKey: "country__name__icontains", 
      options: countryOptions,
      render: (c) => {
        const match = countryOptions.find((opt) => opt.value === c.countryName);
        return (
          <div className="flex items-center gap-2">
            {match?.iso2 && <CountryFlag iso2={match.iso2} />}
            <span>{c.countryName}</span>
          </div>
        );
      }
    },
    { key: "mccmnc", label: "MCC MNC", type: "text", filterKey: "mccmnc__icontains" },
    {
      key: "status",
      label: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "status__icontains",
      render: (c) => (
        <StatusBadge 
          status={c.status === "ACTIVE" ? "ACTIVE" : "EXPIRED"} 
          customText={c.status === "ACTIVE" ? "Active" : "Inactive"} 
        />
      )
    },
    { 
      key: "operatorPrefixStartRange", 
      label: "Start Range (Exact)", 
      tableLabel: "Start Range",
      type: "number", 
      filterKey: "operatorPrefixStartRange" 
    },
    { 
      key: "operatorPrefixStartRange__gt_lt", 
      label: "Start Range (> / <)", 
      type: "number_gt_lt", 
      filterKey: "operatorPrefixStartRange",
      isSearchOnly: true,
    },
    { 
      key: "operatorPrefixEndRange", 
      label: "End Range (Exact)", 
      tableLabel: "End Range",
      type: "number", 
      filterKey: "operatorPrefixEndRange" 
    },
    { 
      key: "operatorPrefixEndRange__gt_lt", 
      label: "End Range (> / <)", 
      type: "number_gt_lt", 
      filterKey: "operatorPrefixEndRange",
      isSearchOnly: true,
    },
    { 
      key: "externalPrefixId", 
      label: "External Prefix ID", 
      type: "text", 
      filterKey: "externalPrefixId__icontains" 
    },
    { 
      key: "sourceFileName", 
      label: "Source File Name", 
      type: "text", 
      filterKey: "sourceFileName__icontains" 
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
      render: (c) => (c.createdAt ? formatDateTime(c.createdAt) : "-") 
    },
    { 
      key: "createdAt__gt_lt", 
      label: "Created At (After / Before)", 
      type: "date_gt_lt", 
      filterKey: "createdAt", 
      isSearchOnly: true 
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));
  
  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type as FilterColumnType }));

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
            const selectedOption = columnDef.options.find((opt) => opt.value === value);
            currentSearchParams[columnDef.filterKey || key] = selectedOption ? selectedOption.value : value;
          } else if (columnDef?.type === "date") {
            // Converts single date input into 24-hour range query (e.g. createdAt__range=2026-08-18T00:00:00,2026-08-18T23:59:59)
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

      const response: any = await getMccMncPrefixRangesApi(routeName, currentPage, rowsPerPage, currentSearchParams);

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
      if (error.name !== "AbortError") toast.error("Failed to fetch prefix ranges.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => { setCurrentPage(1); fetchData(); };
  const handleClearFilters = () => { setFilterValues({}); setCurrentPage(1); fetchData({}); };

  const handleEdit = (item: MccMncPrefixRangeData) => { if (!canUpdate) return; setEditingData(item); setIsViewMode(false); setIsModalOpen(true); };
  const handleView = (item: MccMncPrefixRangeData) => { setEditingData(item); setIsViewMode(true); setIsModalOpen(true); };
  const handleAdd = () => {
    setEditingData(null);
    setIsViewMode(false);
    setIsModalOpen(true);
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
        await deleteMccMncPrefixRangeApi(deleteId, routeName);
        toast.success("Prefix Range deleted successfully.");
        fetchData();
      } catch (error) {
        toast.error("Failed to delete prefix range.");
      }
      setDeleteId(null);
      setSelectedRowData(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: MccMncPrefixRangeData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowData(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowData ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => handleView(selectedRowData) },
    ...(canUpdate ? [{ label: "Edit Range", icon: <Edit size={16} />, onClick: () => handleEdit(selectedRowData) }] : []),
    ...(canDelete ? [{ label: "Delete Range", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRowData.id!) }] : []),
  ] : [];

  const tableHeaders = ["S.N.", ...visibleTableFields.map((col) => col.tableLabel || col.label)];
  
  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  const prefixRangeIdentifier = selectedRowData
    ? selectedRowData.countryName
      ? `${selectedRowData.countryName} (${selectedRowData.mccmnc || "-"})`
      : selectedRowData.mccmnc || selectedRowData.externalPrefixId || `Range #${selectedRowData.id}`
    : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Prefix Range</h1>
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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span><span className="text-text-primary dark:text-white">Prefix Range</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options) return <Select key={col.key} label={`Search ${baseLabel}`} value={filterValues[col.key] || ""} onChange={(val) => handleFilterChange(col.key, val)} options={col.options} placeholder={`Select ${baseLabel}`} allowCustomValue={true} />;
          if (col.type === "date") return <DatePicker key={col.key} label={`Search ${baseLabel}`} selected={filterValues[col.key] ? new Date(filterValues[col.key]) : null} onChange={(val: Date | null) => handleFilterChange(col.key, val ? formatLocalDate(val) : "")} />;
          if (col.type === "date_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker label={`Search ${baseLabel} (> After)`} selected={gtStr ? new Date(gtStr) : null} onChange={(val: Date | null) => { const newGt = val ? formatLocalDate(val) : ""; const currentLt = ltStr || ""; handleFilterChange(col.key, newGt || currentLt ? `${newGt},${currentLt}` : ""); }} />
                <DatePicker label={`Search ${baseLabel} (< Before)`} selected={ltStr ? new Date(ltStr) : null} onChange={(val: Date | null) => { const newLt = val ? formatLocalDate(val) : ""; const currentGt = gtStr || ""; handleFilterChange(col.key, currentGt || newLt ? `${currentGt},${newLt}` : ""); }} />
              </React.Fragment>
            );
          }
          if (col.type === "number_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <Input
                  type="number"
                  label={`Search ${baseLabel} (> Greater)`}
                  value={gtStr || ""}
                  onChange={(e) => {
                    const newGt = e.target.value;
                    const currentLt = ltStr || "";
                    const newVal = newGt || currentLt ? `${newGt},${currentLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`> Greater than`}
                />
                <Input
                  type="number"
                  label={`Search ${baseLabel} (< Less)`}
                  value={ltStr || ""}
                  onChange={(e) => {
                    const newLt = e.target.value;
                    const currentGt = gtStr || "";
                    const newVal = currentGt || newLt ? `${currentGt},${newLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`< Less than`}
                />
              </React.Fragment>
            );
          }
          return <Input key={col.key} type={col.type || "text"} label={`Search ${baseLabel}`} value={filterValues[col.key] || ""} onChange={(e) => handleFilterChange(col.key, e.target.value)} placeholder={`${baseLabel}`} />;
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
        rowsPerPageOptions={[
          { value: "10", label: "10" },
          { value: "25", label: "25" },
          { value: "50", label: "50" },
          { value: "100", label: "100" },
          { value: "500", label: "500" },
          { value: "1000", label: "1000" },
        ]} 
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
          canUpdate && (
            <Button variant="primary" onClick={handleAdd} leftIcon={<Plus size={18} />}>
              Add Prefix Range
            </Button>
          )
        }
        renderRow={(item, index) => (
          <tr key={item.id || index} onContextMenu={(e) => handleContextMenu(e, item)} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors">
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">{(currentPage - 1) * rowsPerPage + index + 1}</td>
            {visibleTableFields.map((col) => {
              let cellData = (item as any)[col.key];
              if (col.render) return <td key={col.key} className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{col.render(item)}</td>;
              if (col.options) { const match = col.options.find((opt) => opt.value === String(cellData)); cellData = match ? match.label : cellData; }
              return <td key={col.key} className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{cellData || "-"}</td>;
            })}
          </tr>
        )}
      />

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <MccMncPrefixRangeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} moduleName={routeName} editingData={editingData} isViewMode={isViewMode} />

      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => {
          setDeleteId(null);
          setSelectedRowData(null);
        }} 
        onConfirm={handleDelete} 
        title="Delete Prefix Range" 
        message={`Are you sure you want to delete prefix range "${prefixRangeIdentifier}"? This action cannot be undone.`} 
      />
    </div>
  );
};

export default MccMncPrefixRange;