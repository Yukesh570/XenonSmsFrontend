import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, Search, RotateCcw, Info } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import { getRouteLookupApi } from "../../api/routeLookupApi/routeLookupApi";
import { getClientsApi } from "../../api/clientApi/clientApi";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import { actionHelper } from "../../helper/action";
import { StatusBadge } from "../../components/ui/StatusBadge";

interface Option {
  label: string;
  value: string;
}

interface RouteLookupTableRow {
  id: string | number;
  countryName: string;
  mcc: string;
  mnc: string;
  clientName: string;
  routeGroup: string;
  smppUsername: string;
  terminatingVendor: string;
  systemId: string;
  companyName: string;
  routingType: string;
  clientCost?: number;
  vendorCost?: number;
  clientCurrencyCode?: string;
  vendorCurrencyCode?: string;
}

interface ColumnDef {
  key: keyof RouteLookupTableRow;
  label: string;
  className?: string;
  render?: (row: RouteLookupTableRow) => React.ReactNode;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
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
    key: "clientName",
    label: "Client Name",
    className: "px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "routeGroup",
    label: "Route Group",
    className: "px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "smppUsername",
    label: "SMPP Username",
    className: "px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
  {
    key: "terminatingVendor",
    label: "Terminating Vendor",
    className: "px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap",
  },
  {
    key: "systemId",
    label: "System ID",
    className: "px-4 py-3 font-mono text-primary whitespace-nowrap",
  },
  {
    key: "companyName",
    label: "Company Name",
    className: "px-4 py-3 text-text-secondary dark:text-gray-300 whitespace-nowrap",
  },
  {
    key: "routingType",
    label: "Routing Type",
    className: "px-4 py-3 whitespace-nowrap",
    render: (row) => (
      <StatusBadge
        status={row.routingType === "NO_ROUTE" ? "NO_ROUTE" : "DELIVERED"}
        customText={row.routingType}
      />
    ),
  },
  {
    key: "clientCost",
    label: "Client Cost",
    className: "px-4 py-3 font-semibold text-text-primary dark:text-white whitespace-nowrap",
    render: (row) =>
      row.clientCost != null ? `${row.clientCost} ${row.clientCurrencyCode || ""}` : "-",
  },
  {
    key: "vendorCost",
    label: "Vendor Cost",
    className: "px-4 py-3 font-semibold text-text-primary dark:text-white whitespace-nowrap",
    render: (row) =>
      row.vendorCost != null ? `${row.vendorCost} ${row.vendorCurrencyCode || ""}` : "-",
  },
];

const FindRoute: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<Option[]>([]);

  const [tableData, setTableData] = useState<RouteLookupTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Column Reordering & Sorting state
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem("findroute_table_columns");
      if (saved) {
        const parsedKeys: string[] = JSON.parse(saved);
        if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
          const reordered = parsedKeys
            .map((k) => DEFAULT_COLUMNS.find((c) => c.key === k))
            .filter((c): c is ColumnDef => Boolean(c));
          const missing = DEFAULT_COLUMNS.filter((c) => !parsedKeys.includes(c.key));
          return [...reordered, ...missing];
        }
      }
    } catch (e) {
      console.error("Error loading findroute columns from localStorage", e);
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "findroute_table_columns",
        JSON.stringify(columns.map((c) => c.key))
      );
    } catch (e) {
      console.error("Error saving findroute columns to localStorage", e);
    }
  }, [columns]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RouteLookupTableRow;
    direction: "asc" | "desc";
  } | null>(null);

  const routeName = "client";

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Find Route", "Opened Find Route Module", false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  // Fetch Clients for Dropdown
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res: any = await getClientsApi("client", 1, 1000);
        const list = res.results || (Array.isArray(res) ? res : []);
        const options: Option[] = list.map((c: any) => ({
          label: c.name || `Client ${c.id}`,
          value: String(c.id),
        }));
        setClientOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
      } catch (err) {
        console.error("Failed to load clients", err);
      }
    };
    loadClients();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number to search.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const response = await getRouteLookupApi(
        routeName,
        phoneNumber.trim(),
        selectedClientId || undefined
      );

      if (response?.error) {
        setSearchError(response.error);
        setTableData([]);
      } else if (response && response.route && response.route.length > 0) {
        const formattedRows: RouteLookupTableRow[] = response.route.map((item, idx) => ({
          id: item.route_id || idx,
          countryName: response.country?.name || "-",
          mcc: item.mcc || response.mcc || "-",
          mnc: item.mnc || response.mnc || "-",
          clientName: item.client?.name || response.client?.name || "-",
          routeGroup: item.route_group || "-",
          smppUsername: item.client?.smpp_username || response.client?.smpp_username || "-",
          terminatingVendor: item.terminating_vendor?.name || "-",
          systemId: item.terminating_vendor?.system_id || "-",
          companyName: item.terminating_vendor?.company_name || "-",
          routingType: response.routing_type || "-",
          clientCost: item.client_cost,
          vendorCost: item.vendor_cost,
          clientCurrencyCode: item.client?.currencyCode || response.client?.currencyCode,
          vendorCurrencyCode: item.terminating_vendor?.currencyCode,
        }));
        setTableData(formattedRows);
      } else if (response && (response.country || response.client || response.mcc)) {
        const fallbackRow: RouteLookupTableRow = {
          id: "no-route-found",
          countryName: response.country?.name || "-",
          mcc: response.mcc || "-",
          mnc: response.mnc || "-",
          clientName: response.client?.name || "-",
          routeGroup: "-",
          smppUsername: response.client?.smpp_username || "-",
          terminatingVendor: "-",
          systemId: "-",
          companyName: "-",
          routingType: response.routing_type || "NO_ROUTE",
          clientCost: undefined,
          vendorCost: undefined,
          clientCurrencyCode: response.client?.currencyCode,
          vendorCurrencyCode: undefined,
        };
        setTableData([fallbackRow]);
      } else {
        setTableData([]);
      }
    } catch (error: any) {
      let backendError = "Failed to lookup route for the provided number.";
      if (error.response?.status === 404) {
        backendError = "No route match found for this number.";
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
    setSelectedClientId("");
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
          Find Route
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Find Route</span>
        </div>
      </div>

      {/* Sleek, Compact Search Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="e.g. 579102200043"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Select
              label="Client (Optional)"
              placeholder="Select Client"
              value={selectedClientId}
              onChange={(val) => setSelectedClientId(val)}
              options={clientOptions}
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
            <span className="font-semibold">Instruction:</span> Please enter a valid phone number and click <span className="font-semibold">Search</span> to perform a route lookup.
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

export default FindRoute;