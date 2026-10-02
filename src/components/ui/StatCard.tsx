import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendText?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendText }) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:p-3.5 shadow-sm flex items-center justify-between gap-3 transition-shadow hover:shadow-md min-h-[68px]">
      {/* Left side: Title, Value & optional trend text */}
      <div className="min-w-0 flex-1">
        <h3
          className="text-text-secondary dark:text-gray-400 text-xs sm:text-[13px] font-medium truncate"
          title={title}
        >
          {title}
        </h3>
        <div className="flex items-baseline gap-2 mt-0.5">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white leading-tight">
            {value}
          </h2>
          {trend !== undefined && (
            <div
              className={`flex items-center space-x-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                isPositive
                  ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : isNegative
                  ? "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
                  : "text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp size={10} />
              ) : isNegative ? (
                <TrendingDown size={10} />
              ) : (
                <Minus size={10} />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
          {trendText && (
            <span
              className="text-[11px] text-text-secondary dark:text-gray-500 font-normal truncate"
              title={trendText}
            >
              {trendText}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Icon in themed box */}
      <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary shrink-0 flex items-center justify-center [&>svg]:w-[21px] [&>svg]:h-[21px] sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]">
        {icon}
      </div>
    </div>
  );
};

export default StatCard;