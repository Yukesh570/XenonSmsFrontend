import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";

// ⚡️ FIX: Adjusted paths to match folder depth
import {
  updateMccMncPrefixImportBatchApi,
  getMccMncPrefixImportErrorsApi,
  type MccMncPrefixImportBatchData,
} from "../../../api/mccMncPrefixApi/mccMncPrefixImportBatchApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import TextArea from "../../ui/TextArea";
import { formatDateTime } from "../../../helper/dateFormatter";
import ModalDataTable from "../../ui/ModalDataTable";

interface MccMncPrefixImportBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingData: MccMncPrefixImportBatchData | null;
  isViewMode?: boolean;
}

export const MccMncPrefixImportBatchModal: React.FC<MccMncPrefixImportBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingData,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    status: "PENDING",
    errorSummary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorsData, setErrorsData] = useState<any[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [errorsPage, setErrorsPage] = useState(1);
  const [errorsRowsPerPage, setErrorsRowsPerPage] = useState(25);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);

  // Dynamic columns for drag & drop, sorting, resizing
  const [columns, setColumns] = useState<string[]>([
    "rowNumber",
    "errorMessage",
    "rawData",
  ]);

  const COLUMN_LABELS: Record<string, string> = {
    rowNumber: "Row Number",
    errorMessage: "Error Message",
    rawData: "Raw Data",
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

  const sortedErrorsData = useMemo(() => {
    if (!sortConfig) return errorsData;
    return [...errorsData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "rawData") {
        const aRaw = a.rawData !== undefined ? a.rawData : a.raw_data;
        const bRaw = b.rawData !== undefined ? b.rawData : b.raw_data;
        aVal = typeof aRaw === "string" ? aRaw : JSON.stringify(aRaw || "");
        bVal = typeof bRaw === "string" ? bRaw : JSON.stringify(bRaw || "");
      } else if (sortConfig.key === "rowNumber") {
        aVal = a.rowNumber !== undefined ? a.rowNumber : a.row_number;
        bVal = b.rowNumber !== undefined ? b.rowNumber : b.row_number;
      } else if (sortConfig.key === "errorMessage") {
        aVal = a.errorMessage !== undefined ? a.errorMessage : a.error_message;
        bVal = b.errorMessage !== undefined ? b.errorMessage : b.error_message;
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
  }, [errorsData, sortConfig]);

  useEffect(() => {
    if (isOpen && editingData) {
      setFormData({
        status: editingData.status || "PENDING",
        errorSummary: editingData.errorSummary || "",
      });
      if (isViewMode && editingData.id) {
        fetchErrors();
      }
    }
  }, [isOpen, editingData, isViewMode, errorsPage, errorsRowsPerPage]);

  const fetchErrors = async () => {
    if (!editingData?.id) return;
    setIsLoadingErrors(true);
    try {
      const response = await getMccMncPrefixImportErrorsApi(
        editingData.id,
        errorsPage,
        errorsRowsPerPage
      );
      setErrorsData(response.results || []);
      setTotalErrors(response.count || 0);
    } catch (error) {
      console.error("Failed to fetch row errors", error);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
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
        status: formData.status,
        errorSummary: formData.errorSummary,
        fileName: editingData.fileName,
        filePath: editingData.filePath,
        totalRows: editingData.totalRows,
        successRows: editingData.successRows,
        failedRows: editingData.failedRows,
        duplicateRows: editingData.duplicateRows,
        overlapRows: editingData.overlapRows,
        uploadedBy: editingData.uploadedBy,
      };

      await updateMccMncPrefixImportBatchApi(editingData.id, payload, moduleName);
      toast.success("Batch updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (colKey: string, item: any) => {
    switch (colKey) {
      case "rowNumber": {
        const rowNum = item.rowNumber ?? item.row_number ?? "-";
        return (
          <td
            key={colKey}
            className="px-4 py-2 text-center text-xs font-mono text-text-primary dark:text-gray-200 whitespace-nowrap"
          >
            {rowNum}
          </td>
        );
      }

      case "errorMessage": {
        const errorMsg = item.errorMessage || item.error_message || "-";
        return (
          <td
            key={colKey}
            className="px-4 py-2 text-xs text-rose-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis select-text"
          >
            {errorMsg}
          </td>
        );
      }

      case "rawData": {
        const raw = item.rawData !== undefined ? item.rawData : item.raw_data;
        const rawStr =
          typeof raw === "string"
            ? raw
            : JSON.stringify(raw !== undefined ? raw : {});

        return (
          <td
            key={colKey}
            className="px-4 py-2 text-xs font-mono text-text-secondary dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis select-text"
          >
            {rawStr}
          </td>
        );
      }

      default:
        return (
          <td
            key={colKey}
            className="px-4 py-2 text-xs text-text-secondary dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {String(item[colKey] ?? "-")}
          </td>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? "View Import Batch" : "Edit Import Batch"}
      className="max-w-6xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-1 max-h-[80vh] overflow-y-auto custom-scrollbar"
      >
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Batch Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80 pointer-events-none">
            <Input
              label="File Name"
              name="fileName"
              value={editingData?.fileName || "-"}
              disabled={true}
              onChange={() => {}}
            />
            <Input
              label="File Path"
              name="filePath"
              value={editingData?.filePath || "-"}
              disabled={true}
              onChange={() => {}}
            />
            {editingData?.uploadedAt && (
              <Input
                label="Uploaded At"
                name="uploadedAt"
                value={formatDateTime(editingData.uploadedAt)}
                disabled={true}
                onChange={() => {}}
              />
            )}
            {editingData?.completedAt && (
              <Input
                label="Completed At"
                name="completedAt"
                value={formatDateTime(editingData.completedAt)}
                disabled={true}
                onChange={() => {}}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Row Statistics
          </legend>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-80 pointer-events-none">
            <Input
              label="Total"
              name="totalRows"
              value={String(editingData?.totalRows || 0)}
              disabled={true}
              onChange={() => {}}
            />
            <Input
              label="Success"
              name="successRows"
              value={String(editingData?.successRows || 0)}
              disabled={true}
              onChange={() => {}}
            />
            <Input
              label="Failed"
              name="failedRows"
              value={String(editingData?.failedRows || 0)}
              disabled={true}
              onChange={() => {}}
            />
            <Input
              label="Duplicate"
              name="duplicateRows"
              value={String(editingData?.duplicateRows || 0)}
              disabled={true}
              onChange={() => {}}
            />
            <Input
              label="Overlap"
              name="overlapRows"
              value={String(editingData?.overlapRows || 0)}
              disabled={true}
              onChange={() => {}}
            />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Processing Status
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(v: string) => handleSelect("status", v)}
              options={[
                { label: "Pending", value: "PENDING" },
                { label: "Processing", value: "PROCESSING" },
                { label: "Completed", value: "COMPLETED" },
                { label: "Failed", value: "FAILED" },
                { label: "Partial Success", value: "PARTIAL_SUCCESS" },
              ]}
              disabled={isViewMode}
            />
            <div className="md:col-span-2">
              <TextArea
                label="Error Summary"
                name="errorSummary"
                value={formData.errorSummary}
                onChange={handleChange}
                disabled={isViewMode}
                rows={3}
              />
            </div>
          </div>
        </fieldset>

        {isViewMode &&
          ((editingData?.failedRows || 0) > 0 ||
            totalErrors > 0 ||
            errorsData.length > 0) && (
            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-w-0 max-w-full overflow-hidden">
              <legend className="text-sm font-semibold text-primary px-2">
                Row Errors
              </legend>
              <div className="w-full min-w-0">
                <ModalDataTable
                  serverSide={true}
                  data={sortedErrorsData}
                  totalItems={totalErrors}
                  currentPage={errorsPage}
                  rowsPerPage={errorsRowsPerPage}
                  onPageChange={setErrorsPage}
                  onRowsPerPageChange={(rows) => {
                    setErrorsRowsPerPage(rows);
                    setErrorsPage(1);
                  }}
                  rowsPerPageOptions={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  isLoading={isLoadingErrors}
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
                    "Row Number": 120,
                    "Error Message": 480,
                    "Raw Data": 520,
                  }}
                  storageKey="mcc_mnc_prefix_import_errors_modal_table"
                  tableMaxHeight="360px"
                  density="compact"
                  emptyMessage="No row errors found for this batch."
                  renderRow={(item, index) => (
                    <tr
                      key={
                        item.id ||
                        item.rowNumber ||
                        item.row_number ||
                        index
                      }
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors"
                    >
                      {columns.map((colKey) => renderCell(colKey, item))}
                    </tr>
                  )}
                />
              </div>
            </fieldset>
          )}

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className={isViewMode ? "" : "mr-2"}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};