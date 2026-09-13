import React, { useState, useEffect } from "react";
import { getCreditTransactionHistoryApi } from "../../../api/companyApi/companyApi";
import Modal from "../../ui/Modal";
import DataTable from "../../ui/DataTable";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { format } from "date-fns";

interface CreditTransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number | null;
  moduleName?: string;
}

export const CreditTransactionHistoryModal: React.FC<CreditTransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  companyId,
  moduleName = "company",
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      setIsLoading(true);
      getCreditTransactionHistoryApi(moduleName, companyId)
        .then((res: any) => {
          setHistory(res.results || res || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, companyId, moduleName]);


  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Credit Transaction History"
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSpinner className="p-8" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <DataTable
              data={history}
              headers={["ID", "Type", "Amount", "Date"]}
              renderRow={(item: any, index: number) => (
                <tr
                  key={item.id || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-4 py-3 border-b dark:border-gray-700 text-sm">{item.id}</td>
                  <td className="px-4 py-3 border-b dark:border-gray-700 text-sm">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                      {item.creditType}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b dark:border-gray-700 text-sm font-medium">
                    {item.creditAmount}
                  </td>
                  <td className="px-4 py-3 border-b dark:border-gray-700 text-sm text-gray-500">
                    {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
                  </td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
