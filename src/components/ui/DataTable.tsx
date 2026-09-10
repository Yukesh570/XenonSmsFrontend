import React, { useState, useEffect, useRef } from "react";
import Select from "./Select";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  headers: string[];
  renderRow: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  headerActions?: React.ReactNode;

  hideTopBar?: boolean;
  showCountOnly?: boolean;
  density?: "normal" | "compact";

  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
  rowsPerPageOptions?: { value: string; label: string }[];

  // Column Reordering Callback
  onReorderColumns?: (fromIndex: number, toIndex: number) => void;

  // Sorting
  onSort?: (columnIndex: number) => void;
  sortColumnIndex?: number | null;
  sortDirection?: "asc" | "desc" | null;

  emptyMessage?: string;
  errorMessage?: string | null;
}

const rowsOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

export function DataTable<T extends { id?: number | string }>({
  data,
  headers,
  renderRow,
  isLoading = false,
  headerActions,
  hideTopBar = false,
  showCountOnly = false,
  density = "normal",

  serverSide = false,
  totalItems = 0,
  currentPage = 1,
  rowsPerPage = 50,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = rowsOptions,

  onReorderColumns,
  onSort,
  sortColumnIndex = null,
  sortDirection = null,
  emptyMessage,
  errorMessage,
}: DataTableProps<T>) {
  const [clientPage, setClientPage] = useState(1);
  const [clientRows, setClientRows] = useState(50);

  // Jump-to-page input state
  const [jumpInput, setJumpInput] = useState("");

  // Drag-and-drop states with Left/Right positioning
  const [draggedHeaderIdx, setDraggedHeaderIdx] = useState<number | null>(null);
  const [dragOverHeaderIdx, setDragOverHeaderIdx] = useState<number | null>(null);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const hasDraggedRef = useRef(false);

  // Track scroll container viewport width to perfectly center sticky empty states
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    updateWidth();

    const el = scrollContainerRef.current;
    if (!el) return;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateWidth();
      });
      resizeObserver.observe(el);
    } else {
      window.addEventListener("resize", updateWidth);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const activePage = serverSide ? currentPage : clientPage;
  const activeRows = serverSide ? rowsPerPage : clientRows;
  const activeTotal = serverSide ? totalItems : data.length;

  const totalPages = Math.max(1, Math.ceil(activeTotal / activeRows));
  const startIndex = (activePage - 1) * activeRows;

  // Keep jump input synced with active page
  useEffect(() => {
    setJumpInput(String(activePage));
  }, [activePage]);

  const displayData = serverSide
    ? data
    : data.slice(startIndex, startIndex + activeRows);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    if (serverSide && onPageChange) onPageChange(validPage);
    else setClientPage(validPage);
  };

  const handleNext = () => {
    goToPage(activePage + 1);
  };

  const handlePrev = () => {
    goToPage(activePage - 1);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setJumpInput(String(activePage));
    }
  };

  const handleJumpBlur = () => {
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setJumpInput(String(activePage));
    }
  };

  const handleRowsChange = (val: number) => {
    if (serverSide && onRowsPerPageChange) {
      onRowsPerPageChange(val);
      if (onPageChange) onPageChange(1);
    } else {
      setClientRows(val);
      setClientPage(1);
    }
  };

  const paginationLabel = `${
    activeTotal === 0
      ? 0
      : serverSide
        ? (activePage - 1) * activeRows + 1
        : startIndex + 1
  }-${Math.min(
    (serverSide ? (activePage - 1) * activeRows : startIndex) +
      displayData.length,
    activeTotal,
  )} of ${activeTotal}`;

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0) return; // Skip S.N. column
    hasDraggedRef.current = true;
    setDraggedHeaderIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (index === 0 || draggedHeaderIdx === null || draggedHeaderIdx === index) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Detect left vs right half of the target header
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const side = e.clientX < midpoint ? "left" : "right";

    setDragOverHeaderIdx(index);
    setDropSide(side);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverHeaderIdx(null);
      setDropSide(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (
      draggedHeaderIdx !== null &&
      index !== 0 &&
      draggedHeaderIdx !== index &&
      onReorderColumns
    ) {
      // Calculate target index offset by S.N. column (-1)
      let targetIdx = index - 1;
      let fromIdx = draggedHeaderIdx - 1;

      // Adjust target position if dropped on right half
      if (dropSide === "right" && targetIdx < fromIdx) {
        targetIdx += 1;
      } else if (dropSide === "left" && targetIdx > fromIdx) {
        targetIdx -= 1;
      }

      onReorderColumns(fromIdx, targetIdx);
    }

    setDraggedHeaderIdx(null);
    setDragOverHeaderIdx(null);
    setDropSide(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedHeaderIdx(null);
    setDragOverHeaderIdx(null);
    setDropSide(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  return (
    <div
      className={`rounded-xl bg-white shadow-card overflow-hidden dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col relative z-0 app-data-table ${
        density === "compact" ? "table-density-compact" : ""
      }`}
    >
      {/* FULL TOP BAR */}
      {!hideTopBar && !showCountOnly && (
        <div className="flex flex-row flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 gap-2 bg-white dark:bg-gray-800 relative z-10">
          <div className="flex flex-row flex-wrap items-center gap-1.5 sm:gap-2.5">
            {/* Rows Per Page */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap hidden min-[540px]:inline">
                Rows per page:
              </span>
              <span className="text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap min-[540px]:hidden">
                Rows:
              </span>
              <div className="w-16 sm:w-20 shrink-0 rows-per-page-select">
                <Select
                  value={String(activeRows)}
                  onChange={(val) => handleRowsChange(Number(val))}
                  options={rowsPerPageOptions}
                  clearable={false}
                />
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden min-[540px]:block" />

            {/* Combined Pagination Bar */}
            <div className="h-[34px] inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-text-secondary dark:text-gray-300 shadow-sm overflow-hidden">
              {/* Range Count */}
              <span className="px-2 sm:px-2.5 font-medium whitespace-nowrap border-r border-gray-200 dark:border-gray-700 h-full flex items-center select-none text-[11px] sm:text-xs">
                {paginationLabel}
              </span>

              {/* Previous Button */}
              <button
                type="button"
                className="h-full px-1.5 sm:px-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-700"
                onClick={handlePrev}
                disabled={activePage === 1 || isLoading}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Jumper */}
              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 px-1.5 sm:px-2 h-full">
                <span className="text-[11px] sm:text-xs text-text-secondary dark:text-gray-400 select-none">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onBlur={handleJumpBlur}
                  disabled={isLoading || totalPages <= 1}
                  className="w-8 sm:w-10 h-5 text-center text-xs font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                />
                <span className="text-[11px] sm:text-xs text-text-secondary dark:text-gray-400 select-none">
                  of {totalPages}
                </span>
              </form>

              {/* Next Button */}
              <button
                type="button"
                className="h-full px-1.5 sm:px-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200 dark:border-gray-700"
                onClick={handleNext}
                disabled={
                  activePage >= totalPages || activeTotal === 0 || isLoading
                }
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>
      )}

      {/* COUNT ONLY TOP BAR */}
      {showCountOnly && (
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3.5 py-2 bg-white dark:bg-gray-800 relative z-10">
          <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">
            {paginationLabel}
          </span>
          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>
      )}

      {/* SCROLLABLE DATA TABLE */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto max-h-[72vh] min-h-[300px] relative z-0 custom-scrollbar"
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
            <tr>
              {headers.map((header, i) => {
                const isDraggable = Boolean(onReorderColumns && i > 0);
                const isBeingDragged = draggedHeaderIdx === i;
                const isDragOver = dragOverHeaderIdx === i;
                const isSortable = Boolean(onSort && i > 0);
                const isSorted = sortColumnIndex === i;

                return (
                  <th
                    key={i}
                    draggable={isDraggable}
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`group px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[120px] transition-all select-none ${
                      isSorted
                        ? "text-primary dark:text-primary bg-primary/[0.03] dark:bg-primary/[0.06]"
                        : "text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-900"
                    } ${
                      isDraggable
                        ? "cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800"
                        : ""
                    } ${
                      isSortable
                        ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        : ""
                    } ${
                      isBeingDragged
                        ? "opacity-30 border border-dashed border-primary bg-primary/5"
                        : ""
                    } ${
                      isDragOver && dropSide === "left"
                        ? "border-l-4 border-l-primary bg-primary/10 dark:bg-primary/20"
                        : ""
                    } ${
                      isDragOver && dropSide === "right"
                        ? "border-r-4 border-r-primary bg-primary/10 dark:bg-primary/20"
                        : ""
                    }`}
                    onClick={() => {
                      if (hasDraggedRef.current) return;
                      if (isSortable && onSort) {
                        onSort(i);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5 pointer-events-none">
                      {isDraggable && (
                        <GripVertical
                          size={14}
                          className="text-gray-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                      <span className={isSorted ? "font-semibold text-primary dark:text-white" : ""}>
                        {header}
                      </span>
                      {isSortable && (
                        <span className="inline-flex items-center shrink-0 ml-0.5">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUp size={13} className="text-primary stroke-[2.5]" />
                            ) : (
                              <ArrowDown size={13} className="text-primary stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown
                              size={12}
                              className="text-gray-400 opacity-0 group-hover:opacity-70 transition-opacity"
                            />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-0 border-none"
                >
                  <div
                    className="sticky left-0 flex flex-col items-center justify-center py-16 text-center text-text-secondary dark:text-gray-400"
                    style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-0 border-none"
                >
                  <div
                    className="sticky left-0 flex flex-col items-center justify-center py-16 text-center text-text-secondary dark:text-gray-400"
                    style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
                  >
                    <Database
                      size={32}
                      className="text-gray-300 dark:text-gray-600 mb-2"
                    />
                    <span>{errorMessage || emptyMessage || "No records found."}</span>
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

        .app-data-table tbody tr:nth-child(odd) { background-color: #ffffff; }
        .app-data-table tbody tr:nth-child(even) { background-color: #f9fafb; }
        .dark .app-data-table tbody tr:nth-child(odd) { background-color: #1f2937; }
        .dark .app-data-table tbody tr:nth-child(even) { background-color: rgba(17, 24, 39, 0.4); }

        .app-data-table tbody tr:hover { background-color: #f3f4f6; }
        .dark .app-data-table tbody tr:hover { background-color: #374151; }

        .table-density-compact td { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }
        .table-density-compact th { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .table-density-compact th:first-child,
        .table-density-compact td:first-child { min-width: 56px !important; width: 56px !important; }

        .rows-per-page-select {
          height: 34px !important;
          display: flex !important;
          align-items: center !important;
        }
        .rows-per-page-select > div {
          height: 34px !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }
        .rows-per-page-select div.relative.w-full {
          height: 34px !important;
        }
        .rows-per-page-select div[class*="rounded-lg"] {
          height: 34px !important;
          min-height: 34px !important;
          max-height: 34px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
        }
        .rows-per-page-select input {
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          line-height: 32px !important;
          font-size: 0.8125rem !important;
        }
        .rows-per-page-select button {
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
        }
      `,
        }}
      />
    </div>
  );
}

export default DataTable;