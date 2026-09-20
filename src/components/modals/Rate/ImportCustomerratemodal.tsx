import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
} from "lucide-react";
import {
  importCustomerRatesApi,
} from "../../../api/rateApi/customerRateApi";
import { getImportStatusApi } from "../../../api/rateApi/vendorRateApi";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

interface ImportCustomerRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rateGroupId: number | null;
}

export const ImportCustomerRateModal: React.FC<ImportCustomerRateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rateGroupId,
}) => {


  const [csvFile, setCsvFile] = useState<File | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const MAX_ATTEMPTS = 300;
  const POLL_INTERVAL_MS = 2000;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCsvFile(null);
      setProgress(null);
      setIsSubmitting(false);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    }
  }, [isOpen]);



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
          const firstError = resultErrors[0];
          const errorMsg =
            typeof firstError === "string"
              ? firstError
              : `Row ${firstError.row}: ${firstError.error.effectiveFrom ? firstError.error.effectiveFrom[0] : firstError.error}`;

          toast.error(errorMsg);
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
    if (!csvFile) {
      toast.error("Please select a CSV file.");
      return;
    }

    if (!rateGroupId) {
      toast.error("Critical Error: Missing Rate Group ID. Please reopen the table.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      const response = (await importCustomerRatesApi(
        csvFile,
        rateGroupId,
      )) as any;

      const task_id = response.task_id;

      if (!task_id) {
        if (
          response.status === "completed_with_errors" &&
          response.result?.errors
        ) {
          const err = response.result.errors[0];
          toast.error(`Row ${err.row}: ${err.error.effectiveFrom ? err.error.effectiveFrom[0] : err.error}`);
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Customer Rates"
      className="max-w-md"
    >
      <form onSubmit={handleImport} className="space-y-6">
        <div className="space-y-2 mt-4">
          <label className="block text-xs font-medium text-text-secondary">
            CSV File
          </label>
          <div>
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
            disabled={isSubmitting || !csvFile}
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
    </Modal>
  );
};