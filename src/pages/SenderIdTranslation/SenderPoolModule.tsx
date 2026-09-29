import React, { useState, useEffect } from "react";
import { Home, Plus, List } from "lucide-react";
import { NavLink } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
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

const SenderPoolModule: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [pools, setPools] = useState<SenderPool[]>([]);
  const [items, setItems] = useState<SenderPoolItem[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);

  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<number | null>(null);
  const [newPool, setNewPool] = useState<Partial<SenderPool>>({
    selectionMode: "RANDOM",
    status: "ACTIVE"
  });

  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SenderPoolItem>>({
    status: "ACTIVE",
    sequenceNo: 1
  });

  useEffect(() => {
    loadClients();
    loadPools();
  }, []);

  useEffect(() => {
    if (selectedPoolId) {
      loadItems(selectedPoolId);
    } else {
      setItems([]);
    }
  }, [selectedPoolId]);

  const loadClients = async () => {
    try {
      const res = await getClientsApi(undefined, 1, 1000);
      setClients(res.results || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPools = async () => {
    try {
      const res = await getSenderPoolsApi();
      setPools(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadItems = async (poolId: number) => {
    try {
      const res = await getSenderPoolItemsApi(poolId);
      setItems(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePool = async () => {
    try {
      if (editingPoolId) {
        await updateSenderPoolApi(editingPoolId, newPool);
      } else {
        await createSenderPoolApi(newPool as SenderPool);
      }
      setShowPoolForm(false);
      loadPools();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedPoolId) return;
    try {
      await createSenderPoolItemApi({ ...newItem, senderPool: selectedPoolId } as SenderPoolItem);
      setShowItemForm(false);
      loadItems(selectedPoolId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePool = async (id: number) => {
    if (confirm("Delete this pool?")) {
      await deleteSenderPoolApi(id);
      loadPools();
      if (selectedPoolId === id) {
        setSelectedPoolId(null);
        setShowItemsModal(false);
      }
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?") && selectedPoolId) {
      await deleteSenderPoolItemApi(id);
      loadItems(selectedPoolId);
    }
  };

  const handleViewItems = (poolId: number) => {
    setSelectedPoolId(poolId);
    setShowItemsModal(true);
  };

  return (
    <div className="w-full pb-8">
      {/* Header - Matches Find Route / SenderIdTranslation */}
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white">Pools</h2>
          <Button
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => { setEditingPoolId(null); setNewPool({ selectionMode: "RANDOM", status: "ACTIVE" }); setShowPoolForm(true); }}
          >
            Add Pool
          </Button>
        </div>
        
        <div className="[&_.app-data-table]:border-0 [&_.app-data-table]:shadow-none [&_.app-data-table]:rounded-none">
          <DataTable
            data={pools}
            density="compact"
            headers={["ID", "Name", "Mode", "Status", "Actions"]}
            renderRow={(pool) => (
              <tr
                key={pool.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors"
              >
                <td className="px-4 py-3">{pool.id}</td>
                <td className="px-4 py-3 font-medium">{pool.name}</td>
                <td className="px-4 py-3 text-xs">{pool.selectionMode}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${pool.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {pool.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1" onClick={() => handleViewItems(pool.id!)}>
                      <List size={14} /> View Items
                    </button>
                    <button type="button" className="text-primary hover:text-primary-dark font-medium transition-colors" onClick={() => { setEditingPoolId(pool.id!); setNewPool(pool); setShowPoolForm(true); }}>Edit</button>
                    <button type="button" className="text-red-500 hover:text-red-700 font-medium transition-colors" onClick={() => handleDeletePool(pool.id!)}>Delete</button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      </div>

      <Modal isOpen={showPoolForm} onClose={() => setShowPoolForm(false)} title={editingPoolId ? "Edit Sender Pool" : "Add Sender Pool"} className="max-w-lg">
        <div className="space-y-4">
          <Input label="Name" value={newPool.name || ""} onChange={e => setNewPool({...newPool, name: e.target.value})} />
          <Select label="Client (Optional)" value={newPool.client ? String(newPool.client) : ""} onChange={v => setNewPool({...newPool, client: v ? Number(v) : null})} options={[{value: "", label: "Global"}, ...clients.map(c => ({value: String(c.id), label: c.name}))]} />
          <Select label="Selection Mode" value={newPool.selectionMode || ""} onChange={v => setNewPool({...newPool, selectionMode: v as any})} options={[{value: "SEQUENTIAL", label: "Sequential"}, {value: "RANDOM", label: "Random"}]} clearable={false} />
          <Select label="Status" value={newPool.status || ""} onChange={v => setNewPool({...newPool, status: v as any})} options={[{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]} clearable={false} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowPoolForm(false)}>Cancel</Button>
            <Button onClick={handleSavePool}>{editingPoolId ? "Update Pool" : "Save Pool"}</Button>
          </div>
        </div>
      </Modal>

      {/* Items Modal */}
      <Modal isOpen={showItemsModal} onClose={() => { setShowItemsModal(false); setSelectedPoolId(null); }} title={`Pool Items (Pool ID: ${selectedPoolId})`} className="max-w-4xl">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => { setNewItem({ status: "ACTIVE", sequenceNo: 1 }); setShowItemForm(true); }}>
              Add Item
            </Button>
          </div>
          
          <div className="[&_.app-data-table]:border-0 [&_.app-data-table]:shadow-none [&_.app-data-table]:rounded-none border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <DataTable
              data={items}
              density="compact"
              headers={["Seq", "Sender ID", "Comment", "Status", "Actions"]}
              renderRow={(item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors">
                  <td className="px-4 py-3">{item.sequenceNo}</td>
                  <td className="px-4 py-3 font-semibold">{item.senderId}</td>
                  <td className="px-4 py-3 text-gray-500">{item.comment}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-red-500 hover:text-red-700 font-medium transition-colors" onClick={() => handleDeleteItem(item.id!)}>Delete</button>
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showItemForm} onClose={() => setShowItemForm(false)} title="Add Pool Item" className="max-w-lg z-[60]">
        <div className="space-y-4">
          <Input label="Sender ID" value={newItem.senderId || ""} onChange={e => setNewItem({...newItem, senderId: e.target.value})} />
          <Input label="Sequence No" type="number" value={newItem.sequenceNo || ""} onChange={e => setNewItem({...newItem, sequenceNo: Number(e.target.value)})} />
          <Input label="Comment" value={newItem.comment || ""} onChange={e => setNewItem({...newItem, comment: e.target.value})} />
          <Select label="Status" value={newItem.status || ""} onChange={v => setNewItem({...newItem, status: v as any})} options={[{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]} clearable={false} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowItemForm(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default SenderPoolModule;
