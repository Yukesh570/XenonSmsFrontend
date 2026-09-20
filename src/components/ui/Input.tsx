import React, { useState, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import FastTooltip from "./FastTooltip";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isClearable?: boolean;
  labelClassName?: string;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  id, 
  leftIcon,
  rightIcon, 
  disabled, 
  required,
  isClearable = true, 
  value, 
  autoComplete = "off",
  labelClassName,
  className,
  ...props 
}) => {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.onChange) {
      const event = {
        target: { value: "", name: props.name },
        currentTarget: { value: "", name: props.name },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      props.onChange(event);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (props.onChange) {
      props.onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (props.type === "number") {
      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
      }
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (props.type === "number") {
      e.currentTarget.blur();
    }
    if (props.onWheel) {
      props.onWheel(e);
    }
  };

  const isPassword = props.type === "password";
  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
  const showClear = isClearable && !disabled && !props.readOnly && hasValue && !rightIcon;
  const hoverTooltip = hasValue && !isPassword ? String(value) : "";

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={inputId}
        title={label}
        className={`mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate ${labelClassName || ""}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <FastTooltip text={hoverTooltip} disabled={isFocused || !hasValue || isPassword}>
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-0 pl-3 flex items-center h-full text-gray-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            {...props}
            ref={inputRef}
            autoComplete={autoComplete}
            id={inputId}
            value={value}
            disabled={disabled}
            required={required}
            min={props.type === "number" && props.min === undefined ? 0 : props.min}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-input transition duration-150 ease-in-out focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary 
            ${
              disabled
                ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
                : "bg-white border-gray-200 text-text-primary dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
            }
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon || showClear ? "pr-10" : ""}
            ${className || ""}`}
          />
          
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}

          {rightIcon && (
            <div className={`absolute inset-y-0 right-0 flex items-center pr-3 ${disabled ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
              {rightIcon}
            </div>
          )}
        </div>
      </FastTooltip>
    </div>
  );
};

export default Input;