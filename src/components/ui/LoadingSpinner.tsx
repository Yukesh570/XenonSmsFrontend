import React from "react";

export interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: React.ReactNode | false;
  className?: string;
  spinnerClassName?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  text = "Loading...",
  className,
  spinnerClassName = "",
}) => {
  const sizeClasses = {
    xs: "h-4 w-4 border-2",
    sm: "h-6 w-6 border-b-2",
    md: "h-8 w-8 border-b-2",
    lg: "h-10 w-10 border-b-2",
    xl: "h-12 w-12 border-b-2",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center text-text-secondary dark:text-gray-400 ${
        className !== undefined ? className : "py-8"
      }`}
    >
      <div
        className={`animate-spin rounded-full border-primary ${text ? "mb-2" : ""} ${sizeClasses[size]} ${spinnerClassName}`}
      />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
