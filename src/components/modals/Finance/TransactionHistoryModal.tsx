import React, { useEffect, useState } from "react";
import Modal from "../../ui/Modal";
import DataTable from "../../ui/DataTable";
import { getTransactionHistoryApi } from "../../../api/financeApi/accountTransactionApi";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any | null;
  viewMode: "customer" | "vendor";
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen, onClose, company, viewMode
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && company) {
      fetchHistory();
    }
  }, [isOpen, company, viewMode]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const accountType = viewMode === "customer" ? "CLIENT" : "VENDOR";
      const res = await getTransactionHistoryApi(company.id, accountType);
      setHistory(res.results || res.data || res);
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !company) return null;

  const headers = ["Date", "Type", "Amount / Limit", "Remarks", "Status"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Transaction History - ${company.name}`} className="max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-4">
        <DataTable
          headers={headers}
          isLoading={isLoading}
          data={history}
          renderRow={(row) => {
            const dateObj = new Date(row.transactionDate || row.createdAt);
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : "-";
            const amountVal = Number(row.newLimit) || Number(row.amount) || 0;

            return (
              <tr key={row.id} className="border-b dark:border-gray-700">
                <td className="px-4 py-3 text-sm">{dateStr}</td>
                <td className="px-4 py-3 text-sm">{row.transactionType}</td>
                <td className="px-4 py-3 font-medium text-blue-600">{amountVal.toFixed(4)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{row.remarks || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {row.status}
                  </span>
                </td>
              </tr>
            );
          }}
        />
      </div>
    </Modal>
  );
};
