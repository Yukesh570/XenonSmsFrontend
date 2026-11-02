import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { updateImportRowApi, type ImportRowData } from "../../../../api/rateApi/ImportVendor/importRowApi";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Select from "../../../ui/Select";
import Modal from "../../../ui/Modal";
import TextArea from "../../../ui/TextArea";

interface ImportRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingData: ImportRowData | null;
  isViewMode?: boolean;
}

export const ImportRowModal: React.FC<ImportRowModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingData,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    rowStatus: "VALID",
    diffType: "VALID",
    validationError: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && editingData) {
      setFormData({
        rowStatus: editingData.rowStatus || "VALID",
        diffType: editingData.diffType || "VALID",
        validationError: editingData.validationError || "",
      });
    }
  }, [isOpen, editingData]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      // Omitting isDeleted, carrying over uneditable fields
      const payload = {
        rowStatus: formData.rowStatus,
        diffType: formData.diffType,
        validationError: formData.validationError,
        rowNo: editingData.rowNo,
        rawRatePlan: editingData.rawRatePlan,
        rawDestination: editingData.rawDestination,
        rawOperator: editingData.rawOperator,
        rawMcc: editingData.rawMcc,
        rawMnc: editingData.rawMnc,
        rawTimeZone: editingData.rawTimeZone,
        rawCountryCode: editingData.rawCountryCode,
        importedCountryCode: editingData.importedCountryCode,
        normalizedTimeZoneId: editingData.normalizedTimeZoneId,
        normalizedCountryId: editingData.normalizedCountryId,
        normalizedOperatorId: editingData.normalizedOperatorId,
        normalizedMcc: editingData.normalizedMcc,
        normalizedMnc: editingData.normalizedMnc,
        destinationKey: editingData.destinationKey,
        importedRate: editingData.importedRate,
        currency: editingData.currency,
        batch: editingData.batch,
      };

      await updateImportRowApi(editingData.id, payload, moduleName);
      toast.success("Row updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update row.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const statusOptions = [
    { label: "Valid", value: "VALID" },
    { label: "Invalid", value: "INVALID" },
    { label: "Unmapped", value: "UNMAPPED" },
    { label: "Unchanged", value: "UNCHANGED" },
    { label: "Updated", value: "UPDATED" },
    { label: "New", value: "NEW" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? "View Import Row" : "Edit Import Row"}
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* ⚡️ FIX: Added disabled={true} explicitly to all read-only Input fields */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Raw Data (Read Only)</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none opacity-80">
            <Input label="Row No" name="rowNo" value={String(editingData?.rowNo ?? "-")} disabled={true} onChange={() => {}} />
            <Input label="Destination" name="rawDestination" value={editingData?.rawDestination || "-"} disabled={true} onChange={() => {}} />
            <Input label="Operator" name="rawOperator" value={editingData?.rawOperator || "-"} disabled={true} onChange={() => {}} />
            <Input label="MCC" name="rawMcc" value={editingData?.rawMcc || "-"} disabled={true} onChange={() => {}} />
            <Input label="MNC" name="rawMnc" value={editingData?.rawMnc || "-"} disabled={true} onChange={() => {}} />
            <Input label="Country Code" name="rawCountryCode" value={editingData?.rawCountryCode || "-"} disabled={true} onChange={() => {}} />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Normalized & Parsed Data (Read Only)</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none opacity-80">
             <Input label="Destination Key" name="destinationKey" value={editingData?.destinationKey || "-"} disabled={true} onChange={() => {}} />
             <Input label="Imported Rate" name="importedRate" value={String(editingData?.importedRate ?? "-")} disabled={true} onChange={() => {}} />
             <Input label="Currency" name="currency" value={editingData?.currency || "-"} disabled={true} onChange={() => {}} />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Status & Validation</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Select
              label="Row Status"
              value={formData.rowStatus}
              onChange={(v: string) => handleSelect("rowStatus", v)}
              options={statusOptions}
              disabled={isViewMode}
            />
             <Select
              label="Diff Type"
              value={formData.diffType}
              onChange={(v: string) => handleSelect("diffType", v)}
              options={statusOptions}
              disabled={isViewMode}
            />
            <div className="md:col-span-2">
              <TextArea 
                label="Validation Error" 
                name="validationError" 
                value={formData.validationError} 
                onChange={handleChange} 
                disabled={isViewMode} 
                rows={3} 
              />
            </div>
          </div>
        </fieldset>

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