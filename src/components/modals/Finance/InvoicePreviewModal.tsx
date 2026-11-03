import React from "react";
import { createPortal } from "react-dom";
import { X, FileText, Download } from "lucide-react";
import Button from "../../ui/Button";
import { PdfViewer } from "../../pdf/PdfViewer";

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  onGenerate?: () => void;
  isGenerating?: boolean;
  title?: string;
  onViewInvoices?: () => void;
  summaryData?: any;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  title = "Invoice Preview",
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "Invoice.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - rendered via pdf.js (canvas), with our own controllable toolbar */}
        <div className="w-full h-[76vh] bg-gray-100 dark:bg-gray-900">
          {pdfUrl ? (
            <PdfViewer src={pdfUrl} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full text-gray-500 dark:text-gray-400 gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading PDF document...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {pdfUrl && (
            <Button
              variant="primary"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              <span>Download PDF</span>
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicePreviewModal;
