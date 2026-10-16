import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
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
// import { StatementOfAccountModal } from "../../../components/modals/Finance/StatementOfAccountModal";
import ContextMenu, { type ContextMenuItem } from "../../../components/ui/ContextMenu";
import DataTable from "../../../components/ui/DataTable";
import FilterCard from "../../../components/ui/FilterCard";
import Select, { type SelectOption } from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  Building2,
  SlidersHorizontal,
  History
} from "lucide-react";

const CreditPaymentOverviewPage: React.FC = () => {
  const [companies, setCompanies] = useState<AccountOverviewRow[]>([]);
  const [summary, setSummary] = useState<AccountOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // Modals state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLimitOpen, setIsLimitOpen] = useState(false);

  const [isVendorTopUpOpen, setIsVendorTopUpOpen] = useState(false);
  const [isVendorPaymentOpen, setIsVendorPaymentOpen] = useState(false);
  const [isVendorLimitOpen, setIsVendorLimitOpen] = useState(false);

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  // const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [searchName, setSearchName] = useState("");
  const [companyOptions, setCompanyOptions] = useState<SelectOption[]>([]);
  const [isDropdownLoading, setIsDropdownLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"customer" | "vendor">("customer");

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
    getAccountOverviewApi(1, 1000).then((res: any) => {
      const opts = (res.results || []).map((c: any) => ({
        value: c.companyName || c.name,
        label: c.companyName || c.name,
      }));
      setCompanyOptions(opts);
    }).catch(() => {
      getCompaniesApi("finance", 1, 1000).then((res: any) => {
        const opts = (res.results || []).map((c: any) => ({
          value: c.name,
          label: c.name,
        }));
        setCompanyOptions(opts);
      });
    }).finally(() => {
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

  const headers = [
    "Company Name & Category",
    "Prepaid Wallet",
    "Postpaid Limit",
    "Outstanding Debt",
    "Available Credit",
  ];

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

    // items.push({
    //   label: "Statement of Account",
    //   onClick: () => { setContextMenuPos(null); setIsStatementOpen(true); },
    // });

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
    <div className="p-6 h-full space-y-6" onClick={() => setContextMenuPos(null)}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Credit & Payments Overview</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Authoritative financial balance management and ledger overview
          </p>
        </div>

        <div className="flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setViewMode("customer")}
            className={`px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors focus:z-10 ${viewMode === "customer"
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
          >
            Customer View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("vendor")}
            className={`px-4 py-2 text-sm font-medium border rounded-r-md transition-colors focus:z-10 ${viewMode === "vendor"
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
          >
            Vendor View
          </button>
        </div>
      </div>

      {/* Summary Cards Grid (Section 8.1 / E.2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Postpaid Credit Limit"
          value={Number(summary?.totalPostpaidCreditLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<CreditCard size={18} className="text-blue-600 dark:text-blue-400" />}
        />
        <StatCard
          title="Postpaid Outstanding"
          value={Number(summary?.totalPostpaidOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<AlertCircle size={18} className="text-rose-600 dark:text-rose-400" />}
        />
        <StatCard
          title="Postpaid Available"
          value={Number(summary?.postpaidAvailableCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />
        <StatCard
          title="Prepaid Usable Balance"
          value={Number(summary?.totalPrepaidAvailableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<Wallet size={18} className="text-cyan-600 dark:text-cyan-400" />}
        />
        <StatCard
          title="Funding This Month"
          value={Number(summary?.clientFundingThisMonth || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<ArrowUpRight size={18} className="text-purple-600 dark:text-purple-400" />}
        />
        <StatCard
          title="Vendor Available"
          value={Number(summary?.vendorAvailable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />}
        />
      </div>

      <FilterCard
        onSearch={handleSearch}
        onClear={handleClear}
      >
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          headers={headers}
          isLoading={isLoading}
          data={companies}
          serverSide={true}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          renderRow={(row: any) => {
            const side = viewMode === "customer" ? row.customer : row.vendor;
            const isPrepaid = (side?.mode || row.category || row.categoryName || "").toUpperCase() === "PREPAID";

            return (
              <tr
                key={row.companyId || row.id}
                className="border-b dark:border-gray-700 cursor-context-menu hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onContextMenu={(e) => handleContextMenu(e, row)}
              >
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{row.companyName || row.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${isPrepaid
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/20"
                      : "bg-purple-50 text-purple-700 ring-1 ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-500/20"
                      }`}>
                      {row.category || row.categoryName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {isPrepaid ? Number(side?.prepaidBalance ?? 0).toFixed(4) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-medium">
                  {!isPrepaid ? Number(side?.creditLimit ?? 0).toFixed(4) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
                </td>
                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">
                  {!isPrepaid ? Number(side?.outstanding ?? 0).toFixed(4) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                  {Number(side?.availableCredit ?? 0).toFixed(4)}
                </td>
              </tr>
            );
          }}
        />
      </div>

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

      {/* <StatementOfAccountModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        company={selectedCompany}
        viewMode={viewMode}
      /> */}

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
