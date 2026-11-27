import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { Plus, Edit, Trash, Shuffle } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import ModalDataTable from "../../ui/ModalDataTable";
import { StatusBadge } from "../../ui/StatusBadge";
import ContextMenu, { type ContextMenuItem } from "../../ui/ContextMenu";
import { DeleteModal } from "../DeleteModal";
import { MessageTextItemModal } from "./MessageTextItemModal";
import type {
  MessageTextReplacementList,
  MessageTextReplacementListItem,
} from "../../../api/messageFilterApi/messageFilterApi";
import {
  getMessageTextReplacementListItemsApi,
  deleteMessageTextReplacementListItemApi,
  updateMessageTextReplacementListItemApi,
} from "../../../api/messageFilterApi/messageFilterApi";

export interface MessageTextEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeList: MessageTextReplacementList | null;
  onUpdateListCount?: () => void;
}

const DEFAULT_ITEM_COLUMNS = [
  "sn",
  "sequenceNo",
  "value",
  "length",
  "status",
];

export const MessageTextEntriesModal: React.FC<MessageTextEntriesModalProps> = ({
  isOpen,
  onClose,
  activeList,
  onUpdateListCount,
}) => {
  const [items, setItems] = useState<MessageTextReplacementListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Pagination & Sorting State for Items
  const [itemCurrentPage, setItemCurrentPage] = useState(1);
  const [itemRowsPerPage, setItemRowsPerPage] = useState(50);
  const [itemSortConfig, setItemSortConfig] = useState<{
    key: string;
    index: number;
    direction: "asc" | "desc";
  } | null>(null);

  // Column reordering state
  const [columns, setColumns] = useState<string[]>(DEFAULT_ITEM_COLUMNS);

  // Add / Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MessageTextReplacementListItem | null>(null);

  // Context Menu State for Items
  const [itemContextMenuPos, setItemContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowItem, setSelectedRowItem] =
    useState<MessageTextReplacementListItem | null>(null);

  // Delete Item State
  const [deletingItem, setDeletingItem] =
    useState<MessageTextReplacementListItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const loadItems = async (listId: number) => {
    setLoadingItems(true);
    try {
      const res = await getMessageTextReplacementListItemsApi(listId);
      const data = Array.isArray(res) ? res : (res as any)?.results || [];
      setItems(
        data.sort(
          (a: MessageTextReplacementListItem, b: MessageTextReplacementListItem) =>
            a.sequenceNo - b.sequenceNo
        )
      );
    } catch (err: any) {
      toast.error("Failed to load list items");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeList?.id) {
      setItemCurrentPage(1);
      setItemSortConfig(null);
      setColumns(DEFAULT_ITEM_COLUMNS);
      loadItems(activeList.id);
    } else {
      setItems([]);
    }
  }, [isOpen, activeList]);

  const handleItemSort = (columnIndex: number) => {
    const colKey = columns[columnIndex];
    if (!colKey || colKey === "sn") return;

    setItemSortConfig((prev) => {
      if (prev && prev.key === colKey) {
        if (prev.direction === "asc") {
          return { key: colKey, index: columnIndex, direction: "desc" };
        }
        return null;
      }
      return { key: colKey, index: columnIndex, direction: "asc" };
    });
  };

  const handleReorderColumns = (fromIndex: number, toIndex: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];
    if (itemSortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[itemSortConfig.key as keyof MessageTextReplacementListItem];
        let bVal: any = b[itemSortConfig.key as keyof MessageTextReplacementListItem];
        if (itemSortConfig.key === "length") {
          aVal = a.value ? a.value.length : 0;
          bVal = b.value ? b.value.length : 0;
        }
        if (aVal < bVal) return itemSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return itemSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [items, itemSortConfig]);

  const paginatedItems = useMemo(() => {
    const start = (itemCurrentPage - 1) * itemRowsPerPage;
    return filteredAndSortedItems.slice(start, start + itemRowsPerPage);
  }, [filteredAndSortedItems, itemCurrentPage, itemRowsPerPage]);

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: MessageTextReplacementListItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async () => {
    if (!deletingItem?.id || !activeList?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteMessageTextReplacementListItemApi(
        activeList.id,
        deletingItem.id
      );
      toast.success("Item deleted");
      setDeletingItem(null);
      setSelectedRowItem(null);
      loadItems(activeList.id);
      onUpdateListCount?.();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete item");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleToggleItemStatus = async (item: MessageTextReplacementListItem) => {
    if (!activeList?.id || !item.id) return;
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateMessageTextReplacementListItemApi(
        activeList.id,
        item.id,
        { status: nextStatus }
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      );
      toast.success("Item status updated");
    } catch (err: any) {
      toast.error("Failed to toggle item status");
    }
  };

  const handleItemContextMenu = (
    e: React.MouseEvent,
    item: MessageTextReplacementListItem
  ) => {
    e.preventDefault();
    setItemContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowItem(item);
  };

  const itemContextMenuItems: ContextMenuItem[] = selectedRowItem
    ? [
        {
          label: "Edit Entry",
          icon: <Edit size={16} />,
          onClick: () => {
            handleOpenEditItem(selectedRowItem);
            setItemContextMenuPos(null);
          },
        },
        {
          label: selectedRowItem.status === "ACTIVE" ? "Deactivate" : "Activate",
          icon: <Shuffle size={16} />,
          onClick: () => {
            handleToggleItemStatus(selectedRowItem);
            setItemContextMenuPos(null);
          },
        },
        {
          label: "Delete Entry",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => {
            setDeletingItem(selectedRowItem);
            setItemContextMenuPos(null);
          },
        },
      ]
    : [];

  const headers = useMemo(() => {
    const labelMap: Record<string, string> = {
      sn: "S.N.",
      sequenceNo: "Seq #",
      value: "Replacement Value",
      length: "Length",
      status: "Status",
    };
    return columns.map((col) => labelMap[col] || col);
  }, [columns]);

  const renderCell = (
    colKey: string,
    item: MessageTextReplacementListItem,
    index: number
  ) => {
    switch (colKey) {
      case "sn":
        return (
          <td
            key={colKey}
            className="w-12 min-w-[48px] max-w-[48px] px-2 py-2.5 text-center text-xs text-text-primary dark:text-white"
          >
            {(itemCurrentPage - 1) * itemRowsPerPage + index + 1}
          </td>
        );
      case "sequenceNo":
        return (
          <td
            key={colKey}
            className="w-16 min-w-[55px] max-w-[75px] px-3 py-2.5 font-mono text-xs font-semibold text-text-primary dark:text-white text-center"
          >
            #{item.sequenceNo}
          </td>
        );
      case "value":
        return (
          <td key={colKey} className="px-3 py-2.5">
            <div
              className="text-xs font-mono font-medium text-text-primary dark:text-gray-200 break-all max-w-md"
              title={item.value}
            >
              {item.value}
            </div>
          </td>
        );
      case "length":
        return (
          <td
            key={colKey}
            className="w-20 px-3 py-2.5 font-mono text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap text-center"
          >
            {item.value?.length || 0} ch
          </td>
        );
      case "status":
        return (
          <td key={colKey} className="w-24 px-3 py-2.5 text-center whitespace-nowrap">
            <StatusBadge status={item.status} />
          </td>
        );
      default:
        return (
          <td key={colKey} className="px-3 py-2.5 text-xs text-text-secondary dark:text-gray-300">
            {String((item as any)[colKey] ?? "-")}
          </td>
        );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-4xl"
        contentClassName="pr-1.5"
        title={
          <div className="flex items-center gap-2">
            <span>List Entries:</span>
            <span className="text-primary font-bold">{activeList?.name}</span>
            <span className="text-xs text-text-secondary font-normal">
              ({activeList?.selectionMode || "RANDOM"})
            </span>
          </div>
        }
      >
        <div className="space-y-4" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            density="compact"
            data={paginatedItems}
            totalItems={filteredAndSortedItems.length}
            currentPage={itemCurrentPage}
            rowsPerPage={itemRowsPerPage}
            onPageChange={setItemCurrentPage}
            onRowsPerPageChange={setItemRowsPerPage}
            isLoading={loadingItems}
            headers={headers}
            columnKeys={columns}
            onReorderColumns={handleReorderColumns}
            onSort={handleItemSort}
            sortColumnIndex={
              itemSortConfig ? columns.findIndex((c) => c === itemSortConfig.key) : null
            }
            sortDirection={itemSortConfig?.direction || null}
            tableMaxHeight="52vh"
            storageKey="message_text_entries_modal_table"
            emptyMessage="No items in this list yet. Click 'Add Entry' to create one."
            headerActions={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddItem}
                leftIcon={<Plus size={15} />}
              >
                Add Entry
              </Button>
            }
            renderRow={(item: MessageTextReplacementListItem, index: number) => (
              <tr
                key={item.id}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                onDoubleClick={() => handleOpenEditItem(item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs transition-colors cursor-context-menu"
              >
                {columns.map((colKey) => renderCell(colKey, item, index))}
              </tr>
            )}
          />

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Item Context Menu */}
      <ContextMenu
        position={itemContextMenuPos}
        items={itemContextMenuItems}
        onClose={() => setItemContextMenuPos(null)}
      />

      {/* Add / Edit Single Item Modal */}
      <MessageTextItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSuccess={() => {
          if (activeList?.id) loadItems(activeList.id);
          onUpdateListCount?.();
        }}
        listId={activeList?.id || null}
        editingItem={editingItem}
        defaultSequenceNo={items.length + 1}
      />

      {/* Delete Item Confirmation Modal */}
      <DeleteModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        title="Delete Text Entry"
        message={`Are you sure you want to delete this text entry (#${deletingItem?.sequenceNo})?`}
        isDeleting={isDeletingItem}
      />
    </>
  );
};
