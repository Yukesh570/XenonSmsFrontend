import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FileText,
  DollarSign,
  FileSpreadsheet,
  Wallet,
} from "lucide-react";

import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import DatePicker from "../../ui/DatePicker";
import ToggleSwitch from "../../ui/ToggleSwitch";
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCompanyId("");
      const d = new Date();
      d.setDate(1);
      setFromDate(d);
      setToDate(new Date());
      setCurrency("USD");
      setOpeningBalance(null);
      setIncludeInvoices(true);
      setIncludePayments(true);
      setIncludeCreditNotes(true);
    }
  }, [isOpen]);

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
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Company Selector */}
        <Select
          label="Select Company"
          required
          options={companyOptions}
          value={companyId}
          onChange={(val) => setCompanyId(String(val))}
          placeholder={accountType === "VENDOR" ? "Choose vendor company..." : "Choose client company..."}
        />

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label="Statement From"
            selected={fromDate}
            onChange={(d: Date | null) => setFromDate(d)}
            placeholder="Select Start Date"
            isClearable={false}
          />
          <DatePicker
            label="Statement To"
            selected={toDate}
            onChange={(d: Date | null) => setToDate(d)}
            placeholder="Select End Date"
            isClearable={false}
          />
        </div>

        {/* Currency & Opening Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-gray-50/70 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-text-secondary dark:text-gray-400 text-xs font-medium block truncate">
                Billing Currency
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                  {currency}
                </span>
                <span className="text-[11px] text-text-secondary dark:text-gray-500 font-normal">
                  (Company default)
                </span>
              </div>
            </div>
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="bg-gray-50/70 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-text-secondary dark:text-gray-400 text-xs font-medium block truncate">
                Opening Balance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {isLoadingMeta ? (
                  <span className="text-xs text-text-secondary dark:text-gray-400 animate-pulse">
                    Loading...
                  </span>
                ) : (
                  <span className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                    {currency} {formatMoney(openingBalance)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
        </div>

        {/* Ledger Scope / Toggles */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400">
            Include in Statement
          </label>
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 space-y-3 shadow-sm">
            <ToggleSwitch
              label={accountType === "VENDOR" ? "Vendor Invoices" : "Invoices"}
              description={
                accountType === "VENDOR"
                  ? "Include generated vendor invoices / billed"
                  : "Include generated client invoices / debits"
              }
              checked={includeInvoices}
              onChange={setIncludeInvoices}
            />
            <div className="border-t border-gray-100 dark:border-gray-700/60" />
            <ToggleSwitch
              label="Payments"
              description={
                accountType === "VENDOR"
                  ? "Include paid wire/top-up to vendor / credits"
                  : "Include received wire / online payments / credits"
              }
              checked={includePayments}
              onChange={setIncludePayments}
            />
            <div className="border-t border-gray-100 dark:border-gray-700/60" />
            <ToggleSwitch
              label="Adjustments & Credit Notes"
              description="Include debit/credit adjustments and refund notes"
              checked={includeCreditNotes}
              onChange={setIncludeCreditNotes}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExportingExcel || !companyId}
              isLoading={isExportingExcel}
              leftIcon={<FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF || !companyId}
              isLoading={isExportingPDF}
              leftIcon={<FileText size={15} className="text-indigo-600 dark:text-indigo-400" />}
            >
              Export PDF
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleGeneratePreview}
              disabled={isGenerating || !companyId}
              isLoading={isGenerating}
              leftIcon={<FileText size={15} />}
            >
              Preview Statement
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
