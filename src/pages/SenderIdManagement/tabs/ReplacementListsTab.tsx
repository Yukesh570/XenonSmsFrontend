import React, { useState, useEffect, useMemo } from "react";
import { Plus, List, Edit, Trash } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import ModalDataTable from "../../../components/ui/ModalDataTable";
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

const TABLE_HEADERS = ["ID", "Name", "Mode", "Status"];
const TABLE_COL_KEYS = ["id", "name", "selectionMode", "status"];

export const ReplacementListsTab: React.FC = () => {
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
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [lists, sortConfig]);

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
          onClick: () => {
            setSelectedList(selectedRowList);
            setShowItemsModal(true);
          },
        },
        {
          label: "Edit List",
          icon: <Edit size={16} />,
          onClick: () => {
            setEditingListId(selectedRowList.id!);
            setNewList({
              name: selectedRowList.name,
              selectionMode: selectedRowList.selectionMode,
              status: selectedRowList.status,
            });
            setShowListForm(true);
          },
        },
        {
          label: "Delete List",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeleteListId(selectedRowList.id!),
        },
      ]
    : [];

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name) {
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

  // --- Items Logic ---
  const ITEM_HEADERS = ["Sequence", "Value", "Label", "Status"];
  const ITEM_COL_KEYS = ["sequenceNo", "value", "label", "status"];

  const handleItemSort = (columnIndex: number) => {
    const colKey = ITEM_COL_KEYS[columnIndex];
    if (!colKey) return;
    setItemSortConfig((prev) => {
      if (prev?.key === colKey) {
        if (prev.direction === "asc") return { key: colKey, direction: "desc" };
        return null;
      }
      return { key: colKey, direction: "asc" };
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
    if (!selectedList?.id || !newItem.value) {
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
        <DataTable
          density="compact"
          data={sortedLists}
          isLoading={isLoadingLists}
          headers={TABLE_HEADERS}
          onSort={handleSort}
          sortColumnIndex={sortConfig ? TABLE_COL_KEYS.indexOf(sortConfig.key) : undefined}
          sortDirection={sortConfig ? sortConfig.direction : undefined}
          headerActions={
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingListId(null);
                setNewList({ name: "", selectionMode: "SEQUENTIAL", status: "ACTIVE" });
                setShowListForm(true);
              }}
              leftIcon={<Plus size={15} />}
            >
              Add Replacement List
            </Button>
          }
          renderRow={(list: ReplacementList, index: number) => (
            <tr
              key={list.id || index}
              onContextMenu={(e) => handleContextMenu(e, list)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
            >
              <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-400 text-xs">
                {list.id}
              </td>
              <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                {list.name}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                  {list.selectionMode}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={list.status} />
              </td>
            </tr>
          )}
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
            data={sortedItems}
            isLoading={isLoadingItems}
            headers={ITEM_HEADERS}
            onSort={handleItemSort}
            sortColumnIndex={itemSortConfig ? ITEM_COL_KEYS.indexOf(itemSortConfig.key) : undefined}
            sortDirection={itemSortConfig ? itemSortConfig.direction : undefined}
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
                <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-400 text-xs">
                  {item.sequenceNo ?? index + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-text-primary dark:text-white font-mono">
                  {item.value}
                </td>
                <td className="px-4 py-3 text-text-secondary dark:text-gray-300">
                  {item.label || "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
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
