import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, Search, RotateCcw, Info } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import { getPrefixLookupApi, type PrefixLookupData } from "../../api/prefixLookupApi/prefixLookupApi";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import { actionHelper } from "../../helper/action";

export interface PrefixLookupTableRow {
  id: string | number;
  searchedNumber: string;
  normalizedNumber: string;
  countryName: string;
  mcc: string;
  mnc: string;
  mccmnc: string;
  operator: string;
  matchedPrefixStart: string;
  matchedPrefixEnd: string;
}

interface ColumnDef {
  key: keyof PrefixLookupTableRow;
  label: string;
  className?: string;
  render?: (row: PrefixLookupTableRow) => React.ReactNode;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    key: "searchedNumber",
    label: "Searched Number",
    className: "px-4 py-3 font-mono text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "normalizedNumber",
    label: "Normalized Number",
    className: "px-4 py-3 font-mono text-primary font-medium whitespace-nowrap",
  },
  {
    key: "countryName",
    label: "Country Name",
    className: "px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "mcc",
    label: "MCC",
    className: "px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
  {
    key: "mnc",
    label: "MNC",
    className: "px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
  {
    key: "mccmnc",
    label: "MCC/MNC",
    className: "px-4 py-3 font-mono font-medium text-text-primary dark:text-white whitespace-nowrap",
    render: (row) => (
      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
        {row.mccmnc}
      </span>
    ),
  },
  {
    key: "operator",
    label: "Operator",
    className: "px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "matchedPrefixStart",
    label: "Prefix Range Start",
    className: "px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
  {
    key: "matchedPrefixEnd",
    label: "Prefix Range End",
    className: "px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
];

const PrefixLookup: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tableData, setTableData] = useState<PrefixLookupTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Column Reordering & Sorting state
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PrefixLookupTableRow;
    direction: "asc" | "desc";
  } | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Prefix Lookup", "Opened Prefix Lookup Module", false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      toast.error("Please enter a phone number to search.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSearchError(null);

    try {
      const response = await getPrefixLookupApi(trimmed);

      if (response?.error) {
        setSearchError(response.error);
        setTableData([]);
        return;
      }

      let items: any[] = [];
      if (Array.isArray(response)) {
        items = response;
      } else if (response?.results && Array.isArray(response.results)) {
        items = response.results;
      } else if (response && typeof response === "object") {
        if (
          !response.searched_number &&
          !response.normalized_number &&
          !response.operator &&
          !response.country &&
          !response.mccmnc
        ) {
          setTableData([]);
          setSearchError("No prefix match found for this number.");
          return;
        }
        items = [response];
      }

      if (items.length === 0) {
        setTableData([]);
        setSearchError("No prefix match found for this number.");
        return;
      }

      const formattedRows: PrefixLookupTableRow[] = items.map((item: PrefixLookupData, idx: number) => ({
        id: idx + 1,
        searchedNumber: item.searched_number || trimmed,
        normalizedNumber: item.normalized_number || item.searched_number || trimmed,
        countryName: item.country?.name || "-",
        mcc: item.mcc || "-",
        mnc: item.mnc || "-",
        mccmnc: item.mccmnc || (item.mcc && item.mnc ? `${item.mcc}${item.mnc}` : "-"),
        operator: item.operator || "-",
        matchedPrefixStart: item.matchedPrefixStart != null ? String(item.matchedPrefixStart) : "-",
        matchedPrefixEnd: item.matchedPrefixEnd != null ? String(item.matchedPrefixEnd) : "-",
      }));

      setTableData(formattedRows);
    } catch (error: any) {
      let backendError = "Failed to lookup prefix for the provided number.";
      if (error.response?.status === 404) {
        backendError = "No prefix match found for this number.";
      } else if (error.response?.data && typeof error.response.data === "object") {
        backendError =
          error.response.data.error ||
          error.response.data.message ||
          error.response.data.detail ||
          backendError;
      } else if (
        typeof error.response?.data === "string" &&
        !error.response.data.trim().startsWith("<")
      ) {
        backendError = error.response.data;
      } else if (error.message && !error.message.includes("status code 404")) {
        backendError = error.message;
      }
      setSearchError(backendError);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPhoneNumber("");
    setTableData([]);
    setSearchError(null);
    setHasSearched(false);
    setSortConfig(null);
  };

  // Column Reordering
  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // Sorting Handler: Ignore index 0 (S.N.)
  const handleSort = (columnIndex: number) => {
    if (columnIndex === 0) return;
    const col = columns[columnIndex - 1];
    if (!col) return;
    setSortConfig((prev) => {
      if (prev?.key === col.key) {
        if (prev.direction === "asc") return { key: col.key, direction: "desc" };
        return null;
      }
      return { key: col.key, direction: "asc" };
    });
  };

  // Client-side sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;
    return [...tableData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === "asc"
        ? aStr.localeCompare(bStr, undefined, { numeric: true })
        : bStr.localeCompare(aStr, undefined, { numeric: true });
    });
  }, [tableData, sortConfig]);

  const tableHeaders = ["S.N.", ...columns.map((c) => c.label)];

  return (
    <div className="container mx-auto pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
          Prefix Lookup
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Prefix Lookup</span>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <Input
              label="Phone Number"
              placeholder="e.g. 573222000000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              leftIcon={<Search size={15} />}
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </div>

      {/* Instruction Note on Initial Load */}
      {!hasSearched && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please enter a valid phone number and click <span className="font-semibold">Search</span> to perform a prefix lookup.
          </p>
        </div>
      )}

      {/* Results Table with Drag-and-Drop & Asc/Desc Sorting */}
      {hasSearched && (
        <DataTable
          data={sortedData}
          headers={tableHeaders}
          isLoading={isLoading}
          errorMessage={searchError}
          density="compact"
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          sortColumnIndex={
            sortConfig ? columns.findIndex((c) => c.key === sortConfig.key) + 1 : null
          }
          sortDirection={sortConfig?.direction || null}
          renderRow={(row, index) => (
            <tr
              key={row.id || index}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors text-sm"
            >
              <td className="px-4 py-3 text-text-primary dark:text-white">
                {index + 1}
              </td>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row) : (row[col.key] as any)}
                </td>
              ))}
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default PrefixLookup;
