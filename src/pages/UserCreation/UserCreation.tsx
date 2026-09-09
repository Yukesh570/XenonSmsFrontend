import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getUsersApi,
  deleteUserApi,
  type UserCreationData,
} from "../../api/settingApi/userCreationApi/userCreationApi";
import { UserCreationModal } from "../../components/modals/Settings/UserCreationModal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../components/modals/DeleteModal";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render: (user: UserCreationData) => React.ReactNode;
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

const userTypeOptions: Option[] = [
  { label: "ADMIN", value: "ADMIN" },
  { label: "SALES", value: "SALES" },
  { label: "SUPPORT", value: "SUPPORT" },
  { label: "NOC", value: "NOC" },
  { label: "RATE", value: "RATE" },
  { label: "FINANCE", value: "FINANCE" },
  { label: "Account Manager", value: "ACCOUNT_MANAGER" },
];

const DEFAULT_SEARCH_COLUMNS = ["username", "email", "phone", "userType"];
const DEFAULT_TABLE_COLUMNS = ["username", "email", "phone", "userType", "date_joined"];

const UserCreation: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [users, setUsers] = useState<UserCreationData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserCreationData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteUsername, setDeleteUsername] = useState<string>("");
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowUser, setSelectedRowUser] = useState<UserCreationData | null>(null);

  // --- Dynamic Search & Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("usercreation_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "usercreation_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Column Order State & Persistence ---
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("usercreation_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("usercreation_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const location = useLocation();
  const routeName = location.pathname.split("/").pop() || "userCreation";

  // Column definitions matching UserFilter backend schema
  const allColumns: ColumnConfig[] = [
    {
      key: "id",
      label: "User ID",
      type: "number",
      filterKey: "id",
      isSearchable: true,
      render: (u: UserCreationData) => u.id ?? "-",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      filterKey: "username__icontains",
      render: (u: UserCreationData) => (
        <span className="font-medium text-text-primary dark:text-white">
          {u.username}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      type: "text",
      filterKey: "email__icontains",
      render: (u: UserCreationData) => u.email || "-",
    },
    {
      key: "phone",
      label: "Phone",
      type: "text",
      filterKey: "phone__icontains",
      render: (u: UserCreationData) => u.phone || "-",
    },
    {
      key: "userType",
      label: "User Type",
      type: "text",
      options: userTypeOptions,
      filterKey: "userType",
      render: (u: UserCreationData) => {
        const match = userTypeOptions.find((opt) => opt.value === u.userType);
        return match ? match.label : u.userType || "-";
      },
    },
    {
      key: "date_joined",
      label: "Date Joined (Exact)",
      tableLabel: "Date Joined",
      type: "date",
      filterKey: "date_joined",
      render: (u: UserCreationData) =>
        u.date_joined ? formatDateTime(u.date_joined) : "-",
    },
    {
      key: "date_joined__range",
      label: "Date Joined (Range)",
      type: "date_range",
      isSearchOnly: true,
      render: () => null,
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key)
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

  const fetchUsers = async (overrideParams?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const activeFilters = overrideParams || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (value && typeof value === "string" && value.trim() !== "") {
          const columnDef = allColumns.find((c) => c.key === key);
          const filterKey = columnDef?.filterKey || key;

          if (columnDef?.options) {
            const selectedOption = columnDef.options.find(
              (opt) => opt.value === value
            );
            currentSearchParams[filterKey] = selectedOption
              ? selectedOption.value
              : value;
          } else if (columnDef?.type === "date") {
            currentSearchParams[`${key}__range`] =
              `${value}T00:00:00,${value}T23:59:59`;
          } else if (columnDef?.type === "date_range") {
            const baseKey = key.split("__")[0];
            const [start, end] = value.split(",");
            if (start && end) {
              currentSearchParams[`${baseKey}__range`] = `${start}T00:00:00,${end}T23:59:59`;
            } else if (start) {
              currentSearchParams[`${baseKey}__gte`] = `${start}T00:00:00`;
            } else if (end) {
              currentSearchParams[`${baseKey}__lte`] = `${end}T23:59:59`;
            }
          } else if (columnDef?.type === "text") {
            currentSearchParams[filterKey] = value.trim();
          } else {
            currentSearchParams[filterKey] = value.trim();
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

      const response: any = await getUsersApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (response && response.results) {
        setUsers(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setUsers(response);
        setTotalItems(response.length);
      } else {
        setUsers([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchUsers({});
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

  const handleDelete = async () => {
    if (deleteId && canDelete) {
      try {
        await deleteUserApi(deleteId, routeName);
        toast.success("User deleted successfully.");
        fetchUsers();
      } catch (error) {
        toast.error("Failed to delete user.");
      }
      setDeleteId(null);
      setDeleteUsername("");
      setSelectedRowUser(null);
    }
  };

  const handleEdit = (user: UserCreationData) => {
    if (!canUpdate) return;
    setEditingUser(user);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingUser(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (user: UserCreationData) => {
    setEditingUser(user);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, item: UserCreationData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowUser(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowUser
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => handleView(selectedRowUser),
        },
        ...(canUpdate
          ? [
              {
                label: "Edit User",
                icon: <Edit size={16} />,
                onClick: () => handleEdit(selectedRowUser),
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete User",
                icon: <Trash size={16} />,
                variant: "danger" as const,
                onClick: () => {
                  setDeleteId(selectedRowUser.id!);
                  setDeleteUsername(selectedRowUser.username);
                },
              },
            ]
          : []),
      ]
    : [];

  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");
  const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll("aside a.active, nav a.active");
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        const moduleLabel = activeItem?.innerText?.split("\n")[0].trim() || "User Creation";
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const userIdentifier = selectedRowUser
    ? selectedRowUser.username || selectedRowUser.email || `User #${selectedRowUser.id}`
    : deleteUsername || "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            User Creation
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns}
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
              columns={searchableColumns}
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
          <span className="text-text-primary dark:text-white">User Creation</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options) {
            return (
              <Select
                key={col.key}
                label={`Search ${baseLabel}`}
                value={filterValues[col.key] || ""}
                onChange={(val: string) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
              allowCustomValue={true} />
            );
          }
          if (col.type === "date") {
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
          }
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
                      newStart || currentEnd ? `${newStart},${currentEnd}` : ""
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
                      currentStart || newEnd ? `${currentStart},${newEnd}` : ""
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleFilterChange(col.key, e.target.value)
              }
              placeholder={`${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={users}
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
        onReorderColumns={(fromIdx: number, toIdx: number) => {
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
              Add User
            </Button>
          ) : null
        }
        renderRow={(user: UserCreationData, index: number) => (
          <tr
            key={user.id || index}
            onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, user)}
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
                {col.render(user)}
              </td>
            ))}
          </tr>
        )}
      />

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <UserCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchUsers}
        moduleName={routeName}
        editingUser={editingUser}
        isViewMode={isViewMode}
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteUsername("");
          setSelectedRowUser(null);
        }}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${userIdentifier}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default UserCreation;