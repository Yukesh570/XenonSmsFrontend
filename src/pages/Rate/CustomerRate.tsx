import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Layers, Edit, Trash } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// ⚡️ FIX: Using the Group API
import {
  getCustomerRateGroupsApi,
  deleteCustomerRateGroupApi,
  createCustomerRateGroupApi,
  updateCustomerRateGroupApi,
  type CustomerRateGroupData
} from "../../api/rateApi/customerRateApi";

import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

import { CustomerRateTableModal } from "../../components/modals/Rate/CustomerRateTableModal";

import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import { DeleteModal } from "../../components/modals/DeleteModal";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render?: (data: any) => React.ReactNode;
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

const DEFAULT_SEARCH_COLUMNS = ["name", "status"];
const DEFAULT_TABLE_COLUMNS = ["name", "status", "total_rates", "createdAt"];

const GroupModal = ({ isOpen, onClose, onSuccess, moduleName, editingGroup }: any) => {
  const [formData, setFormData] = useState({ name: "", status: "ACTIVE" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingGroup) {
        setFormData({ name: editingGroup.name, status: editingGroup.status });
      } else {
        setFormData({ name: "", status: "ACTIVE" });
      }
    }
  }, [isOpen, editingGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");
    setIsSubmitting(true);
    try {
      if (editingGroup) {
        await updateCustomerRateGroupApi(editingGroup.id, formData, moduleName);
        toast.success("Group updated!");
      } else {
        await createCustomerRateGroupApi(formData, moduleName);
        toast.success("Group created!");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to save group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingGroup ? "Edit Rate Group" : "Create Rate Group"} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Group Name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        <Select label="Status" value={formData.status} onChange={(v) => setFormData({ ...formData, status: v })} options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
};

const CustomerRate: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [groupedRates, setGroupedRates] = useState<CustomerRateGroupData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [countryMap, setCountryMap] = useState<Record<string, string>>({});

  const [activeRateGroup, setActiveRateGroup] = useState<string | null>(null);
  const [activeRateGroupId, setActiveRateGroupId] = useState<number | null>(null);
  const [isSubTableModalOpen, setIsSubTableModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowGroup, setSelectedRowGroup] = useState<CustomerRateGroupData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("customerrate_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "customerrate_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("customerrate_grouped_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("customerrate_grouped_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/")[1] || "customerRate";
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => { actionHelper("Customer Rate", `Opened Customer Rate Module`, false); }, 100);
      hasLoggedOpening.current = true;
    }

    getCountriesApi("country", 1, 1000).then((res: any) => {
      const list = res.results || (Array.isArray(res) ? res : []);
      const map: Record<string, string> = {};
      list.forEach((c: any) => { map[String(c.id)] = c.name; });
      setCountryMap(map);
    }).catch(console.error);
  }, []);

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const allColumns: ColumnConfig[] = [

    { key: "name", label: "Rate Group Name", type: "text", filterKey: "name__icontains" },
    {
      key: "status",
      label: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "status",
      render: (c: any) => <StatusBadge status={c.status} />,
    },
    {
      key: "total_rates",
      label: "Total Rates",
      type: "number",
      filterKey: "total_rates",
      render: (c: any) => c.total_rates || 0,
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
      render: (c: any) => (c.createdAt ? formatDateTime(c.createdAt) : "-")
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

  const tableFilterColumns = allColumns.filter((c) => !c.isSearchOnly).map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => { setFilterValues((prev) => ({ ...prev, [key]: value })); };

  const fetchGroupedRates = async (filters: Record<string, string> | null = null) => {
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
          } else if (columnDef?.type === "text") {
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

      const response: any = await getCustomerRateGroupsApi(routeName, currentPage, rowsPerPage, currentSearchParams);

      if (newController.signal.aborted) return;
      if (response && response.results) {
        setGroupedRates(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setGroupedRates(response);
        setTotalItems(response.length);
      } else {
        setGroupedRates([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to fetch customer rate groups.");
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedRates();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => { setCurrentPage(1); fetchGroupedRates(); };
  const handleClearFilters = () => { setFilterValues({}); setCurrentPage(1); fetchGroupedRates({}); };

  const handleDelete = async () => {
    if (deleteId && canDelete) {
      try {
        await deleteCustomerRateGroupApi(deleteId, routeName);
        toast.success("Group deleted.");
        fetchGroupedRates();
      } catch (error) { toast.error("Failed to delete group."); }
      setDeleteId(null);
      setSelectedRowGroup(null);
    }
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

  const handleContextMenu = (e: React.MouseEvent, groupItem: any) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowGroup(groupItem);
  };

  const openSubTableModal = (groupItem: any) => {
    setActiveRateGroup(groupItem.name);
    setActiveRateGroupId(groupItem.id);
    setIsSubTableModalOpen(true);
  };

  const menuItems: ContextMenuItem[] = selectedRowGroup ? [
    { label: "Manage Rates", icon: <Layers size={16} />, onClick: () => openSubTableModal(selectedRowGroup) },
    ...(canUpdate ? [{ label: "Edit Group", icon: <Edit size={16} />, onClick: () => { setEditingGroup(selectedRowGroup); setIsCreateModalOpen(true); } }] : []),
    ...(canDelete ? [{ label: "Delete Group", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRowGroup.id!) }] : []),
  ] : [];

  const tableHeaders = ["S.N.", ...visibleTableFields.map((col) => col.tableLabel || col.label)];
  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Customer Rates Manager</h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={(cols: any) => setTableColumns(cols)}
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
              onFilter={(newCols: any) => {
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
          <span>/</span><span className="text-text-primary dark:text-white">Customer Rates</span>
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
          return <Input key={col.key} type={col.type || "text"} label={`Search ${baseLabel}`} value={filterValues[col.key] || ""} onChange={(e) => handleFilterChange(col.key, e.target.value)} placeholder={`${baseLabel}`} />;
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={groupedRates}
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
        headerActions={canCreate ? <Button variant="primary" onClick={() => { setEditingGroup(null); setIsCreateModalOpen(true); }} leftIcon={<Plus size={18} />}>Create Group</Button> : null}
        renderRow={(routeGroupObj: any, index: number) => (
          <tr key={index} onContextMenu={(e) => handleContextMenu(e, routeGroupObj)} className="hover:bg-gray-50 dark:hover:bg-gray-700/80 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors">
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">{(currentPage - 1) * rowsPerPage + index + 1}</td>
            {visibleTableFields.map((col) => {
              let cellData = (routeGroupObj as any)[col.key];
              if (col.render) return <td key={col.key} className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap`}>{col.render(routeGroupObj)}</td>;
              if (col.options) { const match = col.options.find((opt) => opt.value === String(cellData)); cellData = match ? match.label : cellData; }
              if (col.key === "name") {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm font-semibold text-primary cursor-pointer hover:underline"
                    onClick={() => openSubTableModal(routeGroupObj)}
                  >
                    {cellData || "-"}
                  </td>
                );
              }
              return <td key={col.key} className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{cellData || "-"}</td>;
            })}
          </tr>
        )}
      />

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <GroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={fetchGroupedRates} moduleName={routeName} editingGroup={editingGroup} />

      <CustomerRateTableModal
        isOpen={isSubTableModalOpen}
        onClose={() => { setIsSubTableModalOpen(false); setActiveRateGroup(null); setActiveRateGroupId(null); fetchGroupedRates(); }}
        rateGroup={activeRateGroup}
        rateGroupId={activeRateGroupId}
        moduleName={routeName}
        canUpdate={canUpdate}
        canDelete={canDelete}
        countryMap={countryMap}
      />

      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => {
          setDeleteId(null);
          setSelectedRowGroup(null);
        }} 
        onConfirm={handleDelete} 
        title="Delete Rate Group" 
        message={`Are you sure you want to delete rate group "${selectedRowGroup?.name || ""}"? All rates inside it will be affected.`} 
      />
    </div>
  );
};

export default CustomerRate;