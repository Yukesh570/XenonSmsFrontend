import React, { useEffect, useState } from "react";
import Modal from "../../ui/Modal";
import DataTable from "../../ui/DataTable";
import DatePicker from "../../ui/DatePicker";
import { getAccountStatementApi } from "../../../api/financeApi/accountTransactionApi";
import { formatDateTime } from "../../../helper/dateFormatter";
import { RefreshCw } from "lucide-react";

interface StatementOfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any | null;
  viewMode?: "customer" | "vendor";
}

export const StatementOfAccountModal: React.FC<StatementOfAccountModalProps> = ({
  isOpen,
  onClose,
  company,
  viewMode = "customer",
}) => {
  const [statementData, setStatementData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fetchStatement = async () => {
    if (!company) return;
    setIsLoading(true);
    try {
      const companyId = company.id || company.companyId;
      const accountType = viewMode === "customer" ? "CLIENT" : "VENDOR";
      const params: any = { companyId, accountType };
      if (fromDate) {
        params.fromDate = fromDate.toISOString().split("T")[0];
      }
      if (toDate) {
        params.toDate = toDate.toISOString().split("T")[0] + " 23:59:59";
      }
      const data = await getAccountStatementApi(params);
      setStatementData(data);
    } catch (error) {
      console.error("Failed to fetch statement of account", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && company) {
      fetchStatement();
    } else if (!isOpen) {
      setStatementData(null);
      setFromDate(null);
      setToDate(null);
    }
  }, [isOpen, company, viewMode]);

  if (!isOpen || !company) return null;

  const rows = statementData?.statementRows || [];
  const currency = statementData?.currency || "USD";
  const category = statementData?.category || "POSTPAID";
  const isPrepaid = category.toUpperCase() === "PREPAID";

  const headers = [
    "Date & Time",
    "Reference",
    "Description",
    `Debit (${currency})`,
    `Credit (${currency})`,
    `Running Balance (${currency})`,
    "Status",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Statement of Account - ${company.companyName || company.name} (${viewMode === "customer" ? "Client" : "Vendor"})`}
      className="max-w-6xl w-full"
    >
      <div className="space-y-4 mt-2">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">Category</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{category}</span>
          </div>
          {isPrepaid ? (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Prepaid Balance</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {Number(statementData?.currentPrepaidBalance || 0).toFixed(4)} {currency}
              </span>
            </div>
          ) : (
            <>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Credit Limit</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {Number(statementData?.creditLimit || 0).toFixed(4)} {currency}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Outstanding Debt</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {Number(statementData?.currentOutstanding || 0).toFixed(4)} {currency}
                </span>
              </div>
            </>
          )}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">Net Ledger Balance</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {Number(statementData?.closingBalance || 0).toFixed(4)} {currency}
            </span>
          </div>
        </div>

        {/* Date Filters & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36 sm:w-44">
              <DatePicker
                label=""
                selected={fromDate}
                onChange={(d) => setFromDate(d)}
                placeholder="From Date..."
                isClearable={true}
              />
            </div>
            <span className="text-gray-400 text-xs">to</span>
            <div className="w-36 sm:w-44">
              <DatePicker
                label=""
                selected={toDate}
                onChange={(d) => setToDate(d)}
                placeholder="To Date..."
                isClearable={true}
              />
            </div>
            <button
              type="button"
              onClick={fetchStatement}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Apply
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total Statement Records: <span className="font-semibold text-gray-800 dark:text-gray-200">{rows.length}</span>
          </div>
        </div>

        {/* Statement Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          <DataTable
            headers={headers}
            isLoading={isLoading}
            data={rows}
            emptyMessage="No statement transactions found for the selected period."
            renderRow={(row: any) => {
              const debitVal = row.debit !== null && row.debit !== undefined ? Number(row.debit).toFixed(4) : "-";
              const creditVal = row.credit !== null && row.credit !== undefined ? Number(row.credit).toFixed(4) : "-";
              const balanceVal = Number(row.runningBalance || 0).toFixed(4);

              return (
                <tr key={row.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                    {row.date ? formatDateTime(row.date) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                    {row.referenceNo}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-800 dark:text-gray-200">
                    {row.description}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
                    {debitVal}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {creditVal}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 dark:text-white">
                    {balanceVal}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300">
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
