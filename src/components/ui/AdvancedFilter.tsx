import React, { Fragment, useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Popover, Transition } from "@headlessui/react";
import { Filter, Search, Check, X, Lock, ChevronDown } from "lucide-react";
import Button from "./Button";

export interface FilterColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "date_range" | "number_range" | "date_gt_lt" | "number_gt_lt";
}

export interface AdvancedFilterProps {
  columns: FilterColumn[];
  selectedColumns: string[];
  defaultColumns?: string[];
  onFilter: (selectedColumns: string[]) => void;
  onClear: () => void;
  isLoading?: boolean;
  buttonLabel?: string;
  enableReorder?: boolean;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  columns,
  selectedColumns,
  defaultColumns = [],
  onFilter,
  onClear,
  isLoading = false,
  buttonLabel = "Filters",
}) => {
  const [tempSelectedKeys, setTempSelectedKeys] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState("");
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Accordion state for Default Options (Expanded by default)
  const [isDefaultExpanded, setIsDefaultExpanded] = useState(false);

  const activeDefaultColumns = defaultColumns;
  const DROPDOWN_WIDTH = 280;

  useEffect(() => {
    setTempSelectedKeys(selectedColumns);
  }, [selectedColumns]);

  const handleToggleColumn = (key: string) => {
    if (activeDefaultColumns.includes(key) && tempSelectedKeys.includes(key)) {
      return;
    }

    setTempSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (tempSelectedKeys.length === columns.length) {
      setTempSelectedKeys(activeDefaultColumns);
    } else {
      setTempSelectedKeys(columns.map((c) => c.key));
    }
  };

  const handleApply = (close: () => void) => {
    onFilter(tempSelectedKeys);
    close();
  };

  const handleClearAll = (close: () => void) => {
    setTempSelectedKeys(activeDefaultColumns);
    onFilter(activeDefaultColumns);
    onClear();
    close();
  };

  const updatePosition = () => {
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, []);

  const searchLower = columnSearch.toLowerCase();

  // Filter columns based on search input
  const filteredColumns = columns.filter((c) =>
    c.label.toLowerCase().includes(searchLower)
  );

  // Split columns strictly into Default (locked) vs Custom (selectable)
  const defaultDisplayColumns = filteredColumns.filter((c) =>
    activeDefaultColumns.includes(c.key)
  );

  const customDisplayColumns = filteredColumns.filter(
    (c) => !activeDefaultColumns.includes(c.key)
  );

  let topPosition = 0;
  let leftPosition = 0;
  let maxDropdownHeight = 400;

  if (buttonRect) {
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - buttonRect.bottom - 20;
    topPosition = buttonRect.bottom + 8;
    maxDropdownHeight = Math.min(400, Math.max(200, spaceBelow));
    leftPosition =
      buttonRect.left + DROPDOWN_WIDTH > window.innerWidth
        ? buttonRect.right - DROPDOWN_WIDTH
        : buttonRect.left;
  }

  // Column Item Renderer
  const renderColumnItem = (col: FilterColumn) => {
    const isSelected = tempSelectedKeys.includes(col.key);
    const isDefault = activeDefaultColumns.includes(col.key);

    return (
      <div
        key={col.key}
        className={`w-full flex items-center px-2 py-1.5 text-left text-xs sm:text-sm rounded-md transition-all select-none ${
          isSelected
            ? "bg-primary/10 text-primary dark:text-primary font-medium"
            : "text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }`}
      >
        <button
          type="button"
          onClick={() => handleToggleColumn(col.key)}
          disabled={isDefault && isSelected}
          className={`flex items-center gap-2 flex-1 text-left min-w-0 ${
            isDefault && isSelected ? "cursor-not-allowed opacity-90" : "cursor-pointer"
          }`}
        >
          <div
            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors flex-shrink-0 ${
              isDefault && isSelected
                ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-primary"
                : isSelected
                ? "bg-primary border-primary text-white"
                : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
            }`}
          >
            {isDefault && isSelected ? (
              <Lock size={10} className="text-primary" />
            ) : (
              isSelected && <Check size={10} />
            )}
          </div>
          <span className="truncate flex-1 text-sm font-medium">{col.label}</span>
        </button>
      </div>
    );
  };

  const showDefaultAccordion = defaultDisplayColumns.length > 0;
  const shouldExpandDefaults = isDefaultExpanded || columnSearch.trim().length > 0;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <StateResetter
            open={open}
            selectedColumns={selectedColumns}
            setTempSelectedKeys={setTempSelectedKeys}
            updatePosition={updatePosition}
          />

          <Popover.Button
            ref={buttonRef}
            onClick={updatePosition}
            title={buttonLabel}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-300 focus:outline-none shadow-sm
              ${
                open || selectedColumns.length > 0
                  ? "border-primary text-primary bg-primary/10 dark:text-primary dark:border-primary"
                  : "bg-white text-text-secondary border-gray-300 hover:border-primary hover:text-primary dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
              }`}
          >
            <Filter size={14} />
            <span className="whitespace-nowrap">{buttonLabel}</span>
            {selectedColumns.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 text-[11px] font-bold text-white bg-primary rounded-full">
                {selectedColumns.length}
              </span>
            )}
          </Popover.Button>

          {open && buttonRect && (
            <Portal>
              <div className="fixed inset-0 z-[9999]" onClick={() => close()}>
                <div
                  className="absolute flex flex-col"
                  style={{
                    top: topPosition,
                    left: leftPosition,
                    maxHeight: maxDropdownHeight,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Transition
                    appear={true}
                    show={true}
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1 scale-95"
                    enterTo="opacity-100 translate-y-0 scale-100"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0 scale-100"
                    leaveTo="opacity-0 translate-y-1 scale-95"
                  >
                    <div
                      className="w-[280px] rounded-lg bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden"
                      style={{ maxHeight: "inherit" }}
                    >
                      {/* Header */}
                      <div className="flex-none px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-2 bg-gray-50/30 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-gray-300">
                            Search {buttonLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => close()}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Find..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-text-primary dark:text-white"
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Select All / Deselect All */}
                      <div className="flex-none border-b border-gray-100 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div
                            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                              tempSelectedKeys.length === columns.length
                                ? "bg-primary border-primary text-white"
                                : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                            }`}
                          >
                            {tempSelectedKeys.length === columns.length && (
                              <Check size={10} />
                            )}
                          </div>
                          <span>
                            {tempSelectedKeys.length === columns.length
                              ? "Deselect All"
                              : "Select All"}
                          </span>
                        </button>
                      </div>

                      {/* List Area */}
                      <div className="flex-1 overflow-y-auto min-h-0 p-1">
                        {/* Expandable Default Options Section */}
                        {showDefaultAccordion && (
                          <div className="border-b border-gray-100 dark:border-gray-700/60 pb-1 mb-1">
                            <button
                              type="button"
                              onClick={() => setIsDefaultExpanded((prev) => !prev)}
                              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <Lock size={12} className="text-gray-400" />
                                <span>Default Options ({defaultDisplayColumns.length})</span>
                              </span>
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${
                                  shouldExpandDefaults ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {shouldExpandDefaults && (
                              <div className="mt-1 space-y-0.5">
                                {defaultDisplayColumns.map((col) => renderColumnItem(col))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Custom Selectable Options */}
                        {customDisplayColumns.length > 0 ? (
                          <div className="space-y-0.5">
                            {customDisplayColumns.map((col) => renderColumnItem(col))}
                          </div>
                        ) : (
                          !showDefaultAccordion && (
                            <div className="py-4 px-4 text-center text-gray-400 text-xs">
                              No items found
                            </div>
                          )
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex-none p-2 sm:p-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleClearAll(close)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-text-primary dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          Clear
                        </button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleApply(close)}
                          className="px-3 py-1 h-auto text-xs min-w-[65px]"
                        >
                          {isLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </Portal>
          )}
        </>
      )}
    </Popover>
  );
};

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const StateResetter: React.FC<{
  open: boolean;
  selectedColumns: string[];
  setTempSelectedKeys: (keys: string[]) => void;
  updatePosition: () => void;
}> = ({ open, selectedColumns, setTempSelectedKeys, updatePosition }) => {
  useEffect(() => {
    if (open) {
      updatePosition();
    } else {
      setTempSelectedKeys(selectedColumns);
    }
  }, [open, selectedColumns, setTempSelectedKeys, updatePosition]);

  return null;
};

export default AdvancedFilter;