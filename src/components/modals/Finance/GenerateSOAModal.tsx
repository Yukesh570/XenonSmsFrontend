import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FileText,
  DollarSign,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import DatePicker from "../../ui/DatePicker";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";
import {
  getCompanySOAMetaApi,
  generateSOAPreviewApi,
  downloadSOAPDFApi,
  downloadSOAExcelApi,
} from "../../../api/financeApi/soaApi";
import type {
  SOARequestPayload,
  SOAResponseData,
} from "../../../api/financeApi/soaApi";

interface GenerateSOAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewSuccess: (data: SOAResponseData, payload: SOARequestPayload) => void;
  accountType?: "CLIENT" | "VENDOR";
}

interface Option {
  label: string;
  value: string;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const GenerateSOAModal: React.FC<GenerateSOAModalProps> = ({
  isOpen,
  onClose,
  onPreviewSuccess,
  accountType = "CLIENT",
}) => {
  const [companyId, setCompanyId] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(1); // Default: 1st day of current month
    return d;
  });
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const [currency, setCurrency] = useState<string>("USD");
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  const [includeInvoices, setIncludeInvoices] = useState<boolean>(true);
  const [includePayments, setIncludePayments] = useState<boolean>(true);
  const [includeCreditNotes, setIncludeCreditNotes] = useState<boolean>(true);

  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Load Companies
  useEffect(() => {
    if (isOpen) {
      getCompaniesApi("company", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setCompanyOptions(
            list.map((c: any) => ({ label: c.name, value: String(c.id) }))
          );
        })
        .catch(() => console.error("Failed to load companies"));
    }
  }, [isOpen]);

  // When company or fromDate changes, auto-fetch currency and opening balance
  useEffect(() => {
    if (!companyId) {
      setCurrency("USD");
      setOpeningBalance(null);
      return;
    }

    const fromDateStr = fromDate ? formatLocalDate(fromDate) : undefined;
    setIsLoadingMeta(true);
    getCompanySOAMetaApi(Number(companyId), fromDateStr, accountType)
      .then((res) => {
        setCurrency(res.currency || "USD");
        setOpeningBalance(res.openingBalance);
      })
      .catch((err) => {
        console.error("Failed to fetch SOA company metadata", err);
      })
      .finally(() => {
        setIsLoadingMeta(false);
      });
  }, [companyId, fromDate, accountType]);

  const validatePayload = (): SOARequestPayload | null => {
    if (!companyId) {
      toast.error("Please select a company.");
      return null;
    }
    if (!fromDate) {
      toast.error("Please select a start date.");
      return null;
    }
    if (!toDate) {
      toast.error("Please select an end date.");
      return null;
    }
    if (fromDate > toDate) {
      toast.error("Start date cannot be after end date.");
      return null;
    }

    return {
      companyId: Number(companyId),
      fromDate: formatLocalDate(fromDate),
      toDate: formatLocalDate(toDate),
      includeInvoices,
      includePayments,
      includeCreditNotes,
      accountType,
    };
  };

  const handleGeneratePreview = async () => {
    const payload = validatePayload();
    if (!payload) return;

    try {
      setIsGenerating(true);
      const data = await generateSOAPreviewApi(payload);
      onPreviewSuccess(data, payload);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to generate statement preview."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    const payload = validatePayload();
    if (!payload) return;

    try {
      setIsExportingPDF(true);
      const blob = await downloadSOAPDFApi(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const prefix = accountType === "VENDOR" ? "SOA_Vendor_Statement_" : "SOA_Statement_";
      a.download = `${prefix}${payload.fromDate}_${payload.toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF statement downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to download PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    const payload = validatePayload();
    if (!payload) return;

    try {
      setIsExportingExcel(true);
      const blob = await downloadSOAExcelApi(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const prefix = accountType === "VENDOR" ? "SOA_Vendor_Statement_" : "SOA_Statement_";
      a.download = `${prefix}${payload.fromDate}_${payload.toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel statement downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to download Excel.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={accountType === "VENDOR" ? "Generate Vendor Statement of Account (SOA)" : "Generate Statement of Account (SOA)"}
    >
      <div className="space-y-5">
        {/* Company Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Select Company <span className="text-red-500">*</span>
          </label>
          <Select
            options={companyOptions}
            value={companyId}
            onChange={(val) => setCompanyId(String(val))}
            placeholder={accountType === "VENDOR" ? "Choose vendor company..." : "Choose client company..."}
          />
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <DatePicker
              label="Statement From *"
              selected={fromDate}
              onChange={(d: Date | null) => setFromDate(d)}
              placeholder="Start date"
            />
          </div>
          <div>
            <DatePicker
              label="Statement To *"
              selected={toDate}
              onChange={(d: Date | null) => setToDate(d)}
              placeholder="End date"
            />
          </div>
        </div>

        {/* Currency & Opening Balance (Read-only / Auto-filled) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Billing Currency
            </span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-200">
              <DollarSign size={16} className="text-primary" />
              <span>{currency}</span>
              <span className="text-[10px] text-gray-400 font-normal">
                (Company default)
              </span>
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Opening Balance
            </span>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              {isLoadingMeta ? (
                <Loader2 size={14} className="animate-spin text-gray-400" />
              ) : (
                <span>
                  {currency} {formatMoney(openingBalance)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Scope / Toggles */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Include in Statement
          </label>
          <div className="space-y-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={includeInvoices}
                onChange={(e) => setIncludeInvoices(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600"
              />
              <span>
                {accountType === "VENDOR"
                  ? "Include Vendor Invoices (Generated Vendor Invoices / Billed)"
                  : "Include Invoices (Generated Client Invoices / Debits)"}
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={includePayments}
                onChange={(e) => setIncludePayments(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600"
              />
              <span>
                {accountType === "VENDOR"
                  ? "Include Payments (Paid Wire/Top-up to Vendor / Credits)"
                  : "Include Payments (Received Wire/Online Payments / Credits)"}
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={includeCreditNotes}
                onChange={(e) => setIncludeCreditNotes(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600"
              />
              <span>Include Adjustments & Credit Notes (Debit/Credit Adjustments & Refunds)</span>
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExportingExcel || !companyId}
              className="text-xs"
            >
              {isExportingExcel ? (
                <Loader2 size={13} className="animate-spin mr-1" />
              ) : (
                <FileSpreadsheet size={13} className="mr-1 text-emerald-600" />
              )}
              Export Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF || !companyId}
              className="text-xs"
            >
              {isExportingPDF ? (
                <Loader2 size={13} className="animate-spin mr-1" />
              ) : (
                <FileText size={13} className="mr-1 text-indigo-600" />
              )}
              Export PDF
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGeneratePreview}
              disabled={isGenerating || !companyId}
              className="flex items-center gap-1.5"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Preview Statement
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
