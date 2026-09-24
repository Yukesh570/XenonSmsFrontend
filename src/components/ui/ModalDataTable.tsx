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
  RotateCcw,
} from "lucide-react";

export interface ModalDataTableProps<T> {
  data: T[];
  headers: string[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderFilterCell?: (header: string, index: number) => React.ReactNode;
  isLoading?: boolean;
  headerActions?: React.ReactNode;

  hideTopBar?: boolean;
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
  columnKeys?: string[];

  emptyMessage?: string;
  errorMessage?: string | null;

  // Filter Reset Option
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;

  // Column Resizing & Persistence
  storageKey?: string;
  resizableColumns?: boolean;

  // Custom table max-height
  tableMaxHeight?: string | number;
}

const defaultRowsOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

export function ModalDataTable<T extends Record<string, any> = any>({
  data,
  headers,
  renderRow,
  renderFilterCell,
  isLoading = false,
  headerActions,
  hideTopBar = false,
  density = "compact",

  serverSide = false,
  totalItems = 0,
  currentPage = 1,
  rowsPerPage = 50,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = defaultRowsOptions,

  onReorderColumns,
  onSort,
  sortColumnIndex = null,
  sortDirection = null,
  columnKeys,
  emptyMessage,
  errorMessage,

  hasActiveFilters = false,
  onResetFilters,

  storageKey,
  resizableColumns = true,
  tableMaxHeight = "58vh",
}: ModalDataTableProps<T>) {
  const [clientPage, setClientPage] = useState(1);
  const [clientRows, setClientRows] = useState(rowsPerPage || 50);

  useEffect(() => {
    if (!serverSide) {
      setClientPage(1);
    }
  }, [data, serverSide]);

  useEffect(() => {
    if (!serverSide && rowsPerPage) {
      setClientRows(rowsPerPage);
    }
  }, [rowsPerPage, serverSide]);

  // Jump-to-page input state
  const [jumpInput, setJumpInput] = useState("");

  const effectiveStorageKey = storageKey
    ? `modal_col_widths_${storageKey}`
    : typeof window !== "undefined" && window.location
    ? `modal_col_widths_${window.location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "default"}`
    : "modal_col_widths_default";

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(effectiveStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            delete parsed["S.N."];
            delete parsed["S.N"];
            delete parsed["SN"];
            delete parsed["#"];
            return parsed;
          }
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
        const cleaned = { ...widths };
        delete cleaned["S.N."];
        delete cleaned["S.N"];
        delete cleaned["SN"];
        delete cleaned["#"];
        localStorage.setItem(effectiveStorageKey, JSON.stringify(cleaned));
      } catch (e) {
        console.error("Error saving column widths to localStorage", e);
      }
    }
  };

  const thRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const isResizingRef = useRef(false);
  const [resizingHeaderIdx, setResizingHeaderIdx] = useState<number | null>(null);

  // Drag-and-drop states
  const [draggedHeaderIdx, setDraggedHeaderIdx] = useState<number | null>(null);
  const [dragOverHeaderIdx, setDragOverHeaderIdx] = useState<number | null>(null);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const hasDraggedRef = useRef(false);

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

  const [internalSortCol, setInternalSortCol] = useState<number | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<"asc" | "desc" | null>(null);

  const effectiveSortCol =
    sortColumnIndex !== undefined && sortColumnIndex !== null
      ? sortColumnIndex
      : internalSortCol;
  const effectiveSortDir =
    sortDirection !== undefined && sortDirection !== null
      ? sortDirection
      : internalSortDir;

  const processedData = React.useMemo(() => {
    if (effectiveSortCol === null || !effectiveSortDir || !data || data.length === 0) {
      return data;
    }

    let key = columnKeys && columnKeys[effectiveSortCol];
    if (!key && headers && headers[effectiveSortCol]) {
      const h = headers[effectiveSortCol];
      key =
        h.charAt(0).toLowerCase() +
        h.slice(1).replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9_]/g, "");
    }
    if (!key) return data;

    return [...data].sort((a: any, b: any) => {
      let aVal = a[key!];
      let bVal = b[key!];

      // Handle common field variations
      if (aVal === undefined) {
        if (key === "country_name") aVal = a.countryName ?? a.country;
        else if (key === "countryName") aVal = a.country_name ?? a.country;
        else if (key === "country") aVal = a.country_name ?? a.countryName;
      }
      if (bVal === undefined) {
        if (key === "country_name") bVal = b.countryName ?? b.country;
        else if (key === "countryName") bVal = b.country_name ?? b.country;
        else if (key === "country") bVal = b.country_name ?? b.countryName;
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined || aVal === "") return 1;
      if (bVal === null || bVal === undefined || bVal === "") return -1;

      // Numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== "boolean" && typeof bVal !== "boolean") {
        return effectiveSortDir === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Date comparison
      if (typeof aVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(aVal)) {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return effectiveSortDir === "asc" ? aDate - bDate : bDate - aDate;
        }
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const res = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
      return effectiveSortDir === "asc" ? res : -res;
    });
  }, [data, effectiveSortCol, effectiveSortDir, columnKeys, headers]);

  const activePage = serverSide ? currentPage : clientPage;
  const activeRows = serverSide ? rowsPerPage : clientRows;
  const activeTotal = serverSide ? totalItems : data.length;

  const totalPages = Math.max(1, Math.ceil(activeTotal / activeRows));
  const startIndex = (activePage - 1) * activeRows;

  useEffect(() => {
    setJumpInput(String(activePage));
  }, [activePage]);

  const displayData = serverSide
    ? processedData
    : processedData.slice(startIndex, startIndex + activeRows);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    if (serverSide && onPageChange) onPageChange(validPage);
    else setClientPage(validPage);
  };

  const handleNext = () => goToPage(activePage + 1);
  const handlePrev = () => goToPage(activePage - 1);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed)) goToPage(parsed);
    else setJumpInput(String(activePage));
  };

  const handleJumpBlur = () => {
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed)) goToPage(parsed);
    else setJumpInput(String(activePage));
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
    activeTotal,
    serverSide ? (activePage - 1) * activeRows + data.length : startIndex + activeRows
  )} of ${activeTotal}`;

  // Check if first column is an S.N. column (non-reorderable serial number)
  const firstHeaderRaw =
    headers.length > 0 && typeof headers[0] === "string"
      ? headers[0].trim().toUpperCase().replace(/[\s.]/g, "")
      : "";
  const hasSnColumn =
    headers.length > 0 &&
    (firstHeaderRaw === "SN" ||
      firstHeaderRaw === "SNO" ||
      firstHeaderRaw === "SLNO" ||
      firstHeaderRaw === "#" ||
      firstHeaderRaw === "NO");

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!onReorderColumns || (hasSnColumn && index === 0)) return;
    setDraggedHeaderIdx(index);
    hasDraggedRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!onReorderColumns || (hasSnColumn && index === 0) || draggedHeaderIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const thRect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - thRect.left;
    const isRightHalf = relativeX > thRect.width / 2;

    setDragOverHeaderIdx(index);
    setDropSide(isRightHalf ? "right" : "left");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverHeaderIdx(null);
      setDropSide(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedHeaderIdx === null || !onReorderColumns || (hasSnColumn && (draggedHeaderIdx === 0 || targetIndex === 0))) return;

    let finalDropIndex = targetIndex;
    if (dropSide === "right" && draggedHeaderIdx > targetIndex) {
      finalDropIndex = targetIndex + 1;
    } else if (dropSide === "left" && draggedHeaderIdx < targetIndex) {
      finalDropIndex = targetIndex - 1;
    }

    if (draggedHeaderIdx !== finalDropIndex) {
      onReorderColumns(draggedHeaderIdx, finalDropIndex);
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

  // Resize handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    index: number,
    header: string
  ) => {
    if (hasSnColumn && index === 0) return;
    e.stopPropagation();
    e.preventDefault();

    const thEl = thRefs.current[index];
    if (!thEl) return;

    isResizingRef.current = true;
    setResizingHeaderIdx(index);

    const startX = e.clientX;
    const startWidth = thEl.getBoundingClientRect().width;
    const minWidth = hasSnColumn && index === 0 ? 40 : 70;

    const baseWidths: Record<string, number> = { ...columnWidths };
    headers.forEach((h, idx) => {
      if (!baseWidths[h]) {
        if (hasSnColumn && idx === 0) {
          baseWidths[h] = 40;
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

  const isFixedLayout = true;

  const getColWidth = (header: string, index?: number) => {
    if (hasSnColumn && index === 0) {
      return 48;
    }
    if (columnWidths[header]) {
      return columnWidths[header];
    }
    return undefined;
  };

  const totalTableWidth = headers.reduce((sum, h, i) => {
    const w = getColWidth(h, i) || (hasSnColumn && i === 0 ? 48 : 120);
    return sum + w;
  }, 0);

  return (
    <div
      className={`rounded-lg bg-white shadow-card overflow-hidden dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col relative z-0 app-modal-data-table ${
        hasSnColumn ? "has-sn-column" : ""
      } ${
        density === "compact" ? "table-density-compact" : ""
      }`}
    >
      {/* Top Pagination & Action Bar */}
      {!hideTopBar && (
        <div className="flex flex-row flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 py-2 gap-2 bg-white dark:bg-gray-800 relative z-10">
          <div className="flex flex-row flex-wrap items-center gap-2">
            {/* Rows Per Page */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">
                Rows per page:
              </span>
              <div className="w-20 shrink-0">
                <Select
                  value={String(activeRows)}
                  onChange={(val) => handleRowsChange(Number(val))}
                  options={rowsPerPageOptions}
                  clearable={false}
                  placement="bottom"
                />
              </div>
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden min-[540px]:block" />

            {/* Pagination Controls */}
            <div className="h-[30px] inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-text-secondary dark:text-gray-300 shadow-sm overflow-hidden">
              <span className="px-2 font-medium whitespace-nowrap border-r border-gray-200 dark:border-gray-700 h-full flex items-center select-none text-[11px]">
                {paginationLabel}
              </span>

              <button
                type="button"
                className="h-full px-1.5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-700"
                onClick={handlePrev}
                disabled={activePage === 1 || isLoading}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 px-1.5 h-full">
                <span className="text-[11px] text-text-secondary dark:text-gray-400 select-none">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  onBlur={handleJumpBlur}
                  disabled={isLoading || totalPages <= 1}
                  className="w-8 h-4 text-center text-xs font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[11px] text-text-secondary dark:text-gray-400 select-none">
                  of {totalPages}
                </span>
              </form>

              <button
                type="button"
                className="h-full px-1.5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200 dark:border-gray-700"
                onClick={handleNext}
                disabled={activePage >= totalPages || activeTotal === 0 || isLoading}
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 transition-colors whitespace-nowrap"
                title="Reset all search filters"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>
      )}

      {/* Scrollable Modal Table Area */}
      <div
        ref={scrollContainerRef}
        style={{ maxHeight: typeof tableMaxHeight === "number" ? `${tableMaxHeight}px` : tableMaxHeight }}
        className="overflow-auto relative z-0 custom-scrollbar"
      >
        <table
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0 table-resizable-active"
          style={{
            tableLayout: "fixed",
            width: containerWidth
              ? `${Math.max(totalTableWidth, containerWidth)}px`
              : "100%",
          }}
        >
          <colgroup>
            {headers.map((h, i) => {
              const isSn = Boolean(hasSnColumn && i === 0);
              const w = getColWidth(h, i);
              return (
                <col
                  key={i}
                  width={isSn ? 48 : undefined}
                  style={{
                    width: isSn ? "48px" : (w ? `${w}px` : undefined),
                    minWidth: isSn ? "48px" : undefined,
                    maxWidth: isSn ? "48px" : undefined,
                  }}
                />
              );
            })}
          </colgroup>

          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm border-b border-gray-200 dark:border-gray-700">
            {/* Header Titles Row with Drag & Drop, Sort, and Resizing */}
            <tr>
              {headers.map((header, i) => {
                const isSn = Boolean(hasSnColumn && i === 0);
                const isDraggable = Boolean(onReorderColumns && !isSn);
                const isBeingDragged = draggedHeaderIdx === i;
                const isDragOver = dragOverHeaderIdx === i;
                const isSortable = Boolean(!isSn && (onSort || columnKeys || headers));
                const isSorted = effectiveSortCol === i;
                const colWidth = getColWidth(header, i);
                const isBeingResized = resizingHeaderIdx === i;

                return (
                  <th
                    key={i}
                    ref={(el) => {
                      thRefs.current[i] = el;
                    }}
                    draggable={isDraggable && !isBeingResized && !isSn}
                    onDragStart={(e) => {
                      if (isResizingRef.current || isBeingResized || isSn) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, i);
                    }}
                    onDragOver={(e) => {
                      if (isResizingRef.current || isBeingResized || isSn) return;
                      handleDragOver(e, i);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      if (isResizingRef.current || isBeingResized || isSn) return;
                      handleDrop(e, i);
                    }}
                    onDragEnd={handleDragEnd}
                    style={{
                      width: isSn ? "48px" : (isFixedLayout && colWidth ? `${colWidth}px` : undefined),
                      minWidth: isSn ? "48px" : (isFixedLayout ? (colWidth ? `${colWidth}px` : "70px") : undefined),
                      maxWidth: isSn ? "48px" : undefined,
                    }}
                    className={`group ${isSn ? "w-12 min-w-[48px] max-w-[48px] !px-1 text-center" : "px-3"} py-2.5 text-left text-xs font-medium uppercase tracking-wider border-b border-r last:border-r-0 border-gray-200 dark:border-gray-700 whitespace-nowrap transition-all select-none relative ${
                      isSorted
                        ? "text-primary dark:text-primary bg-primary/[0.04] dark:bg-primary/[0.08]"
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
                      if (hasDraggedRef.current || isResizingRef.current || isBeingResized || isSn) return;
                      if (onSort) {
                        onSort(i);
                      } else {
                        if (internalSortCol === i) {
                          if (internalSortDir === "asc") setInternalSortDir("desc");
                          else {
                            setInternalSortCol(null);
                            setInternalSortDir(null);
                          }
                        } else {
                          setInternalSortCol(i);
                          setInternalSortDir("asc");
                        }
                      }
                    }}
                  >
                    <div className={`flex items-center ${isSn ? "justify-center" : "gap-1.5 min-w-0 pr-2 overflow-hidden"}`}>
                      {isDraggable && !isSn && (
                        <GripVertical
                          size={14}
                          className="text-gray-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pointer-events-auto"
                        />
                      )}
                      <span
                        className={`truncate pointer-events-none ${
                          isSorted ? "font-semibold text-primary dark:text-white" : ""
                        }`}
                      >
                        {isSn ? "S.N." : header}
                      </span>
                      {isSortable && !isSn && (
                        <span className="inline-flex items-center shrink-0 ml-0.5">
                          {isSorted ? (
                            effectiveSortDir === "asc" ? (
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

                    {/* Column Resizer */}
                    {resizableColumns && !isSn && (
                      <div
                        onMouseDown={(e) => handleResizeStart(e, i, header)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-end group/resizer select-none"
                      >
                        <div
                          className={`w-px h-full transition-all ${
                            isBeingResized
                              ? "bg-primary w-[2px]"
                              : "bg-gray-300 dark:bg-gray-600 group-hover/resizer:bg-primary group-hover/resizer:w-[2px]"
                          }`}
                        />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>

            {/* Optional Filter Row - Synced with draggable & resizable columns */}
            {renderFilterCell && (
              <tr className="bg-gray-50/70 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                {headers.map((header, i) => {
                  const isSn = Boolean(hasSnColumn && i === 0);
                  const w = getColWidth(header, i);
                  return (
                    <th
                      key={`filter-${i}`}
                      className="p-1 font-normal border-b border-r last:border-r-0 border-gray-200 dark:border-gray-700"
                      style={{
                        width: isSn ? "48px" : (isFixedLayout && w ? `${w}px` : undefined),
                        minWidth: isSn ? "48px" : (isFixedLayout ? (w ? `${w}px` : "70px") : undefined),
                        maxWidth: isSn ? "48px" : undefined,
                      }}
                    >
                      {renderFilterCell(header, i)}
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={headers.length} className="p-0 border-none">
                  <div
                    className="sticky left-0"
                    style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
                  >
                    <LoadingSpinner className="py-14" />
                  </div>
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="p-0 border-none">
                  <div
                    className="empty-state-container sticky left-0 flex flex-col items-center justify-center py-14 text-center text-text-secondary dark:text-gray-400"
                    style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
                  >
                    <Database size={30} className="text-gray-300 dark:text-gray-600 mb-2" />
                    <span className="text-sm font-medium">
                      {errorMessage || emptyMessage || "No records found."}
                    </span>
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
        .custom-scrollbar::-webkit-scrollbar { height: 7px; width: 7px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

        .app-modal-data-table tbody tr:nth-child(odd) { background-color: #ffffff; }
        .app-modal-data-table tbody tr:nth-child(even) { background-color: #f9fafb; }
        .dark .app-modal-data-table tbody tr:nth-child(odd) { background-color: #1f2937; }
        .dark .app-modal-data-table tbody tr:nth-child(even) { background-color: rgba(17, 24, 39, 0.45); }

        .app-modal-data-table.has-sn-column th:first-child,
        .app-modal-data-table.has-sn-column td:first-child:not([colspan]) {
          width: 48px !important;
          min-width: 48px !important;
          max-width: 48px !important;
          box-sizing: border-box !important;
          white-space: nowrap !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          text-align: center !important;
        }

        .app-modal-data-table.has-sn-column th:first-child > div {
          justify-content: center !important;
          width: 100% !important;
          padding-right: 0 !important;
          text-align: center !important;
        }

        .app-modal-data-table.has-sn-column td:first-child:not([colspan]) > * {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          display: block !important;
          width: 100% !important;
        }
        `,
        }}
      />
    </div>
  );
}

export default ModalDataTable;
