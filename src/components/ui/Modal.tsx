import React, { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { TabContext } from "../../context/TabContext";

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
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(() => {
    if (typeof document !== "undefined") {
      return document.getElementById("page-modal-root") || document.body;
    }
    return null;
  });
  const location = useLocation();
  const tabContext = useContext(TabContext);

  useEffect(() => {
    if (!modalRoot) {
      setModalRoot(document.getElementById("page-modal-root") || document.body);
    }
  }, [modalRoot]);

  // Hide the modal if the user has navigated/switched to a different tab
  const activeTabPath = tabContext?.activeTabPath;
  const isTabActive =
    !activeTabPath ||
    location.pathname === activeTabPath ||
    location.pathname.startsWith(`${activeTabPath}/`);

  const shouldRender = isOpen && isTabActive && !!modalRoot;

  // Lock background scroll when modal is active
  useEffect(() => {
    if (!shouldRender) return;

    lockBackgroundScroll();
    return () => {
      unlockBackgroundScroll();
    };
  }, [shouldRender]);

  // Support ESC key to close modal
  useEffect(() => {
    if (!shouldRender) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="page-modal-wrapper absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 pointer-events-none overflow-hidden select-none-when-closed"
    >
      {/* Scoped Backdrop - strictly locked to 100% of the area, CANNOT scroll or move */}
      <div
        className="absolute inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-sm pointer-events-auto"
        aria-hidden="true"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Centering Dialog Box - constrained within viewport, pinned header, locked in place */}
      <div
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
    </div>
  );

  return createPortal(content, modalRoot);
};

export default Modal;


