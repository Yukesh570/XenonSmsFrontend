import React, { useState, useEffect, useRef } from "react";
import { Home, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { getVendorTransactionsApi, type VendorTransactionData } from "../../api/transactionApi/transactionApi";
import { VendorTransactionModal } from "../../components/modals/Transaction/VendorTransactionModal";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, { type FilterColumn } from "../../components/ui/AdvancedFilter";
import ContextMenu, { type ContextMenuItem } from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";

interface Option { label: string; value: string; }

interface ColumnConfig extends FilterColumn {
  render?: (data: VendorTransactionData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchable?: boolean;
  isSearchOnly?: boolean;
  tableLabel?: string;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const chargePolicyOptions: Option[] = [
  { label: "On Attempt", value: "ON_ATTEMPT" },
  { label: "On Submit", value: "ON_SUBMIT" },
  { label: "On Delivered", value: "ON_DELIVERED" },
];

const statusOptions: Option[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Charged", value: "CHARGED" },
  { label: "Refunded", value: "REFUNDED" },
  { label: "Failed", value: "FAILED" },
];

const transactionTypeOptions: Option[] = [
  { label: "Deduction", value: "DEDUCTION" },
  { label: "Refund", value: "REFUND" },
  { label: "Top-Up", value: "TOPUP" },
];

const DEFAULT_SEARCH_COLUMNS = ["vendorProfileName", "message_id", "transactionType"];
const DEFAULT_TABLE_COLUMNS = ["message_id", "vendorProfileName", "transactionType", "segments", "amount", "createdAt"];
const BATCH_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

const VendorTransaction: React.FC = () => {
  const [transactions, setTransactions] = useState<VendorTransactionData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewData, setViewData] = useState<VendorTransactionData | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowLog, setSelectedRowLog] = useState<VendorTransactionData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("vendortx_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "vendortx_search_columns",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("vendortx_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("vendortx_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const routeName = pathSegments[pathSegments.length - 1] || "vendorTransaction";
  const abortControllerRef = useRef<AbortController | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const baseCurrencyCode = transactions.length > 0 ? transactions[0].baseCurrencyCode : "";

  const allColumns: ColumnConfig[] = [
    { key: "message_id", label: "Message ID", type: "text", filterKey: "message__message_id__icontains" },
    { key: "vendorProfileName", label: "Vendor Name", type: "text", filterKey: "vendorProfileName__icontains" },
    { key: "transactionType", label: "Type", type: "text", options: transactionTypeOptions, filterKey: "transactionType" },
    { key: "status", label: "Status", type: "text", options: statusOptions, filterKey: "status" },
    { key: "chargePolicy", label: "Charge Policy", type: "text", options: chargePolicyOptions, filterKey: "chargePolicy" },
    { key: "currency", label: "Currency", type: "text", filterKey: "currency__icontains" },
    { key: "segments", label: "Segments", type: "number", filterKey: "segments" },
    { key: "ratePerSegment", label: "Rate Per Segment", type: "number", filterKey: "ratePerSegment", render: (log) => <span>{log.ratePerSegment} {log.currencyCode || log.currency}</span> },
    { key: "amount", label: "Amount", type: "number", filterKey: "amount", render: (log) => <span>{log.amount} {log.currencyCode || log.currency}</span> },

    { key: "balanceSpent", label: "Balance Spent", type: "number", filterKey: "balanceSpent", render: (log) => <span>{log.balanceSpent} {log.currencyCode || log.currency}</span> },
    { key: "baseAmount", label: `Base Amount ${baseCurrencyCode ? `(${baseCurrencyCode})` : ""}`, type: "number", filterKey: "baseAmount" },
    { key: "exchangeRateToBase", label: `Exchange Rate to Base ${baseCurrencyCode ? `(${baseCurrencyCode})` : ""}`, type: "number", filterKey: "exchangeRateToBase" },

    { key: "createdAt", label: "Created At (Single Day)", tableLabel: "Created At", type: "date", filterKey: "createdAt__range", render: (log) => (<span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</span>) },
    { key: "createdAt__range", label: "Created At (Range)", type: "date_range", filterKey: "createdAt__range", isSearchOnly: true },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));
  
  // Map columns according to custom reordered user preference
  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns.filter((c) => !c.isSearchOnly).map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchTransactions = async (
    filters: Record<string, string> | null = null,
    page: number = 1,
    append: boolean = false,
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    if (append) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const activeFilters = filters || filterValues;
      const currentSearchParams: Record<string, string> = {};

      searchColumns.forEach((key) => {
        const value = activeFilters[key];
        if (!value) return;
        const columnDef = allColumns.find((c) => c.key === key);
        const baseKey = columnDef?.filterKey || key;

        if (columnDef?.options) {
          const selectedOption = columnDef.options.find((opt) => opt.value === value);
          currentSearchParams[baseKey] = selectedOption ? selectedOption.value : value;
        } else {
          currentSearchParams[baseKey] = value;
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

      const response: any = await getVendorTransactionsApi(routeName, page, BATCH_SIZE, currentSearchParams);

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setTransactions((prev) => (append ? [...prev, ...response.results] : response.results));
        setTotalItems(response.count);
        setHasMore(Boolean(response.next));
        setLoadedPage(page);
      } else if (Array.isArray(response)) {
        setTransactions((prev) => (append ? [...prev, ...response] : response));
        setTotalItems(response.length);
        setHasMore(false);
        setLoadedPage(page);
      } else {
        if (!append) setTransactions([]);
        setTotalItems(0);
        setHasMore(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") toast.error("Failed to fetch vendor transactions.");
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchTransactions(undefined, 1, false);
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [routeName, searchColumns, sortConfig]);

  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLDivElement>(
      ".custom-scrollbar",
    );
    if (!scrollEl) return;

    const handleScroll = () => {
      if (isLoading || isFetchingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
        fetchTransactions(filterValues, loadedPage + 1, true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [isLoading, isFetchingMore, hasMore, loadedPage, filterValues, transactions.length]);

  const handleSearch = () => {
    fetchTransactions(undefined, 1, false);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    fetchTransactions({}, 1, false);
  };

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

  const handleView = (log: VendorTransactionData) => { setViewData(log); setIsModalOpen(true); };

  const handleContextMenu = (e: React.MouseEvent, log: VendorTransactionData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowLog(log);
  };

  const menuItems: ContextMenuItem[] = selectedRowLog ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => handleView(selectedRowLog) },
  ] : [];

  const tableHeaders = ["S.N", ...visibleTableFields.map((col) => col.tableLabel || col.label)];
  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll('aside a.active, nav a.active');
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = activeItem?.innerText?.split('\n')[0].trim() || "Module";

        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);

      hasLoggedOpening.current = true;
    }
  }, []);

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">Vendor Transactions</h1>
          <div className="relative z-20">
            <AdvancedFilter 
              columns={tableFilterColumns} 
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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Vendor Transactions</span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");

          if (col.options) {
            return <Select key={col.key} label={baseLabel} value={filterValues[col.key] || ""} onChange={(val) => handleFilterChange(col.key, val)} options={col.options} placeholder={`Select ${baseLabel}`} allowCustomValue={true} />;
          }
          if (col.type === "date") {
            const rawVal = filterValues[col.key] || "";
            const datePart = rawVal.split("T")[0];

            return (
              <DatePicker
                key={col.key}
                label={`Search ${baseLabel}`}
                selected={datePart ? new Date(datePart) : null}
                onChange={(val: Date | null) => {
                  if (val) {
                    const formatted = formatLocalDate(val);
                    handleFilterChange(col.key, `${formatted}T00:00:00,${formatted}T23:59:59`);
                  } else {
                    handleFilterChange(col.key, "");
                  }
                }}
              />
            );
          }
          if (col.type === "date_range") {
            const [startRange, endRange] = (filterValues[col.key] || "").split(",");
            const startStr = startRange ? startRange.split("T")[0] : "";
            const endStr = endRange ? endRange.split("T")[0] : "";

            return (
              <React.Fragment key={col.key}>
                <DatePicker
                  label={`Search ${baseLabel} (From)`}
                  selected={startStr ? new Date(startStr) : null}
                  onChange={(val: Date | null) => {
                    const newStart = val ? formatLocalDate(val) : "";
                    const currentEnd = endStr || "";
                    if (newStart || currentEnd) {
                      const startVal = newStart ? `${newStart}T00:00:00` : "";
                      const endVal = currentEnd ? `${currentEnd}T23:59:59` : "";
                      handleFilterChange(col.key, `${startVal},${endVal}`);
                    } else {
                      handleFilterChange(col.key, "");
                    }
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (To)`}
                  selected={endStr ? new Date(endStr) : null}
                  onChange={(val: Date | null) => {
                    const newEnd = val ? formatLocalDate(val) : "";
                    const currentStart = startStr || "";
                    if (currentStart || newEnd) {
                      const startVal = currentStart ? `${currentStart}T00:00:00` : "";
                      const endVal = newEnd ? `${newEnd}T23:59:59` : "";
                      handleFilterChange(col.key, `${startVal},${endVal}`);
                    } else {
                      handleFilterChange(col.key, "");
                    }
                  }}
                />
              </React.Fragment>
            );
          }
          return <Input key={col.key} label={baseLabel} value={filterValues[col.key] || ""} onChange={(e) => handleFilterChange(col.key, e.target.value)} placeholder={`Search ${baseLabel}`} />;
        })}
      </FilterCard>

      <div ref={tableWrapperRef}>
        <DataTable
          serverSide={true}
          data={transactions}
          totalItems={totalItems}
          rowsPerPage={BATCH_SIZE}
          headers={tableHeaders}
          isLoading={isLoading}
        onSort={handleSort}
        sortColumnIndex={sortConfig ? visibleTableFields.findIndex(c => c.key === sortConfig.key) + 1 : null}
        sortDirection={sortConfig?.direction || null}
          showCountOnly={true}
          density="compact"
          onReorderColumns={(fromIdx, toIdx) => {
            setTableColumns((prev) => {
              const validKeys = prev.filter(key => allColumns.some(c => c.key === key));
            const next = [...validKeys];
              const [moved] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, moved);
              return next;
            });
          }}
          renderRow={(log, index) => (
            <tr key={log.id || index} onContextMenu={(e) => handleContextMenu(e, log)} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors">
              <td className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{index + 1}</td>
              {visibleTableFields.map((col) => {
                let cellData = (log as any)[col.key];
                if (col.render) return <td key={col.key} className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{col.render(log)}</td>;
                if (col.options) { const match = col.options.find((opt) => opt.value === String(cellData)); cellData = match ? match.label : cellData; }
                return <td key={col.key} className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">{cellData || "-"}</td>;
              })}
            </tr>
          )}
        />
        {isFetchingMore && (
          <div className="text-center text-xs text-text-secondary dark:text-gray-400 py-2">
            Loading more...
          </div>
        )}
      </div>

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />
      <VendorTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} viewData={viewData} />
    </div>
  );
};

export default VendorTransaction;