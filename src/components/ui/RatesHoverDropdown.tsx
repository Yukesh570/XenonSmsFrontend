import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface RateItem {
  MNC?: string | number;
  mnc?: string | number;
  network?: string;
  rate?: string | number;
  rateBase?: number;
  margin?: number;
  marginPercentage?: number;
}

export interface RatesHoverDropdownProps {
  title: string;
  rates: RateItem[];
  currencyCode?: string;
  baseCurrencyCode?: string;
  selectedMnc?: string | null;
  onSelectMnc?: (mnc: string | null) => void;
  allMargins?: Record<string, { margin?: number; marginPercentage?: number; customerRate?: number | string; vendorRate?: number | string }>;
}

let activeDropdownId: string | null = null;
const dropdownListeners = new Set<(activeId: string | null) => void>();

const registerDropdown = (onActiveChange: (activeId: string | null) => void) => {
  dropdownListeners.add(onActiveChange);
  return () => {
    dropdownListeners.delete(onActiveChange);
  };
};

const setActiveDropdown = (id: string | null) => {
  activeDropdownId = id;
  dropdownListeners.forEach((listener) => listener(id));
};

export const RatesHoverDropdown: React.FC<RatesHoverDropdownProps> = ({
  title,
  rates = [],
  currencyCode,
  selectedMnc,
  onSelectMnc,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownId = useRef<string>(`rates-dropdown-${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    return registerDropdown((activeId) => {
      if (activeId !== dropdownId) {
        setIsOpen(false);
      }
    });
  }, [dropdownId]);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedHeight = Math.min(260, 60 + rates.length * 28);
    const shouldOpenUp = spaceBelow < estimatedHeight + 15 && spaceAbove > spaceBelow;

    setOpenUpwards(shouldOpenUp);

    const dropdownWidth = 240;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - dropdownWidth - 16);
    } else if (left < 16) {
      left = 16;
    }

    if (shouldOpenUp) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      calculatePosition();
      setActiveDropdown(dropdownId);
      setIsOpen(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      if (activeDropdownId === dropdownId) {
        setActiveDropdown(null);
      }
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isOpen) {
      calculatePosition();
      setActiveDropdown(dropdownId);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      if (activeDropdownId === dropdownId) {
        setActiveDropdown(null);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      calculatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      setIsOpen(false);
      if (activeDropdownId === dropdownId) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, dropdownId]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (activeDropdownId === dropdownId) {
        setActiveDropdown(null);
      }
    };
  }, [dropdownId]);

  const getMncKey = (r: RateItem) => {
    if (r.MNC !== undefined && r.MNC !== null) return String(r.MNC);
    if (r.mnc !== undefined && r.mnc !== null) return String(r.mnc);
    if (r.network) return String(r.network);
    return "";
  };

  const selectedRateItem = selectedMnc
    ? rates.find((r) => getMncKey(r).trim() === selectedMnc.trim()) ||
    rates.find((r) => getMncKey(r).trim().toLowerCase() === "all")
    : null;

  const displayRateText =
    selectedRateItem && selectedRateItem.rate !== undefined && selectedRateItem.rate !== null
      ? `${selectedRateItem.rate} ${currencyCode || ""}`.trim()
      : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-block select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="cursor-pointer inline-flex items-center hover:opacity-85 transition-opacity">
        <StatusBadge
          status="MULTIPLE_RATES"
          customText={
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="font-mono">{selectedMnc ? (displayRateText || `Rates (${selectedMnc})`) : "Multiple Rates"}</span>
              {selectedMnc && onSelectMnc && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMnc(null);
                    setIsOpen(false);
                    if (activeDropdownId === dropdownId) {
                      setActiveDropdown(null);
                    }
                  }}
                  className="hover:text-red-600 dark:hover:text-red-400 p-0.5 -mr-0.5 rounded text-[10px] font-bold leading-none cursor-pointer"
                >
                  ✕
                </span>
              )}
              <ChevronDown
                size={11}
                strokeWidth={2.5}
                className={`transition-transform duration-150 ${openUpwards && isOpen ? "rotate-180" : ""}`}
              />
            </span>
          }
        />
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[999999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl p-2.5 min-w-[210px] max-w-[290px] pointer-events-auto"
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : { top: `${coords.top}px` }),
            }}
            onMouseEnter={() => {
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1 flex items-center justify-between">
              <span>{title}</span>
              <span className="text-[10px] font-normal text-gray-400">({rates.length})</span>
            </div>
            <div className="max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                    <th className="px-2 py-1 font-medium">MNC</th>
                    <th className="px-2 py-1 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {rates.map((r, idx) => {
                    const mncKey = getMncKey(r);
                    const isSelected = Boolean(selectedMnc && mncKey && selectedMnc.trim() === mncKey.trim());

                    return (
                      <tr
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectMnc) {
                            onSelectMnc(isSelected ? null : mncKey);
                          }
                          setIsOpen(false);
                          if (activeDropdownId === dropdownId) {
                            setActiveDropdown(null);
                          }
                        }}
                        className={`transition-colors ${onSelectMnc ? "cursor-pointer" : ""
                          } ${isSelected
                            ? "bg-blue-50/90 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-l-blue-600"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          }`}
                        title={onSelectMnc ? (isSelected ? "Click to deselect" : `Click to select MNC ${mncKey}`) : undefined}
                      >
                        <td className="px-2 py-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                          <span className="inline-flex items-center gap-1">
                            {isSelected && <Check size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                            <span>{mncKey || "—"}</span>
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                          {r.rate !== undefined && r.rate !== null ? r.rate : "—"} {currencyCode || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {onSelectMnc && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 px-0.5">
                <span>Click an MNC to select</span>
                {selectedMnc && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMnc(null);
                      setIsOpen(false);
                      if (activeDropdownId === dropdownId) {
                        setActiveDropdown(null);
                      }
                    }}
                    className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Clear selection"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default RatesHoverDropdown;
