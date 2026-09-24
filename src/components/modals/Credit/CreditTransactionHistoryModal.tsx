import React, { useState, useEffect, useMemo } from "react";
import { getCreditTransactionHistoryApi } from "../../../api/companyApi/companyApi";
import Modal from "../../ui/Modal";
import ModalDataTable from "../../ui/ModalDataTable";
import { format } from "date-fns";

interface CreditTransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number | null;
  moduleName?: string;
}

const DEFAULT_COLUMNS = ["id", "creditType", "creditAmount", "createdAt"];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  creditType: "Type",
  creditAmount: "Amount",
  createdAt: "Date",
};

export const CreditTransactionHistoryModal: React.FC<CreditTransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  companyId,
  moduleName = "company",
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHistory([]);
      setSortConfig(null);
      setColumns(DEFAULT_COLUMNS);
    }
  }, [isOpen]);

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

  const handleSort = (idx: number) => {
    const colKey = columns[idx];
    if (!colKey) return;
    setSortConfig((prev) => {
      if (prev?.key === colKey) {
        if (prev.direction === "asc") return { key: colKey, direction: "desc" };
        return null;
      }
      return { key: colKey, direction: "asc" };
    });
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedHistory = useMemo(() => {
    if (!sortConfig) return history;
    return [...history].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "createdAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortConfig.direction === "asc" ? res : -res;
    });
  }, [history, sortConfig]);

  if (!isOpen) return null;

  const renderCell = (colKey: string, item: any) => {
    switch (colKey) {
      case "id":
        return <td key={colKey} className="px-4 py-3 border-b dark:border-gray-700 text-sm">{item.id}</td>;
      case "creditType":
        return (
          <td key={colKey} className="px-4 py-3 border-b dark:border-gray-700 text-sm">
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
              {item.creditType}
            </span>
          </td>
        );
      case "creditAmount":
        return <td key={colKey} className="px-4 py-3 border-b dark:border-gray-700 text-sm font-medium">{item.creditAmount}</td>;
      case "createdAt":
        return (
          <td key={colKey} className="px-4 py-3 border-b dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy HH:mm") : "-"}
          </td>
        );
      default:
        return <td key={colKey} className="px-4 py-3 border-b dark:border-gray-700 text-sm">{item[colKey] || "-"}</td>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Credit Transaction History"
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <ModalDataTable
          data={sortedHistory}
          headers={columns.map((c) => COLUMN_LABELS[c] || c)}
          renderRow={(item: any, index: number) => (
            <tr
              key={item.id || index}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {columns.map((colKey) => renderCell(colKey, item))}
            </tr>
          )}
          isLoading={isLoading}
          serverSide={false}
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          sortColumnIndex={sortConfig ? columns.findIndex((c) => c === sortConfig.key) : null}
          sortDirection={sortConfig?.direction || null}
          columnKeys={columns}
          storageKey="credit_transaction_history_modal"
          emptyMessage="No credit transaction history found."
        />
      </div>
    </Modal>
  );
};

export default CreditTransactionHistoryModal;
