import React, { useState, useEffect, useRef } from "react";
import { Home, Trash, Eye, Download, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axiosInstance";

// --- APIs ---
import {
  getVendorInvoicesApi,
  deleteVendorInvoiceApi,
  getVendorsApi,
  type VendorInvoiceData,
} from "../../../api/financeApi/vendorInvoiceApi";

// --- Modals ---
import { VendorInvoiceViewVendorModal } from "../../../components/modals/Finance/VendorInvoiceViewVendorModal";

// --- Components ---
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

const DEFAULT_SEARCH_COLUMNS = ["invoiceNumber", "companyName"];
const DEFAULT_TABLE_COLUMNS = [
  "invoiceNumber",
  "companyName",
  "billingPeriodStart",
  "billingPeriodEnd",
  "invoiceDate",
  "totalSegments",
  "totalAmount",
  "accountManagerName",
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const VendorInvoice: React.FC = () => {
  const { canDelete } = usePagePermissions();
  const [invoices, setInvoices] = useState<VendorInvoiceData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [companies, setCompanies] = useState<Option[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [isViewVendorModalOpen, setIsViewVendorModalOpen] = useState(false);
  const [viewVendorCompanyName, setViewVendorCompanyName] = useState<string | null>(null);
  const [viewVendorInvoiceId, setViewVendorInvoiceId] = useState<number | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedRow, setSelectedRow] = useState<VendorInvoiceData | null>(null);

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("vendorInvoice_search_columns_v1");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SEARCH_COLUMNS;
    } catch (e) {
      return DEFAULT_SEARCH_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "vendorInvoice_search_columns_v1",
      JSON.stringify(searchColumns),
    );
  }, [searchColumns]);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("vendorInvoice_table_columns_v1");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_TABLE_COLUMNS;
    } catch (e) {
      return DEFAULT_TABLE_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "vendorInvoice_table_columns_v1",
      JSON.stringify(tableColumns),
    );
  }, [tableColumns]);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const location = useLocation();
  const routeName = location.pathname.split("/").pop() || "vendorInvoice";
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Vendor Invoice", `Opened Module`, false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  useEffect(() => {
    getVendorsApi("vendor", 1, 1000)
      .then((res: any) => {
        const list = res.results || (Array.isArray(res) ? res : []);
        setCompanies(
          list.map((v: any) => ({
            label: v.profileName || v.name,
            value: v.profileName || v.name,
          })),
        );
      })
      .catch(() => console.error("Failed to load vendors"));
  }, []);

  const allColumns: ColumnConfig[] = [
    {
      key: "invoiceNumber",
      label: "Invoice No.",
      type: "text",
      filterKey: "invoiceNumber__icontains",
    },
    {
      key: "companyName",
      label: "Vendor",
      type: "text",
      options: companies,
      filterKey: "vendor__profileName__icontains",
    },
    {
      key: "billingPeriodStart",
      label: "Period Start (Exact)",
      tableLabel: "Period Start",
      type: "date",
      filterKey: "billingPeriodStart",
    },
    {
      key: "billingPeriodStart__gt_lt",
      label: "Period Start (After / Before)",
      type: "date_gt_lt",
      filterKey: "billingPeriodStart",
      isSearchOnly: true,
    },
    {
      key: "billingPeriodEnd",
      label: "Period End (Exact)",
      tableLabel: "Period End",
      type: "date",
      filterKey: "billingPeriodEnd",
    },
    {
      key: "billingPeriodEnd__gt_lt",
      label: "Period End (After / Before)",
      type: "date_gt_lt",
      filterKey: "billingPeriodEnd",
      isSearchOnly: true,
    },
    {
      key: "invoiceDate",
      label: "Invoice Date (Exact)",
      tableLabel: "Invoice Date",
      type: "date",
      filterKey: "invoiceDate",
    },
    {
      key: "invoiceDate__gt_lt",
      label: "Invoice Date (After / Before)",
      type: "date_gt_lt",
      filterKey: "invoiceDate",
      isSearchOnly: true,
    },
    {
      key: "totalSegments",
      label: "Total Segments",
      type: "number",
      filterKey: "totalSegments",
    },
    {
      key: "totalSegments__gt_lt",
      label: "Total Segments (> / <)",
      type: "number_gt_lt",
      filterKey: "totalSegments",
      isSearchOnly: true,
    },
    {
      key: "totalAmount",
      label: "Total Amount",
      type: "number",
      isSearchable: false,
    },
    {
      key: "accountManagerName",
      label: "Generated By",
      type: "text",
      filterKey: "accountManager__username__icontains",
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "text",
      filterKey: "createdBy__username__icontains",
      render: (data: any) => data.createdByName || data.createdBy || "-",
    },
    {
      key: "createdAt",
      label: "Created At (Exact)",
      tableLabel: "Created At",
      type: "date",
      filterKey: "createdAt",
      render: (data: any) => {
        if (!data.createdAt) return "-";
        return formatDateTime(data.createdAt);
      },
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
    .map((c) => ({ key: c.key, label: c.tableLabel || c.label, type: c.type }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const fetchInvoices = async (
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
              (opt: Option) => opt.value === value,
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

      const response: any = await getVendorInvoicesApi(
        routeName,
        currentPage,
        rowsPerPage,
        currentSearchParams,
      );

      if (newController.signal.aborted) return;
      if (response && response.results) {
        setInvoices(response.results);
        setTotalItems(response.count);
      } else {
        setInvoices([]);
        setTotalItems(0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch vendor invoices:", error);
      }
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [currentPage, rowsPerPage, searchColumns, sortConfig]);

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
        await deleteVendorInvoiceApi(deleteId, routeName);
        toast.success("Invoice deleted.");
        fetchInvoices();
      } catch (error) {
        toast.error("Failed to delete.");
      }
      setDeleteId(null);
      setSelectedRow(null);
    }
  };

  const handleViewPdf = async (id?: number) => {
    if (!id) {
      toast.error("Invoice ID not available.");
      return;
    }

    const cleanUrl = `/api/finance/company-vendor-invoice/${id}/download/`;
    const toastId = toast.loading("Generating PDF for view...", { type: "info" });
    try {
      const response = await api.get(cleanUrl, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      toast.update(toastId, {
        render: "PDF opened successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: "Failed to load PDF.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleDownloadPdf = async (url?: string) => {
    if (!url) {
      toast.error("Download link not available.");
      return;
    }
    const cleanUrl = url.replace(/^None\/?/, "/").replace(/(?<!:)\/\//g, "/");

    const toastId = toast.loading("Downloading PDF...", { type: "info" });
    try {
      const response = await api.get(cleanUrl, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", cleanUrl.split("/").pop() || "invoice.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.update(toastId, {
        render: "PDF downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      toast.update(toastId, {
        render: "Failed to download PDF.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleDownloadEdr = async (id?: number) => {
    if (!id) {
      toast.error("Invoice ID not available.");
      return;
    }

    const toastId = toast.loading("Downloading EDR...", { type: "info" });
    try {
      const response = await api.get(
        `/api/finance/company-vendor-invoice/${id}/tdr/`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `${response.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") || `EDR-Company-${id}.zip`}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.update(toastId, {
        render: "EDR downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      toast.update(toastId, {
        render: "Failed to download EDR.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const menuItems: ContextMenuItem[] = selectedRow
    ? [
      {
        label: "View Vendor",
        icon: <Users size={16} />,
        onClick: () => {
          setViewVendorCompanyName(selectedRow.companyName || null);
          setViewVendorInvoiceId(selectedRow.id ?? null);
          setIsViewVendorModalOpen(true);
        },
      },
      {
        label: "View Invoice",
        icon: <Eye size={16} />,
        onClick: () => handleViewPdf(selectedRow.id),
      },
      {
        label: "Download PDF",
        icon: <Download size={16} />,
        onClick: () =>
          handleDownloadPdf(
            selectedRow.downloadUrl || `/api/finance/company-vendor-invoice/${selectedRow.id}/download/`,
          ),
      },
      {
        label: "Download EDR",
        icon: <Download size={16} />,
        onClick: () => handleDownloadEdr(selectedRow.id),
      },
      ...(canDelete
        ? [
          {
            label: "Delete Invoice",
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

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-2">
            Vendor Invoices
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
          <span className="text-text-primary dark:text-white">Vendor Invoice</span>
        </div>
      </div>

      <FilterCard
        onSearch={() => {
          setCurrentPage(1);
          fetchInvoices();
        }}
        onClear={() => {
          setFilterValues({});
          setCurrentPage(1);
          fetchInvoices({});
        }}
      >
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");

          if (col.options) {
            return (
              <Select
                key={col.key}
                label={`Search ${baseLabel}`}
                value={filterValues[col.key] || ""}
                onChange={(val) =>
                  handleFilterChange(col.key, val)
                }
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
              onChange={(e) =>
                handleFilterChange(col.key, e.target.value)
              }
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      <DataTable
        serverSide={true}
        data={invoices}
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
        renderRow={(invoice, index) => (
          <tr
            key={invoice.id || index}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuPos({ x: e.clientX, y: e.clientY });
              setSelectedRow(invoice);
            }}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 cursor-context-menu"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              let cellContent: React.ReactNode = "-";
              const rawValue = (invoice as any)[col.key];

              if (col.render) {
                cellContent = col.render(invoice);
              } else if (col.key === "totalAmount") {
                cellContent =
                  rawValue != null && !isNaN(Number(rawValue))
                    ? `${Number(rawValue).toFixed(4)} ${(invoice as any).currencyCode || ""
                    }`
                    : "-";
              } else {
                cellContent = rawValue || "-";
              }

              return (
                <td
                  key={col.key}
                  className={`px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap ${col.key === "invoiceNumber" ? "font-medium text-primary" : ""
                    }`}
                >
                  {cellContent}
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
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRow(null);
        }}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${selectedRow?.invoiceNumber || ""}"? This action cannot be undone.`}
      />
      <VendorInvoiceViewVendorModal
        isOpen={isViewVendorModalOpen}
        onClose={() => setIsViewVendorModalOpen(false)}
        companyName={viewVendorCompanyName}
        companyInvoiceId={viewVendorInvoiceId}
      />
    </div>
  );
};

export default VendorInvoice;