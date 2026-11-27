import React, { useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, id, disabled, required, className, ...props }) => {
  const textAreaId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : props.name || "textarea");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (props.onChange) {
      props.onChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label
          htmlFor={textAreaId}
          className="mb-1.5 text-xs font-medium text-text-secondary dark:text-gray-400"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        {...props}
        ref={textAreaRef}
        autoComplete="off"
        id={textAreaId}
        disabled={disabled}
        required={required}
        onInput={handleInput}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-input transition duration-150 ease-in-out focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary 
        ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
            : "bg-white border-gray-200 text-text-primary dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
        } ${className || ""}`}
      />
    </div>
  );
};

export default TextArea;