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

const ReplacementListModule: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [lists, setLists] = useState<ReplacementList[]>([]);
  const [items, setItems] = useState<ReplacementListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  const [showListForm, setShowListForm] = useState(false);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [newList, setNewList] = useState<Partial<ReplacementList>>({
    selectionMode: "SEQUENTIAL",
    status: "ACTIVE"
  });

  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ReplacementListItem>>({
    status: "ACTIVE",
    sequenceNo: 1
  });

  useEffect(() => {
    loadClients();
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedListId) {
      loadItems(selectedListId);
    } else {
      setItems([]);
    }
  }, [selectedListId]);

  const loadClients = async () => {
    try {
      const res = await getClientsApi(undefined, 1, 1000);
      setClients(res.results || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLists = async () => {
    try {
      const res = await getReplacementListsApi();
      setLists(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadItems = async (listId: number) => {
    try {
      const res = await getReplacementListItemsApi(listId);
      setItems(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveList = async () => {
    try {
      if (editingListId) {
        await updateReplacementListApi(editingListId, newList);
      } else {
        await createReplacementListApi(newList as ReplacementList);
      }
      setShowListForm(false);
      loadLists();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedListId) return;
    try {
      await createReplacementListItemApi({ ...newItem, replacementList: selectedListId } as ReplacementListItem);
      setShowItemForm(false);
      loadItems(selectedListId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteList = async (id: number) => {
    if (confirm("Delete this list?")) {
      await deleteReplacementListApi(id);
      loadLists();
      if (selectedListId === id) {
        setSelectedListId(null);
        setShowItemsModal(false);
      }
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?") && selectedListId) {
      await deleteReplacementListItemApi(id);
      loadItems(selectedListId);
    }
  };

  const handleViewItems = (listId: number) => {
    setSelectedListId(listId);
    setShowItemsModal(true);
  };

  return (
    <div className="w-full pb-8">
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white">Lists</h2>
          <Button
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => { setEditingListId(null); setNewList({ selectionMode: "SEQUENTIAL", status: "ACTIVE" }); setShowListForm(true); }}
          >
            Add List
          </Button>
        </div>
        
        <div className="[&_.app-data-table]:border-0 [&_.app-data-table]:shadow-none [&_.app-data-table]:rounded-none">
          <DataTable
            data={lists}
            density="compact"
            headers={["ID", "Name", "Mode", "Status", "Actions"]}
            renderRow={(list) => (
              <tr
                key={list.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors"
              >
                <td className="px-4 py-3">{list.id}</td>
                <td className="px-4 py-3 font-medium">{list.name}</td>
                <td className="px-4 py-3 text-xs">{list.selectionMode}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${list.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {list.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1" onClick={() => handleViewItems(list.id!)}>
                      <List size={14} /> View Items
                    </button>
                    <button type="button" className="text-primary hover:text-primary-dark font-medium transition-colors" onClick={() => { setEditingListId(list.id!); setNewList(list); setShowListForm(true); }}>Edit</button>
                    <button type="button" className="text-red-500 hover:text-red-700 font-medium transition-colors" onClick={() => handleDeleteList(list.id!)}>Delete</button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      </div>

      <Modal isOpen={showListForm} onClose={() => setShowListForm(false)} title={editingListId ? "Edit Replacement List" : "Add Replacement List"} className="max-w-lg">
        <div className="space-y-4">
          <Input label="Name" value={newList.name || ""} onChange={e => setNewList({...newList, name: e.target.value})} />
          <Select label="Client (Optional)" value={newList.client ? String(newList.client) : ""} onChange={v => setNewList({...newList, client: v ? Number(v) : null})} options={[{value: "", label: "Global"}, ...clients.map(c => ({value: String(c.id), label: c.name}))]} />
          <Select label="Selection Mode" value={newList.selectionMode || ""} onChange={v => setNewList({...newList, selectionMode: v as any})} options={[{value: "SEQUENTIAL", label: "Sequential"}, {value: "RANDOM", label: "Random"}]} clearable={false} />
          <Select label="Status" value={newList.status || ""} onChange={v => setNewList({...newList, status: v as any})} options={[{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]} clearable={false} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowListForm(false)}>Cancel</Button>
            <Button onClick={handleSaveList}>{editingListId ? "Update List" : "Save List"}</Button>
          </div>
        </div>
      </Modal>

      {/* Items Modal */}
      <Modal isOpen={showItemsModal} onClose={() => { setShowItemsModal(false); setSelectedListId(null); }} title={`List Items (List ID: ${selectedListId})`} className="max-w-4xl">
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
              headers={["Seq", "Value", "Label", "Status", "Actions"]}
              renderRow={(item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors">
                  <td className="px-4 py-3">{item.sequenceNo}</td>
                  <td className="px-4 py-3 font-semibold">{item.value}</td>
                  <td className="px-4 py-3 text-gray-500">{item.label}</td>
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

      <Modal isOpen={showItemForm} onClose={() => setShowItemForm(false)} title="Add List Item" className="max-w-lg z-[60]">
        <div className="space-y-4">
          <Input label="Value" value={newItem.value || ""} onChange={e => setNewItem({...newItem, value: e.target.value})} />
          <Input label="Sequence No" type="number" value={newItem.sequenceNo || ""} onChange={e => setNewItem({...newItem, sequenceNo: Number(e.target.value)})} />
          <Input label="Label" value={newItem.label || ""} onChange={e => setNewItem({...newItem, label: e.target.value})} />
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
export default ReplacementListModule;
