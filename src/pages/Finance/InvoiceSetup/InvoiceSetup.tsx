import React, { useState, useEffect, useRef } from "react";
import { Home, Plus, Edit, Trash, Eye } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// --- APIs ---
import {
  getInvoiceSetupsApi,
  deleteInvoiceSetupApi,
  type InvoiceSetupData,
} from "../../../api/financeApi/invoiceSetupApi";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";

// --- Components ---
import { InvoiceSetupModal } from "../../../components/modals/Finance/InvoiceSetupModal";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import Input from "../../../components/ui/Input";
import DatePicker from "../../../components/ui/DatePicker";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../components/ui/ContextMenu";
import { usePagePermissions } from "../../../hooks/usePagePermissions";
import { actionHelper } from "../../../helper/action";

import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../helper/dateFormatter";

interface Option {
  label: string;
  value: string;
}

interface ColumnConfig extends FilterColumn {
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

const DEFAULT_SEARCH_COLUMNS = ["companyName", "invoiceFrequency"];
const DEFAULT_TABLE_COLUMNS = [
  "companyName",
  "businessEntity",
  "invoiceFrequency",
  "dueDays",
  "isTaxApplied",
];

const InvoiceSetup: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();
  const [setups, setSetups] = useState<InvoiceSetupData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [companies, setCompanies] = useState<Option[]>([]);

  // --- Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<InvoiceSetupData | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- Context Menu State ---
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRow, setSelectedRow] = useState<InvoiceSetupData | null>(null);

  // --- Filter States ---
  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("invoiceSetup_search_columns_v2");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "invoiceSetup_search_columns_v2",
      JSON.stringify(searchColumns)
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("invoiceSetup_table_columns_v2");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
    } catch (e) {
      return DEFAULT_TABLE_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "invoiceSetup_table_columns_v2",
      JSON.stringify(tableColumns)
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const routeName = location.pathname.split("/").pop() || "invoiceSetup";
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper(
          "Invoice Setup",
          `Opened Invoice Setup Module`,
          false
        );
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  // --- Fetch Companies for Filter ---
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const compRes: any = await getCompaniesApi("company", 1, 1000);
        const list = compRes.results || (Array.isArray(compRes) ? compRes : []);
        setCompanies(
          list.map((c: any) => ({ label: c.name, value: c.name }))
        );
      } catch (err) {
        console.error("Failed to load companies for filter");
      }
    };
    loadDropdowns();
  }, []);

  const frequencyOptions: Option[] = [
    { label: "Weekly", value: "WEEKLY" },
    { label: "Bi-weekly", value: "BI-WEEKLY" },
    { label: "Monthly", value: "MONTHLY" },
    { label: "3 Months", value: "QUARTERLY" },
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

  const allColumns: ColumnConfig[] = [
    {
      key: "companyName",
      label: "Company",
      type: "text",
      options: companies,
      filterKey: "company__name__icontains",
    },
    {
      key: "businessEntity",
      label: "Entity",
      type: "text",
      filterKey: "businessEntity__legalEntityName__icontains",
      render: (s: InvoiceSetupData) =>
        s.businessEntityName || s.businessEntity || "-",
    },
    {
      key: "invoiceFrequency",
      label: "Frequency",
      type: "text",
      options: frequencyOptions,
      filterKey: "invoiceFrequency",
    },
    {
      key: "dueDays",
      label: "Due Days",
      type: "number",
      filterKey: "dueDays",
    },
    {
      key: "dueDays__gt_lt",
      label: "Due Days (> / <)",
      type: "number_gt_lt",
      filterKey: "dueDays",
      isSearchOnly: true,
    },
    {
      key: "tax",
      label: "Tax Details",
      type: "text",
      filterKey: "tax__icontains",
    },
    {
      key: "isTaxApplied",
      label: "Tax Applied",
      type: "text",
      options: booleanOptions,
      filterKey: "isTaxApplied",
      render: (s: any) => renderBooleanBadge(s.isTaxApplied),
    },
    {
      key: "billingAddressOverride",
      label: "Billing Address",
      type: "text",
      filterKey: "billingAddressOverride__icontains",
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "text",
      filterKey: "createdBy__username__icontains",
      render: (s: any) => s.createdByName || s.createdBy || "-",
    },
    {
      key: "updatedBy",
      label: "Updated By",
      type: "text",
      filterKey: "updatedBy__username__icontains",
      render: (s: any) => s.updatedByName || s.updatedBy || "-",
    },
    {
      key: "createdAt",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "createdAt",
      render: (s: InvoiceSetupData) =>
        s.createdAt ? formatDateTime(s.createdAt) : "-",
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
    (col) => col.isSearchable !== false
  );
  const visibleSearchFields = searchableColumns.filter((col) =>
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

  const fetchSetups = async (
    filters: Record<string, string> | null = null
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
              (opt: Option) => opt.value === value
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

      const response: any = await getInvoiceSetupsApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams
      );

      if (newController.signal.aborted) return;

      if (response && response.results) {
        setSetups(response.results);
        setTotalItems(response.count);
      } else {
        setSetups([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setSetups([]);
        setTotalItems(0);
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSetups();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [currentPage, rowsPerPage, searchColumns, sortConfig]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSetups();
  };
  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchSetups({});
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
        await deleteInvoiceSetupApi(deleteId, routeName);
        toast.success("Invoice Setup deleted successfully.");
        fetchSetups();
      } catch (error) {
        toast.error("Failed to delete setup.");
      }
      setDeleteId(null);
      setSelectedRow(null);
    }
  };

  const handleEdit = (setup: InvoiceSetupData) => {
    if (!canUpdate) return;
    setEditingSetup(setup);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleAdd = () => {
    if (!canCreate) return;
    setEditingSetup(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (setup: InvoiceSetupData) => {
    setEditingSetup(setup);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    setup: InvoiceSetupData
  ) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRow(setup);
  };

  const menuItems: ContextMenuItem[] = selectedRow
    ? [
        {
          label: "View Details",
          icon: <Eye size={16} />,
          onClick: () => handleView(selectedRow),
        },
        ...(canUpdate
          ? [
              {
                label: "Edit Setup",
                icon: <Edit size={16} />,
                onClick: () => handleEdit(selectedRow),
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete Setup",
                icon: <Trash size={16} />,
                variant: "danger" as const,
                onClick: () => setDeleteId(selectedRow.id!),
              },
            ]
          : []),
      ]
    : [];

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];
  const getBaseLabel = (label: string) => label.split(" (")[0].trim();

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Invoice Setup
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
          <span className="text-text-primary dark:text-white">Finance</span>
          <span>/</span>
          <span className="text-text-primary dark:text-white">
            Invoice Setup
          </span>
        </div>
      </div>

      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
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
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={setups}
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
              onClick={handleAdd}
              leftIcon={<Plus size={18} />}
            >
              Add Setup
            </Button>
          ) : null
        }
        renderRow={(setup, index) => (
          <tr
            key={setup.id || index}
            onContextMenu={(e) => handleContextMenu(e, setup)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellData = (setup as any)[col.key];

              if (col.key === "companyName") {
                cellData = setup.companyName || setup.company;
              }

              if (col.key === "businessEntity") {
                cellData = setup.businessEntityName || setup.businessEntity;
              }

              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(setup)}
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

      <InvoiceSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSetups}
        moduleName={routeName}
        editingSetup={editingSetup}
        isViewMode={isViewMode}
      />

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRow(null);
        }}
        onConfirm={handleDelete}
        title="Delete Setup"
        message={`Are you sure you want to delete invoice setup for "${selectedRow?.companyName || (selectedRow as any)?.company || ""}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default InvoiceSetup;