import React, { useState, useRef, useEffect, useMemo } from "react";
import { Upload, FileSpreadsheet, Loader2, Info, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  importApi: (formData: FormData) => Promise<any>;
  checkStatusApi?: (taskId: string) => Promise<any>;
  title?: string;
  sampleFileLink?: string;
  sampleFileName?: string;
  fileKey?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  importApi,
  checkStatusApi,
  title = "Import Data",
  sampleFileLink,
  sampleFileName = "sample_import.csv",
  fileKey = "file",
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [importErrors, setImportErrors] = useState<any[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTEMPTS = 5;
  const POLL_INTERVAL = 2000;

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setProgress(null);
      setImportErrors(null);
      setImportMessage(null);
    }
  }, [isOpen]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadSample = () => {
    if (!sampleFileLink) return;
    const link = document.createElement("a");
    link.href = sampleFileLink;
    link.setAttribute("download", sampleFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatErrorMessage = (msg: string): string => {
    if (typeof msg === 'string' && msg.toLowerCase().includes('utf-8')) {
      return "Encoding Error: Please save your Excel file as 'CSV UTF-8 (Comma delimited)' and try again.";
    }
    return msg;
  };

  const pollStatus = async (taskId: string) => {
    if (!checkStatusApi) return;

    let attempts = 0;

    const intervalId = setInterval(async () => {
      attempts += 1;
      let res: any = null;

      try {
        res = await checkStatusApi(taskId);
      } catch (error: any) {
        if (error.response && error.response.data) {
          res = error.response.data;
        } else {
          console.error("Polling error", error);
          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(intervalId);
            toast.error("Network error checking status.");
            setIsPolling(false);
            setIsSubmitting(false);
            setProgress(null);
          }
          return;
        }
      }

      if (res) {
        const status = (res.state || res.status || "").toUpperCase();

        if (res.progress) {
          setProgress(res.progress);
        } else {
          setProgress((prev) => (prev && prev < 90 ? prev + 10 : 90));
        }

        if (status === "FAILURE" || status === "FAILED" || status === "ERROR") {
          clearInterval(intervalId);
          let errorMsg = res.error || res.result || res.message || "Unknown error";
          errorMsg = formatErrorMessage(String(errorMsg));

          toast.error(`Import failed: ${errorMsg}`);
          setIsPolling(false);
          setIsSubmitting(false);
          setProgress(null);
          return;
        }

        if (
          res.progress === 100 ||
          status === "SUCCESS" ||
          status === "COMPLETED" ||
          status === "COMPLETED_WITH_ERRORS" ||
          status === "FINISHED"
        ) {
          clearInterval(intervalId);
          setProgress(100);

          const resultErrors = res.result?.errors || res.errors;

          if (
            resultErrors &&
            Array.isArray(resultErrors) &&
            resultErrors.length > 0
          ) {
            setIsPolling(false);
            setIsSubmitting(false);
            setImportErrors(resultErrors);
            setImportMessage(res.result?.message || res.message || "Import completed with errors.");
          } else {
            const resultMessage = res.result?.message;
            toast.success(resultMessage || "Import completed successfully!");
            setIsPolling(false);
            setIsSubmitting(false);
            onSuccess();
            onClose();
          }
          return;
        }
      }
    }, POLL_INTERVAL);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    const formData = new FormData();
    formData.append(fileKey, file);

    try {
      const response = await importApi(formData);
      const jobId = response.task_id || response.batch_id;

      if (jobId && checkStatusApi) {
        toast.info("Import started. Processing...");
        setIsPolling(true);
        pollStatus(jobId);
      } else {
        if (response.status === "error" || response.error) {
          let msg = response.error || response.message || "Import failed.";
          toast.error(formatErrorMessage(String(msg)));
          setIsSubmitting(false);
          setProgress(null);
        } else {
          setProgress(100);
          toast.success("Import successful!");
          onSuccess();
          onClose();
          setIsSubmitting(false);
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "object") {
          let msg =
            data.error ||
            data.message ||
            data.detail ||
            (data.result?.errors
              ? data.result.errors[0]?.error
              : "Validation failed.");
          toast.error(formatErrorMessage(String(msg)));
        } else {
          toast.error(data.message || "Failed to upload file.");
        }
      } else {
        toast.error("Failed to upload file.");
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
        errorText = JSON.stringify(errorText);
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
    <Modal isOpen={isOpen} onClose={onClose} title={title} className={importErrors ? "max-w-3xl overflow-visible" : "max-w-lg overflow-visible"}>
      {importErrors ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
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
                setFile(null);
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
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center mb-1">

          <div className="text-sm text-text-secondary dark:text-gray-400 flex items-center gap-1.5">
            <span>Upload a CSV file to bulk import records.</span>

            {/* Prominent Hover Tooltip */}
            <div className="group relative flex items-center mt-0.5">
              <Info size={16} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 cursor-help transition-colors drop-shadow-sm" />

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] text-center pointer-events-none border border-gray-700 dark:border-gray-600">
                If using Microsoft Excel, please use <strong>"Save As"</strong> and select <strong>"CSV UTF-8 (Comma delimited)"</strong> to prevent formatting errors.
                {/* Arrow Pointer */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
              </div>
            </div>
          </div>

          {sampleFileLink && (
            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              title="Download Sample Format"
              disabled={isSubmitting}
            >
              <FileSpreadsheet size={18} />
              Sample Format
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload size={16} />}
            disabled={isSubmitting}
          >
            {file ? "Change File" : "Upload CSV"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
            accept=".csv,.xlsx,.xls"
          />

          <div className="flex-1 text-sm text-gray-500 truncate font-medium">
            {file ? (
              <span className="text-gray-900 dark:text-gray-100">
                {file.name}
              </span>
            ) : (
              "No file selected"
            )}
          </div>
        </div>

        {isSubmitting && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progress || 5}%` }}
            >
              <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2 animate-pulse">
              Processing... {progress ? `${progress}%` : ""}
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          {!isPolling && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isPolling ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Importing...
              </>
            ) : isSubmitting ? (
              "Uploading..."
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