import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getSmppApi,
  deleteSmppApi,
  type SmppData,
} from "../../../api/connectivityApi/smppApi";
import { SmppModal } from "../../../components/modals/Connectivity/SmppModal";
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
import ContextMenu, {
  type ContextMenuItem,
} from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";

// FIXED: Import the timezone formatter
import { formatDateTime } from "../../../helper/dateFormatter";

// --- Interfaces ---
interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render?: (data: SmppData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  tableLabel?: string;
}

// --- Helper to fix UTC timezone offsets shifting the date backward ---
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// --- Default Configuration ---
const DEFAULT_SEARCH_COLUMNS = ["smppHost", "systemID", "bindMode"];
const DEFAULT_TABLE_COLUMNS = ["smppHost", "smppPort", "systemID", "bindMode"];

const Smpp: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [smpps, setSmpps] = useState<SmppData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSmpp, setEditingSmpp] = useState<SmppData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowSmpp, setSelectedRowSmpp] = useState<SmppData | null>(null);

  // --- Dynamic Filters & Columns State ---
  const [searchColumns, setSearchColumns] = useState<string[]>(
    DEFAULT_SEARCH_COLUMNS
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("smpp_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("smpp_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const routeName = pathSegments[pathSegments.length - 1] || "connectivity";
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Tracking ---
  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll(
          "aside a.active, nav a.active"
        );
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel =
          activeItem?.innerText?.split("\n")[0].trim() || "Module";

        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);

      hasLoggedOpening.current = true;
    }
  }, []);

  // --- Column Configuration ---
  const bindModeOptions: Option[] = [
    { label: "Transmitter", value: "TRANSMITTER" },
    { label: "Receiver", value: "RECEIVER" },
    { label: "Transceiver", value: "TRANSCEIVER" },
  ];

  // ⚡️ FIX: Mapped filterKeys directly to Django `SMPPFilter` class fields
  const allColumns: ColumnConfig[] = [
    { key: "smppHost", label: "Host", type: "text", filterKey: "smppHost__icontains" },
    { key: "smppPort", label: "Port", type: "text", filterKey: "smppPort__icontains" },
    { key: "systemID", label: "System ID", type: "text", filterKey: "systemID__icontains" },
    { key: "bindMode", label: "Bind Mode", type: "text", options: bindModeOptions, filterKey: "bindMode__icontains" },

    // --- Source TON Variants ---
    { key: "sourceTON", label: "Source TON (Exact)", tableLabel: "Source TON", type: "number", filterKey: "sourceTON" },
    { key: "sourceTON__range", label: "Source TON (Range)", type: "number_range", isSearchOnly: true, filterKey: "sourceTON" },
    { key: "sourceTON__gt_lt", label: "Source TON (GT / LT)", type: "number_gt_lt", isSearchOnly: true, filterKey: "sourceTON" },

    // --- Dest TON Variants ---
    { key: "destTON", label: "Dest TON (Exact)", tableLabel: "Dest TON", type: "number", filterKey: "destTON" },
    { key: "destTON__range", label: "Dest TON (Range)", type: "number_range", isSearchOnly: true, filterKey: "destTON" },
    { key: "destTON__gt_lt", label: "Dest TON (GT / LT)", type: "number_gt_lt", isSearchOnly: true, filterKey: "destTON" },

    // --- Source NPI Variants ---
    { key: "sourceNPI", label: "Source NPI (Exact)", tableLabel: "Source NPI", type: "number", filterKey: "sourceNPI" },
    { key: "sourceNPI__range", label: "Source NPI (Range)", type: "number_range", isSearchOnly: true, filterKey: "sourceNPI" },
    { key: "sourceNPI__gt_lt", label: "Source NPI (GT / LT)", type: "number_gt_lt", isSearchOnly: true, filterKey: "sourceNPI" },

    // --- Dest NPI Variants ---
    { key: "destNPI", label: "Dest NPI (Exact)", tableLabel: "Dest NPI", type: "number", filterKey: "destNPI" },
    { key: "destNPI__range", label: "Dest NPI (Range)", type: "number_range", isSearchOnly: true, filterKey: "destNPI" },
    { key: "destNPI__gt_lt", label: "Dest NPI (GT / LT)", type: "number_gt_lt", isSearchOnly: true, filterKey: "destNPI" },

    // --- Created At Variants ---
    // FIXED: Implement new timezone cache formatter
    { key: "createdAt", label: "Created At (Exact)", tableLabel: "Created At", type: "date", filterKey: "createdAt", render: (c: any) => (c.createdAt ? formatDateTime(c.createdAt) : "-") },
    { key: "createdAt__range", label: "Created At (From/To)", type: "date_range", isSearchOnly: true, filterKey: "createdAt" },
    { key: "createdAt__gt_lt", label: "Created At (After / Before)", type: "date_gt_lt", isSearchOnly: true, filterKey: "createdAt" },
  ];

  const visibleSearchFields = allColumns.filter((col) =>
    searchColumns.includes(col.key)
  );
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  // --- Fetch Data (Advanced Filter Logic) ---
  const fetchSmpp = async (filters: Record<string, string> | null = null) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    setIsLoading(true);

    try {
      const activeFilters = filters || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (value) {
          const columnDef = allColumns.find((c) => c.key === key);

          if (columnDef?.options) {
            const selectedOption = columnDef.options.find((opt) => opt.value === value);
            currentSearchParams[columnDef.filterKey || key] = selectedOption ? selectedOption.value : value;
          } 
          else if (columnDef?.type === "date") {
            currentSearchParams[`${columnDef.filterKey || key}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          } 
          else if (columnDef?.type === "date_range") {
            // ⚡️ FIX: Strip appended modifiers dynamically to avoid sending "createdAt__range__range"
            const baseKey = key.replace("__range", "");
            const [start, end] = value.split(",");
            if (start && end) {
              currentSearchParams[key] = `${start}T00:00:00,${end}T23:59:59`;
            } else {
              if (start) currentSearchParams[`${baseKey}__gt`] = `${start}T00:00:00`;
              if (end) currentSearchParams[`${baseKey}__lt`] = `${end}T23:59:59`;
            }
          } 
          else if (columnDef?.type === "date_gt_lt") {
            const baseKey = key.replace("__gt_lt", "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gt`] = `${gt}T23:59:59`;
            if (lt) currentSearchParams[`${baseKey}__lt`] = `${lt}T00:00:00`;
          } 
          else if (columnDef?.type === "number_range") {
            const baseKey = key.replace("__range", "");
            const [start, end] = value.split(",");
            if (start && end) {
              currentSearchParams[key] = value;
            } else {
              if (start) currentSearchParams[`${baseKey}__gt`] = start;
              if (end) currentSearchParams[`${baseKey}__lt`] = end;
            }
          } 
          else if (columnDef?.type === "number_gt_lt") {
            const baseKey = key.replace("__gt_lt", "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gt`] = gt;
            if (lt) currentSearchParams[`${baseKey}__lt`] = lt; // ⚡️ FIX: Bug where lt mapped to gt
          } 
          else if (columnDef?.type === "text") {
            const filterKey = columnDef.filterKey || `${key}__icontains`;
            currentSearchParams[filterKey] = value;
          } 
          else {
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

      const response: any = await getSmppApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setSmpps(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setSmpps(response);
        setTotalItems(response.length);
      } else {
        setSmpps([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError")
        toast.error("Failed to fetch SMPP configs.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSmpp();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  // --- Handlers ---
  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
    if (colIndex >= 0 && colIndex < visibleTableFields.length) {
      const col = visibleTableFields[colIndex];
      setSortConfig((prev) => {
        if (prev?.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSmpp();
  };

  const handleClear = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchSmpp({});
  };

  const handleDelete = async () => {
    if (deleteId && canDelete) {
      try {
        await deleteSmppApi(deleteId, routeName);
        toast.success("Deleted successfully.");
        fetchSmpp();
      } catch (error) {
        toast.error("Failed to delete.");
      }
      setDeleteId(null);
    }
  };

  const handleEdit = (item: SmppData) => {
    if (!canUpdate) return;
    setEditingSmpp(item);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleAdd = () => {
    if (!canCreate) return;
    setEditingSmpp(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (item: SmppData) => {
    setEditingSmpp(item);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // --- Context Menu Handler ---
  const handleContextMenu = (e: React.MouseEvent, item: SmppData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowSmpp(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowSmpp
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => handleView(selectedRowSmpp),
        },
        ...(canUpdate
          ? [
              {
                label: "Edit SMPP",
                icon: <Edit size={16} />,
                onClick: () => handleEdit(selectedRowSmpp),
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete SMPP",
                icon: <Trash size={16} />,
                variant: "danger" as const,
                onClick: () => setDeleteId(selectedRowSmpp.id!),
              },
            ]
          : []),
      ]
    : [];

  const tableHeaders = ["S.N.", ...visibleTableFields.map((col) => col.tableLabel || col.label)];

  const getBaseLabel = (label: string) => label.split(" (")[0].trim();

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            SMPP Connectivity
          </h1>
           <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns}
              selectedColumns={tableColumns}
              onFilter={setTableColumns}
              onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
              buttonLabel="Columns"
            />
          </div>

          <div className="relative z-20">
            <AdvancedFilter
              columns={allColumns}
              selectedColumns={searchColumns}
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
          <span className="text-text-primary dark:text-white">SMPP</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClear}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label);

          if (col.options) {
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
          }

          if (col.type === "date") {
            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                selected={filterValues[col.key] ? new Date(filterValues[col.key]) : null}
                onChange={(val: Date | null) =>
                  handleFilterChange(col.key, val ? formatLocalDate(val) : "")
                }
              />
            );
          }

          // FIX: Replaced col-span-2 container with React.Fragment so elements act as single columns!
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
                    const newVal = newStart || currentEnd ? `${newStart},${currentEnd}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (To)`}
                  selected={endStr ? new Date(endStr) : null}
                  onChange={(val: Date | null) => {
                    const newEnd = val ? formatLocalDate(val) : "";
                    const currentStart = startStr || "";
                    const newVal = currentStart || newEnd ? `${currentStart},${newEnd}` : "";
                    handleFilterChange(col.key, newVal);
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
                    const newVal = newGt || currentLt ? `${newGt},${currentLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    const newVal = currentGt || newLt ? `${currentGt},${newLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                />
              </React.Fragment>
            );
          }

          if (col.type === "number_range") {
            const [minStr, maxStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <Input
                  type="number"
                  label={`Search ${baseLabel} (Min)`}
                  value={minStr || ""}
                  onChange={(e) => {
                    const newMin = e.target.value;
                    const currentMax = maxStr || "";
                    const newVal = newMin || currentMax ? `${newMin},${currentMax}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`> Min`}
                />
                <Input
                  type="number"
                  label={`Search ${baseLabel} (Max)`}
                  value={maxStr || ""}
                  onChange={(e) => {
                    const newMax = e.target.value;
                    const currentMin = minStr || "";
                    const newVal = currentMin || newMax ? `${currentMin},${newMax}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`< Max`}
                />
              </React.Fragment>
            );
          }

          if (col.type === "number_gt_lt") {
            const [gtStr, ltStr] = (filterValues[col.key] || "").split(",");
            return (
              <React.Fragment key={col.key}>
                <Input
                  type="number"
                  label={`Search ${baseLabel} (> Greater)`}
                  value={gtStr || ""}
                  onChange={(e) => {
                    const newGt = e.target.value;
                    const currentLt = ltStr || "";
                    const newVal = newGt || currentLt ? `${newGt},${currentLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`> Greater than`}
                />
                <Input
                  type="number"
                  label={`Search ${baseLabel} (< Less)`}
                  value={ltStr || ""}
                  onChange={(e) => {
                    const newLt = e.target.value;
                    const currentGt = gtStr || "";
                    const newVal = currentGt || newLt ? `${currentGt},${newLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                  placeholder={`< Less than`}
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
        data={smpps}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        headers={tableHeaders}
        isLoading={isLoading}
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
        onSort={handleSort}
        sortColumnIndex={sortConfig ? visibleTableFields.findIndex(c => c.key === sortConfig.key) + 1 : null}
        sortDirection={sortConfig?.direction || null}
        headerActions={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleAdd}
              leftIcon={<Plus size={18} />}
            >
              Add Connectivity
            </Button>
          ) : null
        }
        renderRow={(item, index) => (
          <tr
            key={item.id || index}
            onContextMenu={(e) => handleContextMenu(e, item)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (item as any)[col.key];

              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(item)}
                  </td>
                );
              }
              if (col.options) {
                const match = col.options.find(
                  (opt) => opt.value === String(cellData)
                );
                cellData = match ? match.label : cellData;
              }
              return (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap ${
                    col.key === "smppHost"
                      ? "font-medium text-text-primary dark:text-white"
                      : ""
                  }`}
                >
                  {cellData || "-"}
                </td>
              );
            })}
          </tr>
        )}
      />

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <SmppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSmpp}
        moduleName={routeName}
        editingSmpp={editingSmpp}
        isViewMode={isViewMode}
      />
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Config"
        message="Are you sure you want to delete this SMPP configuration? This action cannot be undone."
      />
    </div>
  );
};

export default Smpp;