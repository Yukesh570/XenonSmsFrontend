import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  Eye,
  Shuffle,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import TextArea from "../../../components/ui/TextArea";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import ModalDataTable from "../../../components/ui/ModalDataTable";
import FilterCard from "../../../components/ui/FilterCard";
import Modal from "../../../components/ui/Modal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import { formatDateTime } from "../../../helper/dateFormatter";
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

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (list: MessageTextReplacementList) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

interface MessageTextListsTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
}

const DEFAULT_SEARCH_COLUMNS = ["name", "client", "status"];
const DEFAULT_TABLE_COLUMNS = [
  "name",
  "client",
  "selectionMode",
  "itemCount",
  "status",
];

const ITEM_HEADERS = ["Seq #", "Replacement Value", "Length", "Status"];

export const MessageTextListsTab: React.FC<MessageTextListsTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
}) => {
  const [lists, setLists] = useState<MessageTextReplacementList[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Dynamic Column Persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("message_text_lists_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((k) => k !== "actions");
        }
      }
    } catch (e) {
      console.error("Error reading saved table columns", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("message_text_lists_search_columns_v2");
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
    localStorage.setItem("message_text_lists_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("message_text_lists_search_columns_v2", JSON.stringify(searchColumns));
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (selectedClientId) {
      initial.client = String(selectedClientId);
    }
    return initial;
  });

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (selectedClientId) {
      initial.client = String(selectedClientId);
    }
    return initial;
  });

  // Sync external client change
  useEffect(() => {
    setFilterValues((prev) => {
      if (selectedClientId) {
        return { ...prev, client: String(selectedClientId) };
      } else {
        const next = { ...prev };
        delete next.client;
        return next;
      }
    });
    setAppliedFilters((prev) => {
      if (selectedClientId) {
        return { ...prev, client: String(selectedClientId) };
      } else {
        const next = { ...prev };
        delete next.client;
        return next;
      }
    });
  }, [selectedClientId]);

  // Context Menu State for Lists
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowList, setSelectedRowList] = useState<MessageTextReplacementList | null>(null);

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

  // Item Context Menu State
  const [itemContextMenuPos, setItemContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowItem, setSelectedRowItem] = useState<MessageTextReplacementListItem | null>(null);

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
  const loadLists = async (customFilters?: Record<string, string>) => {
    setLoading(true);
    try {
      const activeFilters = customFilters !== undefined ? customFilters : appliedFilters;
      const clientParam = activeFilters.client ? Number(activeFilters.client) : selectedClientId || undefined;

      const params: Record<string, any> = {};
      if (clientParam) {
        params.client = clientParam;
      }

      for (const [key, rawVal] of Object.entries(activeFilters)) {
        const val = rawVal?.trim();
        if (!val || key === "client") continue;

        const colDef = allColumns.find((c) => c.key === key);
        const filterKey = colDef?.filterKey || key;
        params[filterKey] = val;
      }

      if (sortConfig) {
        const colDef = allColumns.find((c) => c.key === sortConfig.key);
        const sortKey = colDef?.filterKey ? colDef.filterKey.replace(/__(icontains|exact|gte|lte)$/, "") : sortConfig.key;
        params.ordering = sortConfig.direction === "desc" ? `-${sortKey}` : sortKey;
      }

      const res = await getMessageTextReplacementListsApi(params);
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
      const statusValue: "ACTIVE" | "INACTIVE" = listForm.isActive ? "ACTIVE" : "INACTIVE";
      const payload: Partial<MessageTextReplacementList> = {
        client: selectedClientId || 0,
        name: listForm.name.trim(),
        description: listForm.description.trim(),
        selectionMode: listForm.selectionMode,
        status: statusValue,
      };

      if (editingListId) {
        await updateMessageTextReplacementListApi(editingListId, payload);
        toast.success("Replacement list updated successfully");
      } else {
        await createMessageTextReplacementListApi(payload);
        toast.success("Replacement list created successfully");
      }
      setShowListModal(false);
      loadLists();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save replacement list");
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deletingList?.id) return;
    setIsDeletingList(true);
    try {
      await deleteMessageTextReplacementListApi(deletingList.id);
      toast.success("Replacement list deleted");
      setDeletingList(null);
      setSelectedRowList(null);
      loadLists();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete list");
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleToggleListStatus = async (list: MessageTextReplacementList) => {
    if (!list.id) return;
    const isCurrentlyActive = list.status === "ACTIVE";
    const nextStatus: "ACTIVE" | "INACTIVE" = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    try {
      await updateMessageTextReplacementListApi(list.id, {
        status: nextStatus,
      });
      toast.success(
        `List "${list.name}" ${!isCurrentlyActive ? "activated" : "deactivated"}`
      );
      setLists((prev) =>
        prev.map((l) =>
          l.id === list.id
            ? { ...l, status: nextStatus }
            : l
        )
      );
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // Manage Items Handlers
  const handleOpenItems = (list: MessageTextReplacementList) => {
    setActiveListForItems(list);
    if (list.id) loadItems(list.id);
  };

  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setItemForm({
      value: "",
      sequenceNo: items.length + 1,
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
      setSelectedRowItem(null);
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

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent, list: MessageTextReplacementList) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowList(list);
  };

  const listContextMenuItems: ContextMenuItem[] = selectedRowList
    ? [
        {
          label: "Manage Items",
          icon: <Eye size={16} />,
          onClick: () => {
            handleOpenItems(selectedRowList);
            setContextMenuPos(null);
          },
        },
        {
          label: "Edit List",
          icon: <Edit size={16} />,
          onClick: () => {
            handleOpenEditList(selectedRowList);
            setContextMenuPos(null);
          },
        },
        {
          label: selectedRowList.status === "ACTIVE" ? "Deactivate List" : "Activate List",
          icon: <Shuffle size={16} />,
          onClick: () => {
            handleToggleListStatus(selectedRowList);
            setContextMenuPos(null);
          },
        },
        {
          label: "Delete List",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => {
            setDeletingList(selectedRowList);
            setContextMenuPos(null);
          },
        },
      ]
    : [];

  const handleItemContextMenu = (e: React.MouseEvent, item: MessageTextReplacementListItem) => {
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

  const clientOptions: Option[] = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: c.name
          ? c.companyName
            ? `${c.name} (${c.companyName})`
            : c.name
          : c.companyName || `Client #${c.id}`,
      })),
    [clients]
  );

  const modeOptions: Option[] = [
    { label: "Random Rotation", value: "RANDOM" },
    { label: "Sequential Round-Robin", value: "SEQUENTIAL" },
  ];

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  // All Column Definitions
  const allColumns: ColumnConfig[] = [
    {
      key: "name",
      label: "List Name",
      tableLabel: "List Name",
      type: "text",
      filterKey: "name__icontains",
      render: (list) => (
        <span className="text-sm text-text-primary dark:text-white">
          {list.name}
        </span>
      ),
    },
    {
      key: "client",
      label: "Client",
      tableLabel: "Client",
      type: "text",
      filterKey: "client",
      options: clientOptions,
      render: (list) => {
        const clientName =
          list.client__name ||
          list.client_name ||
          clients.find((c) => c.id === list.client || c.value === String(list.client))?.label ||
          clients.find((c) => c.id === list.client || c.value === String(list.client))?.name ||
          (list.client ? `Client #${list.client}` : "Direct Client");

        return (
          <span className="text-sm text-text-secondary dark:text-gray-300">
            {clientName}
          </span>
        );
      },
    },
    {
      key: "selectionMode",
      label: "Selection Mode",
      tableLabel: "Selection Mode",
      type: "text",
      filterKey: "selectionMode",
      options: modeOptions,
      render: (list) => (
        <StatusBadge status="SUBMITTED" customText={list.selectionMode || "RANDOM"} />
      ),
    },
    {
      key: "itemCount",
      label: "Items Count",
      tableLabel: "Items",
      type: "number",
      isSearchable: false,
      render: (list) => (
        <span className="text-sm text-text-secondary dark:text-gray-300">
          {list.itemCount ?? 0} item{(list.itemCount ?? 0) !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      tableLabel: "Status",
      type: "boolean",
      filterKey: "status",
      options: statusOptions,
      render: (list) => <StatusBadge status={list.status} />,
    },
    // Optional Backend Search Fields (Available in Search Fields modal)
    {
      key: "client__isnull",
      label: "Global Lists Only",
      filterKey: "client__isnull",
      options: [
        { label: "Global Lists", value: "true" },
        { label: "Client Lists", value: "false" },
      ],
      isSearchOnly: true,
    },
    {
      key: "allowRandomMacros",
      label: "Allow Random Macros",
      filterKey: "allowRandomMacros",
      options: [
        { label: "Allowed", value: "true" },
        { label: "Disallowed", value: "false" },
      ],
      isSearchOnly: true,
    },
    {
      key: "id",
      label: "List ID",
      tableLabel: "ID",
      type: "number",
      render: (list) => (
        <span className="text-sm text-text-secondary dark:text-gray-300">
          #{list.id}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      tableLabel: "Description",
      type: "text",
      render: (list) => (
        <span className="text-sm text-text-secondary dark:text-gray-300 max-w-[200px] truncate block" title={list.description}>
          {list.description || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created At",
      tableLabel: "Created At",
      type: "date",
      isSearchable: false,
      render: (list) => (list.createdAt ? formatDateTime(list.createdAt) : "-"),
    },
    {
      key: "updatedAt",
      label: "Updated At",
      tableLabel: "Updated At",
      type: "date",
      isSearchable: false,
      render: (list) => (list.updatedAt ? formatDateTime(list.updatedAt) : "-"),
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

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type,
    }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filterValues });
    loadLists(filterValues);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
    setSelectedClientId(null);
    loadLists({});
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
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

  // Filter & Sort Lists
  const filteredAndSortedLists = useMemo(() => {
    let result = lists.filter((l) => {
      for (const colKey of Object.keys(appliedFilters)) {
        const val = appliedFilters[colKey]?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "client") {
          const listClient = String(l.client || "");
          const clientName = (l.client__name || l.client_name || "").toLowerCase();
          if (listClient !== val && !clientName.includes(val)) {
            return false;
          }
        } else if (colKey === "client__isnull") {
          if (val === "true" && l.client !== null && l.client !== undefined && l.client !== 0) return false;
          if (val === "false" && (l.client === null || l.client === undefined || l.client === 0)) return false;
        } else if (colKey === "selectionMode") {
          if (l.selectionMode !== val.toUpperCase()) return false;
        } else if (colKey === "status") {
          if (l.status !== val.toUpperCase()) return false;
        } else if (colKey === "name") {
          if (
            !l.name.toLowerCase().includes(val) &&
            !(l.description && l.description.toLowerCase().includes(val))
          ) {
            return false;
          }
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

  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  return (
    <div className="space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Top Filter Bar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
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
              isLoading={loading}
              buttonLabel="Search Fields"
            />
          </div>
        </div>
      </div>

      {/* Dynamic FilterCard */}
      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options) {
            return (
              <Select
                key={col.key}
                label={baseLabel}
                value={filterValues[col.key] || ""}
                onChange={(val) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
                allowCustomValue={true}
              />
            );
          }
          return (
            <Input
              key={col.key}
              type={col.type === "number" ? "number" : "text"}
              label={baseLabel}
              value={filterValues[col.key] || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleFilterChange(col.key, e.target.value)
              }
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      {/* Lists Table */}
      <DataTable
        density="compact"
        headers={tableHeaders}
        data={filteredAndSortedLists}
        totalItems={filteredAndSortedLists.length}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={loading}
        onSort={handleSort}
        sortColumnIndex={
          sortConfig
            ? visibleTableFields.findIndex((c) => c.key === sortConfig.key) + 1
            : null
        }
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            const validKeys = prev.filter((key) =>
              allColumns.some((c) => c.key === key)
            );
            const next = [...validKeys];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
        }}
        emptyMessage="No text replacement lists found"
        headerActions={
          <Button
            variant="primary"
            onClick={handleOpenAddList}
            leftIcon={<Plus size={16} />}
          >
            New Replacement List
          </Button>
        }
        renderRow={(list, index) => (
          <tr
            key={list.id || index}
            onContextMenu={(e) => handleContextMenu(e, list)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(list)}
                  </td>
                );
              }
              return (
                <td
                  key={col.key}
                  className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                >
                  {(list as any)[col.key] ?? "-"}
                </td>
              );
            })}
          </tr>
        )}
      />

      {/* Context Menu for Lists */}
      <ContextMenu
        position={contextMenuPos}
        items={listContextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

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

          <TextArea
            label="Description (Optional)"
            value={listForm.description}
            onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
            placeholder="Brief purpose of this replacement list"
            rows={2}
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

          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary dark:text-white">
                List Status
              </div>
              <div className="text-xs text-text-secondary dark:text-gray-400">
                Activate or deactivate this replacement list pool
              </div>
            </div>
            <ToggleSwitch
              checked={listForm.isActive}
              onChange={(checked) => setListForm({ ...listForm, isActive: checked })}
            />
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
        className="max-w-4xl"
        title={
          <div className="flex items-center gap-2">
            <span>List Entries:</span>
            <span className="text-primary font-bold">{activeListForItems?.name}</span>
            <span className="text-xs text-text-secondary font-normal">
              ({activeListForItems?.selectionMode || "RANDOM"})
            </span>
          </div>
        }
      >
        <div className="space-y-4" onClick={() => setItemContextMenuPos(null)}>
          <ModalDataTable
            density="compact"
            data={items}
            isLoading={loadingItems}
            headers={ITEM_HEADERS}
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
            renderRow={(item: MessageTextReplacementListItem) => (
              <tr
                key={item.id}
                onContextMenu={(e) => handleItemContextMenu(e, item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary dark:text-gray-200">
                  {item.sequenceNo}
                </td>
                <td className="px-4 py-3">
                  <pre className="text-xs font-mono text-text-primary dark:text-gray-200 whitespace-pre-wrap break-all max-h-24 overflow-y-auto bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                    {item.value}
                  </pre>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary dark:text-gray-400">
                  {item.value.length} ch
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            )}
          />

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setActiveListForItems(null)}>
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
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        className="max-w-md"
        title={editingItemId ? "Update Text Entry" : "Add Text Entry"}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <TextArea
            label="Text Value / Template Content"
            value={itemForm.value}
            onChange={(e) => setItemForm({ ...itemForm, value: e.target.value })}
            rows={4}
            placeholder="Enter replacement string, dynamic macro, or multi-line template..."
            required
          />
          <div className="text-[11px] text-gray-400 -mt-2 flex justify-between">
            <span>Supports any characters, UTF-8, and emoji.</span>
            <span className="font-mono">{itemForm.value.length} characters</span>
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

          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary dark:text-white">
                Entry Status
              </div>
              <div className="text-xs text-text-secondary dark:text-gray-400">
                Include this entry in active list selection
              </div>
            </div>
            <ToggleSwitch
              checked={itemForm.isActive}
              onChange={(checked) => setItemForm({ ...itemForm, isActive: checked })}
            />
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
          message="Are you sure you want to delete this text entry?"
          isDeleting={isDeletingItem}
        />
      )}
    </div>
  );
};
