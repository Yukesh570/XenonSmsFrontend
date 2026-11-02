import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { NavLink } from "react-router-dom";
import {
  getAccountOverviewApi,
  type AccountOverviewRow,
  type AccountOverviewSummary,
} from "../../../api/financeApi/accountTransactionApi";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";
import { ClientTopUpModal } from "../../../components/modals/Finance/ClientTopUpModal";
import { ClientPaymentModal } from "../../../components/modals/Finance/ClientPaymentModal";
import { ChangeClientLimitModal } from "../../../components/modals/Finance/ChangeClientLimitModal";
import { VendorTopUpModal } from "../../../components/modals/Finance/VendorTopUpModal";
import { VendorPaymentModal } from "../../../components/modals/Finance/VendorPaymentModal";
import { ChangeVendorLimitModal } from "../../../components/modals/Finance/ChangeVendorLimitModal";
import { TransactionHistoryModal } from "../../../components/modals/Finance/TransactionHistoryModal";
import { ManualAdjustmentModal } from "../../../components/modals/Finance/ManualAdjustmentModal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import Select, { type SelectOption } from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import {
  Home,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  Building2,
  SlidersHorizontal,
  History,
} from "lucide-react";

interface ColumnDef {
  key: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "company", label: "Company Name & Category" },
  { key: "prepaidWallet", label: "Prepaid Wallet" },
  { key: "postpaidLimit", label: "Postpaid Limit" },
  { key: "usedCredit", label: "Used Credit" },
  { key: "availableCredit", label: "Available Credit" },
];

const DEFAULT_COLUMN_KEYS = [
  "company",
  "prepaidWallet",
  "postpaidLimit",
  "usedCredit",
  "availableCredit",
];

const CreditPaymentOverviewPage: React.FC = () => {
  const [companies, setCompanies] = useState<AccountOverviewRow[]>([]);
  const [summary, setSummary] = useState<AccountOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

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

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
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

  const fetchCompanies = async (page = currentPage, perPage = rowsPerPage, search = searchName) => {
    setIsLoading(true);
    try {
      const searchParams = search ? { name__icontains: search } : {};
      const res = await getAccountOverviewApi(page, perPage, searchParams);
      setCompanies(res.results || []);
      setTotalItems(res.count || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error("Failed to fetch companies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(1, rowsPerPage, "");
    // Load companies for the dropdown filter using overview endpoint
    getAccountOverviewApi(1, 1000)
      .then((res: any) => {
        const opts = (res.results || []).map((c: any) => ({
          value: c.companyName || c.name,
          label: c.companyName || c.name,
        }));
        setCompanyOptions(opts);
      })
      .catch(() => {
        getCompaniesApi("finance", 1, 1000).then((res: any) => {
          const opts = (res.results || []).map((c: any) => ({
            value: c.name,
            label: c.name,
          }));
          setCompanyOptions(opts);
        });
      })
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

      const sideA = viewMode === "customer" ? a.customer : a.vendor;
      const sideB = viewMode === "customer" ? b.customer : b.vendor;

      const isPrepaidA = (sideA?.mode || a.category || a.categoryName || "").toUpperCase() === "PREPAID";
      const isPrepaidB = (sideB?.mode || b.category || b.categoryName || "").toUpperCase() === "PREPAID";

      const nameA = (a.companyName || a.name || "").toLowerCase();
      const nameB = (b.companyName || b.name || "").toLowerCase();

      const prepaidBalA = Number(sideA?.prepaidBalance ?? 0);
      const prepaidBalB = Number(sideB?.prepaidBalance ?? 0);

      const limitA = Number(sideA?.creditLimit ?? 0);
      const limitB = Number(sideB?.creditLimit ?? 0);

      const usedA = Number(sideA?.usedCredit ?? sideA?.outstanding ?? 0);
      const usedB = Number(sideB?.usedCredit ?? sideB?.outstanding ?? 0);

      const availA = Number(sideA?.availableCredit ?? 0);
      const availB = Number(sideB?.availableCredit ?? 0);

      switch (key) {
        case "company":
          valA = nameA;
          valB = nameB;
          break;
        case "prepaidWallet":
          valA = isPrepaidA ? prepaidBalA : -Infinity;
          valB = isPrepaidB ? prepaidBalB : -Infinity;
          break;
        case "postpaidLimit":
          valA = !isPrepaidA ? limitA : -Infinity;
          valB = !isPrepaidB ? limitB : -Infinity;
          break;
        case "usedCredit":
          valA = !isPrepaidA ? usedA : -Infinity;
          valB = !isPrepaidB ? usedB : -Infinity;
          break;
        case "availableCredit":
          valA = availA;
          valB = availB;
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
    const normalizedCompany = {
      ...company,
      id: company.id || company.companyId,
      companyId: company.companyId || company.id,
      name: company.name || company.companyName,
      companyName: company.companyName || company.name,
    };
    setSelectedCompany(normalizedCompany);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const getMenuItems = (): ContextMenuItem[] => {
    if (!selectedCompany) return [];

    const isPrepaid = (
      selectedCompany.category ||
      selectedCompany.categoryName ||
      selectedCompany.customer?.mode ||
      ""
    ).toUpperCase() === "PREPAID";
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
      label: "Manual Adjustment",
      icon: <SlidersHorizontal size={16} />,
      onClick: () => {
        setContextMenuPos(null);
        setIsAdjustmentOpen(true);
      },
    });

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
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
              Credit & Payments Overview
            </h1>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              Authoritative financial balance management and ledger overview
            </p>
          </div>

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

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 mb-4">
        <StatCard
          title="Postpaid Limit"
          value={Number(summary?.totalPostpaidCreditLimit || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          icon={<CreditCard size={18} />}
        />
        <StatCard
          title="Used Credit"
          value={Number(
            summary?.totalPostpaidUsedCredit || summary?.totalPostpaidOutstanding || 0
          ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<AlertCircle size={18} />}
        />
        <StatCard
          title="Postpaid Avail."
          value={Number(summary?.postpaidAvailableCredit || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          title="Prepaid Balance"
          value={Number(summary?.totalPrepaidAvailableBalance || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          icon={<Wallet size={18} />}
        />
        <StatCard
          title="Monthly Funding"
          value={Number(summary?.clientFundingThisMonth || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          title="Vendor Avail."
          value={Number(summary?.vendorAvailable || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          icon={<Building2 size={18} />}
        />
      </div>

      {/* Filter Card */}
      <FilterCard onSearch={handleSearch} onClear={handleClear}>
        <Select
          label="Search Company Name"
          placeholder="Select a company..."
          value={searchName}
          onChange={(val) => {
            setSearchName(val);
            setCurrentPage(1);
            fetchCompanies(1, rowsPerPage, val);
          }}
          options={companyOptions}
          isLoading={isDropdownLoading}
          allowCustomValue={true}
        />
      </FilterCard>

      {/* Data Table with Sorting & Column Reordering */}
      <DataTable
        headers={headers}
        isLoading={isLoading}
        data={sortedCompanies}
        serverSide={true}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalItems={totalItems}
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
        renderRow={(row: any, index: number) => {
          const side = viewMode === "customer" ? row.customer : row.vendor;
          const isPrepaid =
            (side?.mode || row.category || row.categoryName || "").toUpperCase() === "PREPAID";
          const categoryText = isPrepaid ? "Prepaid" : "Postpaid";

          const prepaidBal = Number(side?.prepaidBalance ?? 0);
          const limit = Number(side?.creditLimit ?? 0);
          const used = Number(side?.usedCredit ?? side?.outstanding ?? 0);
          const available = Number(side?.availableCredit ?? 0);

          return (
            <tr
              key={row.companyId || row.id || index}
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
                      <td
                        key="company"
                        className="px-4 py-2.5 text-sm whitespace-nowrap min-w-[260px]"
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-text-primary dark:text-white">
                            {row.companyName || row.name}
                          </span>
                          <span
                            style={{ marginLeft: "16px" }}
                            className={`shrink-0 ml-4 px-2 py-0.5 text-[11px] font-medium rounded ${
                              isPrepaid
                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400/20"
                                : "bg-purple-50 text-purple-700 ring-1 ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-400/20"
                            }`}
                          >
                            {categoryText}
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
                          limit.toFixed(4)
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                    );
                  case "usedCredit":
                    return (
                      <td
                        key="usedCredit"
                        className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap"
                      >
                        {!isPrepaid ? (
                          used.toFixed(4)
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

      <ManualAdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSuccess={() => fetchCompanies(currentPage, rowsPerPage, searchName)}
        company={selectedCompany}
        accountType={viewMode === "customer" ? "CLIENT" : "VENDOR"}
        defaultAccountType={viewMode === "customer" ? "CLIENT" : "VENDOR"}
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
