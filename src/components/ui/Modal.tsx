import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

// Global counter for active modals to lock/unlock background page scroll
let activeModalsCount = 0;
let originalMainOverflow = "";
let originalBodyOverflow = "";

const lockBackgroundScroll = () => {
  if (activeModalsCount === 0) {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      originalMainOverflow = mainEl.style.overflow;
      mainEl.style.overflow = "hidden";
    }
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  activeModalsCount++;
};

const unlockBackgroundScroll = () => {
  activeModalsCount = Math.max(0, activeModalsCount - 1);
  if (activeModalsCount === 0) {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = originalMainOverflow;
    }
    document.body.style.overflow = originalBodyOverflow;
  }
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "max-w-md",
  closeOnBackdropClick = false,
}) => {
  // Fast hover tooltip for modal data boxes and truncated values
  const [modalTooltip, setModalTooltip] = useState<{
    text: string;
    coords: { top: number; left: number };
    placement: "above" | "below";
  } | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeBoxRef = useRef<HTMLElement | null>(null);
  const modalDialogRef = useRef<HTMLDivElement>(null);

  const clearTooltip = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    activeBoxRef.current = null;
    setModalTooltip(null);
  }, []);

  const handleMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't show tooltip on close button, action buttons, links, or field labels
    if (target.closest("button, .close-btn, a, [role='button'], label, legend")) {
      clearTooltip();
      return;
    }

    // Match only specific data boxes: truncated text (.truncate), explicit data-cell-title, or text input
    const box = target.closest(
      ".truncate, [data-cell-title], input:not([type='password']):not([type='checkbox']):not([type='radio']), textarea"
    ) as HTMLElement | null;

    if (!box || box === modalDialogRef.current) {
      clearTooltip();
      return;
    }

    if (box === activeBoxRef.current) return;

    activeBoxRef.current = box;
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }

    let rawText = "";
    if (box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement) {
      if (box.type === "password") return;
      rawText = box.value?.trim();
    } else {
      rawText = box.getAttribute("data-cell-title") || box.innerText?.trim() || box.textContent?.trim() || "";
    }

    if (!rawText || rawText === "-" || rawText === "" || rawText.length === 0) {
      clearTooltip();
      return;
    }

    const text = rawText.replace(/\s+/g, " ");

    tooltipTimerRef.current = setTimeout(() => {
      if (!activeBoxRef.current || !box.isConnected) return;
      const rect = box.getBoundingClientRect();
      const isAbove = rect.top >= 36;
      setModalTooltip({
        text,
        coords: {
          top: isAbove ? rect.top - 6 : rect.bottom + 6,
          left: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
        },
        placement: isAbove ? "above" : "below",
      });
    }, 400);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const box = target.closest(
      ".truncate, [data-cell-title], input:not([type='password']):not([type='checkbox']):not([type='radio']), textarea"
    );
    // Only clear if mouse moved completely out of any data box
    if (!box && activeBoxRef.current) {
      clearTooltip();
    }
  };

  // Strip native title attributes from all elements in Modal and set title="" on truncated items to suppress browser tooltips
  useEffect(() => {
    if (!isOpen) return;
    const el = modalDialogRef.current;
    if (!el) return;

    const stripTitles = () => {
      // 1. Elements with explicit non-empty title attribute
      const titledElements = el.querySelectorAll("[title]:not([title=''])");
      titledElements.forEach((node) => {
        const titleVal = node.getAttribute("title");
        if (titleVal) {
          node.setAttribute("data-cell-title", titleVal);
        }
        // Setting title="" suppresses native browser tooltip fallback
        node.setAttribute("title", "");
      });

      // 2. Truncate elements without title attribute: add title="" so WebKit doesn't auto-generate native ellipsis tooltip
      const truncateElements = el.querySelectorAll(".truncate:not([title])");
      truncateElements.forEach((node) => {
        node.setAttribute("title", "");
      });
    };

    stripTitles();

    const observer = new MutationObserver(() => {
      stripTitles();
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      attributeFilter: ["title"],
    });

    const handleCaptureOver = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== el) {
        if (target.hasAttribute("title") && target.getAttribute("title") !== "") {
          const titleVal = target.getAttribute("title");
          if (titleVal) {
            target.setAttribute("data-cell-title", titleVal);
          }
          target.setAttribute("title", "");
        } else if (target.classList?.contains("truncate") && !target.hasAttribute("title")) {
          target.setAttribute("title", "");
        }
        target = target.parentElement;
      }
    };

    el.addEventListener("mouseover", handleCaptureOver, { capture: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("mouseover", handleCaptureOver, { capture: true });
    };
  }, [isOpen]);

  // Dismiss tooltip on scroll, resize, mousedown, or keydown
  useEffect(() => {
    if (!modalTooltip) return;
    const handleDismiss = () => clearTooltip();
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("mousedown", handleDismiss);
    window.addEventListener("keydown", handleDismiss);
    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("mousedown", handleDismiss);
      window.removeEventListener("keydown", handleDismiss);
    };
  }, [modalTooltip, clearTooltip]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;

    lockBackgroundScroll();
    return () => {
      unlockBackgroundScroll();
    };
  }, [isOpen]);

  // Support ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="page-modal-wrapper fixed inset-0 z-[50000] flex items-center justify-center p-3 sm:p-5 pointer-events-none overflow-hidden select-none-when-closed"
    >
      {/* Full-viewport Backdrop - covers entire window (including sidebar, navbar, and tabs) */}
      <div
        className="absolute inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-sm pointer-events-auto"
        aria-hidden="true"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Centering Dialog Box - constrained within viewport, pinned header, locked in place */}
      <div
        ref={modalDialogRef}
        onMouseOver={handleMouseOver}
        onMouseMove={handleMouseMove}
        onMouseLeave={clearTooltip}
        className={`modal-dialog-panel relative z-10 pointer-events-auto w-full min-w-0 box-border flex flex-col rounded-xl p-5 sm:p-6 text-left align-middle shadow-2xl 
        
        /* LIGHT MODE */
        bg-white text-gray-900 
        
        /* DARK MODE */
        dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700
        
        max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-2.5rem)]
        overscroll-contain
        
        ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - pinned to top of modal card, never scrolls off */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold leading-6 truncate pr-3">
              {title}
            </h3>
          )}
          <button
            type="button"
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors ml-auto shrink-0"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content Body - scrolls cleanly with overscroll containment */}
        <div className="modal-content-body text-text-secondary dark:text-gray-300 flex-1 min-h-0 min-w-0 w-full overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar">
          {children}
        </div>
      </div>

      {modalTooltip &&
        createPortal(
          <div
            className={`fixed z-[99999] px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 dark:bg-gray-800/95 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 ${
              modalTooltip.placement === "above" ? "-translate-y-full" : "translate-y-0"
            } transition-opacity duration-100 border border-gray-700/50 backdrop-blur-sm max-w-lg break-all text-center select-none font-mono`}
            style={{ top: modalTooltip.coords.top, left: modalTooltip.coords.left }}
          >
            {modalTooltip.text}
          </div>,
          document.body
        )}
    </div>
  );

  return createPortal(content, document.body);
};

export default Modal;


