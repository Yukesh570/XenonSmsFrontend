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
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "max-w-md",
}) => {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const location = useLocation();
  const tabContext = useContext(TabContext);

  useEffect(() => {
    setModalRoot(document.getElementById("page-modal-root") || document.body);
  }, []);

  // Hide the modal if the user has navigated/switched to a different tab
  const activeTabPath = tabContext?.activeTabPath;
  const isTabActive =
    !activeTabPath ||
    location.pathname === activeTabPath ||
    location.pathname.startsWith(`${activeTabPath}/`);

  if (!isOpen || !modalRoot || !isTabActive) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="page-modal-overlay absolute inset-0 z-30 overflow-y-auto pointer-events-auto"
    >
      {/* Scoped Backdrop - covers exactly and only the page content area */}
      <div
        className="absolute inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-sm pointer-events-auto"
        aria-hidden="true"
      />

      {/* Centering container */}
      <div className="relative z-10 flex min-h-full items-center justify-center p-4 text-center">
        <div
          className={`w-full rounded-xl p-6 text-left align-middle shadow-xl 
          
          /* LIGHT MODE */
          bg-white text-gray-900 
          
          /* DARK MODE */
          dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700
          
          ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            {title && (
              <h3 className="text-lg font-semibold leading-6">
                {title}
              </h3>
            )}
            <button
              type="button"
              className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors ml-auto"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="text-text-secondary dark:text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
};

export default Modal;


