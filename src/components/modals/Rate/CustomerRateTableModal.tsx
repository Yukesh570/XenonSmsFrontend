import React, { useState, useEffect } from "react";
import Modal from "../../ui/Modal";
import { DeleteModal } from "../DeleteModal";
import {
  deleteCustomerRateApi,
  getCustomerRatesApi,
  getCustomerRatesPerMNCMCCApi,
  exportCustomerRatesEmailApi,
} from "../../../api/rateApi/customerRateApi";
import { getEmailTemplatesApi } from "../../../api/emailTemplateApi/emailTemplateApi";
import { CustomerRateModal } from "./CustomerRateModal";
import { RateVersionTableModal } from "./RateVersionTableModal";
import { ImportCustomerRateModal } from "./ImportCustomerratemodal";
import { toast } from "react-toastify";
import Button from "../../ui/Button";
import { Plus, Edit, Trash, Layers, Upload, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import DatePicker from "../../ui/DatePicker";
import { StatusBadge } from "../../ui/StatusBadge";
import ContextMenu, { type ContextMenuItem } from "../../ui/ContextMenu";
import { getCountriesApi } from "../../../api/settingApi/countryApi/countryApi";
import { CountryFlag } from "../../ui/CountryFlag";

interface CustomerRateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateGroup: string | null;
  rateGroupId?: number | null;
  moduleName: string;
  canUpdate: boolean;
  canDelete: boolean;
  countryMap: Record<string, string>;
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

const statusOptions = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Expired", value: "EXPIRED" },
];

export const CustomerRateTableModal: React.FC<CustomerRateTableModalProps> = ({
  isOpen,
  onClose,
  rateGroup,
  rateGroupId,
  moduleName,
  canUpdate,
  canDelete,
  countryMap,
}) => {
  const [latestRates, setLatestRates] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [emailTemplateOptions, setEmailTemplateOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const [versionTargetRate, setVersionTargetRate] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRate, setSelectedRate] = useState<any>(null);

  const [countryOptions, setCountryOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getCountriesApi("country", 1, 1000);
        const data = res.results || (Array.isArray(res) ? res : []);
        setCountryOptions(
          data.map((item: any) => ({
            label: item.name || "Unknown",
            value: item.name || String(item.id),
            iso2: item.iso2,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch countries", error);
      }
    };
    fetchCountries();
  }, []);

  // Fetch email templates for export dropdown
  useEffect(() => {
    if (isOpen) {
      getEmailTemplatesApi("emailTemplate", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setEmailTemplateOptions(
            list.map((t: any) => ({
              label: t.name,
              value: String(t.id),
            }))
          );
        })
        .catch((err) => console.error("Failed to fetch email templates", err));
    }
  }, [isOpen]);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  useEffect(() => { setCurrentPage(1); }, [rateGroup, moduleName]);

  useEffect(() => {
    if (isOpen && rateGroup) {
      fetchLatestRates();
    } else {
      setLatestRates([]);
      setTotalItems(0);
    }
  }, [isOpen, rateGroup, currentPage, rowsPerPage, apiFilters]);


  useEffect(() => {
    let interval: number | undefined;
    if (isPolling && pollCount < 3) { // Poll up to 3 times (18 seconds)
      interval = window.setInterval(() => {
        fetchLatestRates(true);
        setPollCount((prev) => prev + 1);
      }, 1500);
    } else if (pollCount >= 3) {
      setIsPolling(false);
      setPollCount(0);
    }
    return () => clearInterval(interval);
  }, [isPolling, pollCount, currentPage, rowsPerPage, apiFilters]);

  const fetchLatestRates = async (background = false) => {
    if (!background) setIsLoading(true);
    try {
      const searchParams: Record<string, any> = { rateGroup__name: rateGroup };
      Object.keys(apiFilters).forEach((key) => {
        const val = apiFilters[key];
        if (!val) return;

        if (key === "countryName") searchParams["country__name__icontains"] = val;
        else if (key === "MCC") searchParams["MCC__icontains"] = val;
        else if (key === "MNC") searchParams["MNC__icontains"] = val;
        else if (key === "countryCode") searchParams["countryCode__icontains"] = val;
        else if (key === "rate") searchParams["rate_icontains"] = val;
        else if (key === "version") searchParams["version"] = val;
        else if (key === "status") searchParams["status__icontains"] = val;
        else if (key === "effectiveFrom") searchParams["effectiveFrom"] = val;
      });

      const res = await getCustomerRatesApi(moduleName, currentPage, rowsPerPage, searchParams);
      const list = res.results || (Array.isArray(res) ? res : []);
      setLatestRates(list);
      setTotalItems(res.count ?? list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rates.");
    } finally {
      if (!background) setIsLoading(false);
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
  const paginationLabel = `${totalItems === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + latestRates.length, totalItems)} of ${totalItems}`;

  const handleDelete = async () => {
    if (deleteId && canDelete) {
      try {
        await deleteCustomerRateApi(deleteId, moduleName);
        toast.success("Rate deleted successfully.");
        fetchLatestRates();
      } catch (error) {
        toast.error("Failed to delete rate.");
      }
      setDeleteId(null);
      setSelectedRate(null);
    }
  };

  const handleExportEmail = async (exportOnlyNew: boolean) => {
    if (!selectedEmailTemplate) {
      return toast.error("Please select an email template.");
    }
    if (!rateGroupId) {
      return toast.error("Rate Group ID is not available.");
    }

    setIsExporting(true);
    try {
      await exportCustomerRatesEmailApi(
        rateGroupId,
        {
          exportOnlyNew,
          emailTemplateId: Number(selectedEmailTemplate),
        },
        moduleName,
      );
      toast.success(`Rates exported successfully (${exportOnlyNew ? "New only" : "All"})!`);
      setIsExportModalOpen(false);
      setSelectedEmailTemplate("");
    } catch (error: any) {
      console.error("Export error:", error);
      const data = error.response?.data;
      let errorMsg = "Failed to export rates.";

      if (typeof data === "string") {
        errorMsg = data;
      } else if (data?.error) {
        errorMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
      } else if (data?.detail) {
        errorMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      } else if (data?.message) {
        errorMsg = typeof data.message === "string" ? data.message : JSON.stringify(data.message);
      } else if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        errorMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }

      if (errorMsg.toLowerCase().includes("no new rates found to export")) {
        toast.info(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, rate: any) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRate(rate);
  };

  const menuItems: ContextMenuItem[] = selectedRate ? [
    {
      label: "Manage Versions",
      icon: <Layers size={16} />,
      onClick: () => {
        setVersionTargetRate(selectedRate);
        setIsVersionsModalOpen(true);
      },
    },
    ...(canUpdate ? [{ label: "Edit Rate", icon: <Edit size={16} />, onClick: () => { setEditingRate(selectedRate); setIsViewMode(false); setIsCreateModalOpen(true); } }] : []),
    ...(canDelete ? [{ label: "Delete", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedRate.id) }] : []),
  ] : [];

  const currencyCode = latestRates.length > 0 ? latestRates[0].currencyCode : "";

  const headers = [
    "Country", "MCC", "MNC", "Network", "Country Code", `Rate ${currencyCode ? `(${currencyCode})` : ""}`, "Version", "Status", "Remark",
    "Effective From", "Effective To",
  ];

  const renderCountry = (rate: any) => {
    const countryNameStr = rate.countryName || countryMap[String(rate.country)] || String(rate.country || "-");
    const match = countryOptions.find((opt) => opt.label === countryNameStr || opt.value === String(rate.country));
    return (
      <div className="flex items-center gap-1.5">
        {match?.iso2 && <CountryFlag iso2={match.iso2} />}
        <span>{countryNameStr}</span>
      </div>
    );
  };

  const rateItemName = selectedRate
    ? selectedRate.countryName || countryMap[String(selectedRate.country)] || selectedRate.network || `MCC: ${selectedRate.MCC || "-"}`
    : "";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Customer Rates: ${rateGroup || ""}`}
        className="max-w-full w-full"
      >
        <div className="p-4 w-full min-w-0 flex flex-col" onClick={() => setContextMenuPos(null)}>
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 w-full shrink-0">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex flex-col space-y-1.5 text-[13px] text-gray-600 dark:text-gray-300 leading-tight">
                <p>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Displaying Latest Rates:</span>{" "}
                  Shows the latest version of each country combination in this group.
                </p>
                <p>Right-click a row and select <strong>Manage Versions</strong> to view all versions.</p>
                <p>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Search:</span> Use the input fields in the header row and press <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs mx-0.5 shadow-sm">Enter</kbd> to apply the filter.
                </p>
              </div>
            </div>
            {canUpdate && (
              <div className="flex shrink-0 w-full sm:w-auto gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedEmailTemplate("");
                    setIsExportModalOpen(true);
                  }}
                  leftIcon={<Download size={16} />}
                  className="w-full sm:w-auto text-sm py-1.5 px-4"
                >
                  Export
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsImportModalOpen(true)}
                  leftIcon={<Upload size={16} />}
                  className="w-full sm:w-auto text-sm py-1.5 px-4"
                >
                  Import
                </Button>
                <Button
                  variant="primary"
                  onClick={() => { setEditingRate(null); setIsViewMode(false); setIsCreateModalOpen(true); }}
                  leftIcon={<Plus size={16} />}
                  className="w-full sm:w-auto text-sm py-1.5 px-4"
                >
                  Add Rate
                </Button>
              </div>
            )}
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

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg custom-scrollbar w-full min-w-0">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                  {headers.map((h, i) => (
                    <th key={i} className="py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/80">
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="countryName" placeholder="Search..." value={columnFilters["countryName"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="MCC" placeholder="Search..." value={columnFilters["MCC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="70px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="MNC" placeholder="Search..." value={columnFilters["MNC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="70px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="countryCode" placeholder="Search..." value={columnFilters["countryCode"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="80px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput type="number" fieldKey="rate" placeholder="Search..." value={columnFilters["rate"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="70px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal relative z-[60]">
                    <div className="filter-crt-wrapper" style={{ minWidth: "100px" }}>
                      <Select label="" value={columnFilters["status"] || ""} onChange={(val: string) => { handleFilterChange("status", val); setApiFilters((prev) => ({ ...prev, status: val })); setCurrentPage(1); }} options={[{ label: "All", value: "" }, ...statusOptions]} placeholder="All" placement="bottom" />
                    </div>
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"><FilterInput fieldKey="remark" placeholder="Search..." value={columnFilters["remark"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" /></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal relative z-[60]">
                    <div className="filter-crt-wrapper" style={{ minWidth: "130px" }}>
                      <DatePicker
                        label=""
                        selected={columnFilters["effectiveFrom"] ? new Date(columnFilters["effectiveFrom"]) : null}
                        onChange={(date: Date | null) => {
                          const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";
                          handleFilterChange("effectiveFrom", dateStr);
                          setApiFilters((prev) => dateStr ? { ...prev, effectiveFrom: dateStr } : (() => { const next = { ...prev }; delete next["effectiveFrom"]; return next; })());
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </th>
                  <th className="p-1 border-b dark:border-gray-600 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={headers.length} className="text-center py-8 text-gray-500">Loading rates...</td></tr>
                ) : latestRates.length === 0 ? (
                  <tr><td colSpan={headers.length} className="text-center py-8 text-gray-500">{Object.keys(apiFilters).length > 0 ? "No rates match your search filters." : "No rates found in this group."}</td></tr>
                ) : (
                  latestRates.map((v) => (
                    <tr
                      key={v.id}
                      onContextMenu={(e) => handleContextMenu(e, v)}
                      className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-context-menu transition-colors"
                    >
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{renderCountry(v)}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MCC || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MNC || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.network || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.countryCode || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 font-medium whitespace-nowrap">{v.rate || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">v{v.version || 0}</td>
                      <td className="py-3 px-4"><StatusBadge status={v.status} /></td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.remark || "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.effectiveFrom ? new Date(v.effectiveFrom).toLocaleString() : "-"}</td>
                      <td className="py-3 px-4 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.effectiveTo ? new Date(v.effectiveTo).toLocaleString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ContextMenu
          position={contextMenuPos}
          items={menuItems}
          onClose={() => setContextMenuPos(null)}
        />
      </Modal>

      {/* Export Rates Email Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (!isExporting) {
            setIsExportModalOpen(false);
            setSelectedEmailTemplate("");
          }
        }}
        title="Export Rates via Email"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary dark:text-gray-400">
            Select an email template to dispatch rate details for <strong>{rateGroup || "this group"}</strong>.
          </p>

          <div>
            <Select
              label="Email Template"
              value={selectedEmailTemplate}
              onChange={setSelectedEmailTemplate}
              options={emailTemplateOptions}
              placeholder="Select Email Template"
              placement="bottom"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsExportModalOpen(false);
                setSelectedEmailTemplate("");
              }}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleExportEmail(true)}
              disabled={isExporting || !selectedEmailTemplate}
              leftIcon={isExporting ? <Loader2 size={16} className="animate-spin" /> : undefined}
            >
              Export New
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleExportEmail(false)}
              disabled={isExporting || !selectedEmailTemplate}
              leftIcon={isExporting ? <Loader2 size={16} className="animate-spin" /> : undefined}
            >
              Export All
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedRate(null);
        }}
        onConfirm={handleDelete}
        title="Delete Customer Rate"
        message={`Are you sure you want to delete rate for "${rateItemName}"? This action cannot be undone.`}
      />

      <CustomerRateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(isBulk) => {
          if (isBulk) {
            setIsPolling(true);
            setPollCount(0);
            toast.info("Updating rates in background, please wait...");
          } else {
            fetchLatestRates();
          }
        }}
        moduleName={moduleName}
        editingRate={editingRate}
        isViewMode={isViewMode}
        rateGroupId={rateGroupId}
      />

      <RateVersionTableModal
        isOpen={isVersionsModalOpen}
        onClose={() => {
          setIsVersionsModalOpen(false);
          setVersionTargetRate(null);
        }}
        ratePlan={rateGroup}
        ratePlanFilter={versionTargetRate}
        moduleName={moduleName}
        fetchApi={getCustomerRatesPerMNCMCCApi}
        deleteApi={deleteCustomerRateApi}
        countryMap={countryMap}
        isVendorMode={false}
        onEdit={(rateData) => { setEditingRate(rateData); setIsViewMode(false); setIsCreateModalOpen(true); }}
        onView={(rateData) => { setEditingRate(rateData); setIsViewMode(true); setIsCreateModalOpen(true); }}
        onRefresh={fetchLatestRates}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <ImportCustomerRateModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchLatestRates}
        rateGroupId={rateGroupId ?? null}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .filter-crt-wrapper label { display: none !important; }
        .filter-crt-wrapper > div { margin-bottom: 0 !important; }
        .filter-crt-wrapper input, .filter-crt-wrapper select, .filter-crt-wrapper button {
          min-height: 28px !important; height: 28px !important; padding-top: 2px !important;
          padding-bottom: 2px !important; padding-left: 6px !important; padding-right: 6px !important;
          font-size: 12px !important; border-radius: 4px !important;
        }
        .filter-crt-wrapper .react-datepicker__input-container input {
          padding-left: 34px !important;
        }
      `}} />
    </>
  );
};

export default CustomerRateTableModal;