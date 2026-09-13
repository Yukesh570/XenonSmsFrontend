import React, { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Combobox, Transition } from "@headlessui/react";
import { ChevronDown, Check, X } from "lucide-react";

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
  open,
}) => {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const hasLabel = !!label;

  const anchorRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<"top" | "bottom">(placement);
  const [isTyping, setIsTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setIsTyping(false);
    }
  }, [open]);

  useEffect(() => {
    if (!value) {
      setQuery("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    setIsTyping(false);
  }, [value]);

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

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const trimmedQuery = query.trim();
      if (trimmedQuery !== "") {
        const match = options.find(
          (o) =>
            o.value === trimmedQuery ||
            o.label.toLowerCase() === trimmedQuery.toLowerCase() ||
            (o.displayLabel && o.displayLabel.toLowerCase() === trimmedQuery.toLowerCase())
        );
        
        if (match) {
          onChange(match.value);
        } else if (allowCustomValue) {
          onChange(trimmedQuery);
        }
      }

      const inputEl = e.currentTarget;
      inputEl.blur();

      if (allowCustomValue) {
        setTimeout(() => {
          const form = inputEl.closest("form");
          if (form) {
            form.requestSubmit();
          }
        }, 0);
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

  const selectedOption = options.find((o) => o.value === value);

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
              className={`inline-flex ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {renderTrigger(selectedOption, open)}
            </Combobox.Button>
            <Combobox.Input className="sr-only" aria-hidden="true" tabIndex={-1} readOnly value={value || ""} />
          </>
        ) : (
          <div
            className={`relative w-full rounded-lg border text-sm text-left shadow-input transition duration-150 ease-in-out focus-within:outline-none focus-within:ring-1 
            ${
              error
                ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                : "border-gray-200 focus-within:border-primary focus-within:ring-primary"
            } 
            ${
              disabled
                ? "bg-gray-100 dark:bg-gray-800"
                : "bg-white dark:bg-gray-800"
            }
            dark:border-gray-700`}
          >
          {selectedOption?.icon && !isTyping && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
            className={`w-full border-none bg-transparent ${selectedOption?.icon && !isTyping ? "pl-10" : "px-3"} pr-10 outline-none focus:outline-none focus:ring-0 focus:border-transparent text-text-primary dark:text-white text-sm ${
              hasLabel ? "py-2.5" : "py-2"
            } ${
              disabled ? "text-gray-400 cursor-not-allowed dark:text-gray-500" : ""
            }`}
            displayValue={(val: string) => {
              const opt = options.find((option) => option.value === val);
              return opt ? (opt.displayLabel ?? opt.label) : (val || "");
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsTyping(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (allowCustomValue && query.trim() !== "") {
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
              } else if (!allowCustomValue) {
                setQuery("");
                setIsTyping(false);
                if (inputRef.current) {
                  const opt = options.find((o) => o.value === value);
                  const actualDisplayValue = opt ? (opt.displayLabel ?? opt.label) : (value || "");
                  inputRef.current.value = actualDisplayValue;
                }
              }
            }}
            placeholder={placeholder}
          />

          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown
              size={18}
              className={`${
                disabled ? "text-gray-300" : "text-gray-500 dark:text-gray-400"
              }`}
              aria-hidden="true"
            />
          </Combobox.Button>

          {(value || query) && clearable && !disabled && (
            <span
              onClick={handleClear}
              className="absolute inset-y-0 right-8 flex items-center pr-2 cursor-pointer hover:text-red-500 group z-10"
              title="Clear selection"
            >
              <X size={16} className="text-gray-400 group-hover:text-red-500" />
            </span>
          )}
        </div>
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
                    : coords.left,
                  width: renderTrigger ? Math.max(coords.width, 130) : coords.width,
                  minWidth: renderTrigger ? 130 : undefined,
                }}
                className="z-[99999] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-gray-700 custom-grid-scroll max-h-60"
              >
                {filteredOptions.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-text-secondary dark:text-gray-400">
                    Nothing found.
                  </div>
                ) : (
                  visibleOptions.map((option, index) => (
                    <Combobox.Option
                      key={`${option.value}-${index}`}
                      disabled={option.disabled}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-3 pr-10 ${
                          option.disabled
                            ? "opacity-40 cursor-not-allowed"
                            : active
                            ? "bg-primary/10 text-primary dark:text-primary dark:bg-primary/20"
                            : "text-text-secondary dark:text-gray-300"
                        }`
                      }
                      value={option.value}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`flex items-center gap-2 whitespace-normal break-words leading-tight ${
                              selected
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
  return (
    <Combobox
      value={props.value}
      onChange={(val: string | null) => {
        if (val !== null) {
          props.onChange(val);
        }
      }}
      disabled={props.disabled}
    >
      {({ open }) => <SelectContent {...props} open={open} />}
    </Combobox>
  );
};

export default Select;