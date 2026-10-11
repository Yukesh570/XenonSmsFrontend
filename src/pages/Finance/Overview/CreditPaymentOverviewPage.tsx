import React, { useEffect, useState } from "react";
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

const CreditPaymentOverviewPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const searchParams = searchName ? { name__icontains: searchName } : {};
      const res = await getCompaniesApi("finance", 1, 100, searchParams);
      setCompanies(res.results || []);
    } catch (error) {
      toast.error("Failed to fetch companies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // Load companies for the dropdown filter
    getCompaniesApi("finance", 1, 1000).then(res => {
      const opts = (res.results || []).map((c: any) => ({
        value: c.name,
        label: c.name
      }));
      setCompanyOptions(opts);
    }).finally(() => {
      setIsDropdownLoading(false);
    });
  }, []);

  const [viewMode, setViewMode] = useState<"customer" | "vendor">("customer");

  const headers = [
    "Company Name & Category",
    "Prepaid Wallet",
    "Postpaid Limit",
    "Outstanding Debt",
    "Available Credit",
  ];

  const handleContextMenu = (e: React.MouseEvent, company: any) => {
    e.preventDefault();
    setSelectedCompany(company);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const getMenuItems = (): ContextMenuItem[] => {
    if (!selectedCompany) return [];
    
    const isPrepaid = selectedCompany.categoryName && selectedCompany.categoryName.toUpperCase() === "PREPAID";
    const items: ContextMenuItem[] = [];

    if (viewMode === "vendor") {
      if (isPrepaid) {
        items.push({
          label: "Vendor Top-Up",
          onClick: () => { setContextMenuPos(null); setIsVendorTopUpOpen(true); },
        });
      } else {
        items.push({
          label: "Vendor Payment",
          onClick: () => { setContextMenuPos(null); setIsVendorPaymentOpen(true); },
        });
        items.push({
          label: "Change Vendor Limit",
          onClick: () => { setContextMenuPos(null); setIsVendorLimitOpen(true); },
        });
      }
    } else {
      if (isPrepaid) {
        items.push({
          label: "Client Top-Up",
          onClick: () => { setContextMenuPos(null); setIsTopUpOpen(true); },
        });
      } else {
        items.push({
          label: "Receive Payment",
          onClick: () => { setContextMenuPos(null); setIsPaymentOpen(true); },
        });
        items.push({
          label: "Change Client Limit",
          onClick: () => { setContextMenuPos(null); setIsLimitOpen(true); },
        });
      }
    }

    items.push({
      label: "View History",
      onClick: () => { setContextMenuPos(null); setIsHistoryOpen(true); },
    });

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div className="p-6 h-full" onClick={() => setContextMenuPos(null)}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Credit & Payments Overview</h1>
        
        <div className="flex rounded-md shadow-sm" role="group">
          <button 
            type="button" 
            onClick={() => setViewMode("customer")}
            className={`px-4 py-2 text-sm font-medium border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600 ${viewMode === "customer" ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white" : "bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-300"}`}
          >
            Customer View
          </button>
          <button 
            type="button" 
            onClick={() => setViewMode("vendor")}
            className={`px-4 py-2 text-sm font-medium border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600 ${viewMode === "vendor" ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white" : "bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-300"}`}
          >
            Vendor View
          </button>
        </div>
      </div>

      <FilterCard 
        onSearch={fetchCompanies} 
        onClear={() => {
          setSearchName("");
          // Note: State updates are async, so we manually pass {} here
          getCompaniesApi("finance", 1, 100, {}).then(res => {
            setCompanies(res.results || []);
          });
        }}
      >
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          headers={headers}
          isLoading={isLoading}
          data={companies}
          renderRow={(row) => {
            const isPrepaid = row.categoryName && row.categoryName.toUpperCase() === "PREPAID";
            
            const prepaidBal = viewMode === "customer" ? Number(row.prepaidCustomerBalance || 0) : Number(row.prepaidVendorBalance || 0);
            const postpaidLimit = viewMode === "customer" ? Number(row.customerCreditLimit || 0) : Number(row.vendorCreditLimit || 0);
            const outstanding = viewMode === "customer" ? Number(row.outstandingCustomerCredit || 0) : Number(row.outstandingVendorCredit || 0);

            const available = isPrepaid ? prepaidBal : (postpaidLimit - outstanding);

            return (
              <tr 
                key={row.id} 
                className="border-b dark:border-gray-700 cursor-context-menu hover:bg-gray-50 dark:hover:bg-gray-700"
                onContextMenu={(e) => handleContextMenu(e, row)}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-semibold">{row.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${isPrepaid ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10' : 'bg-purple-50 text-purple-700 ring-1 ring-purple-700/10'}`}>
                      {row.categoryName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isPrepaid ? prepaidBal.toFixed(4) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3">
                  {!isPrepaid ? postpaidLimit.toFixed(4) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3 text-red-500">
                  {!isPrepaid ? outstanding.toFixed(4) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3 font-medium text-emerald-600">
                  {available.toFixed(4)}
                </td>
              </tr>
            );
          }}
        />
      </div>

      <ContextMenu position={contextMenuPos} items={menuItems} onClose={() => setContextMenuPos(null)} />

      <ClientTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={fetchCompanies}
        company={selectedCompany}
      />
      <ClientPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={fetchCompanies}
        company={selectedCompany}
      />
      <ChangeClientLimitModal
        isOpen={isLimitOpen}
        onClose={() => setIsLimitOpen(false)}
        onSuccess={fetchCompanies}
        company={selectedCompany}
      />

      <VendorTopUpModal
        isOpen={isVendorTopUpOpen}
        onClose={() => setIsVendorTopUpOpen(false)}
        onSuccess={fetchCompanies}
        company={selectedCompany}
      />
      <VendorPaymentModal
        isOpen={isVendorPaymentOpen}
        onClose={() => setIsVendorPaymentOpen(false)}
        onSuccess={fetchCompanies}
        company={selectedCompany}
      />
      <ChangeVendorLimitModal
        isOpen={isVendorLimitOpen}
        onClose={() => setIsVendorLimitOpen(false)}
        onSuccess={fetchCompanies}
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
