import React from "react";

interface ToggleSwitchProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = "",
}) => {
  return (
    <label
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={`inline-flex ${description ? "items-start" : "items-center"} select-none ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      {/* The Toggle Switch */}
      <div className={`relative ${description ? "mt-0.5" : ""} shrink-0 leading-none`}>
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={() => {
            if (!disabled) {
              onChange(!checked);
            }
          }}
        />
        {/* The track (background) */}
        <div
          className={`block w-10 h-5 rounded-full transition-colors border ${
            checked
              ? "bg-primary border-primary"
              : "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-500/50"
          }`}
        ></div>
        {/* The circle (knob) */}
        <div
          className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        ></div>
      </div>

      {label && !description && (
        <span className="ml-2.5 text-xs font-medium text-gray-800 dark:text-gray-200 select-none">
          {label}
        </span>
      )}

      {description && (
        <div className="ml-3 flex flex-col">
          {label && (
            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-200 leading-tight">
              {label}
            </span>
          )}
          <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
            {description}
          </span>
        </div>
      )}
    </label>
  );
};

export default ToggleSwitch;

