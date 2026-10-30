import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  FileText,
  Building2,
  Calendar,
  Wallet,
  DollarSign,
} from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import DataTable from "../../ui/DataTable";
import {
  downloadSOAPDFApi,
  downloadSOAExcelApi,
} from "../../../api/financeApi/soaApi";
import type {
  SOAResponseData,
  SOARequestPayload,
} from "../../../api/financeApi/soaApi";

interface SOAPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  soaData: SOAResponseData | null;
  requestPayload: SOARequestPayload | null;
}

type SortableColumnKey =
  | "date"
  | "reference"
  | "description"
  | "debit"
  | "credit"
  | "balance";

const COLUMN_INDEX_TO_KEY: Record<number, SortableColumnKey> = {
  1: "date",
  2: "reference",
  3: "description",
  4: "debit",
  5: "credit",
  6: "balance",
};

export const SOAPreviewModal: React.FC<SOAPreviewModalProps> = ({
  isOpen,
  onClose,
  soaData,
  requestPayload,
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [sortConfig, setSortConfig] = useState<{
    key: SortableColumnKey;
    direction: "asc" | "desc";
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSortConfig(null);
    }
  }, [isOpen]);

  const currency = soaData?.currency || "USD";
  const isVendor = soaData?.accountType === "VENDOR" || requestPayload?.accountType === "VENDOR";

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleDownloadPDF = async () => {
    if (!requestPayload || !soaData) return;
    try {
      setIsExportingPDF(true);
      const blob = await downloadSOAPDFApi(requestPayload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const prefix = isVendor ? "SOA_Vendor_" : "SOA_";
      a.download = `${prefix}${soaData.company.name.replace(/\s+/g, "_")}_${requestPayload.fromDate}_${requestPayload.toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF statement downloaded successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to download PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!requestPayload || !soaData) return;
    try {
      setIsExportingExcel(true);
      const blob = await downloadSOAExcelApi(requestPayload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const prefix = isVendor ? "SOA_Vendor_" : "SOA_";
      a.download = `${prefix}${soaData.company.name.replace(/\s+/g, "_")}_${requestPayload.fromDate}_${requestPayload.toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel statement downloaded successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to download Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSort = (colIndex: number) => {
    const key = COLUMN_INDEX_TO_KEY[colIndex];
    if (!key) return;

    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null; // toggle sort off
      }
      return { key, direction: "asc" };
    });
  };

  const sortColumnIndex = useMemo(() => {
    if (!sortConfig) return null;
    const entry = Object.entries(COLUMN_INDEX_TO_KEY).find(
      ([, k]) => k === sortConfig.key
    );
    return entry ? Number(entry[0]) : null;
  }, [sortConfig]);

  const sortedItems = useMemo(() => {
    if (!soaData?.items) return [];
    if (!sortConfig) return soaData.items;

    const { key, direction } = sortConfig;
    return [...soaData.items].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (key) {
        case "date": {
          const timeA = a.rawDate
            ? new Date(a.rawDate).getTime()
            : new Date(a.date).getTime();
          const timeB = b.rawDate
            ? new Date(b.rawDate).getTime()
            : new Date(b.date).getTime();
          valA = isNaN(timeA) ? 0 : timeA;
          valB = isNaN(timeB) ? 0 : timeB;
          break;
        }
        case "reference":
          valA = (a.reference || "").toLowerCase();
          valB = (b.reference || "").toLowerCase();
          break;
        case "description":
          valA = (a.description || "").toLowerCase();
          valB = (b.description || "").toLowerCase();
          break;
        case "debit":
          valA = Number(a.debit || 0);
          valB = Number(b.debit || 0);
          break;
        case "credit":
          valA = Number(a.credit || 0);
          valB = Number(b.credit || 0);
          break;
        case "balance":
          valA = Number(a.balance || 0);
          valB = Number(b.balance || 0);
          break;
        default:
          return 0;
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [soaData?.items, sortConfig]);

  const tableRows = useMemo(() => {
    if (!soaData) return [];
    const rows: any[] = [
      {
        id: "__OPENING__",
        isOpening: true,
        balance: soaData.openingBalance,
      },
    ];

    if (sortedItems.length === 0) {
      rows.push({
        id: "__EMPTY__",
        isEmptyMessage: true,
      });
    } else {
      rows.push(...sortedItems);
    }

    return rows;
  }, [soaData, sortedItems]);

  if (!isOpen || !soaData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isVendor ? "Vendor Statement of Account" : "Statement of Account"}
      className="max-w-6xl w-full"
    >
      <div className="space-y-4">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Client Company */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                {isVendor ? "Vendor Company" : "Client Company"}
              </span>
              <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0">
                <Building2 size={16} />
              </div>
            </div>
            <div>
              <h3
                className="text-sm font-bold text-text-primary dark:text-white truncate"
                title={soaData.company.name}
              >
                {soaData.company.name}
              </h3>
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                Currency: <span className="font-semibold text-primary">{currency}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Statement Period */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                Statement Period
              </span>
              <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0">
                <Calendar size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary dark:text-white truncate">
                {soaData.statementPeriod.formatted}
              </h3>
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                Statement Range
              </p>
            </div>
          </div>

          {/* Card 3: Opening Balance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                Opening Balance
              </span>
              <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0">
                <Wallet size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary dark:text-white whitespace-nowrap">
                {currency} {formatMoney(soaData.openingBalance)}
              </h3>
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                Prior to {soaData.statementPeriod.fromDate}
              </p>
            </div>
          </div>

          {/* Card 4: Closing Balance (Due) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm flex flex-col justify-between h-[96px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                {isVendor
                ? (soaData.closingBalance >= 0 ? "Closing Balance (Payable)" : "Closing Balance (Advance)")
                : (soaData.closingBalance > 0 ? "Closing Balance (Due)" : "Closing Balance (Credit)")}
              </span>
              <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0">
                <DollarSign size={16} />
              </div>
            </div>
            <div>
              <h3
                className={`text-sm font-bold whitespace-nowrap ${
                  soaData.closingBalance > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {currency} {formatMoney(soaData.closingBalance)}
              </h3>
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                Net: <span className="font-medium text-text-primary dark:text-gray-200">{currency} {formatMoney(soaData.netMovement)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Table with Sorting */}
        <DataTable
          headers={[
            "S.N.",
            "Date",
            "Reference",
            "Description",
            "Debit (+)",
            "Credit (-)",
            "Balance",
          ]}
          data={tableRows}
          density="compact"
          hideTopBar={true}
          rowsPerPage={1000}
          tableMaxHeight="52vh"
          onSort={handleSort}
          sortColumnIndex={sortColumnIndex}
          sortDirection={sortConfig?.direction || null}
          storageKey="soa_statement_preview_table_v4"
          defaultColumnWidths={{
            "S.N.": 54,
            Date: 120,
            Reference: 160,
            Description: 280,
            "Debit (+)": 110,
            "Credit (-)": 110,
            Balance: 130,
          }}
          renderRow={(item: any, index: number) => {
            if (item.isOpening) {
              return (
                <tr
                  key="__OPENING__"
                  className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 font-medium text-xs"
                >
                  <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
                  <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
                  <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
                  <td className="px-3 py-2 text-left text-xs font-semibold text-text-primary dark:text-white">
                    Opening Balance
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-text-secondary dark:text-gray-500">—</td>
                  <td className="px-3 py-2 text-right text-xs text-text-secondary dark:text-gray-500">—</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-text-primary dark:text-white">
                    {currency} {formatMoney(soaData.openingBalance)}
                  </td>
                </tr>
              );
            }

            if (item.isEmptyMessage) {
              return (
                <tr key="__EMPTY__">
                  <td
                    colSpan={7}
                    className="py-8 text-center text-text-secondary dark:text-gray-400 italic text-xs"
                  >
                    No invoices or payments found for the selected date range.
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={item.id || index}
                className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-xs"
              >
                <td className="px-3 py-2 text-center text-xs font-medium text-text-secondary dark:text-gray-400">
                  {index}
                </td>
                <td className="px-3 py-2 text-center text-xs whitespace-nowrap text-text-secondary dark:text-gray-300">
                  {item.date}
                </td>
                <td className="px-3 py-2 text-center text-xs whitespace-nowrap font-mono font-medium text-primary dark:text-primary-light">
                  {item.reference}
                </td>
                <td className="px-3 py-2 text-left text-xs text-text-primary dark:text-white">
                  {item.description}
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium">
                  {item.debit != null && item.debit > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {formatMoney(item.debit)}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium">
                  {item.credit != null && item.credit > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatMoney(item.credit)}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-xs font-bold text-text-primary dark:text-white">
                  {formatMoney(item.balance)}
                </td>
              </tr>
            );
          }}
          footerContent={
            <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600 text-xs">
              <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
              <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
              <td className="px-3 py-2 text-center text-xs text-text-secondary dark:text-gray-500">—</td>
              <td className="px-3 py-2 text-left text-xs uppercase text-text-primary dark:text-white tracking-wider font-bold">
                Closing Balance
              </td>
              <td className="px-3 py-2 text-right text-xs text-rose-600 dark:text-rose-400 font-bold">
                {formatMoney(soaData.totalDebits)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {formatMoney(soaData.totalCredits)}
              </td>
              <td
                className={`px-3 py-2 text-right text-xs font-bold ${
                  soaData.closingBalance > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {currency} {formatMoney(soaData.closingBalance)}
              </td>
            </tr>
          }
        />

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-text-secondary dark:text-gray-400">
            {isVendor
              ? "Debits increase payable to vendor; Credits decrease payable to vendor."
              : "Debits increase amount owed; Credits decrease amount owed."}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              isLoading={isExportingExcel}
              leftIcon={<FileSpreadsheet size={15} />}
            >
              Download Excel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              isLoading={isExportingPDF}
              leftIcon={<FileText size={15} />}
            >
              Download PDF Statement
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
