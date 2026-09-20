import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface FastTooltipProps {
  text?: string | null;
  children: React.ReactNode;
  delay?: number; // milliseconds before showing (default 400ms)
  className?: string;
  disabled?: boolean;
}

export const FastTooltip: React.FC<FastTooltipProps> = ({
  text,
  children,
  delay = 400,
  className = "w-full",
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Position above the element; if not enough space at top (< 36px), position below
    const spaceAbove = rect.top;
    const isAbove = spaceAbove >= 36;
    setPlacement(isAbove ? "above" : "below");
    setCoords({
      top: isAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
    });
  }, []);

  const handleMouseEnter = () => {
    if (disabled || !text || String(text).trim() === "") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  const handleInteraction = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const handleScrollOrResize = () => setVisible(false);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hasContent = Boolean(!disabled && text && String(text).trim() !== "");

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleInteraction}
      onFocusCapture={handleInteraction}
      className={className}
    >
      {children}
      {visible && hasContent && coords &&
        createPortal(
          <div
            className={`fixed z-[99999] px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 dark:bg-gray-800/95 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 ${
              placement === "above" ? "-translate-y-full" : "translate-y-0"
            } transition-opacity duration-150 border border-gray-700/50 backdrop-blur-sm max-w-sm break-words text-center select-none`}
            style={{ top: coords.top, left: coords.left }}
          >
            {text}
          </div>,
          document.body
        )}
    </div>
  );
};

export default FastTooltip;
