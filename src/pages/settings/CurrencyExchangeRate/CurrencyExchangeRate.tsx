import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye, History } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getCurrencyExchangeRatesApi,
  deleteCurrencyExchangeRateApi,
  type CurrencyExchangeRateData,
} from "../../../api/settingApi/currencyExchangeRateApi/currencyExchangeRateApi";
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
import { CurrencyExchangeRateModal } from "../../../components/modals/Settings/CurrencyExchangeRateModal";
import { CurrencyExchangeRateHistoryModal } from "../../../components/modals/Settings/CurrencyExchangeRateHistoryModal";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../components/ui/ContextMenu";
import { actionHelper } from "../../../helper/action";
import { formatDateTime } from "../../../helper/dateFormatter";
import { StatusBadge } from "../../../components/ui/StatusBadge";

interface Option {
  label: string;
  value: string;
}

type FilterColumnType =
  | "number"
  | "boolean"
  | "date"
  | "date_gt_lt"
  | "text"
  | "number_range"
  | "number_gt_lt";

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: FilterColumnType;
  render?: (data: any) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const DEFAULT_SEARCH_COLUMNS = [
  "baseCurrency",
  "targetCurrency",
  "status",
  "source",
];
const DEFAULT_TABLE_COLUMNS = [
  "baseCurrency",
  "targetCurrency",
  "exchangeRate",
  "status",
  "source",
  "createdAt",
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CurrencyExchangeRate: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [rates, setRates] = useState<CurrencyExchangeRateData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyExchangeRateData | null>(null);
  const [historyRateId, setHistoryRateId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu States ---
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowRate, setSelectedRowRate] = useState<CurrencyExchangeRateData | null>(null);

  // --- Dynamic Filters & Columns State ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("currency_exchange_rate_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "currency_exchange_rate_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("currency_exchange_rate_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "currency_exchange_rate_columns",
      JSON.stringify(tableColumns),
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const routeName = pathParts[pathParts.length - 1] || "currencyExchangeRate";
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
    { label: "Expired", value: "EXPIRED" },
  ];

  const allColumns: ColumnConfig[] = [
    {
      key: "baseCurrency",
      label: "Base Currency",
      type: "text",
      filterKey: "baseCurrency__name__icontains",
      render: (c) => (
        <span>
          {c.baseCurrency_name ? c.baseCurrency_name : c.baseCurrency}{" "}
          {c.baseCurrency_name && (
            <span className="text-gray-400">({c.baseCurrency})</span>
          )}
        </span>
      ),
    },
    {
      key: "targetCurrency",
      label: "Target Currency",
      type: "text",
      filterKey: "targetCurrency__name__icontains",
      render: (c) => (
        <span>
          {c.targetCurrency_name ? c.targetCurrency_name : c.targetCurrency}{" "}
          {c.targetCurrency_name && (
            <span className="text-gray-400">({c.targetCurrency})</span>
          )}
        </span>
      ),
    },
    {
      key: "exchangeRate",
      label: "Exchange Rate",
      type: "number",
      isSearchable: false,
      render: (c) =>
        c.targetCurrency_symbol
          ? `${c.targetCurrency_symbol} ${c.exchangeRate}`
          : c.exchangeRate,
    },
    {
      key: "version",
      label: "Version",
      type: "number",
      isSearchable: false,
      render: (c) => (c.version ? `${c.version}` : c.version),
    },
    {
      key: "status",
      label: "Status",
      type: "text",
      options: activeOptions,
      filterKey: "status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "source",
      label: "Source",
      type: "text",
      filterKey: "source__icontains",
      render: (c) => <span>{c.source ? c.source : "-"}</span>,
    },
    {
      key: "createdAt",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "createdAt",
      render: (c) => (c.createdAt ? formatDateTime(c.createdAt) : "-"),
    },
    {
      key: "createdAt__gt_lt",
      label: "Created At (After / Before)",
      type: "date_gt_lt",
      filterKey: "createdAt",
      isSearchOnly: true,
    },
  ];

  const searchableColumns = allColumns.filter(
    (col) => col.isSearchable !== false,
  );
  const visibleSearchFields = searchableColumns.filter((col) =>
    searchColumns.includes(col.key),
  );

  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type as FilterColumnType,
    }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchRates = async (
    filters: Record<string, string> | null = null,
  ) => {
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
            const selectedOption = columnDef.options.find(
              (opt) => opt.value === value,
            );
            currentSearchParams[columnDef.filterKey || key] = selectedOption
              ? selectedOption.value
              : value;
          } else if (columnDef?.type === "date") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            currentSearchParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          } else if (columnDef?.type === "date_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__gt_lt$/, "")
              .replace(/__exact$/, "")
              .replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = `${gt}T00:00:00`;
            if (lt) currentSearchParams[`${baseKey}__lte`] = `${lt}T23:59:59`;
          } else if (columnDef?.type === "number_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey
              .replace(/__gt_lt$/, "")
              .replace(/__exact$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = gt;
            if (lt) currentSearchParams[`${baseKey}__lte`] = lt;
          } else if (
            columnDef?.type === "text" ||
            columnDef?.type === "boolean" ||
            columnDef?.type === "number"
          ) {
            const filterKey = columnDef.filterKey || `${key}__icontains`;
            currentSearchParams[filterKey] = value;
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

      const response: any = await getCurrencyExchangeRatesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setRates(response.results);
        setTotalItems(response.count);
      } else if (Array.isArray(response)) {
        setRates(response);
        setTotalItems(response.length);
      } else {
        setRates([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError")
        toast.error("Failed to fetch exchange rates.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRates();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchRates({});
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
        await deleteCurrencyExchangeRateApi(deleteId, routeName);
        toast.success("Exchange rate deleted.");
        fetchRates();
      } catch (error) {
        toast.error("Failed to delete exchange rate.");
      }
      setDeleteId(null);
      setSelectedRowRate(null);
    }
  };

  const handleEdit = (rate: CurrencyExchangeRateData) => {
    if (!canUpdate) return;
    setEditingRate(rate);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingRate(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (rate: CurrencyExchangeRateData) => {
    setEditingRate(rate);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: CurrencyExchangeRateData,
  ) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowRate(item);
  };

  const menuItems: ContextMenuItem[] = selectedRowRate
    ? [
      {
        label: "View Details",
        icon: <Eye size={16} />,
        onClick: () => handleView(selectedRowRate),
      },
      {
        label: "Manage History",
        icon: <History size={16} />,
        onClick: () => {
          setHistoryRateId(selectedRowRate.id as number);
          setIsHistoryModalOpen(true);
        },
      },
      ...(canUpdate
        ? [
          {
            label: "Edit Rate",
            icon: <Edit size={16} />,
            onClick: () => handleEdit(selectedRowRate),
          },
        ]
        : []),
      ...(canDelete
        ? [
          {
            label: "Delete Rate",
            icon: <Trash size={16} />,
            variant: "danger" as const,
            onClick: () => setDeleteId(selectedRowRate.id!),
          },
        ]
        : []),
    ]
    : [];

  const headers = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll(
          "aside a.active, nav a.active",
        );
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel =
          activeItem?.innerText?.split("\n")[0].trim() || "Module";
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const exchangeRateIdentifier = selectedRowRate
    ? `${selectedRowRate.baseCurrency || selectedRowRate.baseCurrency_name || ""} to ${selectedRowRate.targetCurrency || selectedRowRate.targetCurrency_name || ""}`.trim() || `Exchange Rate #${selectedRowRate.id}`
    : "";

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Currency Exchange Rates
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={setTableColumns}
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
          <span className="text-text-primary dark:text-white">
            Exchange Rates
          </span>
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
                onChange={(val) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
                allowCustomValue={true}
              />
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
                placeholder={`Select ${baseLabel}`}
              />
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
                  placeholder="> After"
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
                  placeholder="< Before"
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
        data={rates}
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
              Add Rate
            </Button>
          ) : null
        }
        renderRow={(rate, index) => (
          <tr
            key={rate.id || index}
            onContextMenu={(e) => handleContextMenu(e, rate)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (rate as any)[col.key];

              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(rate)}
                  </td>
                );
              }
              if (col.options) {
                const match = col.options.find(
                  (opt) => opt.value === String(cellData),
                );
                cellData = match ? match.label : cellData;
              }
              return (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap ${
                    col.key === "baseCurrency" || col.key === "targetCurrency"
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

      <CurrencyExchangeRateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRates}
        moduleName={routeName}
        editingRate={editingRate}
        isViewMode={isViewMode}
      />

      <CurrencyExchangeRateHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        rateId={historyRateId}
        moduleName={routeName}
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRowRate(null);
        }}
        onConfirm={handleDelete}
        title="Delete Currency Exchange Rate"
        message={`Are you sure you want to delete currency exchange rate for "${exchangeRateIdentifier}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default CurrencyExchangeRate;