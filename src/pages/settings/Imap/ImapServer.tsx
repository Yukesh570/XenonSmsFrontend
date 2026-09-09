import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getImapServersApi,
  deleteImapServerApi,
  type ImapServerData,
} from "../../../api/settingApi/imapApi/imapApi";
import { ImapModal } from "../../../components/modals/Settings/ImapModal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DatePicker from "../../../components/ui/DatePicker";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";
import { StatusBadge } from "../../../components/ui/StatusBadge";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render: (server: ImapServerData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SEARCH_COLUMNS = ["name", "imapHost", "imapUser"];
const DEFAULT_TABLE_COLUMNS = [
  "name",
  "imapHost",
  "imapPort",
  "imapUser",
  "security",
  "active",
];

const ImapServer: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [servers, setServers] = useState<ImapServerData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ImapServerData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowServer, setSelectedRowServer] = useState<ImapServerData | null>(null);

  // --- Dynamic Search & Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("imapserver_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "imapserver_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Column Order State & Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("imapserver_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("imapserver_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const location = useLocation();
  const routeName = location.pathname.split("/")[1] || "";

  const getSecurityStatus = (sec?: string) => {
    if (sec === "TLS") return "QUEUED";
    if (sec === "SSL") return "DELIVERED";
    return "UNKNOWN";
  };

  const securityOptions: Option[] = [
    { label: "TLS", value: "TLS" },
    { label: "SSL", value: "SSL" },
    { label: "NONE", value: "NONE" },
  ];

  // Column definitions for dynamic rendering, filtering, & visibility
  const allColumns: ColumnConfig[] = [
    {
      key: "name",
      label: "Name",
      type: "text",
      filterKey: "name__icontains",
      render: (server) => (
        <span className="font-medium text-text-primary dark:text-white">
          {server.name}
        </span>
      ),
    },
    {
      key: "imapHost",
      label: "Host",
      type: "text",
      filterKey: "imapHost__icontains",
      render: (server) => (
        <span className="text-text-primary dark:text-white">
          {server.imapHost}
        </span>
      ),
    },
    {
      key: "imapPort",
      label: "Port",
      type: "number",
      filterKey: "imapPort",
      render: (server) => (
        <StatusBadge status="SUBMITTED" customText={String(server.imapPort)} />
      ),
    },
    {
      key: "imapUser",
      label: "User",
      type: "text",
      filterKey: "imapUser__icontains",
      render: (server) => (
        <span className="text-text-primary dark:text-white">
          {server.imapUser}
        </span>
      ),
    },
    {
      key: "security",
      label: "Security",
      type: "text",
      options: securityOptions,
      filterKey: "security",
      render: (server) => (
        <StatusBadge
          status={getSecurityStatus(server.security)}
          customText={server.security || "NONE"}
        />
      ),
    },
    {
      key: "active",
      label: "Active",
      type: "text",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" }
      ],
      filterKey: "active",
      render: (server) => (
        <StatusBadge
          status={server.active ? "DELIVERED" : "REJECTED"}
          customText={server.active ? "Yes" : "No"}
        />
      ),
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const headers = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchServers = async (overrideParams?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const activeFilters = overrideParams || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (value) {
          const columnDef = allColumns.find((c) => c.key === key);
          if (columnDef?.options) {
            const selectedOption = columnDef.options.find(
              (opt) => opt.value === value,
            );
            if (selectedOption) {
              currentSearchParams[columnDef.filterKey || key] = selectedOption.value;
            } else {
              currentSearchParams[columnDef.filterKey || key] = value;
            }
          } else {
            currentSearchParams[columnDef?.filterKey || key] = value;
          }
        }
      });

      if (sortConfig) {
        const columnDef = allColumns.find((c: any) => c.key === sortConfig.key);
        let sortKey = sortConfig.key;
        if (columnDef && columnDef.filterKey) {
          sortKey = columnDef.filterKey.replace(/__(icontains|exact|range|gt_lt|gte|lte)$/, "");
        }
        currentSearchParams["ordering"] = sortConfig.direction === "desc" ? `-${sortKey}` : sortKey;
      }

      const response = await getImapServersApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
      );
      setServers(response.results);
      setTotalItems(response.count);
    } catch (error) {
      console.error("Failed to fetch IMAP servers:", error);
      toast.error("Failed to fetch IMAP servers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [currentPage, rowsPerPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchServers();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchServers({});
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

  const handleAdd = () => {
    setEditingServer(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteImapServerApi(deleteId, routeName);
        toast.success("Host deleted successfully");
        fetchServers();
      } catch (error) {
        console.error("Failed to delete IMAP Host:", error);
        toast.error("Failed to delete IMAP Host");
      }
    }
    setDeleteId(null);
    setSelectedRowServer(null);
  };

  const handleEdit = (server: ImapServerData) => { if (!canUpdate) return; setEditingServer(server); setIsViewMode(false); setIsModalOpen(true); };
  const handleView = (server: ImapServerData) => { setEditingServer(server); setIsViewMode(true); setIsModalOpen(true); };

  const handleContextMenu = (e: React.MouseEvent, item: ImapServerData) => {
    e.preventDefault();
    setSelectedRowServer(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const menuItems: ContextMenuItem[] = selectedRowServer ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => handleView(selectedRowServer) },
    ...(canUpdate ? [{ label: "Edit Server", icon: <Edit size={16} />, onClick: () => handleEdit(selectedRowServer) }] : []),
    ...(canDelete ? [{ label: "Delete Server", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRowServer.id!) }] : []),
  ] : [];

  const getBaseLabel = (label: string) => label.replace(" (From)", "").replace(" (To)", "");

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("IMAP Settings", `Opened IMAP Settings Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const imapServerIdentifier = selectedRowServer
    ? selectedRowServer.name || selectedRowServer.imapHost || `IMAP Server #${selectedRowServer.id}`
    : "";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            IMAP
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={(cols) => setTableColumns(cols)}
              onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
              buttonLabel="Columns"
              enableReorder={true}
            />
          </div>
          <div className="relative z-20">
            <AdvancedFilter
              columns={searchableColumns}
              selectedColumns={searchColumns}
              defaultColumns={DEFAULT_SEARCH_COLUMNS}
              onFilter={(newCols) => {
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
              isLoading={isLoading}
              buttonLabel="Search Fields"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Email Hosts (IMAP)</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options)
            return (
              <Select
                key={col.key}
                label={`Search ${baseLabel}`}
                value={filterValues[col.key] || ""}
                onChange={(val) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
                allowCustomValue={true} />
            );
          if (col.type === "date")
            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                selected={
                  filterValues[col.key] ? new Date(filterValues[col.key]) : null
                }
                onChange={(val: Date | null) =>
                  handleFilterChange(col.key, val ? formatLocalDate(val) : "")
                }
              />
            );
          if (col.type === "date_range") {
            const [startStr, endStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (From)`}
                  selected={startStr ? new Date(startStr) : null}
                  onChange={(val: Date | null) => {
                    const newStart = val ? formatLocalDate(val) : "";
                    const currentEnd = endStr || "";
                    handleFilterChange(
                      col.key,
                      newStart || currentEnd ? `${newStart},${currentEnd}` : "",
                    );
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (To)`}
                  selected={endStr ? new Date(endStr) : null}
                  onChange={(val: Date | null) => {
                    const newEnd = val ? formatLocalDate(val) : "";
                    const currentStart = startStr || "";
                    handleFilterChange(
                      col.key,
                      currentStart || newEnd ? `${currentStart},${newEnd}` : "",
                    );
                  }}
                />
              </React.Fragment>
            );
          }
          if (col.type === "date_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (> After)`}
                  selected={gtStr ? new Date(gtStr) : null}
                  onChange={(val: Date | null) => {
                    const newGt = val ? formatLocalDate(val) : "";
                    const currentLt = ltStr || "";
                    handleFilterChange(
                      col.key,
                      newGt || currentLt ? `${newGt},${currentLt}` : "",
                    );
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    handleFilterChange(
                      col.key,
                      currentGt || newLt ? `${currentGt},${newLt}` : "",
                    );
                  }}
                />
              </React.Fragment>
            );
          }
          return (
            <Input
              key={col.key}
              type={col.type || "text"}
              label={`Search ${baseLabel}`}
              value={filterValues[col.key] || ""}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              placeholder={`${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={servers}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        headers={headers}
        isLoading={isLoading}
        onSort={handleSort}
        sortColumnIndex={sortConfig ? visibleTableFields.findIndex(c => c.key === sortConfig.key) + 1 : null}
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            const validKeys = prev.filter(key => allColumns.some(c => c.key === key));
            const next = [...validKeys];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
        }}
        headerActions={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleAdd}
              leftIcon={<Plus size={18} />}
            >
              Add Host
            </Button>
          ) : null
        }
        renderRow={(server, index) => (
          <tr
            key={server.id}
            onContextMenu={(e) => handleContextMenu(e, server)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => (
              <td
                key={col.key}
                className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
              >
                {col.render(server)}
              </td>
            ))}
          </tr>
        )}
      />

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <ImapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchServers}
        moduleName={routeName}
        editingServer={editingServer}
        isViewMode={isViewMode}
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRowServer(null);
        }}
        onConfirm={handleDelete}
        title="Delete Host"
        message={`Are you sure you want to delete IMAP host "${imapServerIdentifier}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default ImapServer;