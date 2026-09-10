import React, { useState, useEffect, useRef } from "react";
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

const FindRoute: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<Option[]>([]);

  const [tableData, setTableData] = useState<RouteLookupTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
        // Fallback row when no active terminating route exists
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
      const backendError =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.detail ||
        (typeof error.response?.data === "string" ? error.response.data : null) ||
        error.message ||
        "Failed to lookup route for the provided number.";
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
  };

  const tableHeaders = [
    "S.N.",
    "Country Name",
    "MCC",
    "MNC",
    "Client Name",
    "Route Group",
    "SMPP Username",
    "Terminating Vendor",
    "System ID",
    "Company Name",
    "Routing Type",
    "Client Cost",
    "Vendor Cost",
  ];

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

      {/* Results Table */}
      {hasSearched && (
        <DataTable
          data={tableData}
          headers={tableHeaders}
          isLoading={isLoading}
          errorMessage={searchError}
          density="compact"
          renderRow={(row, index) => (
            <tr
              key={row.id || index}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors text-sm"
            >
              <td className="px-4 py-3 text-text-primary dark:text-white">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap">
                {row.countryName}
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {row.mcc}
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {row.mnc}
              </td>
              <td className="px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap">
                {row.clientName}
              </td>
              <td className="px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap">
                {row.routeGroup}
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {row.smppUsername}
              </td>
              <td className="px-4 py-3 font-medium text-text-primary dark:text-white whitespace-nowrap">
                {row.terminatingVendor}
              </td>
              <td className="px-4 py-3 font-mono text-primary whitespace-nowrap">
                {row.systemId}
              </td>
              <td className="px-4 py-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">
                {row.companyName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge
                  status={row.routingType === "NO_ROUTE" ? "NO_ROUTE" : "DELIVERED"}
                  customText={row.routingType}
                />
              </td>
              <td className="px-4 py-3 font-semibold text-text-primary dark:text-white whitespace-nowrap">
                {row.clientCost != null ? `${row.clientCost} ${row.clientCurrencyCode || ""}` : "-"}
              </td>
              <td className="px-4 py-3 font-semibold text-text-primary dark:text-white whitespace-nowrap">
                {row.vendorCost != null ? `${row.vendorCost} ${row.vendorCurrencyCode || ""}` : "-"}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default FindRoute;