import React, { forwardRef, useState, useEffect, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
import { Calendar, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import FastTooltip from "./FastTooltip";

const customDatePickerStyles = `
  .react-datepicker-wrapper {
    width: 100%;
  }
  #datepicker-portal {
    position: relative;
    z-index: 99999 !important;
  }
  .react-datepicker-popper {
    z-index: 99999 !important;
  }
  
  /* --- MAIN CONTAINER --- */
  .react-datepicker {
    font-family: inherit;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    background-color: #ffffff;
    display: flex !important;
    flex-direction: column !important;
    position: relative !important;
    overflow: hidden;
  }

  .dark .react-datepicker,
  body.dark .react-datepicker {
    background-color: #1f2937 !important; /* gray-800 */
    border-color: #374151 !important;     /* gray-700 */
    color: #f3f4f6 !important;
  }

  /* --- CHILDREN CONTAINER UNWRAPPED VIA DISPLAY: CONTENTS --- */
  .react-datepicker__children-container {
    display: contents !important;
  }

  /* --- CALENDAR MONTH CONTAINER --- */
  .react-datepicker__month-container {
    float: none !important;
    display: flex !important;
    flex-direction: column !important;
    order: 0 !important;
  }

  .react-datepicker__header {
    background-color: transparent !important;
    border-bottom: none !important;
    padding: 0 !important;
  }

  .react-datepicker__day-names {
    display: flex;
    justify-content: space-around;
    padding: 8px 8px 4px 8px;
    border-bottom: 1px solid #f3f4f6;
  }
  .dark .react-datepicker__day-names {
    border-color: #374151 !important;
  }

  .react-datepicker__day-name {
    color: #6b7280;
    font-size: 0.75rem;
    font-weight: 600;
    width: 2.25rem;
    line-height: 1.75rem;
    margin: 0;
  }
  .dark .react-datepicker__day-name,
  body.dark .react-datepicker__day-name {
    color: #9ca3af !important;
  }

  .react-datepicker__month {
    margin: 6px 8px 8px 8px !important;
  }

  /* --- DAYS --- */
  .react-datepicker__day {
    width: 2.25rem;
    line-height: 2.25rem;
    margin: 0.1rem;
    border-radius: 0.5rem;
    color: #374151;
    font-size: 0.8125rem;
    font-weight: 400;
    transition: all 120ms ease;
  }
  .dark .react-datepicker__day,
  body.dark .react-datepicker__day {
    color: #e5e7eb !important;
  }
  
  /* Hover State */
  .react-datepicker__day:hover {
    background-color: #f3f4f6;
    border-radius: 0.5rem;
  }
  .dark .react-datepicker__day:hover,
  body.dark .react-datepicker__day:hover {
    background-color: #374151 !important;
    color: #ffffff !important;
  }
  
  /* Selected State */
  .react-datepicker__day--selected {
    background-color: var(--color-primary) !important; 
    color: #ffffff !important;
    font-weight: 600;
    border-radius: 0.5rem;
  }

  /* Neutralize today date highlight & keyboard focus */
  .react-datepicker__day--today:not(.react-datepicker__day--selected):not(:hover),
  .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--selected):not(:hover) {
    background-color: transparent !important;
    color: inherit !important;
    font-weight: normal !important;
  }

  .react-datepicker__day--outside-month {
    color: #9ca3af !important;
    opacity: 0.45;
  }
  .dark .react-datepicker__day--outside-month {
    color: #6b7280 !important;
  }

  /* Hide default time container completely */
  .react-datepicker__time-container {
    display: none !important;
  }

  /* Slim Modern Scrollbar for month/year popovers */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 4px;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
`;

export type DatePickerMode = "whole_day" | "specific_time";

export const parseDateValue = (val?: string | Date | null): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "string" && !val.includes("T")) {
    const parts = val.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export interface DatePickerProps {
  label: string;
  selected: Date | string | null;
  onChange: (date: Date | null, mode?: DatePickerMode) => void;
  showTimeSelect?: boolean;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
  isClearable?: boolean;
  enableModeToggle?: boolean;
  dateMode?: DatePickerMode;
  onDateModeChange?: (mode: DatePickerMode) => void;
  portalId?: string;
}

const CustomInput = forwardRef<HTMLInputElement, any>(
  (
    {
      value,
      onClick,
      onChange,
      placeholder,
      className,
      onClear,
      disabled,
      isClearable,
    },
    ref
  ) => {
    const hasValue = Boolean(value && String(value).trim() !== "");
    return (
      <FastTooltip text={hasValue ? value : ""} disabled={!hasValue}>
        <div className="relative group w-full">
          <div className="relative">
            <input
              autoComplete="off"
              value={value}
              onClick={!disabled ? onClick : undefined}
              onChange={!disabled ? onChange : undefined}
              ref={ref}
              disabled={disabled}
              placeholder={placeholder}
              readOnly
              className={`w-full rounded-lg border px-3 py-2.5 pl-10 pr-10 text-sm shadow-input transition duration-150 ease-in-out focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer
              ${
                disabled
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
                  : "bg-white border-gray-200 text-text-primary dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
              }
              ${className}`}
            />

            {/* Calendar Icon */}
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors ${
                disabled
                  ? "text-gray-400"
                  : "text-gray-500 dark:text-gray-400 group-hover:text-primary"
              }`}
            >
              <Calendar size={18} />
            </div>

            {/* Clear Button */}
            {value && isClearable && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </FastTooltip>
    );
  }
);

CustomInput.displayName = "CustomInput";

interface ManualTimePickerProps {
  selected: Date | null;
  nowInTz: Date;
  onChange: (date: Date) => void;
}

const ManualTimePicker: React.FC<ManualTimePickerProps> = ({
  selected,
  nowInTz,
  onChange,
}) => {
  const defaultMidnight = useMemo(() => {
    const d = new Date(nowInTz.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [nowInTz]);

  const currentDate = selected || defaultMidnight;
  const rawH = currentDate.getHours();
  const currentM = currentDate.getMinutes();

  const [hourStr, setHourStr] = useState(String(rawH).padStart(2, "0"));
  const [minStr, setMinStr] = useState(String(currentM).padStart(2, "0"));
  const [isHourFocused, setIsHourFocused] = useState(false);
  const [isMinFocused, setIsMinFocused] = useState(false);

  useEffect(() => {
    const d = selected || defaultMidnight;
    if (!isHourFocused) {
      setHourStr(String(d.getHours()).padStart(2, "0"));
    }
    if (!isMinFocused) {
      setMinStr(String(d.getMinutes()).padStart(2, "0"));
    }
  }, [selected, defaultMidnight, isHourFocused, isMinFocused]);

  const commitTime = (h24: number, m: number) => {
    const base = selected ? new Date(selected.getTime()) : new Date(nowInTz.getTime());
    base.setHours(h24, m, 0, 0);
    onChange(base);
  };

  const handleHourStep = (delta: number) => {
    let num = (parseInt(hourStr, 10) || 0) + delta;
    if (num > 23) num = 0;
    if (num < 0) num = 23;
    setHourStr(String(num).padStart(2, "0"));
    commitTime(num, parseInt(minStr, 10) || 0);
  };

  const handleMinuteStep = (delta: number) => {
    let num = (parseInt(minStr, 10) || 0) + delta;
    if (num > 59) num = 0;
    if (num < 0) num = 59;
    setMinStr(String(num).padStart(2, "0"));
    commitTime(parseInt(hourStr, 10) || 0, num);
  };

  return (
    <div
      className="w-full border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 px-3 py-2 flex items-center justify-between select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Time (24h)
      </span>

      <div className="flex items-center gap-1">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleHourStep(1)}
            className="p-0.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
            title="Increase Hour"
          >
            <ChevronUp size={12} strokeWidth={2.5} />
          </button>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={hourStr}
            onFocus={(e) => {
              setIsHourFocused(true);
              e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                handleHourStep(1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                handleHourStep(-1);
              } else if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 2) {
                setHourStr(val);
                if (val.length === 2) {
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 0 && num <= 23) {
                    commitTime(num, parseInt(minStr, 10) || 0);
                  }
                }
              }
            }}
            onBlur={() => {
              setIsHourFocused(false);
              let num = parseInt(hourStr, 10);
              if (isNaN(num) || num < 0) num = 0;
              if (num > 23) num = 23;
              setHourStr(String(num).padStart(2, "0"));
              commitTime(num, parseInt(minStr, 10) || 0);
            }}
            className="w-8 h-6 text-xs text-center font-semibold font-mono rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleHourStep(-1)}
            className="p-0.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
            title="Decrease Hour"
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </button>
        </div>

        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 pb-0.5">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleMinuteStep(1)}
            className="p-0.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
            title="Increase Minute"
          >
            <ChevronUp size={12} strokeWidth={2.5} />
          </button>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={minStr}
            onFocus={(e) => {
              setIsMinFocused(true);
              e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                handleMinuteStep(1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                handleMinuteStep(-1);
              } else if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 2) {
                setMinStr(val);
                if (val.length === 2) {
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 0 && num <= 59) {
                    commitTime(parseInt(hourStr, 10) || 0, num);
                  }
                }
              }
            }}
            onBlur={() => {
              setIsMinFocused(false);
              let num = parseInt(minStr, 10);
              if (isNaN(num) || num < 0) num = 0;
              if (num > 59) num = 59;
              setMinStr(String(num).padStart(2, "0"));
              commitTime(parseInt(hourStr, 10) || 0, num);
            }}
            className="w-8 h-6 text-xs text-center font-semibold font-mono rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleMinuteStep(-1)}
            className="p-0.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
            title="Decrease Minute"
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

const getNowInTimezone = (tz: string) => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();

    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10);
      if (part.type === "month") month = parseInt(part.value, 10) - 1;
      if (part.type === "day") day = parseInt(part.value, 10);
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
      if (part.type === "second") second = parseInt(part.value, 10);
    }
    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    return new Date();
  }
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const START_YEAR = 1990;
const END_YEAR = 2035;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

interface CalendarHeaderProps {
  date: Date;
  changeYear: (year: number) => void;
  changeMonth: (month: number) => void;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}) => {
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

  const selectedYearRef = useRef<HTMLButtonElement | null>(null);
  const selectedMonthRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll selected year/month into center view when dropdown opens
  useEffect(() => {
    if (isYearOpen && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: "center" });
    }
  }, [isYearOpen]);

  useEffect(() => {
    if (isMonthOpen && selectedMonthRef.current) {
      selectedMonthRef.current.scrollIntoView({ block: "center" });
    }
  }, [isMonthOpen]);

  return (
    <div className="relative flex items-center justify-between px-2 h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 select-none">
      {/* Outside click backdrop */}
      {(isMonthOpen || isYearOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsMonthOpen(false);
            setIsYearOpen(false);
          }}
        />
      )}

      {/* Prev button */}
      <button
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        type="button"
        className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 disabled:opacity-30 transition z-10"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Header Buttons: Month & Year */}
      <div className="flex items-center gap-1.5 z-40">
        {/* Month Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsMonthOpen(!isMonthOpen);
              setIsYearOpen(false);
            }}
            className="flex items-center gap-1 px-1.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700/60 rounded transition-colors"
          >
            <span>{MONTHS[date.getMonth()]}</span>
            {isMonthOpen ? (
              <ChevronUp size={14} strokeWidth={2.5} className="text-primary" />
            ) : (
              <ChevronDown size={14} strokeWidth={2.5} className="text-gray-500" />
            )}
          </button>

          {/* Month Popover Menu */}
          {isMonthOpen && (
            <div className="absolute top-8 left-0 z-50 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* LOCKED MONTH TITLE: Remains fixed at top while scrolling */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 py-2 text-center text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700/80">
                MONTH
              </div>
              <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {MONTHS.map((m, idx) => {
                  const isSelected = idx === date.getMonth();
                  return (
                    <button
                      key={m}
                      ref={isSelected ? selectedMonthRef : null}
                      type="button"
                      onClick={() => {
                        changeMonth(idx);
                        setIsMonthOpen(false);
                      }}
                      className={`w-full text-center py-1.5 px-2 text-xs rounded-lg transition-colors font-medium ${
                        isSelected
                          ? "bg-gray-100 dark:bg-gray-700 text-primary dark:text-white font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Year Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsYearOpen(!isYearOpen);
              setIsMonthOpen(false);
            }}
            className="flex items-center gap-1 px-1.5 py-1 text-xs font-bold text-gray-800 dark:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700/60 rounded transition-colors"
          >
            <span>{date.getFullYear()}</span>
            {isYearOpen ? (
              <ChevronUp size={14} strokeWidth={2.5} className="text-primary" />
            ) : (
              <ChevronDown size={14} strokeWidth={2.5} className="text-gray-500" />
            )}
          </button>

          {/* Year Popover Menu */}
          {isYearOpen && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-28 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* LOCKED YEAR TITLE: Remains fixed at top while scrolling */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 py-2 text-center text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700/80">
                YEAR
              </div>
              <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {YEARS.map((y) => {
                  const isSelected = y === date.getFullYear();
                  return (
                    <button
                      key={y}
                      ref={isSelected ? selectedYearRef : null}
                      type="button"
                      onClick={() => {
                        changeYear(y);
                        setIsYearOpen(false);
                      }}
                      className={`w-full text-center py-1.5 px-2 text-xs rounded-lg transition-colors font-medium ${
                        isSelected
                          ? "bg-gray-100 dark:bg-gray-700 text-primary dark:text-white font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        type="button"
        className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 disabled:opacity-30 transition z-10"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const CustomDatePicker: React.FC<DatePickerProps> = ({
  label,
  selected,
  onChange,
  showTimeSelect = false,
  placeholder,
  minDate,
  disabled = false,
  isClearable = true,
  enableModeToggle,
  dateMode: externalDateMode,
  onDateModeChange,
  portalId = "datepicker-portal",
}) => {
  const [appTimezone, setAppTimezone] = useState<string>(
    () => localStorage.getItem("app_timezone") || "UTC"
  );
  const [appDateFormat, setAppDateFormat] = useState<string>(
    () => localStorage.getItem("app_date_format") || "YYYY-MM-DD"
  );
  const [appDateTimeFormat, setAppDateTimeFormat] = useState<string>(
    () => localStorage.getItem("app_datetime_format") || "YYYY-MM-DD HH:mm:ss"
  );

  useEffect(() => {
    const handleTimezoneChange = () => {
      setAppTimezone(localStorage.getItem("app_timezone") || "UTC");
      setAppDateFormat(localStorage.getItem("app_date_format") || "YYYY-MM-DD");
      setAppDateTimeFormat(localStorage.getItem("app_datetime_format") || "YYYY-MM-DD HH:mm:ss");
    };

    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
  }, []);

  const nowInTz = useMemo(() => getNowInTimezone(appTimezone), [appTimezone]);

  const selectedDate = useMemo(() => parseDateValue(selected), [selected]);

  // Enable mode toggle whenever explicitly requested, or by default whenever showTimeSelect is true
  const shouldEnableToggle = enableModeToggle !== undefined ? enableModeToggle : Boolean(showTimeSelect);

  // Initial mode determination
  const initialMode: DatePickerMode = useMemo(() => {
    if (externalDateMode) return externalDateMode;
    if (typeof selected === "string") {
      return selected.includes("T") ? "specific_time" : "whole_day";
    }
    if (selected instanceof Date) {
      const hasTime = selected.getHours() !== 0 || selected.getMinutes() !== 0 || selected.getSeconds() !== 0;
      return hasTime ? "specific_time" : "whole_day";
    }
    return "whole_day";
  }, [externalDateMode, selected]);

  const [internalMode, setInternalMode] = useState<DatePickerMode>(initialMode);

  useEffect(() => {
    if (externalDateMode) {
      setInternalMode(externalDateMode);
    }
  }, [externalDateMode]);

  const activeMode: DatePickerMode = shouldEnableToggle
    ? (externalDateMode || internalMode)
    : (showTimeSelect ? "specific_time" : "whole_day");

  const isTimeActive = shouldEnableToggle ? activeMode === "specific_time" : showTimeSelect;

  const handleModeToggle = (newMode: DatePickerMode) => {
    setInternalMode(newMode);
    onDateModeChange?.(newMode);

    if (selectedDate) {
      const nextDate = new Date(selectedDate.getTime());
      if (newMode === "whole_day") {
        nextDate.setHours(0, 0, 0, 0);
      }
      (nextDate as any).dateMode = newMode;
      onChange(nextDate, newMode);
    }
  };

  const handleCalendarDateClick = (date: Date | null) => {
    if (disabled) return;
    if (date) {
      if (isTimeActive) {
        const h = selectedDate ? selectedDate.getHours() : 0;
        const m = selectedDate ? selectedDate.getMinutes() : 0;
        date.setHours(h, m, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      (date as any).dateMode = activeMode;
    }
    onChange(date, activeMode);
  };

  const handleManualTimeChange = (date: Date) => {
    if (disabled) return;
    (date as any).dateMode = "specific_time";
    onChange(date, "specific_time");
  };

  const openToDateValue = useMemo(() => {
    if (selectedDate) return selectedDate;
    const d = new Date(nowInTz.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate, nowInTz]);

  const handleClear = () => {
    if (!disabled) {
      onChange(null, activeMode);
    }
  };

  const effectiveDateFormat = useMemo(() => {
    const raw = isTimeActive ? appDateTimeFormat : appDateFormat;
    if (!raw) return isTimeActive ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd";
    return raw
      .replace(/YYYY/g, "yyyy")
      .replace(/YY/g, "yy")
      .replace(/DD/g, "dd")
      .replace(/D/g, "d")
      .replace(/(?:HH|hh|H|h):MM/g, (m) => m.slice(0, -2) + "mm")
      .replace(/:MM(?=:|$|\s|[A-Za-z])/g, ":mm")
      .replace(/\bA\b/g, "aa")
      .replace(/\ba\b/g, "aa");
  }, [isTimeActive, appDateTimeFormat, appDateFormat]);

  return (
    <div className="flex flex-col w-full">
      <style>{customDatePickerStyles}</style>

      {label && (
        <label title={label} className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate">
          {label}
        </label>
      )}

      <div className="relative">
        <DatePicker
          selected={selectedDate}
          openToDate={openToDateValue}
          onChange={handleCalendarDateClick}
          showTimeSelect={false}
          shouldCloseOnSelect={!isTimeActive}
          dateFormat={effectiveDateFormat}
          placeholderText={
            placeholder ||
            (isTimeActive ? "Select Date & Time" : "Select Date")
          }
          customInput={
            <CustomInput
              onClear={handleClear}
              disabled={disabled}
              isClearable={isClearable}
            />
          }
          disabled={disabled}
          minDate={minDate}
          showPopperArrow={false}
          autoComplete="off"
          portalId={portalId}
          popperPlacement="bottom-start"
          calendarClassName={`${
            document.documentElement.classList.contains("dark") ? "dark" : ""
          }`}
          popperProps={{
            strategy: "fixed",
          }}
          renderCustomHeader={(headerProps) => <CalendarHeader {...headerProps} />}
        >
          {shouldEnableToggle && (
            <div
              className="w-full h-10 px-2 flex items-center justify-center bg-gray-50/90 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 select-none order-first"
              style={{ order: -1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full grid grid-cols-2 p-0.5 bg-gray-200/70 dark:bg-gray-800 rounded-lg border border-gray-300/50 dark:border-gray-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeToggle("whole_day");
                  }}
                  className={`py-1 text-[11px] font-semibold rounded-md transition-all text-center ${
                    activeMode === "whole_day"
                      ? "bg-white dark:bg-gray-700 text-primary dark:text-white shadow-2xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Whole Day
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeToggle("specific_time");
                  }}
                  className={`py-1 text-[11px] font-semibold rounded-md transition-all text-center ${
                    activeMode === "specific_time"
                      ? "bg-white dark:bg-gray-700 text-primary dark:text-white shadow-2xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  Specific Time
                </button>
              </div>
            </div>
          )}

          {isTimeActive && (
            <div className="w-full order-last" style={{ order: 1 }}>
              <ManualTimePicker
                selected={selectedDate}
                nowInTz={nowInTz}
                onChange={handleManualTimeChange}
              />
            </div>
          )}
        </DatePicker>
      </div>
    </div>
  );
};

export default CustomDatePicker;