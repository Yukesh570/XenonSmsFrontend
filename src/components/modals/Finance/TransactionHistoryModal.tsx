import React, { useEffect, useState, useMemo } from "react";
import Modal from "../../ui/Modal";
import DataTable from "../../ui/DataTable";
import Select, { type SelectOption } from "../../ui/Select";
import DatePicker from "../../ui/DatePicker";
import { StatusBadge } from "../../ui/StatusBadge";
import { getTransactionHistoryApi } from "../../../api/financeApi/accountTransactionApi";
import { X } from "lucide-react";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any | null;
  viewMode: "customer" | "vendor";
}

interface ColumnDef {
  key: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount / Limit" },
  { key: "remarks", label: "Remarks" },
  { key: "status", label: "Status" },
];

const DEFAULT_COLUMN_KEYS = ["date", "type", "amount", "remarks", "status"];

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  company,
  viewMode,
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Column reordering & sorting state
  const [tableColumnKeys, setTableColumnKeys] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const visibleColumns = useMemo(() => {
    return tableColumnKeys
      .map((key) => ALL_COLUMNS.find((col) => col.key === key))
      .filter((col): col is ColumnDef => Boolean(col));
  }, [tableColumnKeys]);

  const headers = useMemo(() => {
    return ["S.N.", ...visibleColumns.map((col) => col.label)];
  }, [visibleColumns]);

  useEffect(() => {
    if (isOpen && company) {
      setSortConfig(null);
      setTableColumnKeys(DEFAULT_COLUMN_KEYS);
      fetchHistory();
    } else if (!isOpen) {
      setSelectedType("");
      setSelectedDate(null);
    }
  }, [isOpen, company, viewMode]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const accountType = viewMode === "customer" ? "CLIENT" : "VENDOR";
      const compId = company.id || company.companyId;
      const res = await getTransactionHistoryApi(compId, accountType);
      setHistory(res.results || res.data || res || []);
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1; // Offset for "S.N."
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

  const typeOptions: SelectOption[] = useMemo(() => {
    const rawTypes = history
      .map((r) => r.transactionType)
      .filter((t): t is string => Boolean(t && typeof t === "string"));

    const uniqueTypes = Array.from(new Set(rawTypes));

    return [
      { value: "", label: "All Types" },
      ...uniqueTypes.map((t) => ({
        value: t,
        label: t,
      })),
    ];
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      if (selectedType) {
        const rowType = String(row.transactionType || "").toLowerCase();
        const search = selectedType.toLowerCase().trim();
        if (!rowType.includes(search)) return false;
      }

      if (selectedDate) {
        const rowDate = new Date(row.transactionDate || row.createdAt);
        if (isNaN(rowDate.getTime())) return false;
        const isSameDate =
          rowDate.getFullYear() === selectedDate.getFullYear() &&
          rowDate.getMonth() === selectedDate.getMonth() &&
          rowDate.getDate() === selectedDate.getDate();
        if (!isSameDate) return false;
      }

      return true;
    });
  }, [history, selectedType, selectedDate]);

  const sortedHistory = useMemo(() => {
    if (!sortConfig) return filteredHistory;
    const { key, direction } = sortConfig;

    return [...filteredHistory].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (key) {
        case "date": {
          const timeA = new Date(a.transactionDate || a.createdAt).getTime() || 0;
          const timeB = new Date(b.transactionDate || b.createdAt).getTime() || 0;
          valA = timeA;
          valB = timeB;
          break;
        }
        case "type":
          valA = (a.transactionType || "").toLowerCase();
          valB = (b.transactionType || "").toLowerCase();
          break;
        case "amount": {
          valA = Number(a.newLimit) || Number(a.amount) || 0;
          valB = Number(b.newLimit) || Number(b.amount) || 0;
          break;
        }
        case "remarks":
          valA = (a.remarks || "").toLowerCase();
          valB = (b.remarks || "").toLowerCase();
          break;
        case "status":
          valA = (a.status || "").toLowerCase();
          valB = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredHistory, sortConfig]);

  if (!isOpen || !company) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transaction History - ${company.companyName || company.name || "Company"}`}
      className="max-w-5xl w-full"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-4">
        <DataTable
          headers={headers}
          isLoading={isLoading}
          data={sortedHistory}
          emptyMessage="No transaction history found."
          density="compact"
          onSort={handleSort}
          sortColumnIndex={
            sortConfig
              ? visibleColumns.findIndex((c) => c.key === sortConfig.key) + 1
              : null
          }
          sortDirection={sortConfig?.direction || null}
          onReorderColumns={handleReorderColumns}
          headerActions={
            <div className="flex items-center gap-2">
              <div className="w-36 sm:w-44">
                <Select
                  label=""
                  value={selectedType}
                  onChange={(val) => setSelectedType(val || "")}
                  options={typeOptions}
                  placeholder="Filter Type..."
                  clearable={true}
                  allowCustomValue={true}
                  placement="bottom"
                />
              </div>
              <div className="w-36 sm:w-44">
                <DatePicker
                  label=""
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  placeholder="Filter Date..."
                  isClearable={true}
                />
              </div>
              {(selectedType || selectedDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("");
                    setSelectedDate(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Clear filters"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          }
          renderRow={(row, index) => {
            const dateObj = new Date(row.transactionDate || row.createdAt);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleString()
              : "-";
            const amountVal = Number(row.newLimit) || Number(row.amount) || 0;

            return (
              <tr
                key={row.id || index}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              >
                <td className="px-4 py-2.5 text-sm text-text-primary dark:text-white whitespace-nowrap">
                  {index + 1}
                </td>
                {visibleColumns.map((col) => {
                  switch (col.key) {
                    case "date":
                      return (
                        <td
                          key="date"
                          className="px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                        >
                          {dateStr}
                        </td>
                      );
                    case "type":
                      return (
                        <td
                          key="type"
                          className="px-4 py-2.5 text-sm font-medium text-text-primary dark:text-white whitespace-nowrap"
                        >
                          {row.transactionType || "-"}
                        </td>
                      );
                    case "amount":
                      return (
                        <td
                          key="amount"
                          className="px-4 py-2.5 text-sm font-semibold text-primary dark:text-primary-light whitespace-nowrap"
                        >
                          {amountVal.toFixed(4)}
                        </td>
                      );
                    case "remarks":
                      return (
                        <td
                          key="remarks"
                          className="px-4 py-2.5 text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap"
                        >
                          {row.remarks || "-"}
                        </td>
                      );
                    case "status":
                      return (
                        <td
                          key="status"
                          className="px-4 py-2.5 text-sm whitespace-nowrap"
                        >
                          <StatusBadge status={row.status} />
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
      </div>
    </Modal>
  );
};
