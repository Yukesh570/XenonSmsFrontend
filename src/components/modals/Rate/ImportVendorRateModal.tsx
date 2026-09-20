import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  importVendorRatesApi,
  getImportStatusApi,
} from "../../../api/rateApi/vendorRateApi";
import {
  getMappingSetupsApi,
  type MappingSetupData,
} from "../../../api/mappingSetupApi/mappingSetupApi";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";

interface ImportVendorRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rateGroupId: number | null;
}

export const ImportVendorRateModal: React.FC<ImportVendorRateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rateGroupId,
}) => {
  const [allMappings, setAllMappings] = useState<MappingSetupData[]>([]);
  const [mappingOptions, setMappingOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    country: "",
    countryCode: "",
    network: "",
    MCC: "",
    MNC: "",
    rate: "",
    effectiveFrom: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [importErrors, setImportErrors] = useState<any[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const MAX_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 2000;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      getMappingSetupsApi("mappingSetup", 1, 1000).then((res: any) => {
        if (!isMounted.current) return;
        let list: MappingSetupData[] = [];
        if (res && res.results) list = res.results;
        else if (Array.isArray(res)) list = res;

        setAllMappings(list);
        setMappingOptions(
          list.map((m) => ({
            label: m.name || String(m.id), // ⚡️ FIX: Removed m.ratePlan dependency to fix TS Error 2339
            value: String(m.id),
          })),
        );
      });
    } else {
      setCsvFile(null);
      setSelectedMappingId("");
      setProgress(null);
      setIsSubmitting(false);
      setImportErrors(null);
      setImportMessage(null);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedMappingId) {
      const selected = allMappings.find(
        (m) => String(m.id) === selectedMappingId,
      );
      if (selected) {
        setFormData({
          country: selected.country || "",
          countryCode: selected.countryCode || "",
          network: selected.network || "",
          MCC: selected.MCC || "",
          MNC: selected.MNC || "",
          rate: selected.rate || "",
          effectiveFrom: selected.effectiveFrom || "",
        });
      }
    } else {
      setFormData({
        country: "",
        countryCode: "",
        network: "",
        MCC: "",
        MNC: "",
        rate: "",
        effectiveFrom: "",
      });
    }
  }, [selectedMappingId, allMappings]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const checkStatus = async (taskId: string, attempt = 1) => {
    if (!isMounted.current) return;

    let statusRes: any = null;

    try {
      statusRes = await getImportStatusApi(taskId);
    } catch (err: any) {
      if (err.response && err.response.data) {
        statusRes = err.response.data;
      } else {
        console.error("Polling error", err);
        if (attempt >= MAX_ATTEMPTS) {
          setIsSubmitting(false);
          toast.error("Network error checking status.");
          return;
        }
        timeoutRef.current = window.setTimeout(
          () => checkStatus(taskId, attempt + 1),
          POLL_INTERVAL_MS,
        );
        return;
      }
    }

    if (statusRes) {
      const state =
        statusRes?.state?.toUpperCase() || statusRes?.status?.toUpperCase();

      if (
        state === "SUCCESS" ||
        state === "COMPLETED" ||
        state === "FINISHED"
      ) {
        setIsSubmitting(false);
        setProgress(100);
        toast.success("Import completed successfully!");
        onSuccess();
        onClose();
        return;
      }

      if (state === "COMPLETED_WITH_ERRORS") {
        setIsSubmitting(false);
        setProgress(100);

        const resultErrors = statusRes.result?.errors || statusRes.errors;

        if (
          resultErrors &&
          Array.isArray(resultErrors) &&
          resultErrors.length > 0
        ) {
          setImportErrors(resultErrors);
          setImportMessage(statusRes.result?.message || statusRes.message || "Import completed with errors.");
        } else {
          toast.error("Import finished with errors.");
        }
        return;
      }

      if (state === "FAILURE" || state === "FAILED") {
        setIsSubmitting(false);
        toast.error(statusRes?.error || "Import failed.");
        return;
      }

      if (attempt >= MAX_ATTEMPTS) {
        setIsSubmitting(false);
        setProgress(null);
        toast.error("Import timed out (Server took too long).");
        return;
      }

      setProgress((prev) => (prev && prev < 90 ? prev + 15 : 90));
      timeoutRef.current = window.setTimeout(
        () => checkStatus(taskId, attempt + 1),
        POLL_INTERVAL_MS,
      );
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMappingId || !csvFile) {
      toast.error("Please select a mapping setup and a CSV file.");
      return;
    }

    if (!rateGroupId) {
      toast.error("Critical Error: Missing Rate Group ID. Please reopen the table.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      const response = (await importVendorRatesApi(
        csvFile,
        selectedMappingId,
        rateGroupId // ⚡️ FIX: Now this is injected directly into the URL by the API function
      )) as any;

      const task_id = response.task_id;

      if (!task_id) {
        if (
          response.status === "completed_with_errors" &&
          response.result?.errors
        ) {
          setImportErrors(response.result.errors);
          setImportMessage(response.result?.message || "Import completed with errors.");
          setIsSubmitting(false);
          return;
        }
        throw new Error("No Task ID returned.");
      }

      toast.info("Import started");
      checkStatus(task_id, 1);
    } catch (error: any) {
      console.error(error);
      const data = error.response?.data;

      if (data) {
        if (data.status === "completed_with_errors" && data.result?.errors) {
          const err = data.result.errors[0];
          toast.error(`Row ${err.row}: ${err.error.effectiveFrom ? err.error.effectiveFrom[0] : err.error}`);
        } else {
          const msg = data.error || data.message || "Failed to start import.";
          toast.error(msg);
        }
      } else {
        toast.error("Failed to start import.");
      }

      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const groupedErrors = useMemo(() => {
    if (!importErrors) return [];
    const groups: Record<string, { rows: number[], details: Set<string> }> = {};
    importErrors.forEach((err) => {
      let errorText = err.error || err;
      if (typeof errorText === 'object' && errorText !== null) {
        if (errorText.effectiveFrom) {
           errorText = errorText.effectiveFrom[0] || JSON.stringify(errorText);
        } else {
           errorText = JSON.stringify(errorText);
        }
      } else if (typeof errorText !== 'string') {
        errorText = String(errorText);
      }
      
      let baseErrorText = errorText;
      let detailMatch = "";
      
      const mccMncMatch = errorText.match(/(Invalid MCC\/MNC: )'([^']+)' \/ '([^']+)' (.*)/);
      if (mccMncMatch) {
         baseErrorText = mccMncMatch[1] + "the following combinations " + mccMncMatch[4];
         detailMatch = `MCC: ${mccMncMatch[2]}, MNC: ${mccMncMatch[3]}`;
      }
      
      if (!groups[baseErrorText]) {
        groups[baseErrorText] = { rows: [], details: new Set() };
      }
      if (err.row !== undefined && err.row !== null) {
        groups[baseErrorText].rows.push(err.row);
      }
      if (detailMatch) {
        groups[baseErrorText].details.add(detailMatch);
      }
    });
    return Object.entries(groups).map(([error, data]) => ({ 
      error, 
      rows: data.rows,
      details: Array.from(data.details)
    }));
  }, [importErrors]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Vendor Rates"
      className={importErrors ? "max-w-4xl overflow-visible" : "max-w-4xl"}
    >
      {importErrors ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-800 dark:text-red-400 font-semibold mb-1">
                {importMessage || "Import Failed"}
              </h3>
              <p className="text-red-600 dark:text-red-300 text-sm">
                Please fix the following errors in your file and try again.
              </p>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupedErrors.map((group, idx) => {
                  return (
                    <tr key={idx} className="bg-white dark:bg-gray-900 hover:bg-red-50/50 dark:hover:bg-red-900/10">
                      <td className="px-4 py-2 text-red-600 dark:text-red-400 font-medium whitespace-pre-wrap">
                        {group.error}
                        {group.details && group.details.length > 0 && (
                          <div className="mt-1.5 text-xs text-red-500 font-mono bg-red-50/50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 max-h-48 overflow-y-auto custom-scrollbar">
                            {group.details.join(" | ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setImportErrors(null);
                setCsvFile(null);
              }}
            >
              Try Again
            </Button>
            <Button type="button" variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleImport} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <Select
            label="Select Mapping Setup"
            value={selectedMappingId}
            onChange={setSelectedMappingId}
            options={mappingOptions}
            placeholder="Choose a mapping"
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">
              CSV File
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload size={16} />}
                disabled={isSubmitting}
                className="w-full"
              >
                {csvFile ? "Change File" : "Select File"}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
                accept=".csv,.xlsx,.xls"
              />
            </div>
          </div>
        </div>

        {csvFile && (
          <div className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
            <FileSpreadsheet size={18} className="mr-2" />
            <span className="truncate font-medium">{csvFile.name}</span>
            <button
              type="button"
              onClick={() => setCsvFile(null)}
              className="ml-auto text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              disabled={isSubmitting}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <hr className="border-gray-100 dark:border-gray-700" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Expected File Headers
            </h4>
            {selectedMappingId && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center">
                <AlertTriangle size={12} className="mr-1" />
                File MUST match these headers
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-80">
            <Input
              label="Country Header"
              value={formData.country}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="Country Code Header"
              value={formData.countryCode}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="Network Header"
              value={formData.network}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="MCC Header"
              value={formData.MCC}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="MNC Header"
              value={formData.MNC}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="Rate Header"
              value={formData.rate}
              readOnly
              disabled
              placeholder="-"
            />
            <Input
              label="Effective From Header"
              value={formData.effectiveFrom}
              readOnly
              disabled
              placeholder="-"
            />
          </div>
        </div>

        {isSubmitting && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress || 5}%` }}
            ></div>
            <p className="text-xs text-center text-gray-500 mt-1">
              Processing {progress ? `${progress}%` : ""}
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !csvFile || !selectedMappingId}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" /> Importing
              </>
            ) : (
              "Start Import"
            )}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
};