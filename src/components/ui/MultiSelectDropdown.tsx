import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Check, X, ChevronDown, Search, Loader2 } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export interface MultiSelectOption {
  label: string;
  value: string;
  isAll?: boolean;
  isUiOnly?: boolean;
  groupIndex?: number;
  icon?: React.ReactNode;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selectedValues: string[], clickedOption?: MultiSelectOption) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

const CustomPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
};

const MultiSelectDropdownContent: React.FC<
  MultiSelectDropdownProps & {
    open: boolean;
    close: () => void;
    toggle: () => void;
    portalRef: React.RefObject<HTMLDivElement | null>;
  }
> = ({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  placeholder = "Select...",
  open,
  close,
  toggle,
  portalRef,
  isLoading = false,
}) => {
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm("");
      setHighlightedIndex(null);
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(null);
  }, [searchTerm]);

  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, []);

  let topPosition = 0;
  let leftPosition = 0;
  let maxDropdownHeight = 380;
  let dropdownWidth = 280;

  if (buttonRect) {
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - buttonRect.bottom - 20;
    const spaceAbove = buttonRect.top - 20;
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      topPosition = Math.max(10, buttonRect.top - Math.min(380, spaceAbove) - 4);
      maxDropdownHeight = Math.min(380, spaceAbove);
    } else {
      topPosition = buttonRect.bottom + 4;
      maxDropdownHeight = Math.min(380, Math.max(220, spaceBelow));
    }

    dropdownWidth = Math.max(buttonRect.width, 280);
    leftPosition = buttonRect.left;
    if (leftPosition + dropdownWidth > window.innerWidth - 12) {
      leftPosition = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange([]);
      setSearchTerm("");
      setHighlightedIndex(null);
    }
  };

  const hasSelected = selected && selected.length > 0;
  const isOptionsLoading =
    isLoading === true ||
    (hasSelected && options.length === 0 && isLoading !== false);
  const isEffectivelyDisabled = disabled || isOptionsLoading;

  const getDisplayText = () => {
    if (isOptionsLoading) return "Loading...";
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const matchedOption = options.find((opt) => opt.value === selected[0]);
      if (matchedOption) return matchedOption.label;
      const raw = String(selected[0]);
      const match = raw.match(/\(([^)]+)\)/);
      return match ? match[1] : raw;
    }

    const allOptions = options.filter((o) => o.isAll);
    for (const allOpt of allOptions) {
      if (allOpt.value === "ALL_MCC") {
        const standardOpts = options.filter((o) => !o.isUiOnly);
        const isAllSelected =
          standardOpts.length > 0 && standardOpts.every((o) => selected.includes(o.value));
        if (isAllSelected) return "All MCCs";
      } else {
        const mccPrefix = allOpt.value.split("(")[0];
        const standardOpts = options.filter(
          (o) => o.value.startsWith(`${mccPrefix}(`) && !o.isUiOnly
        );
        const isAllSelected =
          standardOpts.length > 0 && standardOpts.every((o) => selected.includes(o.value));
        if (isAllSelected) return allOpt.label;
      }
    }

    if (selected.length === 2) {
      const first = options.find((o) => o.value === selected[0])?.label || selected[0];
      const second = options.find((o) => o.value === selected[1])?.label || selected[1];
      return `${first}, ${second}`;
    }

    return `${selected.length} selected`;
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = selected
    .map((val) => options.find((o) => o.value === val) || { label: val, value: val })
    .filter((opt) =>
      searchTerm ? opt.label.toLowerCase().includes(searchTerm.toLowerCase()) : true
    );

  const unselectedOptions = filteredOptions.filter(
    (opt) => !selected.includes(opt.value) || opt.isAll
  );

  const allDisplayedOptions = [...selectedOptions, ...unselectedOptions];

  const singleSelectedOption =
    !isOptionsLoading && selected.length === 1
      ? options.find((opt) => opt.value === selected[0])
      : null;

  const fullSelectedNames = selected
    .map((s) => options.find((o) => o.value === s)?.label || s)
    .join(", ");
  const hoverTooltip = isOptionsLoading
    ? "Loading..."
    : selected.length > 0
    ? fullSelectedNames
    : undefined;

  const findNextValidIndex = (current: number | null, step: number) => {
    if (allDisplayedOptions.length === 0) return null;
    if (current === null) {
      return step > 0 ? 0 : allDisplayedOptions.length - 1;
    }
    let next = current + step;
    if (next < 0) return allDisplayedOptions.length - 1;
    if (next >= allDisplayedOptions.length) return 0;
    return next;
  };

  useEffect(() => {
    if (highlightedIndex !== null) {
      const el = document.querySelector(`[data-multi-option-index="${highlightedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const toggleOption = (opt: MultiSelectOption) => {
    if (opt.isAll) {
      onChange(selected, opt);
    } else {
      if (selected.includes(opt.value)) {
        onChange(selected.filter((v) => v !== opt.value), opt);
      } else {
        onChange([...selected, opt.value], opt);
      }
    }
  };

  const renderOptionBtn = (
    opt: MultiSelectOption,
    isSelected: boolean,
    _onChangeHandler: any,
    optionIndex: number
  ) => {
    const isHighlighted = highlightedIndex === optionIndex;
    return (
      <div
        key={`${opt.value}-${optionIndex}`}
        role="button"
        tabIndex={0}
        data-multi-option-index={optionIndex}
        onMouseEnter={() => setHighlightedIndex(optionIndex)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
          toggleOption(opt);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer select-none
          ${
            opt.isAll
              ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold border-y border-gray-300 dark:border-gray-600"
              : isHighlighted
              ? "bg-primary/10 text-primary dark:text-primary dark:bg-primary/20"
              : isSelected
              ? "text-primary dark:text-primary font-medium bg-primary/5 hover:bg-primary/10"
              : "text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
          }
        `}
      >
        <span className="flex items-center gap-2 break-words text-wrap">
          {opt.icon && <span>{opt.icon}</span>}
          {opt.label}
        </span>
        {isSelected && !opt.isAll ? (
          <span className="flex items-center justify-center w-5 h-5 text-primary">
            <Check size={16} strokeWidth={2.5} />
          </span>
        ) : isSelected && opt.isAll ? (
          <Check size={16} className="text-gray-800 dark:text-gray-200" strokeWidth={2.5} />
        ) : null}
      </div>
    );
  };

  return (
    <>
      <label
        title={label}
        className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate"
      >
        {label}
      </label>

      {/* Trigger Box */}
      <div
        ref={buttonRef}
        title={hoverTooltip}
        tabIndex={isEffectivelyDisabled ? -1 : 0}
        onClick={() => {
          if (!isEffectivelyDisabled) {
            updatePosition();
            toggle();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            if (!open && !isEffectivelyDisabled) {
              e.preventDefault();
              updatePosition();
              toggle();
            }
          }
        }}
        className={`w-full h-[34px] border rounded-lg px-3 py-1 flex justify-between items-center shadow-input transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary select-none ${
          isEffectivelyDisabled
            ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
            : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:border-primary"
        } ${open && !isEffectivelyDisabled ? "ring-1 ring-primary border-primary" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          {singleSelectedOption?.icon && (
            <span className="shrink-0 flex items-center pointer-events-none">
              {singleSelectedOption.icon}
            </span>
          )}
          <span
            className={`truncate text-xs sm:text-sm ${
              isOptionsLoading || selected.length === 0
                ? "text-gray-400 dark:text-gray-500"
                : "text-text-primary dark:text-white font-medium"
            }`}
          >
            {getDisplayText()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isOptionsLoading ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <>
              {selected.length > 0 && !disabled && (
                <div
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-red-500 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none cursor-pointer"
                  title="Clear all"
                >
                  <X size={14} strokeWidth={2.5} />
                </div>
              )}
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Dropdown Menu Popover */}
      {open && buttonRect && !isEffectivelyDisabled && (
        <CustomPortal>
          <div
            className="fixed inset-0 z-[99999]"
            onClick={() => {
              close();
            }}
          >
            <div
              ref={portalRef}
              className="absolute flex flex-col transition-all duration-100 ease-out opacity-100 translate-y-0"
              style={{
                top: topPosition,
                left: leftPosition,
                width: dropdownWidth,
                maxHeight: maxDropdownHeight,
              }}
              onClick={(e: any) => e.stopPropagation()}
              onMouseDown={(e: any) => e.stopPropagation()}
            >
              <div
                className="w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
                style={{ maxHeight: "inherit" }}
              >
                {/* Dedicated Search Header */}
                <div className="flex-none p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80">
                  <div className="relative flex items-center">
                    <Search
                      size={14}
                      className="absolute left-2.5 text-gray-400 pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Search ${label?.replace(/^Search\s+/i, "") || "countries"}...`}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          e.stopPropagation();
                          const next = findNextValidIndex(highlightedIndex, 1);
                          setHighlightedIndex(next);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          e.stopPropagation();
                          const prev = findNextValidIndex(highlightedIndex, -1);
                          setHighlightedIndex(prev);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          close();
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          if (highlightedIndex !== null && allDisplayedOptions[highlightedIndex]) {
                            const chosen = allDisplayedOptions[highlightedIndex];
                            toggleOption(chosen);
                            setSearchTerm("");
                            setHighlightedIndex(null);
                          } else if (searchTerm.trim() !== "") {
                            const trimmed = searchTerm.trim().toLowerCase();
                            const exactMatch = allDisplayedOptions.find(
                              (o) =>
                                o.label.toLowerCase() === trimmed ||
                                o.value.toLowerCase() === trimmed
                            );
                            if (exactMatch) {
                              toggleOption(exactMatch);
                              setSearchTerm("");
                              setHighlightedIndex(null);
                            } else if (allDisplayedOptions.length > 0) {
                              toggleOption(allDisplayedOptions[0]);
                              setSearchTerm("");
                              setHighlightedIndex(null);
                            }
                          }
                        }
                      }}
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-1 focus:ring-primary text-text-primary dark:text-white placeholder:text-gray-400"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Section (Same Dropdown Row Look) */}
                {selectedOptions.length > 0 && (
                  <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-100/70 dark:bg-gray-800/90">
                      <span className="text-[11px] font-semibold text-primary dark:text-primary-light uppercase tracking-wider">
                        Selected ({selected.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="max-h-[140px] overflow-y-auto custom-grid-scroll divide-y divide-gray-50 dark:divide-gray-800/40">
                      {selectedOptions.map((opt, idx) =>
                        renderOptionBtn(opt, true, onChange, idx)
                      )}
                    </div>
                  </div>
                )}

                {/* Scrolling Unselected Options List Container */}
                <div className="flex-1 overflow-y-auto min-h-0 relative py-1 custom-grid-scroll bg-white dark:bg-gray-800">
                  {unselectedOptions.map((opt, idx) => {
                    let isSelected = selected.includes(opt.value) && !opt.isAll;
                    if (opt.isAll) {
                      if (opt.value === "ALL_MCC") {
                        const standardOpts = options.filter((o) => !o.isUiOnly);
                        isSelected =
                          selected.includes(opt.value) ||
                          (standardOpts.length > 0 &&
                            standardOpts.every((o) => selected.includes(o.value)));
                      } else {
                        const mccPrefix = opt.value.split("(")[0];
                        const standardOpts = options.filter(
                          (o) => o.value.startsWith(`${mccPrefix}(`) && !o.isUiOnly
                        );
                        isSelected =
                          selected.includes(opt.value) ||
                          (standardOpts.length > 0 &&
                            standardOpts.every((o) => selected.includes(o.value)));
                      }
                    }
                    return renderOptionBtn(
                      opt,
                      isSelected,
                      onChange,
                      selectedOptions.length + idx
                    );
                  })}
                  {isLoading ? (
                    <div className="py-6 px-4 flex flex-col items-center justify-center">
                      <LoadingSpinner size="sm" text="Loading..." className="py-0" />
                    </div>
                  ) : unselectedOptions.length === 0 && selectedOptions.length === 0 ? (
                    <div className="py-6 px-4 text-center text-gray-500 text-xs">
                      No matching options found
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CustomPortal>
      )}
    </>
  );
};

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = (props) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const hasSelected = props.selected && props.selected.length > 0;
  const isLocked =
    props.isLoading === true ||
    (hasSelected && props.options.length === 0 && props.isLoading !== false);

  useEffect(() => {
    if (isLocked && open) {
      setOpen(false);
    }
  }, [isLocked, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsidePortal = !portalRef.current || !portalRef.current.contains(target);

      if (clickedOutsideDropdown && clickedOutsidePortal) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative flex flex-col w-full" ref={dropdownRef}>
      <MultiSelectDropdownContent 
        {...props} 
        open={open && !isLocked} 
        close={() => setOpen(false)} 
        toggle={() => {
          if (!isLocked) setOpen(!open);
        }} 
        portalRef={portalRef} 
      />
    </div>
  );
};

export default MultiSelectDropdown;