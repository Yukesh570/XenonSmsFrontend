import React, { useState, useEffect, useRef } from "react";
import Select from "./Select";
import LoadingSpinner from "./LoadingSpinner";
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

  // Column Resizing & Persistence
  storageKey?: string;
  resizableColumns?: boolean;
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
  storageKey,
  resizableColumns = true,
}: DataTableProps<T>) {
  const [clientPage, setClientPage] = useState(1);
  const [clientRows, setClientRows] = useState(50);

  // Jump-to-page input state
  const [jumpInput, setJumpInput] = useState("");

  // Column Resizing & Persistence state
  const effectiveStorageKey =
    storageKey ||
    (typeof window !== "undefined" && window.location
      ? `table_col_widths_${window.location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "default"}`
      : "table_col_widths_default");

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(effectiveStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch (e) {
        console.error("Error loading column widths from localStorage", e);
      }
    }
    return {};
  });

  const saveWidths = (widths: Record<string, number>) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(effectiveStorageKey, JSON.stringify(widths));
      } catch (e) {
        console.error("Error saving column widths to localStorage", e);
      }
    }
  };

  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const isResizingRef = useRef(false);
  const [resizingHeaderIdx, setResizingHeaderIdx] = useState<number | null>(null);

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

  // Check if first column is an S.N. column (non-reorderable serial number)
  const hasSnColumn =
    headers.length > 0 &&
    typeof headers[0] === "string" &&
    (headers[0].trim() === "S.N." ||
      headers[0].trim() === "S.N" ||
      headers[0].trim() === "SN" ||
      headers[0].trim() === "#");
  const columnOffset = hasSnColumn ? 1 : 0;

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (hasSnColumn && index === 0) return;
    hasDraggedRef.current = true;
    setDraggedHeaderIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (
      (hasSnColumn && index === 0) ||
      draggedHeaderIdx === null ||
      draggedHeaderIdx === index
    ) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Detect left vs right half of the target header
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const side = e.clientX < midpoint ? "left" : "right";

    if (dragOverHeaderIdx !== index || dropSide !== side) {
      setDragOverHeaderIdx(index);
      setDropSide(side);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverHeaderIdx(null);
      setDropSide(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (
      draggedHeaderIdx !== null &&
      (!hasSnColumn || index !== 0) &&
      draggedHeaderIdx !== index &&
      onReorderColumns
    ) {
      // Calculate drop position accurately from cursor coordinates
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const currentSide = e.clientX < midpoint ? "left" : "right";

      const fromIdx = draggedHeaderIdx - columnOffset;
      const targetDataIdx = index - columnOffset;

      let toIdx = targetDataIdx;
      if (fromIdx < targetDataIdx) {
        // Dragging right / forward:
        // Dropping on left half means inserting before target -> targetDataIdx - 1
        // Dropping on right half means inserting after target -> targetDataIdx
        toIdx = currentSide === "left" ? targetDataIdx - 1 : targetDataIdx;
      } else if (fromIdx > targetDataIdx) {
        // Dragging left / backward:
        // Dropping on left half means inserting before target -> targetDataIdx
        // Dropping on right half means inserting after target -> targetDataIdx + 1
        toIdx = currentSide === "left" ? targetDataIdx : targetDataIdx + 1;
      }

      if (toIdx !== fromIdx && toIdx >= 0) {
        onReorderColumns(fromIdx, toIdx);
      }
    }

    setDraggedHeaderIdx(null);
    setDragOverHeaderIdx(null);
    setDropSide(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 200);
  };

  const handleDragEnd = () => {
    setDraggedHeaderIdx(null);
    setDragOverHeaderIdx(null);
    setDropSide(null);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 200);
  };

  // --- Dynamic Column Resizing Handlers ---
  const handleResizeStart = (
    e: React.MouseEvent,
    index: number,
    header: string
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const thEl = thRefs.current[index];
    if (!thEl) return;

    isResizingRef.current = true;
    setResizingHeaderIdx(index);

    const startX = e.clientX;
    const startWidth = thEl.getBoundingClientRect().width;
    const minWidth = hasSnColumn && index === 0 ? 56 : 80;

    // Snapshot currently rendered widths for any unset columns so they stay steady
    const baseWidths: Record<string, number> = { ...columnWidths };
    headers.forEach((h, idx) => {
      if (!baseWidths[h]) {
        if (hasSnColumn && idx === 0) {
          baseWidths[h] = 56;
        } else if (thRefs.current[idx]) {
          baseWidths[h] = Math.max(50, Math.round(thRefs.current[idx]!.getBoundingClientRect().width));
        }
      }
    });

    let lastWidth = startWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + deltaX));
      lastWidth = newWidth;

      setColumnWidths({
        ...baseWidths,
        [header]: newWidth,
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const finalWidths = {
        ...baseWidths,
        [header]: lastWidth,
      };
      setColumnWidths(finalWidths);
      saveWidths(finalWidths);

      setTimeout(() => {
        isResizingRef.current = false;
        setResizingHeaderIdx(null);
      }, 100);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleAutoFitColumn = (e: React.MouseEvent, index: number, header: string) => {
    e.stopPropagation();
    e.preventDefault();

    const thEl = thRefs.current[index];
    if (!thEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // 1. Calculate required full header width (all words completely visible)
    if (ctx) {
      ctx.font = "bold 12px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    }
    const uppercaseHeader = typeof header === "string" ? header.toUpperCase() : "";
    const headerTextWidth = ctx && uppercaseHeader
      ? ctx.measureText(uppercaseHeader).width * 1.08
      : (thEl.querySelector("span")?.scrollWidth || 50);
    // Include 32px padding + 14px grip icon + 6px gap + 16px sort icon + 8px pr-2 + 12px resizer + 16px buffer
    const headerWidth = Math.max(hasSnColumn && index === 0 ? 56 : 95, Math.round(headerTextWidth + 95));

    // 2. Calculate required data width by scanning visible cells in this column
    let maxDataTextWidth = 0;
    const tableEl = scrollContainerRef.current?.querySelector("table");
    if (tableEl) {
      const rows = tableEl.querySelectorAll("tbody tr");
      const sampleLimit = Math.min(rows.length, 50);

      if (ctx) {
        ctx.font = "14px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      }

      for (let r = 0; r < sampleLimit; r++) {
        const cell = rows[r].children[index] as HTMLElement;
        if (cell && !cell.hasAttribute("colspan")) {
          const text = cell.innerText.replace(/\n/g, " ").trim();
          if (text && text !== "-") {
            const textWidth = ctx ? ctx.measureText(text).width : text.length * 8.5;
            if (textWidth > maxDataTextWidth) {
              maxDataTextWidth = textWidth;
            }
          }
        }
      }
    }

    // Measure width required to show AT LEAST the first full word of the header (never just 1 letter)
    const firstWord = (typeof header === "string" ? header.trim().split(/\s+/)[0] : "") || "";
    const firstWordUpper = firstWord.toUpperCase();
    const firstWordTextWidth = ctx && firstWordUpper
      ? ctx.measureText(firstWordUpper).width * 1.08
      : (firstWordUpper.length * 8.5);
    const minFirstWordWidth = Math.max(85, Math.round(firstWordTextWidth + 72));

    // Minimum data column width: must show AT LEAST the first full word of the header
    const minDataW = hasSnColumn && index === 0 ? 56 : minFirstWordWidth;
    const dataWidth = maxDataTextWidth > 0
      ? Math.max(minDataW, Math.round(maxDataTextWidth + 36))
      : headerWidth;

    // 3. Toggle logic:
    // If currently already near dataWidth, toggle back to full headerWidth!
    // Otherwise, toggle to dataWidth!
    const currentWidth = columnWidths[header] || Math.round(thEl.getBoundingClientRect().width);

    let nextWidth: number;
    if (Math.abs(currentWidth - dataWidth) <= 12 && dataWidth !== headerWidth) {
      // It's already shrunk to data length -> toggle back to full header length!
      nextWidth = headerWidth;
    } else {
      // It's at header length (or custom) -> shrink to data length (showing at least 1 full word)!
      nextWidth = dataWidth;
    }

    setColumnWidths((prev) => {
      const next = { ...prev, [header]: nextWidth };
      saveWidths(next);
      return next;
    });
  };

  const hasCustomWidths = Object.keys(columnWidths).length > 0;
  const isResizingActive = resizingHeaderIdx !== null;
  const isFixedLayout = Boolean(resizableColumns && (hasCustomWidths || isResizingActive));

  const getColWidth = (header: string, index: number) => {
    if (columnWidths[header]) {
      return columnWidths[header];
    }
    if (hasSnColumn && index === 0) {
      return 56;
    }
    return undefined;
  };

  const totalTableWidth = headers.reduce((sum, h, i) => {
    const w = getColWidth(h, i) || (hasSnColumn && i === 0 ? 56 : 140);
    return sum + w;
  }, 0);

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
                  onWheel={(e) => e.currentTarget.blur()}
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
        <table
          className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0 ${
            isFixedLayout ? "table-resizable-active" : ""
          }`}
          style={
            isFixedLayout
              ? {
                  tableLayout: "fixed",
                  width: `${Math.max(totalTableWidth, containerWidth || 0)}px`,
                }
              : undefined
          }
        >
          {isFixedLayout && (
            <colgroup>
              {headers.map((h, i) => {
                const w = getColWidth(h, i);
                return (
                  <col
                    key={i}
                    style={{
                      width: w ? `${w}px` : undefined,
                      minWidth: w ? `${w}px` : undefined,
                    }}
                  />
                );
              })}
            </colgroup>
          )}
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
            <tr>
              {headers.map((header, i) => {
                const isDraggable = Boolean(
                  onReorderColumns && (!hasSnColumn || i > 0)
                );
                const isBeingDragged = draggedHeaderIdx === i;
                const isDragOver = dragOverHeaderIdx === i;
                const isSortable = Boolean(
                  onSort && (!hasSnColumn || i > 0)
                );
                const isSorted = sortColumnIndex === i;
                const colWidth = getColWidth(header, i);
                const isBeingResized = resizingHeaderIdx === i;

                return (
                  <th
                    key={i}
                    ref={(el) => {
                      thRefs.current[i] = el;
                    }}
                    draggable={isDraggable && !isBeingResized}
                    onDragStart={(e) => {
                      if (isResizingRef.current || isBeingResized) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, i);
                    }}
                    onDragOver={(e) => {
                      if (isResizingRef.current || isBeingResized) return;
                      handleDragOver(e, i);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      if (isResizingRef.current || isBeingResized) return;
                      handleDrop(e, i);
                    }}
                    onDragEnd={handleDragEnd}
                    style={
                      isFixedLayout
                        ? {
                            width: colWidth ? `${colWidth}px` : undefined,
                            minWidth: colWidth
                              ? `${colWidth}px`
                              : hasSnColumn && i === 0
                              ? "56px"
                              : "50px",
                            maxWidth: colWidth ? `${colWidth}px` : undefined,
                          }
                        : undefined
                    }
                    title={typeof header === "string" ? header : undefined}
                    className={`group px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-all select-none relative ${
                      !colWidth && (!hasSnColumn || i > 0) ? "min-w-[80px]" : ""
                    } ${
                      isSorted
                        ? "text-primary dark:text-primary bg-primary/[0.03] dark:bg-primary/[0.06]"
                        : "text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-900"
                    } hover:bg-gray-100 dark:hover:bg-gray-800 ${
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
                      if (hasDraggedRef.current || isResizingRef.current || isBeingResized) return;
                      if (isSortable && onSort) {
                        onSort(i);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2 overflow-hidden">
                      {isDraggable && (
                        <GripVertical
                          size={14}
                          className="text-gray-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pointer-events-auto"
                        />
                      )}
                      <span
                        className={`truncate pointer-events-none ${
                          isSorted ? "font-semibold text-primary dark:text-white" : ""
                        }`}
                        title={typeof header === "string" ? header : undefined}
                      >
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

                    {/* Single Boundary Line that acts as Column Resizer */}
                    {resizableColumns && (
                      <div
                        onMouseDown={(e) => handleResizeStart(e, i, header)}
                        onDoubleClick={(e) => handleAutoFitColumn(e, i, header)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-end group/resizer select-none"
                        title="Drag to resize column (Double-click to auto-fit)"
                      >
                        <div
                          className={`w-px h-full transition-all ${
                            isBeingResized
                              ? "bg-primary w-[2px]"
                              : "bg-gray-200 dark:bg-gray-700/90 group-hover/resizer:bg-primary group-hover/resizer:w-[2px]"
                          }`}
                        />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800"
            onMouseOver={(e) => {
              const target = e.target as HTMLElement;
              const td = target.closest("td");
              if (td && !td.getAttribute("title")) {
                const text = td.innerText?.trim();
                if (text && text !== "-") {
                  td.setAttribute("title", text);
                }
              }
            }}
          >
            {isLoading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-0 border-none"
                >
                  <div
                    className="sticky left-0"
                    style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
                  >
                    <LoadingSpinner className="py-16" />
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

        /* Dynamic adjustable column widths & text truncation with ellipsis */
        .app-data-table table.table-resizable-active {
          table-layout: fixed !important;
        }
        .app-data-table table.table-resizable-active th {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .app-data-table table.table-resizable-active td {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 0 !important;
        }
        .app-data-table table.table-resizable-active td[colspan] {
          white-space: normal !important;
          max-width: none !important;
          overflow: visible !important;
        }
        .app-data-table table.table-resizable-active td > span:not([class*="badge"]),
        .app-data-table table.table-resizable-active td > a,
        .app-data-table table.table-resizable-active td > p,
        .app-data-table table.table-resizable-active td > div:not([class*="menu"]):not([class*="dropdown"]) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-block;
          max-width: 100%;
          vertical-align: middle;
        }

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