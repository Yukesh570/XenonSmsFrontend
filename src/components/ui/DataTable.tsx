import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
import { getHeaderWordMinWidth, getHeaderFirstWordMinWidth } from "./ModalDataTable";

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

  // Optional footer rendered inside <tfoot> of the same <table> for pixel-perfect column alignment
  footerContent?: React.ReactNode;

  // Custom table max-height (number in px, or CSS string like "calc(100vh - 380px)")
  tableMaxHeight?: string | number;
}

const rowsOptions = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "250", label: "250" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
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
  footerContent,
  tableMaxHeight,
}: DataTableProps<T>) {
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
          if (parsed && typeof parsed === "object") {
            delete parsed["S.N."];
            delete parsed["S.N"];
            delete parsed["SN"];
            delete parsed["#"];
            delete parsed["ID"];
            delete parsed["Id"];
            delete parsed["id"];
            delete parsed["SEQ"];
            delete parsed["Seq"];
            delete parsed["seq"];
            const clean: Record<string, number> = {};
            for (const key of Object.keys(parsed)) {
              if (typeof parsed[key] === "number" && parsed[key] >= 50) {
                clean[key] = parsed[key];
              }
            }
            return clean;
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
        delete cleaned["ID"];
        delete cleaned["Id"];
        delete cleaned["id"];
        delete cleaned["SEQ"];
        delete cleaned["Seq"];
        delete cleaned["seq"];
        localStorage.setItem(effectiveStorageKey, JSON.stringify(cleaned));
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

  // Fast hover tooltip for table headers
  const [headerTooltip, setHeaderTooltip] = useState<{
    text: string;
    coords: { top: number; left: number };
    placement: "above" | "below";
  } | null>(null);
  const headerTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeHeaderRef = useRef<HTMLElement | null>(null);

  const clearHeaderTooltip = useCallback(() => {
    if (headerTooltipTimerRef.current) {
      clearTimeout(headerTooltipTimerRef.current);
      headerTooltipTimerRef.current = null;
    }
    activeHeaderRef.current = null;
    setHeaderTooltip(null);
  }, []);

  const handleHeaderMouseOver = (e: React.MouseEvent) => {
    if (isResizingRef.current || hasDraggedRef.current) {
      clearHeaderTooltip();
      return;
    }

    const target = e.target as HTMLElement;
    const th = target.closest("th") as HTMLElement | null;
    if (!th) {
      clearHeaderTooltip();
      return;
    }

    // Skip column resize handle
    if (target.closest(".group\\/resizer")) {
      clearHeaderTooltip();
      return;
    }

    if (th === activeHeaderRef.current) return;

    activeHeaderRef.current = th;
    if (headerTooltipTimerRef.current) {
      clearTimeout(headerTooltipTimerRef.current);
    }

    const spanEl = (th.querySelector("span[data-header-label]") || th.querySelector("span")) as HTMLElement | null;
    const rawText = spanEl?.innerText?.trim() || th.innerText?.trim();
    if (!rawText || rawText === "-" || rawText === "" || rawText.length === 0) {
      clearHeaderTooltip();
      return;
    }

    const text = rawText.replace(/\s+/g, " ");

    headerTooltipTimerRef.current = setTimeout(() => {
      if (!activeHeaderRef.current || !th.isConnected) return;
      const rect = th.getBoundingClientRect();
      const isAbove = rect.top >= 36;
      setHeaderTooltip({
        text,
        coords: {
          top: isAbove ? rect.top - 6 : rect.bottom + 6,
          left: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
        },
        placement: isAbove ? "above" : "below",
      });
    }, 350);
  };

  useEffect(() => {
    if (!headerTooltip) return;
    const handleDismiss = () => clearHeaderTooltip();
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("mousedown", handleDismiss);
    window.addEventListener("keydown", handleDismiss);
    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("mousedown", handleDismiss);
      window.removeEventListener("keydown", handleDismiss);
    };
  }, [headerTooltip, clearHeaderTooltip]);

  useEffect(() => {
    return () => {
      if (headerTooltipTimerRef.current) clearTimeout(headerTooltipTimerRef.current);
    };
  }, []);

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
  const firstHeaderRaw =
    headers.length > 0 && typeof headers[0] === "string"
      ? headers[0].trim().toUpperCase().replace(/[\s.]/g, "")
      : "";
  const hasSnColumn =
    headers.length > 0 &&
    (firstHeaderRaw === "SN" ||
      firstHeaderRaw === "SNO" ||
      firstHeaderRaw === "SLNO" ||
      firstHeaderRaw === "SRNO" ||
      firstHeaderRaw === "SERIALNO" ||
      firstHeaderRaw === "SERIALNUMBER" ||
      firstHeaderRaw === "#" ||
      firstHeaderRaw === "NO" ||
      firstHeaderRaw === "ID" ||
      firstHeaderRaw === "SEQ");
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

  const SN_COL_WIDTH = 48;

  const getColWidth = (header: string, index: number) => {
    if (hasSnColumn && index === 0) {
      return SN_COL_WIDTH;
    }
    const minLimit = getHeaderFirstWordMinWidth(header, index, hasSnColumn);
    if (
      columnWidths[header] &&
      typeof columnWidths[header] === "number"
    ) {
      return Math.max(minLimit, columnWidths[header]);
    }
    return getHeaderWordMinWidth(header, index, hasSnColumn);
  };

  const defaultTotalWidth = useMemo(() => {
    return headers.reduce((sum, h, i) => {
      const w = getColWidth(h, i);
      return sum + w;
    }, 0);
  }, [headers, columnWidths, hasSnColumn]);

  const totalRequestedWidth = defaultTotalWidth;

  const getEffectiveColWidth = (header: string, index: number): number => {
    if (hasSnColumn && index === 0) {
      return SN_COL_WIDTH;
    }

    if (containerWidth && totalRequestedWidth < containerWidth) {
      const snWidth = hasSnColumn ? SN_COL_WIDTH : 0;
      const availableSpace = containerWidth - snWidth;

      const unresizedNonSnCols = headers.filter(
        (h, i) => (!hasSnColumn || i > 0) && !columnWidths[h]
      );

      const isExplicitlyResized = Boolean(columnWidths[header]);

      if (unresizedNonSnCols.length > 0) {
        if (isExplicitlyResized) {
          return getColWidth(header, index);
        }
        const explicitlyResizedSum = headers.reduce((sum, h, i) => {
          if (hasSnColumn && i === 0) return sum;
          if (columnWidths[h]) return sum + getColWidth(h, i);
          return sum;
        }, 0);
        const spaceForUnresized = Math.max(0, availableSpace - explicitlyResizedSum);
        const unresizedDefaultSum = unresizedNonSnCols.reduce((sum, h) => {
          const idx = headers.indexOf(h);
          return sum + getHeaderWordMinWidth(h, idx, hasSnColumn);
        }, 0);
        if (unresizedDefaultSum > 0) {
          const defaultW = getHeaderWordMinWidth(header, index, hasSnColumn);
          const minLimit = getHeaderFirstWordMinWidth(header, index, hasSnColumn);
          return Math.max(
            minLimit,
            Math.round((defaultW / unresizedDefaultSum) * spaceForUnresized)
          );
        }
      } else {
        const lastColIdx = headers.length - 1;
        if (index === lastColIdx) {
          const otherColsSum = headers.reduce((sum, h, i) => {
            if (i === lastColIdx) return sum;
            return sum + (hasSnColumn && i === 0 ? SN_COL_WIDTH : getColWidth(h, i));
          }, 0);
          return Math.max(
            getColWidth(header, index),
            containerWidth - otherColsSum
          );
        }
        return getColWidth(header, index);
      }
    }

    return getColWidth(header, index);
  };

  const totalTableWidth = useMemo(() => {
    return headers.reduce((sum, h, i) => {
      return sum + getEffectiveColWidth(h, i);
    }, 0);
  }, [headers, columnWidths, hasSnColumn, containerWidth, totalRequestedWidth]);

  // --- Dynamic Column Resizing Handlers ---
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

    // Snapshot currently rendered widths for all columns so they stay steady
    const baseWidths: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const minLimit = getHeaderFirstWordMinWidth(h, idx, hasSnColumn);
      if (hasSnColumn && idx === 0) {
        baseWidths[h] = SN_COL_WIDTH;
      } else if (columnWidths[h] && columnWidths[h] >= minLimit) {
        baseWidths[h] = columnWidths[h];
      } else {
        baseWidths[h] = getEffectiveColWidth(h, idx);
      }
    });

    let lastWidth = startWidth;
    const minLimitForHeader = getHeaderFirstWordMinWidth(header, index, hasSnColumn);

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(minLimitForHeader, Math.round(startWidth + deltaX));
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

  return (
    <div
      style={
        tableMaxHeight
          ? {
              maxHeight:
                typeof tableMaxHeight === "number"
                  ? `${tableMaxHeight}px`
                  : tableMaxHeight,
            }
          : undefined
      }
      className={`rounded-xl bg-white shadow-card overflow-hidden dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col relative z-0 app-data-table ${
        hasSnColumn ? "has-sn-column" : ""
      } ${
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
        className={`overflow-auto ${
          tableMaxHeight ? "flex-1 min-h-0" : "max-h-[72vh] min-h-[300px]"
        } relative z-0 custom-scrollbar`}
      >
        <table
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0 table-resizable-active"
          style={{
            tableLayout: "fixed",
            width: totalTableWidth < (containerWidth || 0)
              ? "100%"
              : `${totalTableWidth}px`,
            minWidth: "100%",
          }}
        >
          <colgroup>
            {headers.map((h, i) => {
              const isSn = Boolean(hasSnColumn && i === 0);
              const w = getEffectiveColWidth(h, i);
              return (
                <col
                  key={i}
                  width={isSn ? SN_COL_WIDTH : w}
                  style={{
                    width: isSn ? `${SN_COL_WIDTH}px` : `${w}px`,
                    minWidth: `${isSn ? SN_COL_WIDTH : getHeaderFirstWordMinWidth(h, i, hasSnColumn)}px`,
                    maxWidth: isSn ? `${SN_COL_WIDTH}px` : undefined,
                  }}
                />
              );
            })}
          </colgroup>
          <thead
            className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm"
            onMouseOver={handleHeaderMouseOver}
            onMouseLeave={clearHeaderTooltip}
          >
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
                const colWidth = getEffectiveColWidth(header, i);
                const isBeingResized = resizingHeaderIdx === i;

                const isSn = Boolean(hasSnColumn && i === 0);

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
                      width: isSn ? `${SN_COL_WIDTH}px` : `${colWidth}px`,
                      minWidth: `${isSn ? SN_COL_WIDTH : getHeaderFirstWordMinWidth(header, i, hasSnColumn)}px`,
                      maxWidth: isSn ? `${SN_COL_WIDTH}px` : undefined,
                    }}
                    className={`group ${isSn ? "w-12 min-w-[48px] max-w-[48px] !px-1 border-r" : "px-3"} py-2.5 text-center text-xs font-medium uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-all select-none relative ${
                      !colWidth && !isSn ? "min-w-[80px]" : ""
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
                      if (hasDraggedRef.current || isResizingRef.current || isBeingResized || isSn) return;
                      if (isSortable && onSort) {
                        onSort(i);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 min-w-0 w-full px-1">
                      {isDraggable && !isSn && (
                        <GripVertical
                          size={13}
                          className="text-gray-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pointer-events-auto"
                        />
                      )}
                      <span
                        data-header-label="true"
                        className={`whitespace-nowrap text-center pointer-events-none select-none ${
                          isSorted ? "font-semibold text-primary dark:text-white" : ""
                        }`}
                      >
                        {isSn ? "S.N." : header}
                      </span>
                      {isSortable && !isSn && (
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
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
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
                    className="empty-state-container sticky left-0 flex flex-col items-center justify-center py-16 text-center text-text-secondary dark:text-gray-400"
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
          {footerContent && (
            <tfoot className="sticky bottom-0 z-20">
              {footerContent}
            </tfoot>
          )}
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

        .app-data-table tfoot,
        .app-data-table tfoot tr,
        .app-data-table tfoot td {
          position: sticky;
          bottom: 0;
          z-index: 20;
          border-top: none !important;
          box-shadow: none !important;
        }

        /* Dynamic adjustable column widths & text truncation with ellipsis */
        .app-data-table table.table-resizable-active {
          table-layout: fixed !important;
        }
        .app-data-table table.table-resizable-active th {
          overflow: visible;
          white-space: nowrap;
          text-align: center !important;
        }
        .app-data-table table.table-resizable-active td {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 0 !important;
          vertical-align: middle !important;
        }
        .app-data-table table.table-resizable-active td[colspan] {
          white-space: normal !important;
          max-width: none !important;
          overflow: visible !important;
        }
        .app-data-table table.table-resizable-active td > span:not([class*="badge"]),
        .app-data-table table.table-resizable-active td > a,
        .app-data-table table.table-resizable-active td > p,
        .app-data-table table.table-resizable-active td > div:not([class*="menu"]):not([class*="dropdown"]):not(.empty-state-container) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap !important;
          display: inline-block;
          max-width: 100%;
          vertical-align: middle;
        }
        .app-data-table table.table-resizable-active td svg,
        .app-data-table table.table-resizable-active td img {
          display: inline-block !important;
          vertical-align: -0.15em !important;
          margin-right: 0.35rem !important;
          flex-shrink: 0 !important;
        }
        .app-data-table table.table-resizable-active td img {
          vertical-align: middle !important;
        }
        .app-data-table table.table-resizable-active td button svg,
        .app-data-table table.table-resizable-active td [role="button"] svg,
        .app-data-table table.table-resizable-active td a svg:only-child {
          margin-right: 0 !important;
        }
        .app-data-table table.table-resizable-active td * {
          white-space: nowrap;
        }
        .app-data-table table.table-resizable-active td[colspan] * {
          white-space: normal;
        }

        .table-density-compact td { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }
        .table-density-compact th { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }

        .app-data-table.has-sn-column th:first-child,
        .app-data-table.has-sn-column td:first-child:not([colspan]) {
          width: 48px !important;
          min-width: 48px !important;
          max-width: 48px !important;
          box-sizing: border-box !important;
          white-space: nowrap !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          text-align: center !important;
        }

        .app-data-table.has-sn-column th:first-child > div {
          justify-content: center !important;
          width: 100% !important;
          padding-right: 0 !important;
          text-align: center !important;
        }

        .app-data-table.has-sn-column td:first-child:not([colspan]) > * {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          display: block !important;
          width: 100% !important;
        }

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


      {headerTooltip &&
        createPortal(
          <div
            className={`fixed z-[99999] px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 dark:bg-gray-800/95 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 ${
              headerTooltip.placement === "above" ? "-translate-y-full" : "translate-y-0"
            } transition-opacity duration-100 border border-gray-700/50 backdrop-blur-sm max-w-md break-words text-center select-none`}
            style={{ top: headerTooltip.coords.top, left: headerTooltip.coords.left }}
          >
            {headerTooltip.text}
          </div>,
          document.body
        )}
    </div>
  );
}

export default DataTable;