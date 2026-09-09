import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Layers, Edit } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getGroupedCustomRoutesApi,
  getCustomRoutesApi,
} from "../../api/routeManagerApi/customRouteApi";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

import { CustomRouteModal } from "../../components/modals/RouteManager/CustomRouteModal";
import { SubRouteTableModal } from "../../components/modals/RouteManager/SubRouteTableModal";

import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";
import DataTable from "../../components/ui/DataTable";
import FilterCard from "../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../components/ui/AdvancedFilter";
import { usePagePermissions } from "../../hooks/usePagePermissions";
import ContextMenu, {
  type ContextMenuItem,
} from "../../components/ui/ContextMenu";
import { actionHelper } from "../../helper/action";
import { formatDateTime } from "../../helper/dateFormatter";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CountryFlag } from "../../components/ui/CountryFlag";

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

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SEARCH_COLUMNS = ["name", "status", "country"];
const DEFAULT_TABLE_COLUMNS = [
  "name",
  "country",
  "status",
  "createdAt",
];

const CustomRoute: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [groupedRoutes, setGroupedRoutes] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [routeGroupOptions, setRouteGroupOptions] = useState<Option[]>([]);

  const [activeRouteGroup, setActiveRouteGroup] = useState<string | null>(null);
  const [activeRouteGroupId, setActiveRouteGroupId] = useState<number | null>(null);
  const [isSubTableModalOpen, setIsSubTableModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRowGroup, setSelectedRowGroup] = useState<any | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("customroute_search_columns");
    return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "customroute_search_columns",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("customroute_grouped_columns");
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "customroute_grouped_columns",
      JSON.stringify(tableColumns),
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/")[2] || "customRoute";
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Custom Route", `Opened Custom Route Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const countryRes: any = await getCountriesApi("country", 1, 1000);
        const countryList = countryRes.results || (Array.isArray(countryRes) ? countryRes : []);
        setCountryOptions(countryList.map((c: any) => ({ 
          label: c.name, 
          value: c.name,
          ...(c.iso2 ? { icon: <CountryFlag iso2={c.iso2} /> } : {})
        })));
      } catch (err: any) {
        console.error("Failed to load countries for filter", err);
      }

      try {
        const routeRes: any = await getGroupedCustomRoutesApi(routeName, 1, 1000);
        const routeList = routeRes.results || (Array.isArray(routeRes) ? routeRes : []);
        setRouteGroupOptions(routeList.map((r: any) => ({ label: r.name, value: r.name })));
      } catch (err: any) {
        console.error("Failed to load route groups for filter", err);
      }
    };
    loadDropdowns();
  }, [routeName]);

  const statusOptions: Option[] = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const allColumns: ColumnConfig[] = [
    {
      key: "name",
      label: "Route Group",
      type: "text",
      options: routeGroupOptions,
      filterKey: "name__icontains",
    },
    {
      key: "country",
      label: "Country",
      type: "text",
      options: countryOptions,
      filterKey: "country__name__icontains",
      render: (c: any) => {
        if (c.routeGroupCountry && Array.isArray(c.routeGroupCountry) && c.routeGroupCountry.length > 0) {
          const full = c.routeGroupCountry.map((item: any) => item.countryName).join(", ");
          return (
            <span title={full} className="block max-w-[240px] truncate">
              {full}
            </span>
          );
        }
        return "-";
      },
    },
    {
      key: "status",
      label: "Status",
      type: "text",
      options: statusOptions,
      filterKey: "status",
      render: (c: any) => <StatusBadge status={c.status} />,
    },
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
    {
      key: "createdAt",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "createdAt",
      render: (c: any) => (c.createdAt ? formatDateTime(c.createdAt) : "-"),
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

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type as FilterColumnType }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const openSubTableModal = (groupName: string, groupId?: number) => {
    setActiveRouteGroup(groupName);
    setActiveRouteGroupId(groupId ?? null);
    setIsSubTableModalOpen(true);
  };

  const fetchGroupedRoutes = async (
    filters: Record<string, string> | null = null,
    autoOpenModal: boolean = false,
    extraNavInfo?: { clientName?: string; vendorName?: string }
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
            // Converts single date input into 24-hour range query (e.g. createdAt__range=2026-08-18T00:00:00,2026-08-18T23:59:59)
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

      let response: any = await getGroupedCustomRoutesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;

      let routeList = response && response.results
        ? response.results
        : Array.isArray(response)
          ? response
          : [];

      const searchTarget = activeFilters.name;
      const isInitialNavigation = extraNavInfo !== undefined;
      const clientName = extraNavInfo?.clientName || (isInitialNavigation ? searchTarget : undefined);
      const vendorName = extraNavInfo?.vendorName || (isInitialNavigation ? searchTarget : undefined);

      if (routeList.length === 0 && searchTarget) {
        let foundGroupId: number | null = null;
        let foundGroupName: string | null = null;

        if (vendorName) {
          try {
            const subRouteRes: any = await getCustomRoutesApi(
              "customRoute",
              1,
              10,
              { terminatingVendorProfileName__icontains: vendorName }
            );
            const subList = subRouteRes?.results || (Array.isArray(subRouteRes) ? subRouteRes : []);
            if (subList.length > 0 && subList[0].routeGroup) {
              foundGroupId = subList[0].routeGroup;
              foundGroupName = subList[0].routeGroupName || null;
            }
          } catch (e) {
            console.error("Vendor sub-route lookup failed", e);
          }
        }

        if (!foundGroupId && clientName) {
          try {
            const clientRes: any = await getClientsApi("client", 1, 10, { name__icontains: clientName });
            const clientList = clientRes?.results || (Array.isArray(clientRes) ? clientRes : []);
            if (clientList.length > 0) {
              const c = clientList[0];
              const matchedRouteGroup = c.routeGroup || c.customRoute || c.routeGroupName || c.customRouteName;
              if (typeof matchedRouteGroup === "number") {
                foundGroupId = matchedRouteGroup;
              } else if (typeof matchedRouteGroup === "string") {
                foundGroupName = matchedRouteGroup;
              }
            }
          } catch (e) {
            console.error("Client route group lookup failed", e);
          }
        }

        if (foundGroupId || foundGroupName) {
          try {
            const groupParams: Record<string, any> = {};
            if (foundGroupId) groupParams.id = foundGroupId;
            else if (foundGroupName) groupParams.name__icontains = foundGroupName;

            const fallbackRes: any = await getGroupedCustomRoutesApi(
              routeName,
              1,
              rowsPerPage,
              groupParams
            );
            const fallbackList = fallbackRes?.results || (Array.isArray(fallbackRes) ? fallbackRes : []);
            if (fallbackList.length > 0) {
              routeList = fallbackList;
              response = fallbackRes;
            }
          } catch (e) {
            console.error("Fallback route group query failed", e);
          }
        }
      }

      setGroupedRoutes(routeList);
      setTotalItems(response?.count ?? routeList.length);

      if (autoOpenModal && routeList.length > 0) {
        const matchedGroup = routeList[0];
        if (matchedGroup) {
          openSubTableModal(matchedGroup.name, matchedGroup.id);
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to fetch custom routes.");
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const initialName = queryParams.get("name") || (location.state as any)?.searchName;
    const clientName = queryParams.get("client") || (location.state as any)?.clientName;
    const vendorName = queryParams.get("vendor") || (location.state as any)?.vendorName;
    const autoOpen = queryParams.get("autoOpen") === "true" || Boolean((location.state as any)?.autoOpen);

    if (initialName || clientName || vendorName) {
      const nameVal = initialName || clientName || vendorName;
      setFilterValues((prev) => ({ ...prev, name: nameVal }));
      fetchGroupedRoutes({ name: nameVal }, autoOpen, { clientName, vendorName });
    } else {
      fetchGroupedRoutes();
    }

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [routeName, currentPage, rowsPerPage, searchColumns, location.search, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchGroupedRoutes();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchGroupedRoutes({});
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

  const handleAddMain = () => {
    if (!canCreate) return;
    setIsCreateModalOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, groupItem: any) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowGroup(groupItem);
  };

  const menuItems: ContextMenuItem[] = selectedRowGroup
    ? [
      {
        label: "Manage Routes",
        icon: <Layers size={16} />,
        onClick: () => openSubTableModal(selectedRowGroup.name, selectedRowGroup.id),
      },
      ...(canUpdate
        ? [
          {
            label: "Edit Route Group",
            icon: <Edit size={16} />,
            onClick: () => {
              setIsEditGroupModalOpen(true);
            },
          },
        ]
        : []),
    ]
    : [];

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];
  const getBaseLabel = (label: string) => (label ? label.split(" (")[0].trim() : "");

  const handlePageClick = () => {
    setContextMenuPos(null);
  };

  return (
    <div className="container mx-auto" onClick={handlePageClick}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Custom Route Manager
          </h1>
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns as any}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={(cols: any) => setTableColumns(cols)}
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
              onFilter={(newCols: any) => {
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
            Custom Route
          </span>
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
                allowCustomValue={true}
              />
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
                placeholder={`Select ${baseLabel}`}
              />
            );
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
                  placeholder={`> After`}
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
                  placeholder={`< Before`}
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
        data={groupedRoutes}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        density="compact"
        headers={tableHeaders}
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
              onClick={handleAddMain}
              leftIcon={<Plus size={18} />}
            >
              Create Route
            </Button>
          ) : null
        }
        renderRow={(routeGroupObj: any, index: number) => (
          <tr
            key={index}
            onContextMenu={(e) => handleContextMenu(e, routeGroupObj)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/80 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (routeGroupObj as any)[col.key];
              if (col.render)
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap`}
                  >
                    {col.render(routeGroupObj)}
                  </td>
                );
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
                    className="px-4 py-4 text-sm font-semibold text-primary cursor-pointer hover:underline"
                    onClick={() => openSubTableModal(routeGroupObj.name, routeGroupObj.id)}
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

      <SubRouteTableModal
        isOpen={isSubTableModalOpen}
        onClose={() => {
          setIsSubTableModalOpen(false);
          setActiveRouteGroup(null);
          setActiveRouteGroupId(null);
          fetchGroupedRoutes();
        }}
        routeGroup={activeRouteGroup}
        routeGroupId={activeRouteGroupId}
        moduleName={routeName}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <CustomRouteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          fetchGroupedRoutes();
          if (created?.id) {
            openSubTableModal(created.name, created.id);
          }
        }}
        moduleName={routeName}
        editingRoute={null}
        isViewMode={false}
        isCreatingGroup={true}
      />

      <CustomRouteModal
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        onSuccess={() => fetchGroupedRoutes()}
        moduleName={routeName}
        editingRoute={null}
        isEditingGroupStatus={true}
        groupData={selectedRowGroup}
      />
    </div>
  );
};

export default CustomRoute;