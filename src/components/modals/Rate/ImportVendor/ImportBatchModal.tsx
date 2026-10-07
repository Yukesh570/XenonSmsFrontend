import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axiosInstance";
import { updateImportBatchApi, type ImportBatchData } from "../../../../api/rateApi/ImportVendor/importBatchApi";
import { getImportRowsApi, type ImportRowData } from "../../../../api/rateApi/ImportVendor/importRowApi";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Select from "../../../ui/Select";
import Modal from "../../../ui/Modal";
import ModalDataTable from "../../../ui/ModalDataTable";
import { StatusBadge } from "../../../ui/StatusBadge";
import { AlertTriangle, Download } from "lucide-react";

interface ImportBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingData: ImportBatchData | null;
  isViewMode?: boolean;
}

export const ImportBatchModal: React.FC<ImportBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingData,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    sourceType: "",
    currency: "",
    batchStatus: "PARSING",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ImportRowData[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRowsCount, setTotalRowsCount] = useState(0);

  // Dynamic columns for drag & drop, sorting, resizing
  const [columns, setColumns] = useState<string[]>([
    "rowNo",
    "destination",
    "mccMnc",
    "importedRate",
    "rowStatus",
  ]);

  const COLUMN_LABELS: Record<string, string> = {
    rowNo: "Row",
    destination: "Dest/Country",
    mccMnc: "MCC/MNC",
    importedRate: "Rate",
    rowStatus: "Status",
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (columnIndex: number) => {
    const colKey = columns[columnIndex];
    setSortConfig((prev) => {
      if (prev?.key === colKey) {
        if (prev.direction === "asc") return { key: colKey, direction: "desc" };
        return null;
      }
      return { key: colKey, direction: "asc" };
    });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return parsedRows;
    return [...parsedRows].sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortConfig.key === "rowNo") {
        aVal = a.rowNo ?? 0;
        bVal = b.rowNo ?? 0;
      } else if (sortConfig.key === "destination") {
        aVal = a.rawDestination || a.rawCountryCode || "";
        bVal = b.rawDestination || b.rawCountryCode || "";
      } else if (sortConfig.key === "mccMnc") {
        aVal = `${a.rawMcc || ""} / ${a.rawMnc || ""}`;
        bVal = `${b.rawMcc || ""} / ${b.rawMnc || ""}`;
      } else if (sortConfig.key === "importedRate") {
        aVal = Number(a.importedRate) || 0;
        bVal = Number(b.importedRate) || 0;
      } else if (sortConfig.key === "rowStatus") {
        aVal = a.rowStatus || "";
        bVal = b.rowStatus || "";
      }

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const cmp = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [parsedRows, sortConfig]);

  const handleDownloadAttachment = async () => {
    if (!editingData?.attachment) return;
    try {
      const response = await api.get(
        `/vendorRateImportAttachment/${editingData.attachment}/download/`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attachment_${editingData.attachment}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error(
          "File no longer exists on the server. It may have been cleaned up automatically."
        );
      } else {
        toast.error("Failed to download attachment.");
      }
    }
  };

  const renderCell = (colKey: string, row: ImportRowData) => {
    switch (colKey) {
      case "rowNo":
        return (
          <td
            key={colKey}
            className="py-2.5 px-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
          >
            {row.rowNo ?? "-"}
          </td>
        );
      case "destination":
        return (
          <td
            key={colKey}
            className="py-2.5 px-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap"
          >
            {row.rawDestination || row.rawCountryCode || "-"}
          </td>
        );
      case "mccMnc":
        return (
          <td
            key={colKey}
            className="py-2.5 px-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
          >
            {row.rawMcc || row.rawMnc
              ? `${row.rawMcc || ""} / ${row.rawMnc || ""}`
              : "-"}
          </td>
        );
      case "importedRate":
        return (
          <td
            key={colKey}
            className="py-2.5 px-3 text-sm text-text-primary dark:text-gray-200 font-medium whitespace-nowrap"
          >
            {row.importedRate ?? "-"}
          </td>
        );
      case "rowStatus": {
        const val = (row.rowStatus || "").toUpperCase();
        let colorKey = "PENDING";
        if (["VALID", "NEW", "UPDATED", "PUBLISHED", "ACTIVE"].includes(val)) {
          colorKey = "ACTIVE";
        } else if (["INVALID", "FAILED"].includes(val)) {
          colorKey = "FAILED";
        } else if (["UNMAPPED", "SUSPENDED"].includes(val)) {
          colorKey = "SUSPENDED";
        } else if (["UNCHANGED"].includes(val)) {
          colorKey = "UNKNOWN";
        } else if (val) {
          colorKey = val;
        }

        return (
          <td key={colKey} className="py-2.5 px-3 whitespace-nowrap">
            <StatusBadge status={colorKey} customText={row.rowStatus || "-"} />
          </td>
        );
      }
      default:
        return (
          <td
            key={colKey}
            className="py-2.5 px-3 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
          >
            {(row as any)[colKey] ?? "-"}
          </td>
        );
    }
  };

  const fetchRows = (page: number, size: number = rowsPerPage) => {
    if (editingData?.id) {
      setIsLoadingRows(true);
      getImportRowsApi("importRow", page, size, { batch__id: editingData.id })
        .then((res: any) => {
          setParsedRows(res.results || []);
          setTotalRowsCount(res.count || 0);
        })
        .catch(() => toast.error("Failed to load parsed rows preview"))
        .finally(() => setIsLoadingRows(false));
    }
  };

  useEffect(() => {
    if (isOpen && editingData) {
      setFormData({
        sourceType: editingData.sourceType || "",
        currency: editingData.currency || "",
        batchStatus: editingData.batchStatus || "PARSING",
      });

      if (isViewMode && editingData.id) {
        setRowsPage(1);
        fetchRows(1, rowsPerPage);
      } else {
        setParsedRows([]);
        setTotalRowsCount(0);
      }
    }
  }, [isOpen, editingData, isViewMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode || !editingData?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        sourceType: formData.sourceType,
        currency: formData.currency,
        batchStatus: formData.batchStatus,
        parserProfileId: editingData.parserProfileId,
        totalRows: editingData.totalRows,
        validRows: editingData.validRows,
        invalidRows: editingData.invalidRows,
        unmappedRows: editingData.unmappedRows,
        updatedRows: editingData.updatedRows,
        newRows: editingData.newRows,
        effectiveDate: editingData.effectiveDate,
        publishedAt: editingData.publishedAt,
        vendor: editingData.vendor,
        mail: editingData.mail,
        attachment: editingData.attachment,
      };

      await updateImportBatchApi(editingData.id, payload, moduleName);
      toast.success("Batch updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? `Import Batch Details - ${editingData?.subject || 'N/A'}` : "Edit Import Batch Status"}
      className={isViewMode ? "max-w-5xl" : "max-w-2xl"}
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-1">
        
        {isViewMode && editingData?.failureReason && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
            <AlertTriangle className="text-red-500 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Import Failed</h3>
              <p className="text-sm text-red-700 mt-1">{editingData.failureReason}</p>
            </div>
          </div>
        )}

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <legend className="text-sm font-semibold text-primary px-2">Configuration</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Source Type" name="sourceType" value={formData.sourceType} onChange={handleChange} disabled={isViewMode} />
            <Input label="Currency" name="currency" value={formData.currency} onChange={handleChange} disabled={isViewMode} />
            <Select
              label="Batch Status"
              value={formData.batchStatus}
              onChange={(v: string) => handleSelect("batchStatus", v)}
              options={[
                { label: "Parsing", value: "PARSING" },
                { label: "Parsed", value: "PARSED" },
                { label: "Ready For Review", value: "READY_FOR_REVIEW" },
                { label: "Auto Approved", value: "AUTO_APPROVED" },
                { label: "Manual Approved", value: "MANUAL_APPROVED" },
                { label: "Published", value: "PUBLISHED" },
                { label: "Rolled Back", value: "ROLLED_BACK" },
                { label: "Failed", value: "FAILED" },
              ]}
              disabled={isViewMode}
            />
          </div>
        </fieldset>

        {isViewMode && (
          <>
            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-semibold text-primary px-2">Processing Statistics</legend>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Input label="Total Rows" name="totalRows" value={String(editingData?.totalRows ?? 0)} disabled={true} onChange={() => { }} />
                <Input label="Valid Rows" name="validRows" value={String(editingData?.validRows ?? 0)} disabled={true} onChange={() => { }} />
                <Input label="Invalid Rows" name="invalidRows" value={String(editingData?.invalidRows ?? 0)} disabled={true} onChange={() => { }} />
                <Input label="Unmapped Rows" name="unmappedRows" value={String(editingData?.unmappedRows ?? 0)} disabled={true} onChange={() => { }} />
                <Input label="New / Updated" name="newRows" value={`${editingData?.newRows ?? 0} / ${editingData?.updatedRows ?? 0}`} disabled={true} onChange={() => { }} />
              </div>
            </fieldset>

            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-w-0 max-w-full overflow-hidden">
              <legend className="text-sm font-semibold text-primary px-2">Parsed Rates Preview</legend>
              <div className="w-full min-w-0">
                <ModalDataTable
                  serverSide={true}
                  data={sortedRows}
                  totalItems={totalRowsCount}
                  currentPage={rowsPage}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(page) => {
                    setRowsPage(page);
                    fetchRows(page, rowsPerPage);
                  }}
                  onRowsPerPageChange={(rows) => {
                    setRowsPerPage(rows);
                    setRowsPage(1);
                    fetchRows(1, rows);
                  }}
                  rowsPerPageOptions={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  isLoading={isLoadingRows}
                  headerActions={
                    editingData?.attachment ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadAttachment}
                        leftIcon={<Download size={15} />}
                      >
                        Download Source File
                      </Button>
                    ) : undefined
                  }
                  headers={columns.map((c) => COLUMN_LABELS[c] || c)}
                  columnKeys={columns}
                  onReorderColumns={handleReorderColumns}
                  onSort={handleSort}
                  sortColumnIndex={
                    sortConfig
                      ? columns.findIndex((c) => c === sortConfig.key)
                      : null
                  }
                  sortDirection={sortConfig?.direction || null}
                  defaultColumnWidths={{
                    "Row": 90,
                    "Dest/Country": 220,
                    "MCC/MNC": 160,
                    "Rate": 140,
                    "Status": 130,
                  }}
                  storageKey="parsed_rates_preview_modal_table"
                  tableMaxHeight="360px"
                  density="compact"
                  emptyMessage="No parsed rows found for this batch."
                  renderRow={(item, index) => (
                    <tr
                      key={item.id ?? index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      {columns.map((colKey) => renderCell(colKey, item))}
                    </tr>
                  )}
                />
              </div>
            </fieldset>
          </>
        )}

        {!isViewMode && (
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900 z-10 pb-2">
            <Button type="button" variant="secondary" onClick={onClose} className="mr-2">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update Status"}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
};