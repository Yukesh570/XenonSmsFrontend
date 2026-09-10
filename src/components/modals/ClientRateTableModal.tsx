import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Input from "../ui/Input";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCustomerRateByClientApi, type ClientRateData } from "../../api/clientApi/clientApi";

interface ClientRateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: { id: number; name: string } | null;
}

const FilterInput = ({
  fieldKey, placeholder, value, onChange, onEnter, minWidth = "100px", type = "text"
}: {
  fieldKey: string; placeholder: string; value: string;
  onChange: (key: string, val: string) => void; onEnter: () => void; minWidth?: string; type?: string;
}) => (
  <div className="w-full filter-crt-wrapper" style={{ minWidth }}>
    <Input
      type={type}
      label="" name={fieldKey} value={value || ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(fieldKey, e.target.value)}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
      placeholder={placeholder}
    />
  </div>
);

const rowsOptions = [
  { value: "10", label: "10" }, { value: "25", label: "25" },
  { value: "50", label: "50" }, { value: "100", label: "100" },
];

export const ClientRateTableModal: React.FC<ClientRateTableModalProps> = ({
  isOpen,
  onClose,
  client,
}) => {
  const [rates, setRates] = useState<ClientRateData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => { setCurrentPage(1); }, [client]);

  useEffect(() => {
    if (isOpen && client) {
      fetchRates();
    } else {
      setRates([]);
      setTotalItems(0);
    }
  }, [isOpen, client, currentPage, rowsPerPage, apiFilters]);

  const fetchRates = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const searchParams: Record<string, any> = {};
      Object.keys(apiFilters).forEach((key) => {
        const val = apiFilters[key];
        if (!val) return;

        if (key === "country__name") searchParams["country__name__icontains"] = val;
        else if (key === "MCC") searchParams["MCC__icontains"] = val;
        else if (key === "MNC") searchParams["MNC__icontains"] = val;
        else if (key === "rate") searchParams["rate"] = val;
      });

      const res = await getCustomerRateByClientApi({
        client_id: client.id,
        page: currentPage,
        page_size: rowsPerPage,
        ...searchParams
      });

      const list = res.results || (Array.isArray(res) ? res : []);
      setRates(list);
      setTotalItems(res.count ?? list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load client rates.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    if (value === "") {
      setApiFilters((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setCurrentPage(1);
    }
  };

  const handleFilterApply = () => { setApiFilters(columnFilters); setCurrentPage(1); };
  const handleResetFilters = () => { setColumnFilters({}); setApiFilters({}); setCurrentPage(1); };
  const hasActiveFilters = Object.values(columnFilters).some((v) => v !== "" && v !== undefined);

  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginationLabel = `${totalItems === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + rates.length, totalItems)} of ${totalItems}`;

  const headers = ["Country", "MCC", "MNC", "Rate"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer Rates: ${client?.name || ""}`}
      className="max-w-4xl"
    >
      <div className="p-4 w-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 w-full shrink-0">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex flex-col space-y-1.5 text-[13px] text-gray-600 dark:text-gray-300 leading-tight">
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">Search:</span> Use the input fields in the header row and press <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs mx-0.5 shadow-sm">Enter</kbd> to apply the filter.
              </p>
            </div>
          </div>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center mb-3 gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">Rows per page:</span>
            <div className="w-24 shrink-0">
              <Select value={String(rowsPerPage)} onChange={(val: string) => { setRowsPerPage(Number(val)); setCurrentPage(1); }} options={rowsOptions} clearable={false} placement="bottom" />
            </div>
          </div>
          <span className="text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">{paginationLabel}</span>
          <div className="flex items-center space-x-2 shrink-0">
            <button className="rounded border border-transparent p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1 || isLoading}><ChevronLeft size={20} /></button>
            <button className="rounded border border-transparent p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages || totalItems === 0 || isLoading}><ChevronRight size={20} /></button>
          </div>
          {hasActiveFilters && (
            <button onClick={handleResetFilters} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 transition-colors whitespace-nowrap">Reset Filters</button>
          )}
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                {headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800/80">
                <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput type="text" fieldKey="country__name" placeholder="Search Country..." value={columnFilters["country__name"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
                <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="MCC" placeholder="Search MCC..." value={columnFilters["MCC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
                <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="MNC" placeholder="Search MNC..." value={columnFilters["MNC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
                <th className="p-1 border-b dark:border-gray-600 font-normal"><FilterInput type="number" fieldKey="rate" placeholder="Search Rate..." value={columnFilters["rate"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={headers.length} className="text-center py-8 text-gray-500">Loading rates...</td></tr>
              ) : rates.length === 0 ? (
                <tr><td colSpan={headers.length} className="text-center py-8 text-gray-500">{Object.keys(apiFilters).length > 0 ? "No rates match your search filters." : "No rates found for this client."}</td></tr>
              ) : (
                rates.map((v, idx) => (
                  <tr
                    key={idx}
                    className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.country_name || "-"}</td>
                    <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MCC || "-"}</td>
                    <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MNC || "-"}</td>
                    <td className="py-3 px-4 text-text-secondary dark:text-gray-300 font-medium whitespace-nowrap">{v.rate || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .filter-crt-wrapper label { display: none !important; }
        .filter-crt-wrapper > div { margin-bottom: 0 !important; }
        .filter-crt-wrapper input, .filter-crt-wrapper select, .filter-crt-wrapper button {
          min-height: 28px !important; height: 28px !important; padding-top: 2px !important;
          padding-bottom: 2px !important; padding-left: 6px !important; padding-right: 6px !important;
          font-size: 12px !important; border-radius: 4px !important;
        }
      `}} />
    </Modal>
  );
};