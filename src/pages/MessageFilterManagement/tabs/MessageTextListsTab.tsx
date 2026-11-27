import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  Eye,
  Shuffle,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import {
  MessageTextListModal,
  MessageTextEntriesModal,
} from "../../../components/modals/MessageFilter";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import { formatDateTime } from "../../../helper/dateFormatter";
import {
  getMessageTextReplacementListsApi,
  deleteMessageTextReplacementListApi,
  updateMessageTextReplacementListApi,
  type MessageTextReplacementList,
} from "../../../api/messageFilterApi/messageFilterApi";

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

const DEFAULT_SEARCH_COLUMNS = ["name", "selectionMode", "status"];
const DEFAULT_TABLE_COLUMNS = [
  "id",
  "name",
  "client",
  "selectionMode",
  "itemCount",
  "status",
];

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
      const saved = localStorage.getItem("message_text_lists_search_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((k) => k !== "client");
          if (filtered.length > 0) return filtered;
        }
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
  const [editingList, setEditingList] = useState<MessageTextReplacementList | null>(null);

  // Delete List State
  const [deletingList, setDeletingList] = useState<MessageTextReplacementList | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  // Manage Items Modal State
  const [activeListForItems, setActiveListForItems] = useState<MessageTextReplacementList | null>(null);

  // Load Lists
  const loadLists = async (customFilters?: Record<string, string>) => {
    if (!selectedClientId) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeFilters = customFilters !== undefined ? customFilters : appliedFilters;
      const params: Record<string, any> = {
        client: selectedClientId,
      };

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
    if (selectedClientId) {
      loadLists();
    } else {
      setLists([]);
      setLoading(false);
    }
  }, [selectedClientId]);

  const handleOpenAddList = () => {
    setEditingList(null);
    setShowListModal(true);
  };

  const handleOpenEditList = (list: MessageTextReplacementList) => {
    setEditingList(list);
    setShowListModal(true);
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
      key: "id",
      label: "ID",
      tableLabel: "ID",
      type: "number",
      filterKey: "id",
      render: (list) => (
        <span
          className="text-sm font-mono font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleOpenEditList(list)}
        >
          #{list.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "List Name",
      tableLabel: "List Name",
      type: "text",
      filterKey: "name__icontains",
      render: (list) => (
        <span
          className="text-sm font-semibold text-text-primary dark:text-white cursor-pointer hover:underline"
          onClick={() => handleOpenEditList(list)}
        >
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
      isSearchable: false,
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
      render: (list) => {
        const count = list.items_count ?? list.itemCount ?? (list as any).itemsCount ?? 0;
        return (
          <span
            className="text-sm font-medium text-primary hover:underline cursor-pointer"
            onClick={() => handleOpenItems(list)}
          >
            {count} item{count !== 1 ? "s" : ""}
          </span>
        );
      },
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
    if (selectedClientId) {
      loadLists({});
    }
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
        let aVal = a[sortConfig.key] ?? "";
        let bVal = b[sortConfig.key] ?? "";
        if (sortConfig.key === "itemCount") {
          aVal = a.items_count ?? a.itemCount ?? 0;
          bVal = b.items_count ?? b.itemCount ?? 0;
        }
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
      {/* Sleek, Compact Selector Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => {
                setSelectedClientId(val ? Number(val) : null);
              }}
              options={clients.map((c) => ({
                value: String(c.id),
                label: c.name
                  ? c.companyName
                    ? `${c.name} (${c.companyName})`
                    : c.name
                  : c.companyName || `Client #${c.id}`,
              }))}
            />
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedClientId(null)}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Instruction Note if no client selected */}
      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to configure and manage its text replacement lists and dictionary pools.
          </p>
        </div>
      )}

      {selectedClientId && (
        <>
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
            storageKey="message_text_lists_main_table"
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
        </>
      )}

      {/* Context Menu for Lists */}
      <ContextMenu
        position={contextMenuPos}
        items={listContextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Add / Edit List Modal */}
      <MessageTextListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onSuccess={() => loadLists()}
        editingList={editingList}
        selectedClientId={selectedClientId}
      />

      {/* Manage Items Modal */}
      <MessageTextEntriesModal
        isOpen={!!activeListForItems}
        onClose={() => setActiveListForItems(null)}
        activeList={activeListForItems}
        onUpdateListCount={() => loadLists()}
      />

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
    </div>
  );
};
