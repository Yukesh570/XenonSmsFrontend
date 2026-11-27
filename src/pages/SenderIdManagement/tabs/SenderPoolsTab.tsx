import React, { useState, useEffect, useMemo } from "react";
import { Plus, List, Edit, Trash } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import ModalDataTable from "../../../components/ui/ModalDataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../../components/ui/AdvancedFilter";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import {
  getSenderPoolsApi,
  createSenderPoolApi,
  updateSenderPoolApi,
  deleteSenderPoolApi,
  getSenderPoolItemsApi,
  createSenderPoolItemApi,
  deleteSenderPoolItemApi,
  type SenderPool,
  type SenderPoolItem,
} from "../../../api/authorizationApi/senderPoolApi";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  tableLabel?: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (pool: SenderPool) => React.ReactNode;
  options?: Option[];
  isSearchOnly?: boolean;
  isSearchable?: boolean;
}

const DEFAULT_SEARCH_COLUMNS = ["name", "selectionMode", "status"];
const DEFAULT_TABLE_COLUMNS = ["id", "name", "selectionMode", "items", "status"];

export const SenderPoolsTab: React.FC = () => {
  const [pools, setPools] = useState<SenderPool[]>([]);
  const [items, setItems] = useState<SenderPoolItem[]>([]);
  const [selectedPool, setSelectedPool] = useState<SenderPool | null>(null);

  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // --- Pagination & Sorting ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // --- Column Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sender_pools_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((k) => k !== "actions");
          if (!filtered.includes("id")) return ["id", ...filtered];
          return filtered;
        }
      }
    } catch (e) {
      console.error("Error reading saved table columns", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sender_pools_search_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading saved search columns", e);
    }
    return DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("sender_pools_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("sender_pools_search_columns", JSON.stringify(searchColumns));
  }, [searchColumns]);

  // --- Filter Values ---
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  // --- Context Menu State ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowPool, setSelectedRowPool] = useState<SenderPool | null>(null);

  // --- Pool Form Modal States ---
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<number | null>(null);
  const [isSubmittingPool, setIsSubmittingPool] = useState(false);
  const [newPool, setNewPool] = useState<Partial<SenderPool>>({
    name: "",
    selectionMode: "RANDOM",
    status: "ACTIVE",
  });

  // --- Pool Delete Modal State ---
  const [deletePoolId, setDeletePoolId] = useState<number | null>(null);
  const [isDeletingPool, setIsDeletingPool] = useState(false);

  // --- Items Modal States ---
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemSortConfig, setItemSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [itemContextMenuPos, setItemContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowItem, setSelectedRowItem] = useState<SenderPoolItem | null>(null);

  // --- Item Form Modal States ---
  const [showItemForm, setShowItemForm] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SenderPoolItem>>({
    senderId: "",
    weight: 1,
    status: "ACTIVE",
  });

  // --- Item Delete Modal State ---
  const [deleteItem, setDeleteItem] = useState<SenderPoolItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    loadPools();
  }, []);

  useEffect(() => {
    if (selectedPool?.id) {
      loadItems(selectedPool.id);
    } else {
      setItems([]);
    }
  }, [selectedPool]);

  const loadPools = async () => {
    setIsLoadingPools(true);
    try {
      const res = await getSenderPoolsApi();
      setPools(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sender pools");
    } finally {
      setIsLoadingPools(false);
    }
  };

  const loadItems = async (poolId: number) => {
    setIsLoadingItems(true);
    try {
      const res = await getSenderPoolItemsApi(poolId);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load pool items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleOpenAddPool = () => {
    setEditingPoolId(null);
    setNewPool({ name: "", selectionMode: "RANDOM", status: "ACTIVE" });
    setShowPoolForm(true);
  };

  const handleOpenEditPool = (pool: SenderPool) => {
    setEditingPoolId(pool.id!);
    setNewPool({
      name: pool.name,
      selectionMode: pool.selectionMode,
      status: pool.status,
    });
    setShowPoolForm(true);
  };

  const handleOpenManageItems = (pool: SenderPool) => {
    setSelectedPool(pool);
    setShowItemsModal(true);
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPool.name?.trim()) {
      toast.error("Pool name is required");
      return;
    }
    setIsSubmittingPool(true);
    try {
      if (editingPoolId) {
        await updateSenderPoolApi(editingPoolId, newPool);
        toast.success("Sender pool updated successfully");
      } else {
        await createSenderPoolApi(newPool as SenderPool);
        toast.success("Sender pool created successfully");
      }
      setShowPoolForm(false);
      setEditingPoolId(null);
      setNewPool({ name: "", selectionMode: "RANDOM", status: "ACTIVE" });
      loadPools();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save sender pool");
    } finally {
      setIsSubmittingPool(false);
    }
  };

  const handleDeletePool = async () => {
    if (!deletePoolId) return;
    setIsDeletingPool(true);
    try {
      await deleteSenderPoolApi(deletePoolId);
      toast.success("Sender pool deleted successfully");
      setDeletePoolId(null);
      setSelectedRowPool(null);
      loadPools();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete sender pool");
    } finally {
      setIsDeletingPool(false);
    }
  };

  // --- Filtering & Sorting ---
  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filterValues });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const allColumns: ColumnConfig[] = [
    {
      key: "id",
      label: "ID",
      tableLabel: "ID",
      type: "number",
      isSearchable: false,
      render: (pool) => (
        <span
          className="font-mono text-sm font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEditPool(pool)}
        >
          #{pool.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "Pool Name",
      tableLabel: "Name",
      type: "text",
      render: (pool) => (
        <span
          className="text-sm font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEditPool(pool)}
          title="Click to edit pool"
        >
          {pool.name}
        </span>
      ),
    },
    {
      key: "selectionMode",
      label: "Selection Mode",
      tableLabel: "Mode",
      type: "text",
      options: [
        { label: "Random Rotation", value: "RANDOM" },
        { label: "Sequential", value: "SEQUENTIAL" },
      ],
      render: (pool) => (
        <StatusBadge status="SUBMITTED" customText={pool.selectionMode} />
      ),
    },
    {
      key: "items",
      label: "Numbers",
      tableLabel: "Numbers",
      type: "text",
      isSearchable: false,
      render: (pool) => (
        <span
          className="text-sm font-medium text-primary hover:underline cursor-pointer"
          onClick={() => handleOpenManageItems(pool)}
          title="Manage numbers for this pool"
        >
          Manage Numbers
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      tableLabel: "Status",
      type: "boolean",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
      ],
      render: (pool) => <StatusBadge status={pool.status} />,
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key)
  );

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // offset for S.N.
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

  const filteredAndSortedPools = useMemo(() => {
    let result = pools.filter((p) => {
      for (const colKey of Object.keys(appliedFilters)) {
        const val = appliedFilters[colKey]?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "selectionMode") {
          if (p.selectionMode?.toLowerCase() !== val) return false;
        } else if (colKey === "status") {
          if (p.status?.toLowerCase() !== val) return false;
        } else if (colKey === "name") {
          if (!p.name?.toLowerCase().includes(val)) return false;
        } else {
          const itemVal = String((p as any)[colKey] || "").toLowerCase();
          if (!itemVal.includes(val)) return false;
        }
      }
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return result;
  }, [pools, appliedFilters, sortConfig]);

  // Context Menu handlers
  const handleContextMenu = (e: React.MouseEvent, pool: SenderPool) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowPool(pool);
  };

  const poolContextMenuItems: ContextMenuItem[] = selectedRowPool
    ? [
        {
          label: "Manage Pool Numbers",
          icon: <List size={16} />,
          onClick: () => handleOpenManageItems(selectedRowPool),
        },
        {
          label: "Edit Sender Pool",
          icon: <Edit size={16} />,
          onClick: () => handleOpenEditPool(selectedRowPool),
        },
        {
          label: "Delete Sender Pool",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeletePoolId(selectedRowPool.id!),
        },
      ]
    : [];

  // --- Items Logic ---
  interface ModalItemColDef {
    key: string;
    label: string;
  }
  const DEFAULT_ITEM_COLS: ModalItemColDef[] = [
    { key: "sn", label: "S.N." },
    { key: "senderId", label: "Sender ID / MSISDN" },
    { key: "weight", label: "Weight" },
    { key: "status", label: "Status" },
  ];
  const [itemColumns, setItemColumns] = useState<ModalItemColDef[]>(DEFAULT_ITEM_COLS);

  const handleItemSort = (columnIndex: number) => {
    const col = itemColumns[columnIndex];
    if (!col || col.key === "sn") return;
    setItemSortConfig((prev) => {
      if (prev?.key === col.key) {
        if (prev.direction === "asc") return { key: col.key, direction: "desc" };
        return null;
      }
      return { key: col.key, direction: "asc" };
    });
  };

  const handleReorderItemColumns = (fromIdx: number, toIdx: number) => {
    setItemColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedItems = useMemo(() => {
    if (!itemSortConfig) return items;
    return [...items].sort((a: any, b: any) => {
      const aVal = a[itemSortConfig.key] ?? "";
      const bVal = b[itemSortConfig.key] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return itemSortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return itemSortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, itemSortConfig]);

  const handleItemContextMenu = (e: React.MouseEvent, item: SenderPoolItem) => {
    e.preventDefault();
    setItemContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowItem(item);
  };

  const itemContextMenuItems: ContextMenuItem[] = selectedRowItem
    ? [
        {
          label: "Delete Number",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteItem(selectedRowItem),
        },
      ]
    : [];

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool?.id || !newItem.senderId?.trim()) {
      toast.error("Sender ID is required");
      return;
    }
    setIsSubmittingItem(true);
    try {
      await createSenderPoolItemApi({
        ...(newItem as SenderPoolItem),
        senderPool: selectedPool.id,
      });
      toast.success("Number added to pool successfully");
      setShowItemForm(false);
      setNewItem({ senderId: "", weight: 1, status: "ACTIVE" });
      loadItems(selectedPool.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to add number to pool");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem?.id || !selectedPool?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteSenderPoolItemApi(deleteItem.id);
      toast.success("Number removed from pool successfully");
      setDeleteItem(null);
      setSelectedRowItem(null);
      loadItems(selectedPool.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete number from pool");
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Top Toolbar with AdvancedFilter and Add Pool */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative z-30">
            <AdvancedFilter
              columns={allColumns as any}
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
              isLoading={isLoadingPools}
              buttonLabel="Search Fields"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenAddPool}
            leftIcon={<Plus size={16} />}
          >
            Add Sender Pool
          </Button>
        </div>
      </div>

      {/* Dynamic FilterCard */}
      {visibleSearchFields.length > 0 && (
        <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
          {visibleSearchFields.map((col) => {
            if (col.options) {
              return (
                <Select
                  key={col.key}
                  label={col.label}
                  value={filterValues[col.key] || ""}
                  onChange={(val) => handleFilterChange(col.key, val)}
                  options={col.options}
                  placeholder={`Select ${col.label}`}
                  allowCustomValue={true}
                />
              );
            }
            return (
              <Input
                key={col.key}
                type={col.type === "number" ? "number" : "text"}
                label={col.label}
                value={filterValues[col.key] || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFilterChange(col.key, e.target.value)
                }
                placeholder={`Search ${col.label}`}
              />
            );
          })}
        </FilterCard>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
        <DataTable
          density="compact"
          storageKey="sender_pools_main_table"
          headers={tableHeaders}
          data={filteredAndSortedPools}
          totalItems={filteredAndSortedPools.length}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
          isLoading={isLoadingPools}
          onSort={handleSort}
          sortColumnIndex={
            sortConfig
              ? visibleTableFields.findIndex((c) => c.key === sortConfig.key) + 1
              : null
          }
          sortDirection={sortConfig?.direction || null}
          onReorderColumns={(fromIdx, toIdx) => {
            const adjustedFrom = fromIdx - 1;
            const adjustedTo = toIdx - 1;
            if (
              adjustedFrom >= 0 &&
              adjustedTo >= 0 &&
              adjustedFrom < visibleTableFields.length &&
              adjustedTo < visibleTableFields.length
            ) {
              const newFields = [...visibleTableFields];
              const [moved] = newFields.splice(adjustedFrom, 1);
              newFields.splice(adjustedTo, 0, moved);
              setTableColumns(newFields.map((f) => f.key));
            }
          }}
          renderRow={(pool: SenderPool, index: number) => {
            const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
            return (
              <tr
                key={pool.id || index}
                onContextMenu={(e) => handleContextMenu(e, pool)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="px-4 py-3.5 text-sm text-text-primary dark:text-white">
                  {rowNumber}
                </td>
                {visibleTableFields.map((col) => {
                  if (col.render) {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm whitespace-nowrap">
                        {col.render(pool)}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                      {(pool as any)[col.key] ?? "-"}
                    </td>
                  );
                })}
              </tr>
            );
          }}
        />
      </div>

      {/* Context Menu for Pools */}
      <ContextMenu
        position={contextMenuPos}
        items={poolContextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Add / Edit Pool Modal */}
      <Modal
        isOpen={showPoolForm}
        onClose={() => {
          setShowPoolForm(false);
          setEditingPoolId(null);
        }}
        title={editingPoolId ? "Edit Sender Pool" : "Add Sender Pool"}
        className="max-w-md"
      >
        <form onSubmit={handleSavePool} className="space-y-4">
          <Input
            label="Pool Name"
            value={newPool.name || ""}
            onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
            placeholder="e.g. MARKETING_ROTATION_POOL"
            required
          />

          <Select
            label="Selection Mode"
            value={newPool.selectionMode || "RANDOM"}
            onChange={(val) => setNewPool({ ...newPool, selectionMode: val as any })}
            options={[
              { value: "RANDOM", label: "Random Rotation" },
              { value: "SEQUENTIAL", label: "Sequential (Round Robin)" },
            ]}
          />

          <Select
            label="Status"
            value={newPool.status || "ACTIVE"}
            onChange={(val) => setNewPool({ ...newPool, status: val as any })}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowPoolForm(false);
                setEditingPoolId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingPool}>
              {editingPoolId ? "Update Pool" : "Create Pool"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Pool Modal */}
      <DeleteModal
        isOpen={!!deletePoolId}
        onClose={() => {
          setDeletePoolId(null);
          setSelectedRowPool(null);
        }}
        onConfirm={handleDeletePool}
        title="Delete Sender Pool"
        message="Are you sure you want to delete this sender pool? Translation rules using this pool will fail."
        isDeleting={isDeletingPool}
      />

      {/* Pool Items Modal */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => {
          setShowItemsModal(false);
          setSelectedPool(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <span>Pool Numbers:</span>
            <span className="text-primary font-bold">{selectedPool?.name}</span>
          </div>
        }
        className="max-w-4xl"
      >
        <div className="space-y-4" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            density="compact"
            storageKey="sender_pool_items_modal_table"
            data={sortedItems}
            isLoading={isLoadingItems}
            headers={itemColumns.map((c) => c.label)}
            onSort={handleItemSort}
            sortColumnIndex={itemSortConfig ? itemColumns.findIndex((c) => c.key === itemSortConfig.key) : undefined}
            sortDirection={itemSortConfig ? itemSortConfig.direction : undefined}
            onReorderColumns={handleReorderItemColumns}
            resizableColumns={true}
            headerActions={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowItemForm(true)}
                leftIcon={<Plus size={15} />}
              >
                Add Number
              </Button>
            }
            renderRow={(item: SenderPoolItem, index: number) => (
              <tr
                key={item.id || index}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                {itemColumns.map((col) => {
                  if (col.key === "sn") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-center text-sm font-medium text-text-secondary dark:text-gray-400">
                        {index + 1}
                      </td>
                    );
                  }
                  if (col.key === "senderId") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm font-semibold font-mono text-primary">
                        {item.senderId}
                      </td>
                    );
                  }
                  if (col.key === "weight") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-secondary dark:text-gray-300">
                        {item.weight ?? 1}
                      </td>
                    );
                  }
                  if (col.key === "status") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm">
                        <StatusBadge status={item.status} />
                      </td>
                    );
                  }
                  return null;
                })}
              </tr>
            )}
          />
        </div>
      </Modal>

      {/* Item Context Menu */}
      <ContextMenu
        position={itemContextMenuPos}
        items={itemContextMenuItems}
        onClose={() => setItemContextMenuPos(null)}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={showItemForm}
        onClose={() => setShowItemForm(false)}
        title="Add Number to Pool"
        className="max-w-sm"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Sender ID / MSISDN"
            value={newItem.senderId || ""}
            onChange={(e) => setNewItem({ ...newItem, senderId: e.target.value })}
            placeholder="e.g. +14155552671"
            required
          />

          <Input
            label="Weight"
            type="number"
            value={newItem.weight || 1}
            onChange={(e) => setNewItem({ ...newItem, weight: Number(e.target.value) })}
            min={1}
            max={100}
            required
          />

          <Select
            label="Status"
            value={newItem.status || "ACTIVE"}
            onChange={(val) => setNewItem({ ...newItem, status: val as any })}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setShowItemForm(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingItem}>
              Add Number
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Modal */}
      <DeleteModal
        isOpen={!!deleteItem}
        onClose={() => {
          setDeleteItem(null);
          setSelectedRowItem(null);
        }}
        onConfirm={handleDeleteItem}
        title="Delete Number from Pool"
        message={`Are you sure you want to remove "${deleteItem?.senderId}" from the pool?`}
        isDeleting={isDeletingItem}
      />
    </div>
  );
};
