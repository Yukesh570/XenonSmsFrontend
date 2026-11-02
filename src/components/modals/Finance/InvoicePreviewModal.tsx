import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Download } from "lucide-react";
import Button from "../../ui/Button";

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
    }
  }, [isOpen]);

  // Track container dimensions to fit whole A4 page dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const baseHeight = Math.max(380, containerSize.height - 32);
  const baseWidth = Math.round(baseHeight * (210 / 297));

  // Convert base64 to Blob URL for clean PDF rendering
  useEffect(() => {
    if (!pdfUrl) {
      setBlobUrl(null);
      return;
    }

    if (pdfUrl.startsWith("data:application/pdf;base64,")) {
      try {
        const base64Data = pdfUrl.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Failed to convert base64 to blob:", e);
        setBlobUrl(pdfUrl);
      }
    } else {
      setBlobUrl(pdfUrl);
    }
  }, [pdfUrl]);

  // Handle Trackpad Pinch-to-Zoom & Ctrl+Wheel (Prevents whole browser/site from zooming)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Prevent native browser page zoom
        e.preventDefault();
        e.stopPropagation();

        const factor = Math.abs(e.deltaY) > 50 ? 0.003 : 0.01;
        const zoomDelta = -e.deltaY * factor;

        setZoom((prev) => {
          const next = prev + zoomDelta;
          // Minimum is 1.0 (single view), maximum is 3.0
          return Math.min(3.0, Math.max(1.0, Number(next.toFixed(3))));
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen, blobUrl]);

  // Drag to pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || !containerRef.current) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    containerRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Double-click to toggle zoom
  const handleDoubleClick = () => {
    setZoom((prev) => (prev > 1.05 ? 1 : 1.75));
  };

  if (!isOpen) return null;

  const handleDownload = () => {
    const targetUrl = blobUrl || pdfUrl;
    if (!targetUrl) return;
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = "Invoice.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const iframeSrc = blobUrl ? `${blobUrl}#toolbar=0&navpanes=0&view=Fit` : "";

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

        {/* Body - Single View whole A4 page container with isolated trackpad zoom */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className={`w-full h-[76vh] bg-gray-200/90 dark:bg-gray-950 overflow-auto flex p-4 relative select-none ${
            zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          }`}
        >
          {blobUrl ? (
            <div
              style={{
                width: `${Math.round(baseWidth * zoom)}px`,
                height: `${Math.round(baseHeight * zoom)}px`,
                minWidth: `${Math.round(baseWidth * zoom)}px`,
                minHeight: `${Math.round(baseHeight * zoom)}px`,
              }}
              className="m-auto relative shrink-0"
            >
              <div
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                className="bg-white shadow-2xl rounded-sm overflow-hidden border border-gray-300/60 dark:border-gray-800 pointer-events-none"
              >
                <iframe
                  src={iframeSrc}
                  title="Invoice Preview"
                  className="w-full h-full border-0 outline-none pointer-events-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full text-gray-500 dark:text-gray-400 gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading PDF document...</p>
            </div>
          )}

          {/* Discreet Reset Pill (Only visible when zoomed) */}
          {zoom > 1.05 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="absolute bottom-4 right-4 z-10 px-3 py-1 text-xs font-semibold bg-gray-900/80 text-white rounded-full shadow-lg backdrop-blur-sm hover:bg-gray-900 transition-all cursor-pointer"
            >
              {Math.round(zoom * 100)}% • Reset
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {blobUrl && (
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