import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axiosInstance";
import { updateImportBatchApi, type ImportBatchData } from "../../../../api/rateApi/ImportVendor/importBatchApi";
import { getImportRowsApi, type ImportRowData } from "../../../../api/rateApi/ImportVendor/importRowApi";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Select from "../../../ui/Select";
import Modal from "../../../ui/Modal";
import { AlertTriangle, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";

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

  const handleNextPage = () => {
    const nextPage = rowsPage + 1;
    setRowsPage(nextPage);
    fetchRows(nextPage, rowsPerPage);
  };

  const handlePrevPage = () => {
    if (rowsPage > 1) {
      const prevPage = rowsPage - 1;
      setRowsPage(prevPage);
      fetchRows(prevPage, rowsPerPage);
    }
  };

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
      <form onSubmit={handleSubmit} className="space-y-6 px-1 max-h-[85vh] overflow-y-auto custom-scrollbar">

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

            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <legend className="text-sm font-semibold text-primary px-2 m-0">Original Attachment</legend>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await api.get(`/vendorRateImportAttachment/${editingData?.attachment}/download/`, {
                        responseType: 'blob',
                      });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `attachment_${editingData?.attachment}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (err: any) {
                      if (err.response?.status === 404) {
                        toast.error("File no longer exists on the server. It may have been cleaned up automatically.");
                      } else {
                        toast.error("Failed to download attachment.");
                      }
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Download size={16} /> Download Source File
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <FileText size={24} className="text-gray-400" />
                <span>Attachment ID: {editingData?.attachment || "N/A"}</span>
              </div>
            </fieldset>

            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-semibold text-primary px-2">Parsed Rates Preview</legend>
              {isLoadingRows && parsedRows.length === 0 ? (
                <p className="text-sm text-gray-500">Loading parsed rows...</p>
              ) : parsedRows.length > 0 ? (
                <div className="overflow-x-auto flex flex-col">
                  <div className="flex flex-row flex-wrap items-center gap-2.5 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                    {/* Rows Per Page */}
                    <div className="flex items-center space-x-2 h-[34px]">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Rows per page:
                      </span>
                      <div className="w-20 shrink-0">
                        <Select
                          value={String(rowsPerPage > 0 ? rowsPerPage : 10)}
                          onChange={(val) => {
                            const size = Number(val);
                            if (size > 0) {
                              setRowsPerPage(size);
                              setRowsPage(1);
                              fetchRows(1, size);
                            }
                          }}
                          options={[
                            { label: "10", value: "10" },
                            { label: "25", value: "25" },
                            { label: "50", value: "50" },
                            { label: "100", value: "100" }
                          ]}
                          clearable={false}
                        />
                      </div>
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden min-[540px]:block" />

                    {/* Combined Pagination Bar */}
                    <div className="h-[34px] inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-500 dark:text-gray-300 shadow-sm overflow-hidden">
                      <span className="px-2 sm:px-2.5 font-medium whitespace-nowrap border-r border-gray-200 dark:border-gray-700 h-full flex items-center select-none text-[11px] sm:text-xs">
                        {totalRowsCount === 0 ? 0 : (rowsPage - 1) * (rowsPerPage > 0 ? rowsPerPage : 10) + 1}-{Math.min(rowsPage * (rowsPerPage > 0 ? rowsPerPage : 10), totalRowsCount)} of {totalRowsCount}
                      </span>

                      <button
                        type="button"
                        className="w-8 shrink-0 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-700"
                        onClick={handlePrevPage}
                        disabled={rowsPage === 1 || isLoadingRows}
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div className="flex items-center gap-1 px-1.5 sm:px-2 h-full">
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 select-none">Page</span>
                        <input
                          type="number"
                          min={1}
                          max={Math.ceil(totalRowsCount / (rowsPerPage > 0 ? rowsPerPage : 10)) || 1}
                          value={rowsPage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const safeRowsPerPage = rowsPerPage > 0 ? rowsPerPage : 10;
                            const maxPage = Math.ceil(totalRowsCount / safeRowsPerPage) || 1;
                            if (!isNaN(val) && val >= 1 && val <= maxPage) {
                              setRowsPage(val);
                              fetchRows(val, safeRowsPerPage);
                            }
                          }}
                          className="w-10 sm:w-12 h-6 text-center text-xs font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 select-none">
                          of {Math.ceil(totalRowsCount / (rowsPerPage > 0 ? rowsPerPage : 10)) || 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="w-8 shrink-0 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200 dark:border-gray-700"
                        onClick={handleNextPage}
                        disabled={rowsPage * (rowsPerPage > 0 ? rowsPerPage : 10) >= totalRowsCount || isLoadingRows}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2">Row</th>
                        <th className="px-4 py-2">Dest/Country</th>
                        <th className="px-4 py-2">MCC/MNC</th>
                        <th className="px-4 py-2">Rate</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr key={row.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-4 py-2">{row.rowNo}</td>
                          <td className="px-4 py-2">{row.rawDestination || row.rawCountryCode}</td>
                          <td className="px-4 py-2">{row.rawMcc} / {row.rawMnc}</td>
                          <td className="px-4 py-2 font-medium">{row.importedRate}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${row.rowStatus === 'VALID' || row.rowStatus === 'NEW' ? 'bg-green-100 text-green-800' :
                                row.rowStatus === 'INVALID' || row.rowStatus === 'UNMAPPED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {row.rowStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No parsed rows found for this batch.</p>
              )}
            </fieldset>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900 z-10 pb-2">
          <Button type="button" variant="secondary" onClick={onClose} className={isViewMode ? "" : "mr-2"}>
            {isViewMode ? "Close Details" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update Status"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};