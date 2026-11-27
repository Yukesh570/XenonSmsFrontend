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
  getReplacementListsApi,
  createReplacementListApi,
  updateReplacementListApi,
  deleteReplacementListApi,
  getReplacementListItemsApi,
  createReplacementListItemApi,
  deleteReplacementListItemApi,
  type ReplacementList,
  type ReplacementListItem,
} from "../../../api/authorizationApi/replacementListApi";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  tableLabel?: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (list: ReplacementList) => React.ReactNode;
  options?: Option[];
  isSearchOnly?: boolean;
  isSearchable?: boolean;
}

const DEFAULT_SEARCH_COLUMNS = ["name", "selectionMode", "status"];
const DEFAULT_TABLE_COLUMNS = ["id", "name", "selectionMode", "items", "status"];

export const ReplacementListsTab: React.FC = () => {
  const [lists, setLists] = useState<ReplacementList[]>([]);
  const [items, setItems] = useState<ReplacementListItem[]>([]);
  const [selectedList, setSelectedList] = useState<ReplacementList | null>(null);

  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // --- Pagination & Sorting ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // --- Column Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("replacement_lists_table_columns");
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
      const saved = localStorage.getItem("replacement_lists_search_columns");
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
    localStorage.setItem("replacement_lists_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("replacement_lists_search_columns", JSON.stringify(searchColumns));
  }, [searchColumns]);

  // --- Filter Values ---
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  // --- Context Menu State ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowList, setSelectedRowList] = useState<ReplacementList | null>(null);

  // --- List Form Modal States ---
  const [showListForm, setShowListForm] = useState(false);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [isSubmittingList, setIsSubmittingList] = useState(false);
  const [newList, setNewList] = useState<Partial<ReplacementList>>({
    name: "",
    selectionMode: "SEQUENTIAL",
    status: "ACTIVE",
  });

  // --- List Delete Modal State ---
  const [deleteListId, setDeleteListId] = useState<number | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  // --- Items Modal States ---
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemSortConfig, setItemSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [itemContextMenuPos, setItemContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowItem, setSelectedRowItem] = useState<ReplacementListItem | null>(null);

  // --- Item Form Modal States ---
  const [showItemForm, setShowItemForm] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ReplacementListItem>>({
    value: "",
    label: "",
    status: "ACTIVE",
    sequenceNo: 1,
  });

  // --- Item Delete Modal State ---
  const [deleteItem, setDeleteItem] = useState<ReplacementListItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedList?.id) {
      loadItems(selectedList.id);
    } else {
      setItems([]);
    }
  }, [selectedList]);

  const loadLists = async () => {
    setIsLoadingLists(true);
    try {
      const res = await getReplacementListsApi();
      setLists(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load replacement lists");
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadItems = async (listId: number) => {
    setIsLoadingItems(true);
    try {
      const res = await getReplacementListItemsApi(listId);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load list items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleOpenAddList = () => {
    setEditingListId(null);
    setNewList({ name: "", selectionMode: "SEQUENTIAL", status: "ACTIVE" });
    setShowListForm(true);
  };

  const handleOpenEditList = (list: ReplacementList) => {
    setEditingListId(list.id!);
    setNewList({
      name: list.name,
      selectionMode: list.selectionMode,
      status: list.status,
    });
    setShowListForm(true);
  };

  const handleOpenManageItems = (list: ReplacementList) => {
    setSelectedList(list);
    setShowItemsModal(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name?.trim()) {
      toast.error("List name is required");
      return;
    }
    setIsSubmittingList(true);
    try {
      if (editingListId) {
        await updateReplacementListApi(editingListId, newList);
        toast.success("Replacement list updated successfully");
      } else {
        await createReplacementListApi(newList as ReplacementList);
        toast.success("Replacement list created successfully");
      }
      setShowListForm(false);
      setEditingListId(null);
      setNewList({ name: "", selectionMode: "SEQUENTIAL", status: "ACTIVE" });
      loadLists();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save replacement list");
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListId) return;
    setIsDeletingList(true);
    try {
      await deleteReplacementListApi(deleteListId);
      toast.success("Replacement list deleted successfully");
      setDeleteListId(null);
      setSelectedRowList(null);
      loadLists();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete replacement list");
    } finally {
      setIsDeletingList(false);
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
      render: (list) => (
        <span
          className="font-mono text-sm font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEditList(list)}
        >
          #{list.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "List Name",
      tableLabel: "Name",
      type: "text",
      render: (list) => (
        <span
          className="text-sm font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEditList(list)}
          title="Click to edit list"
        >
          {list.name}
        </span>
      ),
    },
    {
      key: "selectionMode",
      label: "Selection Mode",
      tableLabel: "Mode",
      type: "text",
      options: [
        { label: "Sequential", value: "SEQUENTIAL" },
        { label: "Random", value: "RANDOM" },
      ],
      render: (list) => (
        <StatusBadge status="SUBMITTED" customText={list.selectionMode} />
      ),
    },
    {
      key: "items",
      label: "Values",
      tableLabel: "Values",
      type: "text",
      isSearchable: false,
      render: (list) => (
        <span
          className="text-sm font-medium text-primary hover:underline cursor-pointer"
          onClick={() => handleOpenManageItems(list)}
          title="Manage values for this list"
        >
          Manage Values
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
      render: (list) => <StatusBadge status={list.status} />,
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

  const filteredAndSortedLists = useMemo(() => {
    let result = lists.filter((l) => {
      for (const colKey of Object.keys(appliedFilters)) {
        const val = appliedFilters[colKey]?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "selectionMode") {
          if (l.selectionMode?.toLowerCase() !== val) return false;
        } else if (colKey === "status") {
          if (l.status?.toLowerCase() !== val) return false;
        } else if (colKey === "name") {
          if (!l.name?.toLowerCase().includes(val)) return false;
        } else {
          const itemVal = String((l as any)[colKey] || "").toLowerCase();
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
  }, [lists, appliedFilters, sortConfig]);

  // Context Menu handlers
  const handleContextMenu = (e: React.MouseEvent, list: ReplacementList) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowList(list);
  };

  const listContextMenuItems: ContextMenuItem[] = selectedRowList
    ? [
        {
          label: "Manage List Items",
          icon: <List size={16} />,
          onClick: () => handleOpenManageItems(selectedRowList),
        },
        {
          label: "Edit Replacement List",
          icon: <Edit size={16} />,
          onClick: () => handleOpenEditList(selectedRowList),
        },
        {
          label: "Delete Replacement List",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteListId(selectedRowList.id!),
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
    { key: "value", label: "Value" },
    { key: "label", label: "Label" },
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

  const handleItemContextMenu = (e: React.MouseEvent, item: ReplacementListItem) => {
    e.preventDefault();
    setItemContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowItem(item);
  };

  const itemContextMenuItems: ContextMenuItem[] = selectedRowItem
    ? [
        {
          label: "Delete Item",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteItem(selectedRowItem),
        },
      ]
    : [];

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList?.id || !newItem.value?.trim()) {
      toast.error("Item value is required");
      return;
    }
    setIsSubmittingItem(true);
    try {
      await createReplacementListItemApi({
        ...(newItem as ReplacementListItem),
        replacementList: selectedList.id,
        sequenceNo: newItem.sequenceNo || items.length + 1,
      });
      toast.success("Replacement item added successfully");
      setShowItemForm(false);
      setNewItem({ value: "", label: "", status: "ACTIVE", sequenceNo: items.length + 1 });
      loadItems(selectedList.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to add replacement item");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem?.id || !selectedList?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteReplacementListItemApi(deleteItem.id);
      toast.success("Replacement item deleted successfully");
      setDeleteItem(null);
      setSelectedRowItem(null);
      loadItems(selectedList.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete replacement item");
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Top Toolbar with AdvancedFilter and Add List */}
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
              isLoading={isLoadingLists}
              buttonLabel="Search Fields"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenAddList}
            leftIcon={<Plus size={16} />}
          >
            Add Replacement List
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
          storageKey="replacement_lists_main_table"
          headers={tableHeaders}
          data={filteredAndSortedLists}
          totalItems={filteredAndSortedLists.length}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
          isLoading={isLoadingLists}
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
          renderRow={(list: ReplacementList, index: number) => {
            const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
            return (
              <tr
                key={list.id || index}
                onContextMenu={(e) => handleContextMenu(e, list)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="px-4 py-3.5 text-sm text-text-primary dark:text-white">
                  {rowNumber}
                </td>
                {visibleTableFields.map((col) => {
                  if (col.render) {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm whitespace-nowrap">
                        {col.render(list)}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                      {(list as any)[col.key] ?? "-"}
                    </td>
                  );
                })}
              </tr>
            );
          }}
        />
      </div>

      {/* Context Menu for Lists */}
      <ContextMenu
        position={contextMenuPos}
        items={listContextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Add / Edit List Modal */}
      <Modal
        isOpen={showListForm}
        onClose={() => {
          setShowListForm(false);
          setEditingListId(null);
        }}
        title={editingListId ? "Edit Replacement List" : "Add Replacement List"}
        className="max-w-md"
      >
        <form onSubmit={handleSaveList} className="space-y-4">
          <Input
            label="List Name"
            value={newList.name || ""}
            onChange={(e) => setNewList({ ...newList, name: e.target.value })}
            placeholder="e.g. OTP_ALPHANUMERIC_LIST"
            required
          />

          <Select
            label="Selection Mode"
            value={newList.selectionMode || "SEQUENTIAL"}
            onChange={(val) => setNewList({ ...newList, selectionMode: val as any })}
            options={[
              { value: "SEQUENTIAL", label: "Sequential (Round Robin)" },
              { value: "RANDOM", label: "Random Rotation" },
            ]}
          />

          <Select
            label="Status"
            value={newList.status || "ACTIVE"}
            onChange={(val) => setNewList({ ...newList, status: val as any })}
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
                setShowListForm(false);
                setEditingListId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingList}>
              {editingListId ? "Update List" : "Create List"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete List Modal */}
      <DeleteModal
        isOpen={!!deleteListId}
        onClose={() => {
          setDeleteListId(null);
          setSelectedRowList(null);
        }}
        onConfirm={handleDeleteList}
        title="Delete Replacement List"
        message="Are you sure you want to delete this list? Translation rules using this list will fail."
        isDeleting={isDeletingList}
      />

      {/* List Items Modal */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => {
          setShowItemsModal(false);
          setSelectedList(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <span>List Values:</span>
            <span className="text-primary font-bold">{selectedList?.name}</span>
          </div>
        }
        className="max-w-4xl"
      >
        <div className="space-y-4" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            density="compact"
            storageKey="replacement_list_items_modal_table"
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
                Add Value
              </Button>
            }
            renderRow={(item: ReplacementListItem, index: number) => (
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
                  if (col.key === "value") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm font-semibold font-mono text-primary">
                        {item.value}
                      </td>
                    );
                  }
                  if (col.key === "label") {
                    return (
                      <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300">
                        {item.label || "-"}
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
        title="Add Value to List"
        className="max-w-sm"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Sender ID / Replacement Value"
            value={newItem.value || ""}
            onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
            placeholder="e.g. AUTH_CODE"
            required
          />

          <Input
            label="Label (Optional)"
            value={newItem.label || ""}
            onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
            placeholder="e.g. Promotional Tag"
          />

          <Input
            label="Sequence Number"
            type="number"
            value={newItem.sequenceNo || items.length + 1}
            onChange={(e) => setNewItem({ ...newItem, sequenceNo: Number(e.target.value) })}
            min={1}
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
              Add Value
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
        title="Delete Value from List"
        message={`Are you sure you want to remove "${deleteItem?.value}" from the list?`}
        isDeleting={isDeletingItem}
      />
    </div>
  );
};
