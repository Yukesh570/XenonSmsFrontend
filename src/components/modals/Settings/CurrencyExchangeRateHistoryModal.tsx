import React, { useState, useEffect, useMemo } from "react";
import { Info } from "lucide-react";
import { toast } from "react-toastify";
import {
  getCurrencyExchangeRateHistoryApi,
  type CurrencyExchangeRateData,
} from "../../../api/settingApi/currencyExchangeRateApi/currencyExchangeRateApi";
import Modal from "../../ui/Modal";
import ModalDataTable from "../../ui/ModalDataTable";
import { StatusBadge } from "../../ui/StatusBadge";
import { formatDateTime } from "../../../helper/dateFormatter";

interface CurrencyExchangeRateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateId: number | null;
  moduleName: string;
}

const DEFAULT_COLUMNS = [
  "version",
  "baseCurrency",
  "targetCurrency",
  "exchangeRate",
  "source",
  "effectiveFrom",
  "effectiveTo",
  "status",
];

const COLUMN_LABELS: Record<string, string> = {
  version: "Version",
  baseCurrency: "Base Currency",
  targetCurrency: "Target Currency",
  exchangeRate: "Exchange Rate",
  source: "Source",
  effectiveFrom: "Effective From",
  effectiveTo: "Effective To",
  status: "Status",
};

export const CurrencyExchangeRateHistoryModal: React.FC<CurrencyExchangeRateHistoryModalProps> = ({
  isOpen,
  onClose,
  rateId,
  moduleName,
}) => {
  const [history, setHistory] = useState<CurrencyExchangeRateData[]>([]);
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
    if (isOpen && rateId) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isOpen, rateId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await getCurrencyExchangeRateHistoryApi(moduleName, rateId!);
      setHistory(response.results || response || []);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to fetch currency history"
      );
    } finally {
      setIsLoading(false);
    }
  };

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
    return [...history].sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "exchangeRate" || sortConfig.key === "version") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortConfig.direction === "asc" ? res : -res;
    });
  }, [history, sortConfig]);

  const renderCell = (colKey: string, rate: any, idx: number) => {
    switch (colKey) {
      case "version":
        return (
          <td key={colKey} className="px-4 py-3 text-text-primary dark:text-gray-100 flex items-center gap-2 whitespace-nowrap">
            {rate.status === "ACTIVE" && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                LATEST
              </span>
            )}
            v{rate.version || idx + 1}
          </td>
        );
      case "baseCurrency":
        return (
          <td key={colKey} className="px-4 py-3 text-text-primary dark:text-gray-100 whitespace-nowrap">
            {rate.baseCurrency_name ? rate.baseCurrency_name : rate.baseCurrency}{" "}
            {rate.baseCurrency_name && (
              <span className="text-gray-400">({rate.baseCurrency})</span>
            )}
          </td>
        );
      case "targetCurrency":
        return (
          <td key={colKey} className="px-4 py-3 text-text-primary dark:text-gray-100 whitespace-nowrap">
            {rate.targetCurrency_name ? rate.targetCurrency_name : rate.targetCurrency}{" "}
            {rate.targetCurrency_name && (
              <span className="text-gray-400">({rate.targetCurrency})</span>
            )}
          </td>
        );
      case "exchangeRate":
        return (
          <td key={colKey} className="px-4 py-3 text-text-primary dark:text-gray-100 font-medium whitespace-nowrap">
            {rate.targetCurrency_symbol ? `${rate.targetCurrency_symbol} ` : ""}
            {rate.exchangeRate}
          </td>
        );
      case "source":
        return (
          <td key={colKey} className="px-4 py-3 text-text-secondary dark:text-gray-400 whitespace-nowrap">
            {rate.source || "-"}
          </td>
        );
      case "effectiveFrom":
        return (
          <td key={colKey} className="px-4 py-3 text-text-secondary dark:text-gray-400 whitespace-nowrap">
            {rate.effectiveFrom ? formatDateTime(rate.effectiveFrom) : "-"}
          </td>
        );
      case "effectiveTo":
        return (
          <td key={colKey} className="px-4 py-3 text-text-secondary dark:text-gray-400 whitespace-nowrap">
            {rate.effectiveTo ? formatDateTime(rate.effectiveTo) : "-"}
          </td>
        );
      case "status":
        return (
          <td key={colKey} className="px-4 py-3 whitespace-nowrap">
            <StatusBadge status={rate.status} />
          </td>
        );
      default:
        return <td key={colKey} className="px-4 py-3 text-text-secondary dark:text-gray-400 whitespace-nowrap">{rate[colKey] || "-"}</td>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Currency Exchange Rate History"
      className="max-w-6xl"
    >
      <div className="mt-4">
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 text-sm text-blue-800 flex items-start gap-2 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p>The highlighted row represents the latest active version. Only the latest version can be edited to trigger an upgrade.</p>
            <p className="mt-1">Right-click a row for view, edit, or delete options.</p>
          </div>
        </div>

        <ModalDataTable
          data={sortedHistory}
          headers={columns.map((c) => COLUMN_LABELS[c] || c)}
          renderRow={(rate, idx) => (
            <tr key={rate.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {columns.map((colKey) => renderCell(colKey, rate, idx))}
            </tr>
          )}
          isLoading={isLoading}
          serverSide={false}
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          sortColumnIndex={sortConfig ? columns.findIndex((c) => c === sortConfig.key) : null}
          sortDirection={sortConfig?.direction || null}
          columnKeys={columns}
          storageKey="currency_exchange_history_modal_table"
          emptyMessage="No history found."
        />
      </div>
    </Modal>
  );
};

export default CurrencyExchangeRateHistoryModal;
