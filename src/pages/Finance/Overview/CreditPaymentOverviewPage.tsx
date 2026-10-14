import React, { useEffect, useState, useMemo } from "react";
import { Home, ArrowUpRight, CreditCard, SlidersHorizontal, History } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";
import { ClientTopUpModal } from "../../../components/modals/Finance/ClientTopUpModal";
import { ClientPaymentModal } from "../../../components/modals/Finance/ClientPaymentModal";
import { ChangeClientLimitModal } from "../../../components/modals/Finance/ChangeClientLimitModal";
import { VendorTopUpModal } from "../../../components/modals/Finance/VendorTopUpModal";
import { VendorPaymentModal } from "../../../components/modals/Finance/VendorPaymentModal";
import { ChangeVendorLimitModal } from "../../../components/modals/Finance/ChangeVendorLimitModal";
import { TransactionHistoryModal } from "../../../components/modals/Finance/TransactionHistoryModal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import Select, { type SelectOption } from "../../../components/ui/Select";

interface ColumnDef {
  key: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "company", label: "Company Name & Category" },
  { key: "prepaidWallet", label: "Prepaid Wallet" },
  { key: "postpaidLimit", label: "Postpaid Limit" },
  { key: "outstandingDebt", label: "Outstanding Debt" },
  { key: "availableCredit", label: "Available Credit" },
];

const DEFAULT_COLUMN_KEYS = [
  "company",
  "prepaidWallet",
  "postpaidLimit",
  "outstandingDebt",
  "availableCredit",
];

const CreditPaymentOverviewPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(true);

  // Column reordering & sorting state
  const [tableColumnKeys, setTableColumnKeys] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Modals state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLimitOpen, setIsLimitOpen] = useState(false);

  const [isVendorTopUpOpen, setIsVendorTopUpOpen] = useState(false);
  const [isVendorPaymentOpen, setIsVendorPaymentOpen] = useState(false);
  const [isVendorLimitOpen, setIsVendorLimitOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [searchName, setSearchName] = useState("");
  const [companyOptions, setCompanyOptions] = useState<SelectOption[]>([]);
  const [isDropdownLoading, setIsDropdownLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"customer" | "vendor">("customer");

  const visibleColumns = useMemo(() => {
    return tableColumnKeys
      .map((key) => ALL_COLUMNS.find((col) => col.key === key))
      .filter((col): col is ColumnDef => Boolean(col));
  }, [tableColumnKeys]);

  const headers = useMemo(() => {
    return ["S.N.", ...visibleColumns.map((col) => col.label)];
  }, [visibleColumns]);

  const fetchCompanies = async (
    page = currentPage,
    pageSize = rowsPerPage,
    nameQuery = searchName
  ) => {
    setIsLoading(true);
    try {
      const searchParams = nameQuery ? { name__icontains: nameQuery } : {};
      const res = await getCompaniesApi("finance", page, pageSize, searchParams);
      setCompanies(res.results || []);
      setTotalItems(res.count || 0);
    } catch (error) {
      toast.error("Failed to fetch companies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(1, rowsPerPage, "");
    // Load companies for the dropdown filter
    getCompaniesApi("finance", 1, 1000)
      .then((res) => {
        const opts = (res.results || []).map((c: any) => ({
          value: c.name,
          label: c.name,
        }));
        setCompanyOptions(opts);
      })
      .catch(() => {})
      .finally(() => {
        setIsDropdownLoading(false);
      });
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCompanies(1, rowsPerPage, searchName);
  };

  const handleClear = () => {
    setSearchName("");
    setCurrentPage(1);
    fetchCompanies(1, rowsPerPage, "");
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchCompanies(newPage, rowsPerPage, searchName);
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    setCurrentPage(1);
    fetchCompanies(1, newRows, searchName);
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // Offset for "S.N." column
    if (colIndex >= 0 && colIndex < visibleColumns.length) {
      const col = visibleColumns[colIndex];
      setSortConfig((prev) => {
        if (prev?.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setTableColumnKeys((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedCompanies = useMemo(() => {
    if (!sortConfig) return companies;
    const { key, direction } = sortConfig;

    return [...companies].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      const isPrepaidA = a.categoryName && a.categoryName.toUpperCase() === "PREPAID";
      const isPrepaidB = b.categoryName && b.categoryName.toUpperCase() === "PREPAID";

      const prepaidBalA =
        viewMode === "customer"
          ? Number(a.prepaidCustomerBalance || 0)
          : Number(a.prepaidVendorBalance || 0);
      const prepaidBalB =
        viewMode === "customer"
          ? Number(b.prepaidCustomerBalance || 0)
          : Number(b.prepaidVendorBalance || 0);

      const postpaidLimitA =
        viewMode === "customer"
          ? Number(a.customerCreditLimit || 0)
          : Number(a.vendorCreditLimit || 0);
      const postpaidLimitB =
        viewMode === "customer"
          ? Number(b.customerCreditLimit || 0)
          : Number(b.vendorCreditLimit || 0);

      const outstandingA =
        viewMode === "customer"
          ? Number(a.outstandingCustomerCredit || 0)
          : Number(a.outstandingVendorCredit || 0);
      const outstandingB =
        viewMode === "customer"
          ? Number(b.outstandingCustomerCredit || 0)
          : Number(b.outstandingVendorCredit || 0);

      const availableA = isPrepaidA ? prepaidBalA : postpaidLimitA - outstandingA;
      const availableB = isPrepaidB ? prepaidBalB : postpaidLimitB - outstandingB;

      switch (key) {
        case "company":
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
          break;
        case "prepaidWallet":
          valA = isPrepaidA ? prepaidBalA : -Infinity;
          valB = isPrepaidB ? prepaidBalB : -Infinity;
          break;
        case "postpaidLimit":
          valA = !isPrepaidA ? postpaidLimitA : -Infinity;
          valB = !isPrepaidB ? postpaidLimitB : -Infinity;
          break;
        case "outstandingDebt":
          valA = !isPrepaidA ? outstandingA : -Infinity;
          valB = !isPrepaidB ? outstandingB : -Infinity;
          break;
        case "availableCredit":
          valA = availableA;
          valB = availableB;
          break;
        default:
          return 0;
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [companies, sortConfig, viewMode]);

  const handleContextMenu = (e: React.MouseEvent, company: any) => {
    e.preventDefault();
    setSelectedCompany(company);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const getMenuItems = (): ContextMenuItem[] => {
    if (!selectedCompany) return [];

    const isPrepaid =
      selectedCompany.categoryName &&
      selectedCompany.categoryName.toUpperCase() === "PREPAID";
    const items: ContextMenuItem[] = [];

    if (viewMode === "vendor") {
      if (isPrepaid) {
        items.push({
          label: "Vendor Top-Up",
          icon: <ArrowUpRight size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsVendorTopUpOpen(true);
          },
        });
      } else {
        items.push({
          label: "Vendor Payment",
          icon: <CreditCard size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsVendorPaymentOpen(true);
          },
        });
        items.push({
          label: "Change Vendor Limit",
          icon: <SlidersHorizontal size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsVendorLimitOpen(true);
          },
        });
      }
    } else {
      if (isPrepaid) {
        items.push({
          label: "Client Top-Up",
          icon: <ArrowUpRight size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsTopUpOpen(true);
          },
        });
      } else {
        items.push({
          label: "Receive Payment",
          icon: <CreditCard size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsPaymentOpen(true);
          },
        });
        items.push({
          label: "Change Client Limit",
          icon: <SlidersHorizontal size={16} />,
          onClick: () => {
            setContextMenuPos(null);
            setIsLimitOpen(true);
          },
        });
      }
    }

    items.push({
      label: "View History",
      icon: <History size={16} />,
      onClick: () => {
        setContextMenuPos(null);
        setIsHistoryOpen(true);
      },
    });

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div className="container mx-auto" onClick={() => setContextMenuPos(null)}>
      {/* Top Header & Breadcrumb */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white mr-1">
            Credit & Payments Overview
          </h1>

          {/* Compact View Mode Toggle Switch */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode("customer")}
              className={`px-2.5 py-1 text-xs rounded transition-all ${
                viewMode === "customer"
                  ? "bg-white dark:bg-gray-700 text-primary dark:text-white shadow-xs font-semibold"
                  : "text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 font-medium"
              }`}
            >
              Customer View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("vendor")}
              className={`px-2.5 py-1 text-xs rounded transition-all ${
                viewMode === "vendor"
                  ? "bg-white dark:bg-gray-700 text-primary dark:text-white shadow-xs font-semibold"
                  : "text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 font-medium"
              }`}
            >
              Vendor View
            </button>
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
          <span className="text-text-primary dark:text-white">Credit & Payments</span>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard onSearch={handleSearch} onClear={handleClear}>
        <Select
          label="Search Company Name"
          placeholder="Select a company..."
          value={searchName}
          onChange={(val) => setSearchName(val)}
          options={companyOptions}
          isLoading={isDropdownLoading}
          allowCustomValue={true}
        />
      </FilterCard>

      {/* Data Table with Sorting and Drag-and-Drop Columns */}
      <DataTable
        headers={headers}
        isLoading={isLoading}
        data={sortedCompanies}
        serverSide={true}
        totalItems={totalItems}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        density="compact"
        onSort={handleSort}
        sortColumnIndex={
          sortConfig
            ? visibleColumns.findIndex((c) => c.key === sortConfig.key) + 1
            : null
        }
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={handleReorderColumns}
        renderRow={(row, index) => {
          const isPrepaid =
            row.categoryName && row.categoryName.toUpperCase() === "PREPAID";

          const prepaidBal =
            viewMode === "customer"
              ? Number(row.prepaidCustomerBalance || 0)
              : Number(row.prepaidVendorBalance || 0);
          const postpaidLimit =
            viewMode === "customer"
              ? Number(row.customerCreditLimit || 0)
              : Number(row.vendorCreditLimit || 0);
          const outstanding =
            viewMode === "customer"
              ? Number(row.outstandingCustomerCredit || 0)
              : Number(row.outstandingVendorCredit || 0);

          const available = isPrepaid ? prepaidBal : postpaidLimit - outstanding;

          return (
            <tr
              key={row.id || index}
              className="border-b border-gray-200 dark:border-gray-700 cursor-context-menu hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors"
              onContextMenu={(e) => handleContextMenu(e, row)}
            >
              <td className="px-4 py-2.5 text-sm text-text-primary dark:text-white whitespace-nowrap">
                {(currentPage - 1) * rowsPerPage + index + 1}
              </td>
              {visibleColumns.map((col) => {
                switch (col.key) {
                  case "company":
                    return (
                      <td key="company" className="px-4 py-2.5 text-sm whitespace-nowrap min-w-[260px]">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-text-primary dark:text-white">
                            {row.name}
                          </span>
                          <span
                            style={{ marginLeft: "16px" }}
                            className={`shrink-0 ml-4 px-2 py-0.5 text-[11px] font-medium rounded ${
                              isPrepaid
                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400/20"
                                : "bg-purple-50 text-purple-700 ring-1 ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-400/20"
                            }`}
                          >
                            {isPrepaid ? "Prepaid" : "Postpaid"}
                          </span>
                        </div>
                      </td>
                    );
                  case "prepaidWallet":
                    return (
                      <td
                        key="prepaidWallet"
                        className="px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                      >
                        {isPrepaid ? (
                          prepaidBal.toFixed(4)
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                    );
                  case "postpaidLimit":
                    return (
                      <td
                        key="postpaidLimit"
                        className="px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                      >
                        {!isPrepaid ? (
                          postpaidLimit.toFixed(4)
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                    );
                  case "outstandingDebt":
                    return (
                      <td
                        key="outstandingDebt"
                        className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap"
                      >
                        {!isPrepaid ? (
                          outstanding.toFixed(4)
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                    );
                  case "availableCredit":
                    return (
                      <td
                        key="availableCredit"
                        className="px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
                      >
                        {available.toFixed(4)}
                      </td>
                    );
                  default:
                    return null;
                }
              })}
            </tr>
          );
        }}
      />

      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => setContextMenuPos(null)}
      />

      <ClientTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />
      <ClientPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />
      <ChangeClientLimitModal
        isOpen={isLimitOpen}
        onClose={() => setIsLimitOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />

      <VendorTopUpModal
        isOpen={isVendorTopUpOpen}
        onClose={() => setIsVendorTopUpOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />
      <VendorPaymentModal
        isOpen={isVendorPaymentOpen}
        onClose={() => setIsVendorPaymentOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />
      <ChangeVendorLimitModal
        isOpen={isVendorLimitOpen}
        onClose={() => setIsVendorLimitOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
      />
      <TransactionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        company={selectedCompany}
        viewMode={viewMode}
      />
    </div>
  );
};

export default CreditPaymentOverviewPage;
