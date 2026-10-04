import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

// ⚡️ FIX: Adjusted paths to match folder depth
import { updateMccMncPrefixImportBatchApi, getMccMncPrefixImportErrorsApi, type MccMncPrefixImportBatchData } from "../../../api/mccMncPrefixApi/mccMncPrefixImportBatchApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import TextArea from "../../ui/TextArea";
import { formatDateTime } from "../../../helper/dateFormatter";
import DataTable from "../../ui/DataTable";

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
      const response = await getMccMncPrefixImportErrorsApi(editingData.id, errorsPage, errorsRowsPerPage);
      setErrorsData(response.results || []);
      setTotalErrors(response.count || 0);
    } catch (error) {
      console.error("Failed to fetch row errors", error);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
        // Passing required read-only fields back to preserve data
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? "View Import Batch" : "Edit Import Batch"}
      className="max-w-6xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Batch Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80 pointer-events-none">
            <Input label="File Name" name="fileName" value={editingData?.fileName || "-"} disabled={true} onChange={() => {}} />
            <Input label="File Path" name="filePath" value={editingData?.filePath || "-"} disabled={true} onChange={() => {}} />
            {editingData?.uploadedAt && (
              <Input label="Uploaded At" name="uploadedAt" value={formatDateTime(editingData.uploadedAt)} disabled={true} onChange={() => {}} />
            )}
            {editingData?.completedAt && (
              <Input label="Completed At" name="completedAt" value={formatDateTime(editingData.completedAt)} disabled={true} onChange={() => {}} />
            )}
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Row Statistics</legend>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-80 pointer-events-none">
            <Input label="Total" name="totalRows" value={String(editingData?.totalRows || 0)} disabled={true} onChange={() => {}} />
            <Input label="Success" name="successRows" value={String(editingData?.successRows || 0)} disabled={true} onChange={() => {}} />
            <Input label="Failed" name="failedRows" value={String(editingData?.failedRows || 0)} disabled={true} onChange={() => {}} />
            <Input label="Duplicate" name="duplicateRows" value={String(editingData?.duplicateRows || 0)} disabled={true} onChange={() => {}} />
            <Input label="Overlap" name="overlapRows" value={String(editingData?.overlapRows || 0)} disabled={true} onChange={() => {}} />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Processing Status</legend>
          {/* ⚡️ FIX: Changed to md:grid-cols-2 to prevent the Select from becoming huge */}
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
            {/* ⚡️ FIX: Make TextArea span full width below the Select */}
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

        {isViewMode && (editingData?.failedRows || 0) > 0 && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">Row Errors</legend>
            <DataTable
              serverSide={true}
              data={errorsData}
              totalItems={totalErrors}
              currentPage={errorsPage}
              rowsPerPage={errorsRowsPerPage}
              onPageChange={setErrorsPage}
              onRowsPerPageChange={setErrorsRowsPerPage}
              isLoading={isLoadingErrors}
              headers={["Row Number", "Error Message", "Raw Data"]}
              renderRow={(item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors">
                  <td className="px-4 py-3 text-sm text-text-primary dark:text-white">
                    {item.rowNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-500 whitespace-pre-wrap break-words min-w-[200px]">
                    {item.errorMessage}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-300 font-mono">
                    <pre className="whitespace-pre-wrap break-words min-w-[300px]">
                      {JSON.stringify(item.rawData, null, 2)}
                    </pre>
                  </td>
                </tr>
              )}
            />
          </fieldset>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} className={isViewMode ? "" : "mr-2"}>
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