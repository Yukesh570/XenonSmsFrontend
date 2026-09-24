import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import ModalDataTable from "../ui/ModalDataTable";
import Input from "../ui/Input";
import { toast } from "react-toastify";
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

const DEFAULT_COLUMNS = ["country_name", "MCC", "MNC", "rate"];

const COLUMN_LABELS: Record<string, string> = {
  country_name: "Country",
  MCC: "MCC",
  MNC: "MNC",
  rate: "Rate",
};

export const ClientRateTableModal: React.FC<ClientRateTableModalProps> = ({
  isOpen,
  onClose,
  client,
}) => {
  const [rates, setRates] = useState<ClientRateData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // FIX: Reset filters and sort whenever modal is closed or client changes
  useEffect(() => {
    if (!isOpen) {
      setColumnFilters({});
      setApiFilters({});
      setCurrentPage(1);
      setSortConfig(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setColumnFilters({});
    setApiFilters({});
    setCurrentPage(1);
    setSortConfig(null);
  }, [client]);

  useEffect(() => {
    if (isOpen && client) {
      fetchRates();
    } else {
      setRates([]);
      setTotalItems(0);
    }
  }, [isOpen, client, currentPage, rowsPerPage, apiFilters, sortConfig]);

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

      if (sortConfig) {
        searchParams["ordering"] = sortConfig.direction === "desc" ? `-${sortConfig.key}` : sortConfig.key;
      }

      const res = await getCustomerRateByClientApi({
        client_id: client.id,
        page: currentPage,
        page_size: rowsPerPage,
        ...searchParams,
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

  const handleSort = (idx: number) => {
    const colKey = columns[idx];
    if (!colKey) return;
    const apiKey = colKey === "country_name" ? "country__name" : colKey;
    setSortConfig((prev) => {
      if (prev?.key === apiKey) {
        if (prev.direction === "asc") return { key: apiKey, direction: "desc" };
        return null;
      }
      return { key: apiKey, direction: "asc" };
    });
    setCurrentPage(1);
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const renderFilterCell = (_header: string, index: number) => {
    const colKey = columns[index];
    switch (colKey) {
      case "country_name":
        return (
          <FilterInput
            type="text"
            fieldKey="country__name"
            placeholder="Search Country..."
            value={columnFilters["country__name"] || ""}
            onChange={handleFilterChange}
            onEnter={handleFilterApply}
            minWidth="100px"
          />
        );
      case "MCC":
        return (
          <FilterInput
            fieldKey="MCC"
            placeholder="Search MCC..."
            value={columnFilters["MCC"] || ""}
            onChange={handleFilterChange}
            onEnter={handleFilterApply}
            minWidth="90px"
          />
        );
      case "MNC":
        return (
          <FilterInput
            fieldKey="MNC"
            placeholder="Search MNC..."
            value={columnFilters["MNC"] || ""}
            onChange={handleFilterChange}
            onEnter={handleFilterApply}
            minWidth="90px"
          />
        );
      case "rate":
        return (
          <FilterInput
            type="number"
            fieldKey="rate"
            placeholder="Search Rate..."
            value={columnFilters["rate"] || ""}
            onChange={handleFilterChange}
            onEnter={handleFilterApply}
            minWidth="90px"
          />
        );
      default:
        return null;
    }
  };

  const renderCell = (colKey: string, v: any) => {
    switch (colKey) {
      case "country_name":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.country_name || "-"}</td>;
      case "MCC":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MCC || "-"}</td>;
      case "MNC":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MNC || "-"}</td>;
      case "rate":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 font-medium whitespace-nowrap">{v.rate || "-"}</td>;
      default:
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v[colKey] || "-"}</td>;
    }
  };

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

        <ModalDataTable
          data={rates}
          headers={columns.map((c) => COLUMN_LABELS[c] || c)}
          renderFilterCell={renderFilterCell}
          renderRow={(v, idx) => (
            <tr
              key={idx}
              className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {columns.map((colKey) => renderCell(colKey, v))}
            </tr>
          )}
          isLoading={isLoading}
          serverSide={true}
          totalItems={totalItems}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
          onReorderColumns={handleReorderColumns}
          onSort={handleSort}
          sortColumnIndex={sortConfig ? columns.findIndex((c) => c === (sortConfig.key === "country__name" ? "country_name" : sortConfig.key)) : null}
          sortDirection={sortConfig?.direction || null}
          columnKeys={columns}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
          storageKey="client_rates_modal_table"
          emptyMessage={Object.keys(apiFilters).length > 0 ? "No rates match your search filters." : "No rates found for this client."}
        />
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

export default ClientRateTableModal;