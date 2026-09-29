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
  getSenderPoolsApi,
  createSenderPoolApi,
  updateSenderPoolApi,
  deleteSenderPoolApi,
  getSenderPoolItemsApi,
  createSenderPoolItemApi,
  deleteSenderPoolItemApi,
  type SenderPool,
  type SenderPoolItem
} from "../../api/authorizationApi/senderPoolApi";

const TABLE_HEADERS = ["ID", "Name", "Mode", "Status"];
const TABLE_COL_KEYS = ["id", "name", "selectionMode", "status"];

const SenderPoolModule: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
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
    status: "ACTIVE"
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
    comment: "",
    status: "ACTIVE",
    sequenceNo: 1
  });

  // --- Item Delete Modal State ---
  const [deleteItem, setDeleteItem] = useState<SenderPoolItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    loadClients();
    loadPools();
  }, []);

  useEffect(() => {
    if (selectedPool?.id) {
      loadItems(selectedPool.id);
    } else {
      setItems([]);
    }
  }, [selectedPool]);

  const loadClients = async () => {
    try {
      const res = await getClientsApi(undefined, 1, 1000);
      setClients(res.results || res || []);
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  };

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

  const sortedPools = useMemo(() => {
    if (!sortConfig) return pools;
    return [...pools].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
  }, [pools, sortConfig]);

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent, pool: SenderPool) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowPool(pool);
  };

  const handleOpenAddModal = () => {
    setEditingPoolId(null);
    setNewPool({
      name: "",
      client: null,
      selectionMode: "RANDOM",
      status: "ACTIVE"
    });
    setShowPoolForm(true);
  };

  const handleOpenEditModal = (pool: SenderPool) => {
    setEditingPoolId(pool.id!);
    setNewPool({
      name: pool.name,
      client: pool.client || null,
      selectionMode: pool.selectionMode || "RANDOM",
      status: pool.status || "ACTIVE"
    });
    setShowPoolForm(true);
  };

  const handleViewItems = (pool: SenderPool) => {
    setSelectedPool(pool);
    setShowItemsModal(true);
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPool.name?.trim()) {
      toast.error("Pool Name is required");
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
      loadPools();
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.response?.data?.detail || e?.response?.data?.name?.[0] || "Failed to save sender pool";
      toast.error(errMsg);
    } finally {
      setIsSubmittingPool(false);
    }
  };

  const handleConfirmDeletePool = async () => {
    if (!deletePoolId) return;
    setIsDeletingPool(true);
    try {
      await deleteSenderPoolApi(deletePoolId);
      toast.success("Sender pool deleted successfully");
      loadPools();
      if (selectedPool?.id === deletePoolId) {
        setSelectedPool(null);
        setShowItemsModal(false);
      }
      setDeletePoolId(null);
      setSelectedRowPool(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete sender pool");
    } finally {
      setIsDeletingPool(false);
    }
  };

  // --- Items Actions ---
  const handleItemContextMenu = (e: React.MouseEvent, item: SenderPoolItem) => {
    e.preventDefault();
    setItemContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowItem(item);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool?.id) return;
    if (!newItem.senderId?.trim()) {
      toast.error("Sender ID is required");
      return;
    }

    setIsSubmittingItem(true);
    try {
      await createSenderPoolItemApi({
        ...newItem,
        senderPool: selectedPool.id
      } as SenderPoolItem);
      toast.success("Pool item added successfully");
      setShowItemForm(false);
      loadItems(selectedPool.id);
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.response?.data?.detail || e?.response?.data?.senderId?.[0] || "Failed to add pool item";
      toast.error(errMsg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItem?.id || !selectedPool?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteSenderPoolItemApi(deleteItem.id);
      toast.success("Pool item deleted successfully");
      loadItems(selectedPool.id);
      setDeleteItem(null);
      setSelectedRowItem(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete pool item");
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

  const menuItems: ContextMenuItem[] = selectedRowPool
    ? [
        {
          label: "View Items",
          icon: <List size={16} />,
          onClick: () => handleViewItems(selectedRowPool)
        },
        {
          label: "Edit Pool",
          icon: <Edit size={16} />,
          onClick: () => handleOpenEditModal(selectedRowPool)
        },
        {
          label: "Delete Pool",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => setDeletePoolId(selectedRowPool.id!)
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
          Sender Pools
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Sender Pools</span>
        </div>
      </div>

      {/* Main Table following standard UI pattern */}
      <DataTable
        data={sortedPools}
        density="compact"
        headers={TABLE_HEADERS}
        isLoading={isLoadingPools}
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
            Add Pool
          </Button>
        }
        renderRow={(pool: SenderPool) => (
          <tr
            key={pool.id}
            onContextMenu={(e) => handleContextMenu(e, pool)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
          >
            <td className="w-12 min-w-[48px] max-w-[48px] !px-1 text-center text-sm font-medium text-text-primary dark:text-white">
              {pool.id}
            </td>
            <td
              className="px-4 py-3 font-semibold text-primary cursor-pointer hover:underline"
              onClick={() => handleViewItems(pool)}
              title="Click or right-click to view items"
            >
              {pool.name}
            </td>
            <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300">
              {pool.selectionMode}
            </td>
            <td className="px-4 py-3 text-xs">
              <StatusBadge status={pool.status} />
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

      {/* Add / Edit Pool Modal */}
      <Modal
        isOpen={showPoolForm}
        onClose={() => setShowPoolForm(false)}
        title={editingPoolId ? "Edit Sender Pool" : "Add Sender Pool"}
        className="max-w-md"
      >
        <form onSubmit={handleSavePool} className="space-y-4">
          <Input
            label="Name"
            value={newPool.name || ""}
            onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
            placeholder="e.g. Marketing Pool Alpha"
            required
          />
          <Select
            label="Client (Optional)"
            value={newPool.client ? String(newPool.client) : ""}
            onChange={(v) => setNewPool({ ...newPool, client: v ? Number(v) : null })}
            options={[
              { value: "", label: "Global (All Clients)" },
              ...clients.map((c) => ({ value: String(c.id), label: c.name || `Client ${c.id}` }))
            ]}
          />
          <Select
            label="Selection Mode"
            value={newPool.selectionMode || "RANDOM"}
            onChange={(v) => setNewPool({ ...newPool, selectionMode: v as any })}
            options={[
              { value: "SEQUENTIAL", label: "Sequential" },
              { value: "RANDOM", label: "Random" }
            ]}
            clearable={false}
          />
          <Select
            label="Status"
            value={newPool.status || "ACTIVE"}
            onChange={(v) => setNewPool({ ...newPool, status: v as any })}
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
              onClick={() => setShowPoolForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingPool}
            >
              {isSubmittingPool ? "Saving..." : editingPoolId ? "Save Changes" : "Add Pool"}
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
        onConfirm={handleConfirmDeletePool}
        title="Delete Sender Pool"
        message={`Are you sure you want to delete sender pool "${selectedRowPool?.name || ""}"? This action cannot be undone.`}
        isDeleting={isDeletingPool}
      />

      {/* Items Modal - uses reusable ModalDataTable */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => {
          setShowItemsModal(false);
          setSelectedPool(null);
        }}
        title={`Pool Items: ${selectedPool?.name || ""}`}
        className="max-w-4xl"
      >
        <div className="w-full flex flex-col" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            data={sortedItems}
            headers={["Seq", "Sender ID", "Comment", "Status"]}
            columnKeys={["sequenceNo", "senderId", "comment", "status"]}
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
                    senderId: "",
                    comment: "",
                  });
                  setShowItemForm(true);
                }}
              >
                Add Item
              </Button>
            }
            onSort={(colIdx) => {
              const keys = ["sequenceNo", "senderId", "comment", "status"];
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
                ? ["sequenceNo", "senderId", "comment", "status"].indexOf(itemSortConfig.key)
                : null
            }
            sortDirection={itemSortConfig?.direction || null}
            emptyMessage="No items found in this sender pool."
            renderRow={(item: SenderPoolItem, index: number) => (
              <tr
                key={item.id || index}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="w-12 min-w-[48px] max-w-[48px] !px-1 text-center text-sm font-medium text-text-primary dark:text-white">
                  {item.sequenceNo}
                </td>
                <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">{item.senderId}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-gray-400">{item.comment || "-"}</td>
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
        title="Add Pool Item"
        className="max-w-md z-[60]"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Sender ID"
            value={newItem.senderId || ""}
            onChange={(e) => setNewItem({ ...newItem, senderId: e.target.value })}
            placeholder="e.g. SENDER_POOL_1"
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
            label="Comment (Optional)"
            value={newItem.comment || ""}
            onChange={(e) => setNewItem({ ...newItem, comment: e.target.value })}
            placeholder="e.g. Verification pool sender"
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
        title="Delete Pool Item"
        message={`Are you sure you want to delete pool item "${deleteItem?.senderId || ""}"? This action cannot be undone.`}
        isDeleting={isDeletingItem}
      />
    </div>
  );
};

export default SenderPoolModule;
