import React, { useState, useEffect, useRef, useMemo } from "react";
import { Home, Download, Eye, Save } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// --- API Imports (Traffic) ---
import {
  getTrafficLogsApi,
  exportTrafficLogsApi,
  type TrafficLogData,
} from "../../api/reportApi/liveTrafficApi";

// --- API Imports (Dropdown Data) ---
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
// ⚡️ FIX: Commented out operator API import
// import { getOperatorsApi } from "../../api/operatorApi/operatorApi";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCustomRoutesApi } from "../../api/routeManagerApi/customRouteApi";

// --- Components ---
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { CountryFlag } from "../../components/ui/CountryFlag";
import TraceModal from "../../components/modals/Report/TraceModal";
import CustomDatePicker from "../../components/ui/DatePicker";
import { actionHelper } from "../../helper/action";

// --- Interfaces ---
interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render?: (data: TrafficLogData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  type: "text" | "number" | "date";
}

// --- Static Options (Delivery Status) ---
const deliveryStatusOptions: Option[] = [
  { label: "Delivered", value: "DELIVERED" },
  { label: "Failed", value: "FAILED" },
  { label: "Pending", value: "PENDING" },
  { label: "Undelivered", value: "UNDELIVERED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Uncertain", value: "UNCERTAIN" },
];

// --- Defaults ---
const DEFAULT_SEARCH_COLUMNS = ["timeRange", "status", "client"];
const DEFAULT_TABLE_COLUMNS = [
  "time",
  "messageId",
  "client",
  "vendorRoute",
  "msisdn",
  "senderId",
  "effectiveSenderId",
  "status",
  "cost",
];

const LiveTraffic: React.FC = () => {
  // --- 1. State Management ---
  const [logs, setLogs] = useState<TrafficLogData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Dynamic Dropdown Data ---
  const [clientOptions, setClientOptions] = useState<Option[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  // ⚡️ FIX: Commented out operator state
  // const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [routeOptions, setRouteOptions] = useState<Option[]>([]);

  // --- Filter & Column Visibility (With LocalStorage Persistence) ---

  // 1. Search Fields Persistence
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("traffic_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  // 2. Table Columns Persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("traffic_table_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    startDate: "",
    endDate: "",
  });

  // Modal
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TrafficLogData | null>(null);

  // Routing
  const location = useLocation();
  const moduleName = location.pathname.split("/").pop() || "liveTraffic";
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- 2. Fetch Dropdown Options ---
  const extractOptions = (response: any, labelKey: string, isCountry = false) => {
    let data: any[] = [];
    if (response && response.results) {
      data = response.results;
    } else if (Array.isArray(response)) {
      data = response;
    } else if (response && Array.isArray(response.data)) {
      data = response.data;
    }
    return data.map((item: any) => ({
      label: item[labelKey] || item.name || "Unknown",
      value: String(item.id),
      ...(isCountry && item.iso2 ? { icon: <CountryFlag iso2={item.iso2} /> } : {})
    }));
  };

  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [clientsRes, countriesRes, vendorsRes, routesRes] =
          await Promise.all([
            getClientsApi("client", 1, 1000),
            getCountriesApi("country", 1, 1000),
            // ⚡️ FIX: Commented out operator API call
            // getOperatorsApi("operator", 1, 1000),
            getVendorsApi("vendor", 1, 1000),
            getCustomRoutesApi("customRoute", 1, 1000),
          ]);

        setClientOptions(extractOptions(clientsRes, "name"));
        setCountryOptions(extractOptions(countriesRes, "name", true));
        // ⚡️ FIX: Commented out operator options setting
        // setOperatorOptions(extractOptions(operatorsRes, "name"));
        setVendorOptions(extractOptions(vendorsRes, "profileName"));
        setRouteOptions(extractOptions(routesRes, "name"));
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };

    fetchAllOptions();
  }, []);

const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      // The setTimeout is CRUCIAL here to wait for the sidebar to update
      setTimeout(() => {
        const activeLinks = document.querySelectorAll('aside a.active, nav a.active');
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = activeItem?.innerText?.split('\n')[0].trim() || "Module";
        
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100); // Waits 0.1 seconds
      
      hasLoggedOpening.current = true;
    }
  }, []);

  // --- 3. Configuration ---
  const filterOptionsConfig: ColumnConfig[] = useMemo(
    () => [
      { key: "timeRange", label: "Time Range", type: "date" },
      { key: "client", label: "Client", type: "text", options: clientOptions },
      { key: "vendor", label: "Vendor", type: "text", options: vendorOptions },
      { key: "route", label: "Route", type: "text", options: routeOptions },
      {
        key: "country",
        label: "Country",
        type: "text",
        options: countryOptions,
      },
      // ⚡️ FIX: Commented out operator from filter config
      /* {
        key: "operator",
        label: "Operator",
        type: "text",
        options: operatorOptions,
      }, */
      { key: "senderId", label: "Original Sender ID", type: "text" },
      { key: "effectiveSenderId", label: "Effective Sender ID", type: "text" },
      { key: "senderTranslationAction", label: "Sender Translation Action", type: "text" },
      { key: "senderTranslationRuleId", label: "Sender Translation Rule ID", type: "text" },
      { key: "messageType", label: "Message Type", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "text",
        options: deliveryStatusOptions,
      },
    ],
    [
      clientOptions,
      vendorOptions,
      countryOptions,
      // ⚡️ FIX: Commented out operatorOptions dependency
      // operatorOptions,
      routeOptions,
    ],
  );

  const tableColumnsConfig: ColumnConfig[] = useMemo(
    () => [
      {
        key: "messageId",
        label: "Message ID",
        type: "text",
        render: (log) => (
          <span className="font-mono text-xs text-primary">
            {log.messageId}
          </span>
        ),
      },
      {
        key: "time",
        label: "Time",
        type: "text",
        render: (log) => (
          <span className="text-xs text-text-secondary">
            {new Date(log.time).toLocaleString()}
          </span>
        ),
      },
      { key: "client", label: "Client", type: "text" },
      {
        key: "vendorRoute",
        label: "Vendor/Route",
        type: "text",
        render: (log) => (
          <div className="flex flex-col">
            <span className="font-medium text-text-primary dark:text-white">
              {log.vendor}
            </span>
            <span className="text-xs text-text-secondary">{log.route}</span>
          </div>
        ),
      },
      { key: "msisdn", label: "MSISDN", type: "text" },
      { key: "senderId", label: "Original Sender ID", type: "text" },
      { key: "effectiveSenderId", label: "Effective Sender ID", type: "text" },
      { key: "senderTranslationAction", label: "Translation Action", type: "text" },
      { key: "senderTranslationRuleId", label: "Translation Rule ID", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "text",
        render: (log) => {
          const colors: Record<string, string> = {
            DELIVERED:
              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            FAILED:
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            PENDING:
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            UNDELIVERED:
              "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
            REJECTED:
              "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-300",
            EXPIRED:
              "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300",
          };
          return (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${colors[log.status] || "bg-gray-100 text-gray-600"}`}
            >
              {log.status}
            </span>
          );
        },
      },
      {
        key: "error",
        label: "Error",
        type: "text",
        render: (log) => (
          <span className="text-red-500 text-xs">{log.error || "-"}</span>
        ),
      },
      { key: "latency", label: "Latency", type: "text" },
      { key: "cost", label: "Cost", type: "number" },
    ],
    [],
  );

  // --- Effects: Save Preferences ---
  useEffect(() => {
    localStorage.setItem("traffic_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  // FIX: Added Persistence for Search Fields
  useEffect(() => {
    localStorage.setItem(
      "traffic_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const visibleSearchFields = filterOptionsConfig.filter((col) =>
    searchColumns.includes(col.key),
  );
  const visibleTableFields = tableColumnsConfig.filter((col) =>
    tableColumns.includes(col.key),
  );

  const fetchLogs = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    setIsLoading(true);
    try {
      const currentSearchParams: Record<string, any> = {};
      Object.entries(filterValues).forEach(([key, val]) => {
        if (val) currentSearchParams[key] = val;
      });

      const response = await getTrafficLogsApi(
        moduleName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setLogs(response.results);
        setTotalItems(response.count);
      } else {
        setLogs([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error(error);
        toast.error("Failed to fetch traffic logs.");
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [
    moduleName,
    currentPage,
    rowsPerPage,
    filterValues.startDate,
    filterValues.endDate,
  ]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilterValues({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setTimeout(() => fetchLogs(), 0);
  };

  const handleExport = async () => {
    try {
      const blob = await exportTrafficLogsApi(moduleName, filterValues);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `traffic_report_${new Date().toISOString()}.csv`;
      a.click();
      toast.success("Export started successfully");
    } catch (err) {
      toast.error("Failed to export data");
    }
  };

  const handleViewTrace = (log: TrafficLogData) => {
    setSelectedLog(log);
    setIsTraceModalOpen(true);
  };

  const tableHeaders = [
    ...visibleTableFields.map((col) => col.label),
    "Action",
  ];

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Live Traffic Monitor
          </h1>

            {/* Table Columns Dropdown */}
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableColumnsConfig}
              selectedColumns={tableColumns}
              onFilter={setTableColumns}
              onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
              buttonLabel="Columns"
            />
          </div>

          {/* Search Fields Dropdown */}
          <div className="relative z-20">
            <AdvancedFilter
              columns={filterOptionsConfig}
              selectedColumns={searchColumns}
              onFilter={(newCols) => {
                setSearchColumns(newCols);
                setFilterValues((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    if (
                      !newCols.includes(k) &&
                      k !== "startDate" &&
                      k !== "endDate"
                    )
                      delete next[k];
                  });
                  return next;
                });
              }}
              onClear={() => setSearchColumns(DEFAULT_SEARCH_COLUMNS)}
              isLoading={isLoading}
              buttonLabel="Search Fields"
            />
          </div>

          {/* Save Preset Button */}
          <div className="relative z-20">
            <Button
              variant="secondary"
              onClick={() => toast.info("Filter Preset Saved")}
              title="Save filter presets"
              className="!px-3"
            >
              <Save size={18} />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Report</span>
        </div>
      </div>

      {/* Dynamic Filter Card */}
      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          if (col.key === "timeRange") {
            return (
              <React.Fragment key="timeRange-group">
                <CustomDatePicker
                  label="Start Time"
                  selected={
                    filterValues.startDate
                      ? new Date(filterValues.startDate)
                      : null
                  }
                  onChange={(date) =>
                    handleFilterChange(
                      "startDate",
                      date ? date.toISOString() : "",
                    )
                  }
                  showTimeSelect={true}
                  placeholder="Select Start"
                  isClearable={true}
                />
                <CustomDatePicker
                  label="End Time"
                  selected={
                    filterValues.endDate ? new Date(filterValues.endDate) : null
                  }
                  onChange={(date) =>
                    handleFilterChange(
                      "endDate",
                      date ? date.toISOString() : "",
                    )
                  }
                  showTimeSelect={true}
                  placeholder="Select End"
                  isClearable={true}
                />
              </React.Fragment>
            );
          }

          if (col.options) {
            return (
              <Select
                key={col.key}
                label={col.label}
                value={filterValues[col.key] || ""}
                onChange={(val) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${col.label}`}
              />
            );
          }

          return (
            <Input
              key={col.key}
              label={col.label}
              value={filterValues[col.key] || ""}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              placeholder={`Search ${col.label}`}
            />
          );
        })}
      </FilterCard>

      {/* Data Table */}
      <DataTable
        serverSide={true}
        data={logs}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        headers={tableHeaders}
        isLoading={isLoading}
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleExport}
              leftIcon={<Download size={18} />}
            >
              Export
            </Button>
          </div>
        }
        renderRow={(log, index) => (
          <tr
            key={log.id || index}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors"
          >
            {visibleTableFields.map((col) => {
              const cellData = (log as any)[col.key];
              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(log)}
                  </td>
                );
              }
              return (
                <td
                  key={col.key}
                  className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                >
                  {cellData || "-"}
                </td>
              );
            })}
            <td className="px-4 py-4 text-sm">
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleViewTrace(log)}
                  title="View Trace"
                >
                  <Eye size={14} />
                </Button>
              </div>
            </td>
          </tr>
        )}
      />

      <TraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        data={selectedLog}
      />
    </div>
  );
};

export default LiveTraffic;