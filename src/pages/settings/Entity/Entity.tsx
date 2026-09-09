import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getEntityApi,
  deleteEntityApi,
  type EntityData,
} from "../../../api/settingApi/entityApi/entityApi";
import { EntityModal } from "../../../components/modals/Settings/EntityModal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DatePicker from "../../../components/ui/DatePicker";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";
import { formatDateTime } from "../../../helper/dateFormatter";

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

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SEARCH_COLUMNS = ["companyName", "legalEntityName"];
const DEFAULT_TABLE_COLUMNS = [
  "companyLogo",
  "companyName",
  "legalEntityName",
  "weekCommencing",
  "emailAddress",
  "phone",
  "createdAt",
];

const Entity: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [entities, setEntities] = useState<EntityData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EntityData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowEntity, setSelectedRowEntity] = useState<EntityData | null>(null);

  // --- Advanced Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("entity_search_columns_v1");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "entity_search_columns_v1",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("entity_table_columns_v1");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
    } catch (e) {
      return DEFAULT_TABLE_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem("entity_table_columns_v1", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const imageBase = import.meta.env.VITE_IMAGE_URL || "";

  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const routeName = pathParts[pathParts.length - 1] || "entity";
  const abortControllerRef = useRef<AbortController | null>(null);

  // Available columns for the entity table
  const allColumns: ColumnConfig[] = [
    {
      key: "companyLogo",
      label: "Logo",
      type: "text",
      isSearchable: false,
      render: (data: any) =>
        data.companyLogoPath ? (
          <img
            src={`${imageBase}${data.companyLogoPath}`}
            alt="logo"
            className="h-8 w-8 rounded-full object-cover bg-gray-100 border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
            N/A
          </div>
        ),
    },
    { key: "companyName", label: "Company Name", type: "text", filterKey: "companyName__icontains" },
    { key: "legalEntityName", label: "Legal Entity", type: "text", filterKey: "legalEntityName__icontains" },
    // { key: "weekCommencing", label: "Week Commencing", type: "text", options: [{ label: "Sunday", value: "SUNDAY" }, { label: "Monday", value: "MONDAY" }], filterKey: "weekCommencing" },
    { key: "invoiceNumber", label: "Invoice Number", type: "text", filterKey: "invoiceNumber__icontains", isSearchOnly: true },
    { key: "vatRegistrationNumber", label: "VAT Registration", type: "text", filterKey: "vatRegistrationNumber__icontains" },
    { key: "phone", label: "Phone", type: "text", filterKey: "phone__icontains" },
    { key: "emailAddress", label: "Email Address", type: "text", filterKey: "emailAddress__icontains" },
    { key: "businessAddress", label: "Business Address", type: "text", filterKey: "businessAddress__icontains" },
    { key: "bankAccountDetail", label: "Bank Details", type: "text", filterKey: "bankAccountDetail__icontains" },
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

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false && col.key !== "companyLogo");
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type as FilterColumnType }));

  const headers = ["S.N.", ...visibleTableFields.map((col) => col.tableLabel || col.label)];

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchEntities = async (filters: Record<string, string> | null = null) => {
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
            const selectedOption = columnDef.options.find((opt: Option) => opt.value === value);
            currentSearchParams[columnDef.filterKey || key] = selectedOption ? selectedOption.value : value;
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

      const response: any = await getEntityApi(routeName, currentPage, rowsPerPage, currentSearchParams);

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setEntities(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setEntities(response);
        setTotalItems(response.length);
      } else {
        setEntities([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Fetch error:", error);
        toast.error("Failed to fetch entities.");
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchEntities();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchEntities({});
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
        await deleteEntityApi(deleteId, routeName);
        toast.success("Entity deleted.");
        fetchEntities();
      } catch (error) {
        toast.error("Failed to delete entity.");
      }
      setDeleteId(null);
      setSelectedRowEntity(null);
    }
  };

  const handleEdit = (entity: EntityData) => {
    if (!canUpdate) return;
    setEditingEntity(entity);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleAdd = () => {
    if (!canCreate) return;
    setEditingEntity(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (entity: EntityData) => {
    setEditingEntity(entity);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, item: EntityData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowEntity(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowEntity ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => handleView(selectedRowEntity) },
    ...(canUpdate ? [{ label: "Edit Entity", icon: <Edit size={16} />, onClick: () => handleEdit(selectedRowEntity) }] : []),
    ...(canDelete ? [{ label: "Delete Entity", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRowEntity.id!) }] : []),
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

  const entityIdentifier = selectedRowEntity
    ? selectedRowEntity.companyName || selectedRowEntity.legalEntityName || `Entity #${selectedRowEntity.id}`
    : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Entity Settings</h1>
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
          <span>/</span><span className="text-text-primary dark:text-white">Entity</span>
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
                selected={filterValues[col.key] ? new Date(filterValues[col.key]) : null}
                onChange={(val: Date | null) => handleFilterChange(col.key, val ? formatLocalDate(val) : "")}
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
                    handleFilterChange(col.key, newGt || currentLt ? `${newGt},${currentLt}` : "");
                  }}
                  placeholder="> After"
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    handleFilterChange(col.key, currentGt || newLt ? `${currentGt},${newLt}` : "");
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
        data={entities}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        headers={headers}
        density="compact"
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
          canCreate ? (
            <Button variant="primary" onClick={handleAdd} leftIcon={<Plus size={18} />}>
              Add Entity
            </Button>
          ) : null
        }
        renderRow={(entity, index) => (
          <tr
            key={entity.id || index}
            onContextMenu={(e) => handleContextMenu(e, entity)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellContent: React.ReactNode = "-";
              const rawValue = (entity as any)[col.key];

              if (col.render) {
                cellContent = col.render(entity);
              } else if (col.key === "weekCommencing") {
                cellContent = rawValue ? <span className="capitalize">{rawValue.toLowerCase()}</span> : "-";
              } else {
                cellContent = rawValue || "-";
              }

              return (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap ${
                    col.key === "companyName" ? "font-medium text-primary" : ""
                  }`}
                >
                  {cellContent}
                </td>
              );
            })}
          </tr>
        )}
      />

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <EntityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEntities}
        moduleName={routeName}
        editingEntity={editingEntity}
        isViewMode={isViewMode}
      />
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRowEntity(null);
        }}
        onConfirm={handleDelete}
        title="Delete Entity"
        message={`Are you sure you want to delete entity "${entityIdentifier}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Entity;