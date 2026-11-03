import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

interface PdfViewerProps {
  /** A data:application/pdf;base64,... URI, a blob: URL, or an http(s) URL. */
  src: string;
  className?: string;
}

const dataUriToBytes = (dataUri: string): Uint8Array => {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const PdfViewer: React.FC<PdfViewerProps> = ({ src, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const baseWidthRef = useRef<number | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the document whenever `src` changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setNumPages(0);
    setPageNum(1);
    baseWidthRef.current = null;

    let loadingTask: ReturnType<typeof pdfjsLib.getDocument>;
    try {
      if (src.startsWith("data:")) {
        const bytes = dataUriToBytes(src);
        if (bytes.length === 0) {
          throw new Error("EMPTY_PDF");
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else {
        loadingTask = pdfjsLib.getDocument({ url: src });
      }
    } catch (err: unknown) {
      console.error("Failed to prepare PDF document for loading:", err);
      setError(
        err instanceof Error && err.message === "EMPTY_PDF"
          ? "The generated PDF is empty."
          : "Could not load this PDF document."
      );
      setIsLoading(false);
      return;
    }

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load PDF document:", err);
        setError("Could not load this PDF document.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      pdfDocRef.current = null;
      loadingTask.destroy();
    };
  }, [src]);

  // Render the current page at the current scale, fit to the container width
  // the first time a page is drawn so the initial view matches the old
  // `view=FitH` behavior.
  const renderPage = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container) return;

    try {
      const page = await pdf.getPage(pageNum);
      const effectiveScale = scale;

      if (baseWidthRef.current === null) {
        const unscaledViewport = page.getViewport({ scale: 1 });
        const available = container.clientWidth - 32; // match px padding below
        const fitScale = Math.min(
          Math.max(available / unscaledViewport.width, MIN_SCALE),
          MAX_SCALE
        );
        baseWidthRef.current = fitScale;
        setScale(fitScale);
        return; // the scale update above re-triggers this effect
      }

      const viewport = page.getViewport({ scale: effectiveScale });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTaskRef.current?.cancel();
      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const task = page.render({
        canvas,
        viewport,
        transform,
      });
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== "RenderingCancelledException") {
        console.error("Failed to render PDF page:", err);
      }
    }
  }, [pageNum, scale]);

  useEffect(() => {
    if (!isLoading && numPages > 0) {
      renderPage();
    }
  }, [isLoading, numPages, renderPage]);

  const goToPage = (next: number) => {
    setPageNum(Math.min(Math.max(next, 1), numPages || 1));
  };

  const zoomBy = (delta: number) => {
    setScale((s) => Math.min(Math.max(s + delta, MIN_SCALE), MAX_SCALE));
  };

  const resetZoom = () => {
    baseWidthRef.current = null;
    renderPage();
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className={`flex h-full w-full flex-col ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[70px] text-center text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
            {numPages > 0 ? `${pageNum} / ${numPages}` : "–"}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pageNum + 1)}
            disabled={pageNum >= numPages}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(-SCALE_STEP)}
            disabled={scale <= MIN_SCALE}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[44px] text-center text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(SCALE_STEP)}
            disabled={scale >= MAX_SCALE}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="ml-1 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Fit to width"
            title="Fit to width"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4 dark:bg-gray-900"
      >
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-500">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Loading PDF document...</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-sm bg-white shadow-md"
            />
          </div>
        )}
      </div>
    </div>
  );
};
