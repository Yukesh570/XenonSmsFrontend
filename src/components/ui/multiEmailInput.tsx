import React, { useState, type KeyboardEvent, useRef } from "react";

interface MultiEmailInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const emails = value ? value.split(",").filter((e) => e.trim() !== "") : [];

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();

      const newEmail = inputValue.trim();
      if (newEmail && !emails.includes(newEmail)) {
        const newValue = [...emails, newEmail].join(",");
        onChange(name, newValue);
        setInputValue("");
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
          }
        }, 10);
      }
    } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      const newEmails = [...emails];
      newEmails.pop();
      onChange(name, newEmails.join(","));
    }
  };

  const removeEmail = (indexToRemove: number) => {
    const emailToRemove = emails[indexToRemove];
    const confirmed = window.confirm(`Remove "${emailToRemove}"?`);
    if (!confirmed) return;

    const newEmails = emails.filter((_, index) => index !== indexToRemove);
    onChange(name, newEmails.join(","));
  };

  const editEmail = (indexToEdit: number) => {
    if (disabled) return;
    const emailToEdit = emails[indexToEdit];
    const newEmails = emails.filter((_, index) => index !== indexToEdit);
    onChange(name, newEmails.join(","));
    setInputValue(emailToEdit);
  };

  const handleBlur = () => {
    const newEmail = inputValue.trim();
    if (newEmail && !emails.includes(newEmail)) {
      const newValue = [...emails, newEmail].join(",");
      onChange(name, newValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={`${name}-input`}
        className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate"
      >
        {label}
      </label>
      <div
        ref={containerRef}
        onClick={() => {
          const input = document.getElementById(`${name}-input`) as HTMLInputElement;
          input?.focus();
        }}
        className={`flex flex-nowrap gap-1.5 items-center px-2.5 h-[34px] border border-gray-300 dark:border-gray-700 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary bg-white dark:bg-gray-800 overflow-x-auto overflow-y-hidden scrollbar-none cursor-text transition-colors ${
          disabled ? "bg-gray-100 dark:bg-gray-900 cursor-not-allowed opacity-70" : ""
        }`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {emails.map((email, index) => (
          <span
            key={index}
            className="flex-shrink-0 inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-xs whitespace-nowrap"
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                editEmail(index);
              }}
              className={!disabled ? "cursor-pointer hover:underline truncate max-w-[160px]" : "truncate max-w-[160px]"}
              title={!disabled ? `${email} (Click to edit)` : email}
            >
              {email}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(index);
                }}
                className="text-gray-400 hover:text-red-500 focus:outline-none ml-0.5 leading-none text-sm font-semibold"
              >
                &times;
              </button>
            )}
          </span>
        ))}
        <input
          id={`${name}-input`}
          type="text"
          autoComplete="off"
          className="flex-1 min-w-[100px] outline-none border-none focus:ring-0 p-0 text-sm bg-transparent dark:text-white disabled:cursor-not-allowed"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={emails.length === 0 ? placeholder : ""}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default MultiEmailInput;