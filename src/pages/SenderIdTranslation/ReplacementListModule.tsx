import React, { useState, useEffect, useMemo } from "react";
import { Home, Plus, List, Edit, Trash } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import ModalDataTable from "../../components/ui/ModalDataTable";
import Modal from "../../components/ui/Modal";
import { DeleteModal } from "../../components/modals/DeleteModal";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getClientsApi } from "../../api/clientApi/clientApi";
import {
  getReplacementListsApi,
  createReplacementListApi,
  updateReplacementListApi,
  deleteReplacementListApi,
  getReplacementListItemsApi,
  createReplacementListItemApi,
  deleteReplacementListItemApi,
  type ReplacementList,
  type ReplacementListItem
} from "../../api/authorizationApi/replacementListApi";

const TABLE_HEADERS = ["ID", "Name", "Mode", "Status"];
const TABLE_COL_KEYS = ["id", "name", "selectionMode", "status"];

const ReplacementListModule: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [lists, setLists] = useState<ReplacementList[]>([]);
  const [items, setItems] = useState<ReplacementListItem[]>([]);
  const [selectedList, setSelectedList] = useState<ReplacementList | null>(null);

  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // --- Main Table Sorting & Ordering ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

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
    status: "ACTIVE"
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
    sequenceNo: 1
  });

  // --- Item Delete Modal State ---
  const [deleteItem, setDeleteItem] = useState<ReplacementListItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    loadClients();
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedList?.id) {
      loadItems(selectedList.id);
    } else {
      setItems([]);
    }
  }, [selectedList]);

  const loadClients = async () => {
    try {
      const res = await getClientsApi(undefined, 1, 1000);
      setClients(res.results || res || []);
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  };

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

  // --- Main Table Sorting ---
  const handleSort = (columnIndex: number) => {
    const colKey = TABLE_COL_KEYS[columnIndex];
    if (!colKey) return;
    setSortConfig((prev) => {
      if (prev?.key === colKey) {
        if (prev.direction === "asc") return { key: colKey, direction: "desc" };
        return null;
      }
      return { key: colKey, direction: "asc" };
    });
  };

  const sortedLists = useMemo(() => {
    if (!sortConfig) return lists;
    return [...lists].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
  }, [lists, sortConfig]);

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent, list: ReplacementList) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowList(list);
  };

  const handleOpenAddModal = () => {
    setEditingListId(null);
    setNewList({
      name: "",
      client: null,
      selectionMode: "SEQUENTIAL",
      status: "ACTIVE"
    });
    setShowListForm(true);
  };

  const handleOpenEditModal = (list: ReplacementList) => {
    setEditingListId(list.id!);
    setNewList({
      name: list.name,
      client: list.client || null,
      selectionMode: list.selectionMode || "SEQUENTIAL",
      status: list.status || "ACTIVE"
    });
    setShowListForm(true);
  };

  const handleViewItems = (list: ReplacementList) => {
    setSelectedList(list);
    setShowItemsModal(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name?.trim()) {
      toast.error("List Name is required");
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
      loadLists();
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.response?.data?.detail || e?.response?.data?.name?.[0] || "Failed to save replacement list";
      toast.error(errMsg);
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!deleteListId) return;
    setIsDeletingList(true);
    try {
      await deleteReplacementListApi(deleteListId);
      toast.success("Replacement list deleted successfully");
      loadLists();
      if (selectedList?.id === deleteListId) {
        setSelectedList(null);
        setShowItemsModal(false);
      }
      setDeleteListId(null);
      setSelectedRowList(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete replacement list");
    } finally {
      setIsDeletingList(false);
    }
  };

  // --- Items Actions ---
  const handleItemContextMenu = (e: React.MouseEvent, item: ReplacementListItem) => {
    e.preventDefault();
    setItemContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowItem(item);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList?.id) return;
    if (!newItem.value?.trim()) {
      toast.error("Item value is required");
      return;
    }

    setIsSubmittingItem(true);
    try {
      await createReplacementListItemApi({
        ...newItem,
        replacementList: selectedList.id
      } as ReplacementListItem);
      toast.success("Item added successfully");
      setShowItemForm(false);
      loadItems(selectedList.id);
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.response?.data?.detail || e?.response?.data?.value?.[0] || "Failed to add item";
      toast.error(errMsg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItem?.id || !selectedList?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteReplacementListItemApi(deleteItem.id);
      toast.success("Item deleted successfully");
      loadItems(selectedList.id);
      setDeleteItem(null);
      setSelectedRowItem(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete item");
    } finally {
      setIsDeletingItem(false);
    }
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
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
  }, [items, itemSortConfig]);

  const menuItems: ContextMenuItem[] = selectedRowList
    ? [
        {
          label: "View Items",
          icon: <List size={16} />,
          onClick: () => handleViewItems(selectedRowList)
        },
        {
          label: "Edit List",
          icon: <Edit size={16} />,
          onClick: () => handleOpenEditModal(selectedRowList)
        },
        {
          label: "Delete List",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteListId(selectedRowList.id!)
        }
      ]
    : [];

  const itemMenuItems: ContextMenuItem[] = selectedRowItem
    ? [
        {
          label: "Delete Item",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteItem(selectedRowItem)
        }
      ]
    : [];

  return (
    <div className="w-full pb-8" onClick={() => { setContextMenuPos(null); setItemContextMenuPos(null); }}>
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
          Replacement Lists
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Replacement Lists</span>
        </div>
      </div>

      {/* Main Table following standard UI pattern */}
      <DataTable
        data={sortedLists}
        density="compact"
        headers={TABLE_HEADERS}
        isLoading={isLoadingLists}
        onSort={handleSort}
        sortColumnIndex={
          sortConfig ? TABLE_COL_KEYS.indexOf(sortConfig.key) : null
        }
        sortDirection={sortConfig?.direction || null}
        headerActions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenAddModal}
          >
            Add List
          </Button>
        }
        renderRow={(list: ReplacementList) => (
          <tr
            key={list.id}
            onContextMenu={(e) => handleContextMenu(e, list)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
          >
            <td className="w-12 min-w-[48px] max-w-[48px] !px-1 text-center text-sm font-medium text-text-primary dark:text-white">
              {list.id}
            </td>
            <td
              className="px-4 py-3 font-semibold text-primary cursor-pointer hover:underline"
              onClick={() => handleViewItems(list)}
              title="Click or right-click to view items"
            >
              {list.name}
            </td>
            <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300">
              {list.selectionMode}
            </td>
            <td className="px-4 py-3 text-xs">
              <StatusBadge status={list.status} />
            </td>
          </tr>
        )}
      />

      {/* Context Menu for Main Table */}
      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Add / Edit List Modal */}
      <Modal
        isOpen={showListForm}
        onClose={() => setShowListForm(false)}
        title={editingListId ? "Edit Replacement List" : "Add Replacement List"}
        className="max-w-md"
      >
        <form onSubmit={handleSaveList} className="space-y-4">
          <Input
            label="Name"
            value={newList.name || ""}
            onChange={(e) => setNewList({ ...newList, name: e.target.value })}
            placeholder="e.g. Primary Alpha Sender IDs"
            required
          />
          <Select
            label="Client (Optional)"
            value={newList.client ? String(newList.client) : ""}
            onChange={(v) => setNewList({ ...newList, client: v ? Number(v) : null })}
            options={[
              { value: "", label: "Global (All Clients)" },
              ...clients.map((c) => ({ value: String(c.id), label: c.name || `Client ${c.id}` }))
            ]}
          />
          <Select
            label="Selection Mode"
            value={newList.selectionMode || "SEQUENTIAL"}
            onChange={(v) => setNewList({ ...newList, selectionMode: v as any })}
            options={[
              { value: "SEQUENTIAL", label: "Sequential" },
              { value: "RANDOM", label: "Random" }
            ]}
            clearable={false}
          />
          <Select
            label="Status"
            value={newList.status || "ACTIVE"}
            onChange={(v) => setNewList({ ...newList, status: v as any })}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" }
            ]}
            clearable={false}
          />
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowListForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingList}
            >
              {isSubmittingList ? "Saving..." : editingListId ? "Save Changes" : "Add List"}
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
        onConfirm={handleConfirmDeleteList}
        title="Delete Replacement List"
        message={`Are you sure you want to delete replacement list "${selectedRowList?.name || ""}"? This action cannot be undone.`}
        isDeleting={isDeletingList}
      />

      {/* Items Modal - uses reusable ModalDataTable */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => {
          setShowItemsModal(false);
          setSelectedList(null);
        }}
        title={`List Items: ${selectedList?.name || ""}`}
        className="max-w-4xl"
      >
        <div className="w-full flex flex-col" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            data={sortedItems}
            headers={["Seq", "Value", "Label", "Status"]}
            columnKeys={["sequenceNo", "value", "label", "status"]}
            isLoading={isLoadingItems}
            serverSide={false}
            headerActions={
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setNewItem({
                    status: "ACTIVE",
                    sequenceNo: (items.length || 0) + 1,
                    value: "",
                    label: "",
                  });
                  setShowItemForm(true);
                }}
              >
                Add Item
              </Button>
            }
            onSort={(colIdx) => {
              const keys = ["sequenceNo", "value", "label", "status"];
              const key = keys[colIdx];
              if (!key) return;
              setItemSortConfig((prev) => {
                if (prev?.key === key) {
                  if (prev.direction === "asc") return { key, direction: "desc" };
                  return null;
                }
                return { key, direction: "asc" };
              });
            }}
            sortColumnIndex={
              itemSortConfig
                ? ["sequenceNo", "value", "label", "status"].indexOf(itemSortConfig.key)
                : null
            }
            sortDirection={itemSortConfig?.direction || null}
            emptyMessage="No items found in this replacement list."
            renderRow={(item: ReplacementListItem, index: number) => (
              <tr
                key={item.id || index}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="w-12 min-w-[48px] max-w-[48px] !px-1 text-center text-sm font-medium text-text-primary dark:text-white">
                  {item.sequenceNo}
                </td>
                <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">{item.value}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-gray-400">{item.label || "-"}</td>
                <td className="px-4 py-3 text-xs">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            )}
          />

          {/* Items Context Menu */}
          <ContextMenu
            position={itemContextMenuPos}
            items={itemMenuItems}
            onClose={() => setItemContextMenuPos(null)}
          />
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={showItemForm}
        onClose={() => setShowItemForm(false)}
        title="Add List Item"
        className="max-w-md z-[60]"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Value"
            value={newItem.value || ""}
            onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
            placeholder="e.g. SENDER_A"
            required
          />
          <Input
            label="Sequence No"
            type="number"
            value={newItem.sequenceNo || ""}
            onChange={(e) => setNewItem({ ...newItem, sequenceNo: Number(e.target.value) })}
            required
          />
          <Input
            label="Label (Optional)"
            value={newItem.label || ""}
            onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
            placeholder="e.g. Primary Alpha"
          />
          <Select
            label="Status"
            value={newItem.status || "ACTIVE"}
            onChange={(v) => setNewItem({ ...newItem, status: v as any })}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" }
            ]}
            clearable={false}
          />
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowItemForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingItem}
            >
              {isSubmittingItem ? "Adding..." : "Add Item"}
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
        onConfirm={handleConfirmDeleteItem}
        title="Delete List Item"
        message={`Are you sure you want to delete item "${deleteItem?.value || ""}"? This action cannot be undone.`}
        isDeleting={isDeletingItem}
      />
    </div>
  );
};

export default ReplacementListModule;
