import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, ShieldPlus, Shield, Eye, Mail, Layers } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// --- APIs ---
import {
  getClientsApi,
  deleteClientApi,
  sendClientDetailsEmailApi,
  updateClientApi,
  type ClientData,
} from "../../api/clientApi/clientApi";
import { getCompaniesApi } from "../../api/companyApi/companyApi";
import { getCustomerRateGroupsApi } from "../../api/rateApi/customerRateApi";

// --- Components ---
import { ClientModal } from "../../components/modals/ClientModal";
import { ClientRoutingRateModal } from "../../components/modals/ClientRoutingRateModal";
import IpWhitelistModal from "../../components/modals/WhiteListIPModal";
import { ClientRateTableModal } from "../../components/modals/ClientRateTableModal";
import SenderIdPolicyModal from "../../components/modals/SenderIdPolicyModal";

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
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { getGroupedCustomRoutesApi } from "../../api/routeManagerApi/customRouteApi";
import { StatusBadge, STATUS_COLORS } from "../../components/ui/StatusBadge";

// --- Interfaces ---
interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
  render?: (data: ClientData) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

// --- Default Configuration ---
const DEFAULT_SEARCH_COLUMNS = ["name", "companyName", "routeGroup", "customerRateGroup", "status", "bindStatus"];
const DEFAULT_TABLE_COLUMNS = [
  "name",
  "companyName",
  "routeGroup",
  "customerRateGroup",
  "invoicePolicy",
  "status",
  "bindStatus",
  "route",
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Client: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Dropdown States ---
  const [clientOptions, setClientOptions] = useState<Option[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [routeGroup, setrouteGroup] = useState<Option[]>([]);
  const [routeGroupFilter, setRouteGroupFilter] = useState<Option[]>([]);
  const [customerRateGroupOptions, setCustomerRateGroupOptions] = useState<Option[]>([]);

  // --- Modal States ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [ipModalClient, setIpModalClient] = useState<{ id: number; name: string; } | null>(null);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateModalClient, setRateModalClient] = useState<{ id: number; name: string; } | null>(null);

  const [isSenderIdModalOpen, setIsSenderIdModalOpen] = useState(false);

  const [senderIdModalClient, setSenderIdModalClient] = useState<{ id: number; name: string; } | null>(null);

  // --- Context Menu State ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; } | null>(null);
  const [selectedRowClient, setSelectedRowClient] = useState<ClientData | null>(null);

  // --- Dynamic Filters & Columns State ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("client_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("client_table_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any stale/invalid keys to prevent dragging index mismatches
          const validKeys = parsed.filter(key => DEFAULT_TABLE_COLUMNS.includes(key) || DEFAULT_SEARCH_COLUMNS.includes(key) || key === "session" || key === "route" || key === "paymentTerms" || key === "invoicePolicy" || key === "allowNetting" || key === "enableDlr" || key === "smppUsername" || key === "bindStatus" || key === "maxTps" || key === "maxSessions" || key === "idleTimeoutSec" || key === "submitTimeoutSec" || key === "createdBy" || key === "updatedBy" || key === "createdAt" || key === "createdAt__gt_lt" || key === "maxWindowGlobal" || key === "maxWindowPerSession");
          if (validKeys.length > 0) return validKeys;
        }
      }
    } catch (e) {
      console.error("Error reading localStorage", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("client_table_columns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem(
      "client_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = (location.pathname.split("/").pop() || "client") as string;
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Tracking ---
  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        const activeLinks = document.querySelectorAll("aside a.active, nav a.active");
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = (activeItem?.innerText || "Module").split("\n")[0].trim();
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  // --- Fetch Dropdowns for Search ---
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const clientRes: any = await getClientsApi(routeName, 1, 1000);
        const clientList = clientRes.results || (Array.isArray(clientRes) ? clientRes : []);
        setClientOptions(
          clientList.map((c: any) => ({
            label: c.name,
            value: c.name,
          }))
        );
      } catch (err) {
        console.error("Client Dropdown load error:", err);
      }

      try {
        const compRes: any = await getCompaniesApi("company", 1, 1000);
        const compList = compRes.results || (Array.isArray(compRes) ? compRes : []);
        setCompanies(compList.map((c: any) => ({ label: c.name, value: c.name })));
      } catch (err) {
        console.error("Company Dropdown load error:", err);
      }

      try {
        const rgRes: any = await getGroupedCustomRoutesApi("customRoute", 1, 1000);
        const rgList = rgRes.results || (Array.isArray(rgRes) ? rgRes : []);

        setrouteGroup(
          rgList.map((rg: any) => ({
            label: rg.name,
            value: String(rg.id),
          }))
        );

        setRouteGroupFilter(
          rgList.map((rg: any) => ({
            label: rg.name,
            value: rg.name,
          }))
        );
      } catch (err) {
        console.error("Route Group Dropdown load error:", err);
      }

      try {
        const crgRes: any = await getCustomerRateGroupsApi("customerRate", 1, 1000);
        const crgList = crgRes.results || (Array.isArray(crgRes) ? crgRes : []);
        setCustomerRateGroupOptions(
          crgList.map((rg: any) => ({
            label: rg.name,
            value: String(rg.id),
          }))
        );
      } catch (err: any) {
        console.warn("Customer Rate Group Dropdown load skipped (likely permissions):", err);
      }
    };

    loadDropdowns();
  }, [routeName]);

  // --- Column Configuration ---
  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Trial", value: "TRIAL" },
    { label: "Suspended", value: "SUSPENDED" },
  ];
  const bindStatusOptions: Option[] = [
    { label: "online", value: "ONLINE" },
    { label: "offline", value: "OFFLINE" },
  ];

  const routeOptions: Option[] = [
    { label: "Direct", value: "DIRECT" },
    { label: "High Quality", value: "HIGH QUALITY" },
    { label: "SIM", value: "SIM" },
    { label: "Wholesale", value: "WHOLESALE" },
    { label: "Full", value: "FULL" },
    { label: "Spam", value: "SPAM" },
  ];

  const paymentTermOptions: Option[] = [
    { label: "Prepaid", value: "PREPAID" },
    { label: "Postpaid", value: "POSTPAID" },
  ];

  const invoicePolicyOptions: Option[] = [
    { label: "On Attempt", value: "ON_ATTEMPT" },
    { label: "On Submit", value: "ON_SUBMIT" },
    { label: "On Delivered", value: "ON_DELIVERED" },
  ];

  const booleanOptions: Option[] = [
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
  ];

  const renderBooleanBadge = (value: boolean) => {
    const statusKey = value ? "DELIVERED" : "PENDING";
    const labelText = value ? "Yes" : "No";
    return <StatusBadge status={statusKey} customText={labelText} />;
  };

  const renderSessionBadge = (client: any) => {
    const sessionStr = client.session || "0/2";
    const [current] = sessionStr.split("/");
    const max = client.clientPolicy?.maxSessions || 0;
    const isFull = Number(current) === max && max > 0;

    const statusKey = isFull ? "UNDELIVERED" : "SUBMITTED";
    return <StatusBadge status={statusKey} customText={`${current}/${max}`} />;
  };

  const allColumns: ColumnConfig[] = [
    { key: "name", label: "Client Name", type: "text", options: clientOptions, filterKey: "name__icontains" },
    { key: "companyName", label: "Company", type: "text", options: companies, filterKey: "company__name" },
    { key: "routeGroup", label: "RouteGroup", type: "text", options: routeGroupFilter, filterKey: "routeGroup__name" },
    { key: "customerRateGroup", label: "Customer Rate Group", type: "text", options: customerRateGroupOptions, filterKey: "customerRateGroup__name" },
    {
      key: "status", label: "Status", type: "text", options: statusOptions, filterKey: "status", render: (c) => {
        const statusConfig = STATUS_COLORS[c.status?.toUpperCase() || "UNKNOWN"] || STATUS_COLORS.UNKNOWN;
        return (
          <select
            value={c.status || ""}
            onChange={(e) => handleStatusChange(c, e.target.value as ClientData["status"])}
            onClick={(e) => e.stopPropagation()}
            disabled={!canUpdate}
            className="border rounded px-2 py-0.5 text-xs font-medium focus:outline-none cursor-pointer disabled:cursor-not-allowed appearance-none pr-6 bg-no-repeat"
            style={{
              backgroundColor: statusConfig.bg,
              color: statusConfig.text,
              borderColor: statusConfig.border,
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23${statusConfig.text.replace('#', '')}%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
              backgroundSize: '16px 16px',
              backgroundPosition: 'calc(100% - 4px) center',
            }}
          >
            <option value="ACTIVE" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Active</option>
            <option value="TRIAL" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Trial</option>
            <option value="SUSPENDED" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">Suspended</option>
          </select>
        );
      }
    },
    { key: "route", label: "Route Type", type: "text", options: routeOptions, filterKey: "route" },
    { key: "paymentTerms", label: "Payment Terms", type: "text", options: paymentTermOptions, filterKey: "paymentTerms" },
    {
      key: "invoicePolicy", label: "Invoice Policy", type: "text", options: invoicePolicyOptions, isSearchable: false, render: (c) => {
        if (!c.invoicePolicy) return "-";
        const match = invoicePolicyOptions.find(opt => opt.value === c.invoicePolicy);
        return match ? match.label : c.invoicePolicy;
      }
    },
    { key: "allowNetting", label: "Allow Netting", type: "boolean", options: booleanOptions, filterKey: "allowNetting", render: (c) => renderBooleanBadge(c.allowNetting) },
    { key: "enableDlr", label: "Enable Dlr", type: "boolean", options: booleanOptions, isSearchable: false, render: (c) => renderBooleanBadge(c.enableDlr) },
    { key: "smppUsername", label: "SMPP Username", type: "text", filterKey: "smppUsername__icontains" },
    { key: "bindStatus", label: "Bind Status", type: "text", options: bindStatusOptions, filterKey: "bindStatus", render: (c) => <StatusBadge status={c.bindStatus} /> },
    { key: "session", label: "Sessions (Current/Max)", tableLabel: "Sessions", type: "text", isSearchable: false, render: (c) => renderSessionBadge(c) },
    { key: "maxTps", label: "Max TPS", type: "number", filterKey: "clientPolicy__maxTps", render: (c) => c.clientPolicy?.maxTps ?? "-" },
    { key: "maxSessions", label: "Max Sessions", type: "number", filterKey: "clientPolicy__maxSessions", render: (c) => c.clientPolicy?.maxSessions ?? "-" },
    // { key: "maxWindowGlobal", label: "Max Window (Global)", type: "number", filterKey: "clientPolicy__maxWindowGlobal", render: (c) => c.clientPolicy?.maxWindowGlobal ?? "-" },
    // { key: "maxWindowPerSession", label: "Max Window (Per Session)", type: "number", filterKey: "clientPolicy__maxWindowPerSession", render: (c) => c.clientPolicy?.maxWindowPerSession ?? "-" },
    { key: "idleTimeoutSec", label: "Idle Timeout (s)", type: "number", filterKey: "clientPolicy__idleTimeoutSec", render: (c) => c.clientPolicy?.idleTimeoutSec ?? "-" },
    { key: "submitTimeoutSec", label: "Submit Timeout (s)", type: "number", filterKey: "clientPolicy__submitTimeoutSec", render: (c) => c.clientPolicy?.submitTimeoutSec ?? "-" },
    {
      key: "createdBy",
      label: "Created By",
      type: "text",
      filterKey: "createdBy__username__icontains",
      render: (c: any) => c.createdByName || c.createdBy || "-",
    },
    {
      key: "updatedBy",
      label: "Updated By",
      type: "text",
      filterKey: "updatedBy__username__icontains",
      render: (c: any) => c.updatedByName || c.updatedBy || "-",
    },
    { key: "createdAt", label: "Created At (Exact)", tableLabel: "Created At", type: "date", filterKey: "createdAt", render: (c) => (c.createdAt ? formatDateTime(c.createdAt) : "-") },
    { key: "createdAt__gt_lt", label: "Created At (After / Before)", type: "date_gt_lt", isSearchOnly: true },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchClients = async (filters: Record<string, string> | null = null) => {
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
          } else if (columnDef?.type === "date") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey.replace(/__exact$/, "").replace(/__range$/, "");
            currentSearchParams[`${baseKey}__range`] = `${value}T00:00:00,${value}T23:59:59`;
          } else if (columnDef?.type === "date_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "").replace(/__range$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = `${gt}T00:00:00`;
            if (lt) currentSearchParams[`${baseKey}__lte`] = `${lt}T23:59:59`;
          } else if (columnDef?.type === "number_gt_lt") {
            const rawKey = columnDef.filterKey || key;
            const baseKey = rawKey.replace(/__gt_lt$/, "").replace(/__exact$/, "");
            const [gt, lt] = value.split(",");
            if (gt) currentSearchParams[`${baseKey}__gte`] = gt;
            if (lt) currentSearchParams[`${baseKey}__lte`] = lt;
          } else if (columnDef?.type === "text") {
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

      const response: any = await getClientsApi(routeName, currentPage, rowsPerPage, currentSearchParams);

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setClients(response.results);
        setTotalItems(response.count);
      } else {
        setClients([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") toast.error("Failed to fetch clients.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, sortConfig]);

  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    const ws = new WebSocket(`${wsBase}/ws/status/`);
    ws.onopen = () => console.log("✅ Client Table linked to live SMPP feed");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.username && data.status) {
          setClients((prevClients) =>
            prevClients.map((client) => {
              if (client.smppUsername === data.username) {
                const currentSessionStr = client.session || "0/2";
                const [currentStr, maxLimit] = currentSessionStr.split("/");
                let currentCount = parseInt(currentStr, 10) || 0;

                if (data.status === "ONLINE") {
                  currentCount += 1;
                } else if (data.status === "OFFLINE") {
                  currentCount = Math.max(0, currentCount - 1);
                }

                return {
                  ...client,
                  bindStatus: data.status,
                  session: `${currentCount}/${maxLimit}`,
                };
              }
              return client;
            }),
          );
        }
        if (data.type === "session_count_change") {
          setClients((prevClients) =>
            prevClients.map((client) => {
              if (client.smppUsername === data.username) {
                const currentSessionStr = client.session || "0/2";
                const [, maxLimit] = currentSessionStr.split("/");
                return {
                  ...client,
                  session: `${data.current_sessions}/${maxLimit}`,
                };
              }
              return client;
            }),
          );
        }
      } catch (err) {
        console.error("Error parsing websocket message", err);
      }
    };
    ws.onclose = () => console.log("⚠️ Live SMPP feed disconnected");
    return () => {
      ws.close();
    };
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchClients();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchClients({});
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
        await deleteClientApi(deleteId, routeName);
        toast.success("Client deleted successfully.");
        fetchClients();
      } catch (error) {
        toast.error("Failed to delete client.");
      }
      setDeleteId(null);
      setSelectedRowClient(null);
    }
  };

  const handleEdit = (client: ClientData) => {
    if (!canUpdate) return;
    setEditingClient(client);
    setIsViewMode(false);
    setIsClientModalOpen(true);
  };

  const handleEditRouting = (client: ClientData) => {
    if (!canUpdate) return;
    setEditingClient(client);
    setIsViewMode(false);
    setIsRoutingModalOpen(true);
  };

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingClient(null);
    setIsViewMode(false);
    setIsClientModalOpen(true);
  };

  const handleView = (client: ClientData) => {
    setEditingClient(client);
    setIsViewMode(true);
    setIsClientModalOpen(true);
  };

  const handleAddIp = (client: ClientData) => {
    if (!client.id) return;
    setIpModalClient({ id: client.id, name: client.name });
    setIsIpModalOpen(true);
  };

  const handleSenderIdPolicy = (client: ClientData) => {
    if (!client.id) return;
    setSenderIdModalClient({ id: client.id, name: client.name || "" });
    setIsSenderIdModalOpen(true);
  };

  const handleSendDetails = async (client: ClientData) => {
    if (!client.id) return;
    const toastId = toast.loading("Sending client details...");
    try {
      await sendClientDetailsEmailApi({
        templateName: "Welcome Mail",
        clientId: client.id,
      });
      toast.update(toastId, {
        render: "Details sent successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.update(toastId, {
        render: error.response?.data?.detail || "Failed to send details.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, client: ClientData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowClient(client);
  };

  const handleStatusChange = async (client: ClientData, newStatus: ClientData["status"]) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update clients.");
      return;
    }
    try {
      await updateClientApi(client.id!, { status: newStatus }, routeName);
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c))
      );
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  const menuItems: ContextMenuItem[] = selectedRowClient
    ? [
      ...(canUpdate
        ? [
          {
            label: "Add Access Control",
            icon: <ShieldPlus size={16} />,
            onClick: () => handleAddIp(selectedRowClient),
          },
        ]
        : []),
      {
        label: "Sender ID Policy",
        icon: <Shield size={16} />,
        onClick: () => handleSenderIdPolicy(selectedRowClient),
      },

      {
        label: "View Details",
        icon: <Eye size={16} />,
        onClick: () => handleView(selectedRowClient),
      },
      {
        label: "View Rate",
        icon: <Layers size={16} />,
        onClick: () => {
          setRateModalClient({ id: selectedRowClient.id!, name: selectedRowClient.name });
          setIsRateModalOpen(true);
        }
      },
      {
        label: "Send Details",
        icon: <Mail size={16} />,
        onClick: () => handleSendDetails(selectedRowClient),
      },
      ...(canUpdate
        ? [
          {
            label: "Edit Client",
            icon: <Edit size={16} />,
            onClick: () => handleEdit(selectedRowClient),
          },
          {
            label: (!selectedRowClient.routeGroup && !selectedRowClient.customerRateGroup) ? "Add Route & Rate Plan" : "Edit Route & Rate Group",
            icon: (!selectedRowClient.routeGroup && !selectedRowClient.customerRateGroup) ? <Plus size={16} /> : <Edit size={16} />,
            onClick: () => handleEditRouting(selectedRowClient),
          },
        ]
        : []),
      ...(canDelete
        ? [
          {
            label: "Delete Client",
            icon: <Trash size={16} />,
            variant: "danger" as const,
            onClick: () => setDeleteId(selectedRowClient.id!),
          },
        ]
        : []),
    ]
    : [];

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Clients
          </h1>

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
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Clients</span>
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
                    const newVal =
                      newGt || currentLt ? `${newGt},${currentLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
                />
                <DatePicker
                  label={`Search ${baseLabel} (< Before)`}
                  selected={ltStr ? new Date(ltStr) : null}
                  onChange={(val: Date | null) => {
                    const newLt = val ? formatLocalDate(val) : "";
                    const currentGt = gtStr || "";
                    const newVal =
                      currentGt || newLt ? `${currentGt},${newLt}` : "";
                    handleFilterChange(col.key, newVal);
                  }}
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
                    const newVal =
                      newGt || currentLt ? `${newGt},${currentLt}` : "";
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
                    const newVal =
                      currentGt || newLt ? `${currentGt},${newLt}` : "";
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
        data={clients}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        headers={tableHeaders}
        density="compact"
        isLoading={isLoading}
        onSort={handleSort}
        sortColumnIndex={sortConfig ? visibleTableFields.findIndex(c => c.key === sortConfig.key) + 1 : null}
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            // First ensure we only reorder the active visible keys, otherwise the indices won't match
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
              Add Client
            </Button>
          ) : null
        }
        renderRow={(client, index) => (
          <tr
            key={client.id || index}
            onContextMenu={(e) => handleContextMenu(e, client)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (client as any)[col.key];

              if (col.key === "companyName") {
                cellData = client.companyName || client.company;
              }

              if (col.key === "routeGroup") {
                cellData = client.routeGroupName || client.routeGroup;
              }

              if (col.key === "customerRateGroup") {
                cellData = client.customerRateGroupName || client.customerRateGroup;
              }

              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(client)}
                  </td>
                );
              }
              if (col.options) {
                const match = col.options.find(
                  (opt) => opt.value === String(cellData),
                );
                cellData = match ? match.label : cellData;
              }
              if (col.key === "name") {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm font-semibold text-primary cursor-pointer hover:underline whitespace-nowrap"
                    onClick={() => {
                      setRateModalClient({ id: client.id!, name: client.name });
                      setIsRateModalOpen(true);
                    }}
                  >
                    {cellData || "-"}
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
          </tr>
        )}
      />

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={fetchClients}
        moduleName={routeName}
        editingClient={editingClient}
        isViewMode={isViewMode}
      />

      <ClientRoutingRateModal
        isOpen={isRoutingModalOpen}
        onClose={() => setIsRoutingModalOpen(false)}
        onSuccess={fetchClients}
        moduleName={routeName}
        editingClient={editingClient}
        routeGroupOptions={routeGroup}
        customerRateGroupOptions={customerRateGroupOptions}
      />

      <ClientRateTableModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        client={rateModalClient}
      />

      <IpWhitelistModal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        onSuccess={() => { }}
        moduleName="ipWhitelist"
        editingData={null}
        fixedClient={ipModalClient}
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRowClient(null);
        }}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete client "${selectedRowClient?.name || ""}"? This action cannot be undone.`}
      />
      <SenderIdPolicyModal
        isOpen={isSenderIdModalOpen}
        onClose={() => setIsSenderIdModalOpen(false)}
        client={senderIdModalClient}
      />

    </div>
  );
};

export default Client;