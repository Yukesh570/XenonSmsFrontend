import React, { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
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

export const SOAPreviewModal: React.FC<SOAPreviewModalProps> = ({
  isOpen,
  onClose,
  soaData,
  requestPayload,
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  if (!isOpen || !soaData) return null;

  const currency = soaData.currency || "USD";

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleDownloadPDF = async () => {
    if (!requestPayload) return;
    try {
      setIsExportingPDF(true);
      const blob = await downloadSOAPDFApi(requestPayload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOA_${soaData.company.name.replace(/\s+/g, "_")}_${requestPayload.fromDate}_${requestPayload.toDate}.pdf`;
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
    if (!requestPayload) return;
    try {
      setIsExportingExcel(true);
      const blob = await downloadSOAExcelApi(requestPayload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOA_${soaData.company.name.replace(/\s+/g, "_")}_${requestPayload.fromDate}_${requestPayload.toDate}.xlsx`;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Statement of Account"
      className="max-w-5xl"
    >
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <label className="block text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">
              Client Company
            </label>
            <p className="text-sm font-bold text-text-primary dark:text-white truncate">
              {soaData.company.name}
            </p>
            <span className="text-xs text-text-secondary dark:text-gray-400">
              Currency: <strong className="text-primary">{currency}</strong>
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <label className="block text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">
              Statement Period
            </label>
            <p className="text-sm font-bold text-text-primary dark:text-white">
              {soaData.statementPeriod.formatted}
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <label className="block text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">
              Opening Balance
            </label>
            <p className="text-sm font-bold text-text-primary dark:text-white">
              {currency} {formatMoney(soaData.openingBalance)}
            </p>
            <span className="text-xs text-text-secondary dark:text-gray-400">
              Prior to {soaData.statementPeriod.fromDate}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <label className="block text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
              Closing Balance (Due)
            </label>
            <p
              className={`text-base font-bold ${
                soaData.closingBalance > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {currency} {formatMoney(soaData.closingBalance)}
            </p>
            <span className="text-[11px] text-text-secondary dark:text-gray-400">
              Net: {currency} {formatMoney(soaData.netMovement)}
            </span>
          </div>
        </div>

        {/* Statement Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase text-[11px] font-semibold tracking-wider border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">S.N.</th>
                  <th className="py-2.5 px-3 text-center w-28">Date</th>
                  <th className="py-2.5 px-3 text-center w-36">Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right w-28">Debit (+)</th>
                  <th className="py-2.5 px-3 text-right w-28">Credit (-)</th>
                  <th className="py-2.5 px-3 text-right w-32">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {/* Opening Balance Row */}
                <tr className="bg-gray-50/70 dark:bg-gray-800/40 font-medium">
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-white">
                    Opening Balance
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-right font-bold text-text-primary dark:text-white">
                    {currency} {formatMoney(soaData.openingBalance)}
                  </td>
                </tr>

                {/* Transaction Entries */}
                {soaData.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-medium text-text-secondary dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap text-text-secondary dark:text-gray-300">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-medium text-text-primary dark:text-white">
                      {item.reference}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary dark:text-white">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      {item.debit ? formatMoney(item.debit) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {item.credit ? formatMoney(item.credit) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-text-primary dark:text-white">
                      {formatMoney(item.balance)}
                    </td>
                  </tr>
                ))}

                {/* Empty state */}
                {soaData.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No invoices or payments found for the selected date range.
                    </td>
                  </tr>
                )}

                {/* Closing Balance Row */}
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                  <td className="py-2.5 px-3 uppercase text-text-primary dark:text-white tracking-wider">
                    Closing Balance
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                    {formatMoney(soaData.totalDebits)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    {formatMoney(soaData.totalCredits)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-extrabold text-sm ${
                      soaData.closingBalance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {currency} {formatMoney(soaData.closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-text-secondary dark:text-gray-400">
            Debits increase amount owed; Credits decrease amount owed.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} />
              Download Excel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5"
            >
              <FileText size={15} />
              Download PDF Statement
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
