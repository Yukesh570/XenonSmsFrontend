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

const TABLE_HEADERS = ["ID", "Name", "Mode", "Status"];
const TABLE_COL_KEYS = ["id", "name", "selectionMode", "status"];

export const SenderPoolsTab: React.FC = () => {
  const [pools, setPools] = useState<SenderPool[]>([]);
  const [items, setItems] = useState<SenderPoolItem[]>([]);
  const [selectedPool, setSelectedPool] = useState<SenderPool | null>(null);

  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // --- Main Table Sorting ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

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

  const sortedPools = useMemo(() => {
    if (!sortConfig) return pools;
    return [...pools].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [pools, sortConfig]);

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
          onClick: () => {
            setSelectedPool(selectedRowPool);
            setShowItemsModal(true);
          },
        },
        {
          label: "Edit Pool",
          icon: <Edit size={16} />,
          onClick: () => {
            setEditingPoolId(selectedRowPool.id!);
            setNewPool({
              name: selectedRowPool.name,
              selectionMode: selectedRowPool.selectionMode,
              status: selectedRowPool.status,
            });
            setShowPoolForm(true);
          },
        },
        {
          label: "Delete Pool",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeletePoolId(selectedRowPool.id!),
        },
      ]
    : [];

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPool.name) {
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

  // --- Pool Items Logic ---
  const ITEM_HEADERS = ["ID", "Sender ID", "Weight", "Status"];
  const ITEM_COL_KEYS = ["id", "senderId", "weight", "status"];

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
    if (!selectedPool?.id || !newItem.senderId) {
      toast.error("Sender ID number is required");
      return;
    }
    setIsSubmittingItem(true);
    try {
      await createSenderPoolItemApi({
        ...(newItem as SenderPoolItem),
        senderPool: selectedPool.id,
        sequenceNo: newItem.sequenceNo || items.length + 1,
      });
      toast.success("Sender ID added to pool successfully");
      setShowItemForm(false);
      setNewItem({ senderId: "", weight: 1, status: "ACTIVE" });
      loadItems(selectedPool.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to add sender ID to pool");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem?.id || !selectedPool?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteSenderPoolItemApi(deleteItem.id);
      toast.success("Pool item deleted successfully");
      setDeleteItem(null);
      setSelectedRowItem(null);
      loadItems(selectedPool.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete pool item");
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
        <DataTable
          density="compact"
          data={sortedPools}
          isLoading={isLoadingPools}
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
                setEditingPoolId(null);
                setNewPool({ name: "", selectionMode: "RANDOM", status: "ACTIVE" });
                setShowPoolForm(true);
              }}
              leftIcon={<Plus size={15} />}
            >
              Add Sender Pool
            </Button>
          }
          renderRow={(pool: SenderPool, index: number) => (
            <tr
              key={pool.id || index}
              onContextMenu={(e) => handleContextMenu(e, pool)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
            >
              <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-400 text-xs">
                {pool.id}
              </td>
              <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                {pool.name}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                  {pool.selectionMode}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={pool.status} />
              </td>
            </tr>
          )}
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
            placeholder="e.g. US_LONGCODES_POOL"
            required
          />

          <Select
            label="Selection Mode"
            value={newPool.selectionMode || "RANDOM"}
            onChange={(val) => setNewPool({ ...newPool, selectionMode: val as any })}
            options={[
              { value: "RANDOM", label: "Random Rotation" },
              { value: "SEQUENTIAL", label: "Sequential (Round Robin)" },
              { value: "WEIGHTED", label: "Weighted Ratio" },
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
        message="Are you sure you want to delete this pool? Translation rules using this pool will fail."
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
                Add Number
              </Button>
            }
            renderRow={(item: SenderPoolItem, index: number) => (
              <tr
                key={item.id || index}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-400 text-xs">
                  {item.id}
                </td>
                <td className="px-4 py-3 font-semibold text-text-primary dark:text-white font-mono">
                  {item.senderId}
                </td>
                <td className="px-4 py-3 text-text-secondary dark:text-gray-300">
                  {item.weight ?? 1}
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
