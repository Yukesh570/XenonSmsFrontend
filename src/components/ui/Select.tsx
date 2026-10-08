import React, { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Combobox, Transition } from "@headlessui/react";
import { ChevronDown, Check, X, Loader2 } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import FastTooltip from "./FastTooltip";

export interface SelectOption {
  value: string;
  label: string;
  displayLabel?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  clearable?: boolean;
  disabled?: boolean;
  required?: boolean;
  placement?: "top" | "bottom";
  className?: string;
  allowCustomValue?: boolean;
  renderTrigger?: (selectedOption?: SelectOption, open?: boolean) => React.ReactNode;
  isLoading?: boolean;
  menuWidth?: number | string;
  minMenuWidth?: number | string;
}

const SelectContent: React.FC<SelectProps & { open: boolean }> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  clearable = true,
  disabled = false,
  required = false,
  placement = "bottom",
  className = "",
  allowCustomValue = false,
  renderTrigger,
  isLoading,
  menuWidth,
  minMenuWidth,
  open,
}) => {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const hasLabel = !!label;

  const anchorRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<"top" | "bottom">(placement);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setIsTyping(false);
      setIsTimedOut(false);
      setHighlightedIndex(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && options.length === 0 && isLoading !== false) {
      const timer = setTimeout(() => {
        setIsTimedOut(true);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setIsTimedOut(false);
    }
  }, [open, options.length, isLoading]);

  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
  const isOptionsLoading =
    isLoading === true ||
    (hasValue && options.length === 0 && isLoading !== false && !isTimedOut);
  const isEffectivelyDisabled = disabled || isOptionsLoading;

  useEffect(() => {
    if (isOptionsLoading) {
      if (inputRef.current) {
        inputRef.current.value = "Loading...";
      }
      return;
    }
    const opt = options.find((o) => o.value === value);
    const actualDisplayValue = opt ? (opt.displayLabel ?? opt.label) : (value || "");
    if (inputRef.current) {
      inputRef.current.value = actualDisplayValue;
    }
    if (!value) {
      setQuery("");
    }
    setIsTyping(false);
  }, [value, options, isOptionsLoading]);

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        (option.displayLabel && option.displayLabel.toLowerCase().includes(query.toLowerCase())) ||
        option.value.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    setVisibleCount(50);
    setHighlightedIndex(null);
  }, [query, options]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (visibleCount < filteredOptions.length) {
        setVisibleCount((prev) => prev + 50);
      }
    }
  };

  const visibleOptions = filteredOptions.slice(0, visibleCount);

  useEffect(() => {
    if (highlightedIndex !== null) {
      const el = document.querySelector(`[data-option-index="${highlightedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsTyping(false);
    setHighlightedIndex(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const isSelectingOptionRef = useRef(false);

  const comboboxButtonRef = useRef<HTMLButtonElement>(null);

  const forceCloseCombobox = () => {
    if (open && comboboxButtonRef.current) {
      comboboxButtonRef.current.click();
    }
  };

  const findNextValidIndex = (current: number | null, step: number) => {
    if (visibleOptions.length === 0) return null;
    if (current === null) {
      return step > 0 ? 0 : visibleOptions.length - 1;
    }
    if (current === 0 && step < 0) {
      return null;
    }
    let next = current + step;
    if (next < 0) return null;
    if (next >= visibleOptions.length) {
      next = 0;
    }
    for (let i = 0; i < visibleOptions.length; i++) {
      if (!visibleOptions[next]?.disabled) return next;
      next += step;
      if (next < 0 || next >= visibleOptions.length) return null;
    }
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      const nextIdx = findNextValidIndex(highlightedIndex, 1);
      setHighlightedIndex(nextIdx);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const prevIdx = findNextValidIndex(highlightedIndex, -1);
      setHighlightedIndex(prevIdx);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (open) {
        // Case 1: User explicitly navigated to an option (via Arrow keys or mouse)
        if (highlightedIndex !== null && visibleOptions[highlightedIndex]) {
          const chosen = visibleOptions[highlightedIndex];
          if (chosen.disabled) return;

          isSelectingOptionRef.current = true;
          setQuery("");
          setIsTyping(false);
          setHighlightedIndex(null);

          if (inputRef.current) {
            inputRef.current.value = chosen.displayLabel ?? chosen.label;
          }

          onChange(chosen.value);

          const el = document.querySelector(`[data-option-index="${highlightedIndex}"]`) as HTMLElement;
          if (el) {
            el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
          } else {
            forceCloseCombobox();
          }

          if (allowCustomValue) {
            setTimeout(() => {
              isSelectingOptionRef.current = false;
              const form = inputRef.current?.closest("form");
              if (form) {
                form.requestSubmit();
              }
            }, 50);
          } else {
            setTimeout(() => {
              isSelectingOptionRef.current = false;
            }, 100);
          }
          return;
        }

        const trimmedQuery = query.trim();

        // Case 2: In search filters (allowCustomValue), if user did NOT arrow down, search what was typed
        if (allowCustomValue && trimmedQuery !== "") {
          isSelectingOptionRef.current = true;
          onChange(trimmedQuery);
          if (inputRef.current) {
            inputRef.current.value = trimmedQuery;
          }
          setQuery("");
          setIsTyping(false);
          setHighlightedIndex(null);
          forceCloseCombobox();

          setTimeout(() => {
            isSelectingOptionRef.current = false;
            const form = inputRef.current?.closest("form");
            if (form) {
              form.requestSubmit();
            }
          }, 50);
          return;
        }

        // Case 3: In strict form dropdowns (allowCustomValue = false) without arrow navigation
        if (trimmedQuery !== "") {
          const exactMatch = filteredOptions.find(
            (o) =>
              !o.disabled &&
              (o.value.toLowerCase() === trimmedQuery.toLowerCase() ||
                o.label.toLowerCase() === trimmedQuery.toLowerCase() ||
                (o.displayLabel && o.displayLabel.toLowerCase() === trimmedQuery.toLowerCase()))
          );

          if (exactMatch) {
            isSelectingOptionRef.current = true;
            onChange(exactMatch.value);
            setQuery("");
            setIsTyping(false);
            setHighlightedIndex(null);
            if (inputRef.current) {
              inputRef.current.value = exactMatch.displayLabel ?? exactMatch.label;
            }
            const matchedIdx = visibleOptions.findIndex((o) => o.value === exactMatch.value);
            if (matchedIdx !== -1) {
              const el = document.querySelector(`[data-option-index="${matchedIdx}"]`) as HTMLElement;
              if (el) {
                el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
              } else {
                forceCloseCombobox();
              }
            } else {
              forceCloseCombobox();
            }
            setTimeout(() => {
              isSelectingOptionRef.current = false;
            }, 100);
            return;
          }

          // If only partial text typed and no option highlighted: do not auto-select
          return;
        }

        // Case 4: No query or no match, just close dropdown
        forceCloseCombobox();
      } else {
        // Dropdown closed - pressing Enter in search field submits the form immediately
        if (allowCustomValue) {
          const inputEl = e.currentTarget;
          const currentVal = inputEl.value.trim();
          if (currentVal !== value) {
            onChange(currentVal);
          }
          setTimeout(() => {
            const form = inputEl.closest("form");
            if (form) {
              form.requestSubmit();
            }
          }, 50);
        }
      }
    }
  };

  const updateCoords = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const estimatedMenuHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const finalPlacement: "top" | "bottom" =
      placement === "top" || spaceBelow < estimatedMenuHeight ? "top" : "bottom";

    setResolvedPlacement(finalPlacement);
    setCoords({
      top: finalPlacement === "bottom" ? rect.bottom + 4 : rect.top - 4,
      left: rect.left,
      width: rect.width,
    });
  }, [placement]);

  useEffect(() => {
    if (!coords) return;
    const handler = () => updateCoords();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [coords, updateCoords]);

  useEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open, updateCoords]);

  if (open && !coords) {
    requestAnimationFrame(updateCoords);
  }
  if (!open && coords) {
    setTimeout(() => setCoords(null), 0);
  }

  const selectedOption = !isOptionsLoading ? options.find((o) => o.value === value) : undefined;
  const hasValueSet = Boolean(selectedOption || (hasValue && !isOptionsLoading));
  const hoverText = isOptionsLoading
    ? "Loading..."
    : hasValueSet
      ? (selectedOption ? (selectedOption.displayLabel ?? selectedOption.label) : String(value))
      : "";

  return (
    <div className={`flex flex-col ${hasLabel ? "" : "justify-end"} ${className}`}>
      {hasLabel && (
        <label title={label} className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`relative ${renderTrigger ? "inline-flex" : "w-full"}`} ref={anchorRef}>
        {renderTrigger ? (
          <>
            <Combobox.Button
              as="div"
              className={`inline-flex ${isEffectivelyDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {renderTrigger(selectedOption, open)}
            </Combobox.Button>
            <Combobox.Input className="sr-only" aria-hidden="true" tabIndex={-1} readOnly value={value || ""} />
          </>
        ) : (
          <FastTooltip text={hoverText} disabled={open || isFocused || isTyping || !hasValueSet || isOptionsLoading}>
            <div
              className={`relative w-full h-[34px] flex items-center rounded-lg border text-sm text-left shadow-input transition duration-150 ease-in-out focus-within:outline-none focus-within:ring-1 
              ${error
                  ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500 dark:border-red-500 dark:focus-within:border-red-500 dark:focus-within:ring-red-500"
                  : "border-gray-200 focus-within:border-primary focus-within:ring-primary dark:focus-within:border-primary dark:focus-within:ring-primary"
                } 
              ${isEffectivelyDisabled
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800"
                }
              dark:border-gray-700`}
            >
              {selectedOption?.icon && !isTyping && !isOptionsLoading && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  {selectedOption.icon}
                </span>
              )}
              <Combobox.Input
                ref={inputRef}
                name="search-select-field"
                autoComplete="off"
                data-bwignore="true"
                data-lpignore="true"
                data-1p-ignore="true"
                data-dashlane-ignore="true"
                data-form-type="other"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className={`w-full h-full border-none bg-transparent ${selectedOption?.icon && !isTyping && !isOptionsLoading ? "pl-9" : "px-3"} pr-12 outline-none focus:outline-none focus:ring-0 focus:border-transparent text-text-primary dark:text-white text-xs sm:text-sm py-0 leading-normal ${isEffectivelyDisabled ? "text-gray-400 cursor-not-allowed dark:text-gray-500" : ""
                  }`}
                displayValue={(val: string) => {
                  if (isOptionsLoading) return "Loading...";
                  const opt = options.find((option) => option.value === val);
                  return opt ? (opt.displayLabel ?? opt.label) : (val || "");
                }}
                disabled={isEffectivelyDisabled}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setIsTyping(true);
                  setHighlightedIndex(null);
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  setIsFocused(false);
                  if (isSelectingOptionRef.current) {
                    return;
                  }
                  if (isOptionsLoading) {
                    if (inputRef.current) {
                      inputRef.current.value = "Loading...";
                    }
                    return;
                  }
                  if (allowCustomValue && isTyping && query.trim() !== "") {
                    const trimmedQuery = query.trim();
                    const match = options.find(
                      (o) =>
                        o.value === trimmedQuery ||
                        o.label.toLowerCase() === trimmedQuery.toLowerCase() ||
                        (o.displayLabel && o.displayLabel.toLowerCase() === trimmedQuery.toLowerCase())
                    );
                    if (!match && trimmedQuery !== value) {
                      onChange(trimmedQuery);
                    }
                  } else {
                    setQuery("");
                    setIsTyping(false);
                    if (inputRef.current) {
                      const opt = options.find((o) => o.value === value);
                      const actualDisplayValue = opt ? (opt.displayLabel ?? opt.label) : (value || "");
                      inputRef.current.value = actualDisplayValue;
                    }
                  }
                }}
                placeholder={isOptionsLoading ? "Loading..." : placeholder}
              />

              {isOptionsLoading ? (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                  <Loader2 size={15} className="animate-spin text-primary" />
                </div>
              ) : (
                <Combobox.Button ref={comboboxButtonRef} className="absolute inset-y-0 right-0 flex items-center pr-2" disabled={isEffectivelyDisabled}>
                  <ChevronDown
                    size={16}
                    className={`${isEffectivelyDisabled ? "text-gray-300" : "text-gray-500 dark:text-gray-400"
                      }`}
                    aria-hidden="true"
                  />
                </Combobox.Button>
              )}

              {(value || query) && clearable && !isEffectivelyDisabled && !open && (
                <span
                  onClick={handleClear}
                  className="absolute inset-y-0 right-7 flex items-center pr-1 cursor-pointer hover:text-red-500 group z-10"
                  title="Clear selection"
                >
                  <X size={14} className="text-gray-400 group-hover:text-red-500" />
                </span>
              )}
            </div>
          </FastTooltip>
        )}

        {!disabled &&
          coords &&
          createPortal(
            <Transition
              as={Fragment}
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Combobox.Options
                onScroll={handleScroll}
                style={{
                  position: "fixed",
                  top: resolvedPlacement === "bottom" ? coords.top : undefined,
                  bottom:
                    resolvedPlacement === "top"
                      ? window.innerHeight - coords.top
                      : undefined,
                  left: renderTrigger
                    ? Math.max(8, Math.min(coords.left, window.innerWidth - Math.max(coords.width, 130) - 8))
                    : Math.max(
                      8,
                      Math.min(
                        coords.left,
                        window.innerWidth -
                        (typeof menuWidth === "number"
                          ? menuWidth
                          : typeof minMenuWidth === "number"
                            ? minMenuWidth
                            : coords.width) -
                        8
                      )
                    ),
                  width: menuWidth ?? (renderTrigger ? Math.max(coords.width, 130) : coords.width),
                  minWidth: minMenuWidth ?? (renderTrigger ? 130 : undefined),
                }}
                className="z-[99999] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-gray-700 custom-grid-scroll max-h-60"
              >
                {isLoading || (options.length === 0 && !isTimedOut && isLoading !== false) ? (
                  <div className="py-4 px-4 flex flex-col items-center justify-center">
                    <LoadingSpinner size="sm" text="Loading..." className="py-0" />
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-text-secondary dark:text-gray-400 text-sm">
                    Nothing found.
                  </div>
                ) : (
                  visibleOptions.map((option, index) => (
                    <Combobox.Option
                      key={`${option.value}-${index}`}
                      disabled={option.disabled}
                      data-option-index={index}
                      onMouseEnter={() => {
                        if (!option.disabled) setHighlightedIndex(index);
                      }}
                      onMouseDown={() => {
                        isSelectingOptionRef.current = true;
                      }}
                      className={() => {
                        const isHighlighted = highlightedIndex === index;
                        return `relative cursor-default select-none py-2 pl-3 pr-10 ${option.disabled
                            ? "opacity-40 cursor-not-allowed"
                            : isHighlighted
                              ? "bg-primary/10 text-primary dark:text-primary dark:bg-primary/20"
                              : "text-text-secondary dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                          }`;
                      }}
                      value={option.value}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`flex items-center gap-2 whitespace-normal break-words leading-tight ${selected
                                ? "font-medium text-primary dark:text-primary"
                                : "font-normal"
                              }`}
                          >
                            {option.icon && <span>{option.icon}</span>}
                            <span className="block">{option.label}</span>
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary dark:text-primary">
                              <Check size={16} aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
                {visibleCount < filteredOptions.length && (
                  <div className="text-center py-2 text-xs text-gray-400">
                    Scroll for more...
                  </div>
                )}
              </Combobox.Options>
            </Transition>,
            document.body
          )}
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};

const Select: React.FC<SelectProps> = (props) => {
  const hasValue = props.value !== undefined && props.value !== null && String(props.value).trim() !== "";
  const isLocked = props.isLoading === true || (hasValue && props.options.length === 0 && props.isLoading !== false);

  return (
    <Combobox
      value={props.value}
      onChange={(val: string | null) => {
        if (val !== null && !isLocked) {
          props.onChange(val);
        }
      }}
      disabled={props.disabled || isLocked}
    >
      {({ open }) => <SelectContent {...props} open={open && !isLocked} />}
    </Combobox>
  );
};

export default Select;