import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  List,
  Edit,
  Trash,
  Layers,
  Search,
  FileText,
  Shuffle,
  ListOrdered,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import {
  getMessageTextReplacementListsApi,
  createMessageTextReplacementListApi,
  updateMessageTextReplacementListApi,
  deleteMessageTextReplacementListApi,
  getMessageTextReplacementListItemsApi,
  createMessageTextReplacementListItemApi,
  updateMessageTextReplacementListItemApi,
  deleteMessageTextReplacementListItemApi,
  type MessageTextReplacementList,
  type MessageTextReplacementListItem,
} from "../../../api/authorizationApi/messageFilterApi";

interface MessageTextListsTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
}

const LIST_HEADERS = [
  "ID",
  "List Name & Description",
  "Client",
  "Selection Mode",
  "Items",
  "Status",
  "Actions",
];

export const MessageTextListsTab: React.FC<MessageTextListsTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
}) => {
  const [lists, setLists] = useState<MessageTextReplacementList[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  // List Modal State
  const [showListModal, setShowListModal] = useState(false);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [isSubmittingList, setIsSubmittingList] = useState(false);
  const [listForm, setListForm] = useState<{
    name: string;
    description: string;
    selectionMode: "SEQUENTIAL" | "RANDOM";
    isActive: boolean;
  }>({
    name: "",
    description: "",
    selectionMode: "RANDOM",
    isActive: true,
  });

  // Delete List State
  const [deletingList, setDeletingList] = useState<MessageTextReplacementList | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  // Manage Items Modal State
  const [activeListForItems, setActiveListForItems] = useState<MessageTextReplacementList | null>(null);
  const [items, setItems] = useState<MessageTextReplacementListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Add / Edit Item State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [itemForm, setItemForm] = useState<{
    value: string;
    sequenceNo: number;
    isActive: boolean;
  }>({
    value: "",
    sequenceNo: 1,
    isActive: true,
  });

  // Delete Item State
  const [deletingItem, setDeletingItem] = useState<MessageTextReplacementListItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Load Lists
  const loadLists = async () => {
    setLoading(true);
    try {
      const res = await getMessageTextReplacementListsApi(selectedClientId || undefined);
      const data = Array.isArray(res) ? res : (res as any)?.results || [];
      setLists(data);
    } catch (err: any) {
      console.error("Failed to load text lists", err);
      toast.error(err.response?.data?.detail || "Failed to load text replacement lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, [selectedClientId]);

  // Load Items for Active List
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

  // Open Items Manager
  const handleOpenItems = (list: MessageTextReplacementList) => {
    setActiveListForItems(list);
    if (list.id) {
      loadItems(list.id);
    }
  };

  // Open List Add / Edit
  const handleOpenAddList = () => {
    setEditingListId(null);
    setListForm({
      name: "",
      description: "",
      selectionMode: "RANDOM",
      isActive: true,
    });
    setShowListModal(true);
  };

  const handleOpenEditList = (list: MessageTextReplacementList) => {
    setEditingListId(list.id || null);
    setListForm({
      name: list.name,
      description: list.description || "",
      selectionMode: list.selectionMode || "RANDOM",
      isActive: list.status === "ACTIVE",
    });
    setShowListModal(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listForm.name.trim()) {
      toast.error("List name is required");
      return;
    }

    setIsSubmittingList(true);
    try {
      const payload: Partial<MessageTextReplacementList> = {
        client: selectedClientId || null,
        name: listForm.name.trim(),
        description: listForm.description.trim(),
        selectionMode: listForm.selectionMode,
        status: listForm.isActive ? "ACTIVE" : "INACTIVE",
      };

      if (editingListId) {
        await updateMessageTextReplacementListApi(editingListId, payload);
        toast.success("Text replacement list updated");
      } else {
        await createMessageTextReplacementListApi(payload);
        toast.success("Text replacement list created");
      }
      setShowListModal(false);
      loadLists();
    } catch (err: any) {
      toast.error(
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        "Failed to save list"
      );
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deletingList?.id) return;
    setIsDeletingList(true);
    try {
      await deleteMessageTextReplacementListApi(deletingList.id);
      toast.success("List deleted successfully");
      setDeletingList(null);
      loadLists();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete list");
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleToggleListStatus = async (list: MessageTextReplacementList) => {
    if (!list.id) return;
    const nextStatus = list.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateMessageTextReplacementListApi(list.id, { status: nextStatus });
      toast.success(`List "${list.name}" status updated`);
      setLists((prev) =>
        prev.map((l) => (l.id === list.id ? { ...l, status: nextStatus } : l))
      );
    } catch (err: any) {
      toast.error("Failed to toggle status");
    }
  };

  // Item Management Handlers
  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setItemForm({
      value: "",
      sequenceNo:
        items.length > 0 ? Math.max(...items.map((i) => i.sequenceNo)) + 1 : 1,
      isActive: true,
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: MessageTextReplacementListItem) => {
    setEditingItemId(item.id || null);
    setItemForm({
      value: item.value,
      sequenceNo: item.sequenceNo,
      isActive: item.status === "ACTIVE",
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListForItems?.id) return;
    if (!itemForm.value.trim()) {
      toast.error("Item value is required");
      return;
    }

    setIsSubmittingItem(true);
    try {
      if (editingItemId) {
        await updateMessageTextReplacementListItemApi(
          activeListForItems.id,
          editingItemId,
          {
            value: itemForm.value,
            sequenceNo: Number(itemForm.sequenceNo),
            status: itemForm.isActive ? "ACTIVE" : "INACTIVE",
          }
        );
        toast.success("Item updated");
      } else {
        await createMessageTextReplacementListItemApi(activeListForItems.id, {
          replacementList: activeListForItems.id,
          value: itemForm.value,
          sequenceNo: Number(itemForm.sequenceNo),
          status: itemForm.isActive ? "ACTIVE" : "INACTIVE",
        });
        toast.success("Item added to list");
      }
      setShowItemModal(false);
      loadItems(activeListForItems.id);
      loadLists();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save list item");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem?.id || !activeListForItems?.id) return;
    setIsDeletingItem(true);
    try {
      await deleteMessageTextReplacementListItemApi(
        activeListForItems.id,
        deletingItem.id
      );
      toast.success("Item deleted");
      setDeletingItem(null);
      loadItems(activeListForItems.id);
      loadLists();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete item");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleToggleItemStatus = async (item: MessageTextReplacementListItem) => {
    if (!activeListForItems?.id || !item.id) return;
    const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateMessageTextReplacementListItemApi(
        activeListForItems.id,
        item.id,
        { status: nextStatus }
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      );
      toast.success(`Item status updated`);
    } catch (err: any) {
      toast.error("Failed to toggle item status");
    }
  };

  // Filter Lists
  const filteredLists = useMemo(() => {
    return lists.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.description &&
          l.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMode =
        modeFilter === "ALL" || l.selectionMode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [lists, searchTerm, modeFilter]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Client Selector */}
          <div className="w-64">
            <Select
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
              options={[
                { value: "", label: "All Clients (Global & Direct)" },
                ...clients.map((c) => ({
                  value: String(c.id),
                  label: c.name ? (c.companyName ? `${c.name} (${c.companyName})` : c.name) : (c.companyName || `Client #${c.id}`),
                })),
              ]}
              placeholder="Filter by Client"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search replacement lists..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Mode Filter */}
          <div className="w-44">
            <Select
              value={modeFilter}
              onChange={(val) => setModeFilter(val || "ALL")}
              options={[
                { value: "ALL", label: "All Modes" },
                { value: "RANDOM", label: "Random Rotation" },
                { value: "SEQUENTIAL", label: "Sequential Round-Robin" },
              ]}
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAddList}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={16} />
          <span>New Replacement List</span>
        </Button>
      </div>

      {/* Lists Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <LoadingSpinner />
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="p-12 text-center text-text-secondary dark:text-gray-400">
            <Layers size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
            <p className="text-base font-semibold">No message text replacement lists</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Create reusable pools of arbitrary text templates, disclaimers, or rotation variants for message text rules.
            </p>
            <Button
              variant="secondary"
              onClick={handleOpenAddList}
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Create Text List
            </Button>
          </div>
        ) : (
          <DataTable
            headers={LIST_HEADERS}
            data={filteredLists}
            renderRow={(list) => (
              <tr
                key={list.id}
                className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-text-primary dark:text-gray-200 font-semibold">
                  #{list.id}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-sm text-text-primary dark:text-white">
                    {list.name}
                  </div>
                  {list.description && (
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5 line-clamp-1">
                      {list.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {list.client_name ? (
                    <span className="text-xs font-medium text-text-primary dark:text-gray-200">
                      {list.client_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Global
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {list.selectionMode === "SEQUENTIAL" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <ListOrdered size={12} />
                      Sequential
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <Shuffle size={12} />
                      Random
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleOpenItems(list)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-text-primary dark:text-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <List size={13} />
                    <span>{list.itemCount ?? 0} items</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <ToggleSwitch
                    checked={list.status === "ACTIVE"}
                    onChange={() => handleToggleListStatus(list)}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenItems(list)}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title="Manage Items"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditList(list)}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title="Edit List"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingList(list)}
                      className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Delete List"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {/* Add / Edit List Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        className="max-w-md"
        title={editingListId ? "Update Replacement List" : "Create Replacement List"}
      >
        <form onSubmit={handleSaveList} className="space-y-4">
          <Input
            label="List Name"
            value={listForm.name}
            onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
            placeholder="e.g. Promotional Footers, OTP Prefixes"
            required
          />

          <Input
            label="Description (Optional)"
            value={listForm.description}
            onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
            placeholder="Brief purpose of this replacement list"
          />

          <Select
            label="Selection Mode"
            value={listForm.selectionMode}
            onChange={(val) =>
              setListForm({ ...listForm, selectionMode: val as "SEQUENTIAL" | "RANDOM" })
            }
            options={[
              { value: "RANDOM", label: "Random - Uniform distributed selection" },
              { value: "SEQUENTIAL", label: "Sequential - Round-robin deterministic order" },
            ]}
          />

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={listForm.isActive}
                onChange={(e) => setListForm({ ...listForm, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowListModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingList}>
              {editingListId ? "Update List" : "Create List"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Items Modal */}
      <Modal
        isOpen={!!activeListForItems}
        onClose={() => setActiveListForItems(null)}
        className="max-w-3xl"
        title={
          activeListForItems
            ? `Manage Items: ${activeListForItems.name} (${activeListForItems.selectionMode})`
            : "Manage Items"
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary dark:text-gray-400">
              Each entry represents an arbitrary replacement string or multi-line template.
            </p>
            <Button
              variant="primary"
              onClick={handleOpenAddItem}
              className="flex items-center gap-1.5 text-xs py-1.5"
            >
              <Plus size={14} />
              <span>Add Text Entry</span>
            </Button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {loadingItems ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-text-secondary dark:text-gray-400">
                <FileText size={32} className="mx-auto text-gray-400 mb-2 opacity-60" />
                <p className="text-sm font-semibold">No items in this list yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &quot;Add Text Entry&quot; above to add your first template snippet.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2.5 w-16">Seq #</th>
                    <th className="px-3 py-2.5">Replacement Value / Text</th>
                    <th className="px-3 py-2.5 w-20">Length</th>
                    <th className="px-3 py-2.5 w-20">Status</th>
                    <th className="px-3 py-2.5 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-text-primary dark:text-gray-200">
                        {item.sequenceNo}
                      </td>
                      <td className="px-3 py-2.5">
                        <pre className="text-xs font-mono text-text-primary dark:text-gray-200 whitespace-pre-wrap break-all max-h-24 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200/50 dark:border-gray-700/50">
                          {item.value}
                        </pre>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                        {item.value.length} ch
                      </td>
                      <td className="px-3 py-2.5">
                        <ToggleSwitch
                          checked={item.status === "ACTIVE"}
                          onChange={() => handleToggleItemStatus(item)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1 text-gray-400 hover:text-primary transition-colors"
                            title="Edit Item"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Delete Item"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setActiveListForItems(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Single Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        className="max-w-md"
        title={editingItemId ? "Update Text Entry" : "Add Text Entry"}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-300 mb-1">
              Text Value / Template Content
            </label>
            <textarea
              value={itemForm.value}
              onChange={(e) => setItemForm({ ...itemForm, value: e.target.value })}
              rows={4}
              placeholder="Enter replacement string, dynamic macro, or multi-line template..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              required
            />
            <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
              <span>Supports any characters, UTF-8, and emoji.</span>
              <span className="font-mono">{itemForm.value.length} characters</span>
            </div>
          </div>

          <Input
            label="Sequence Number (for Sequential order)"
            type="number"
            value={itemForm.sequenceNo}
            onChange={(e) => setItemForm({ ...itemForm, sequenceNo: Number(e.target.value) })}
            min={1}
            max={99999}
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={itemForm.isActive}
                onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowItemModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingItem}>
              {editingItemId ? "Update Entry" : "Add Entry"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete List Confirmation Modal */}
      {deletingList && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingList(null)}
          onConfirm={handleDeleteList}
          title="Delete Text Replacement List"
          message={`Are you sure you want to permanently delete list "${deletingList.name}"? Rules referencing this list will fail gracefully.`}
          isDeleting={isDeletingList}
        />
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteItem}
          title="Delete Text Entry"
          message={`Are you sure you want to delete this text entry?`}
          isDeleting={isDeletingItem}
        />
      )}
    </div>
  );
};
