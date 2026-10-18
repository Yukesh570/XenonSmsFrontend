import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getPendingTransactionsApi, verifyTransactionApi } from "../../../api/financeApi/accountTransactionApi";
import DataTable from "../../../components/ui/DataTable";
import Button from "../../../components/ui/Button";

const PendingApprovalsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const fetchPendingTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await getPendingTransactionsApi();
      setTransactions(res.results || res.data || res);
    } catch (error) {
      toast.error("Failed to fetch pending transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  const handleApprove = async (transactionId: number) => {
    setVerifyingId(transactionId);
    try {
      await verifyTransactionApi({ transaction_id: transactionId });
      toast.success("Transaction Approved!");
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    } catch (error) {
      toast.error("Failed to approve transaction.");
    } finally {
      setVerifyingId(null);
    }
  };

  const headers = [
    "Date",
    "Company Name",
    "Transaction Type",
    "Amount / New Limit",
    "Remarks",
    "Actions",
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Pending Approvals</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          headers={headers}
          isLoading={isLoading}
          data={transactions}
          renderRow={(row) => {
            const dateObj = new Date(row.transactionDate);
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : row.transactionDate;
            const amountVal = Number(row.newLimit) || Number(row.amount) || 0;

            return (
              <tr key={row.id} className="border-b dark:border-gray-700">
                <td className="px-4 py-3 text-sm">{dateStr}</td>
                <td className="px-4 py-3 font-semibold">{row.companyName || row.company_name || `Company ID: ${row.company}`}</td>
                <td className="px-4 py-3 text-sm">{row.transactionType}</td>
                <td className="px-4 py-3 font-medium text-blue-600">{amountVal.toFixed(4)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{row.remarks || "-"}</td>
                <td className="px-4 py-3">
                  <Button 
                    size="sm" 
                    variant="primary" 
                    onClick={() => handleApprove(row.id)}
                    disabled={verifyingId === row.id}
                  >
                    {verifyingId === row.id ? "Approving..." : "Approve"}
                  </Button>
                </td>
              </tr>
            );
          }}
        />
      </div>
    </div>
  );
};

export default PendingApprovalsPage;
