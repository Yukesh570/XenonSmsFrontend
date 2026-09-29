import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ position, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  // 1. Calculate Position
  useLayoutEffect(() => {
    if (position && menuRef.current) {
      const menu = menuRef.current;
      const { innerWidth, innerHeight } = window;
      const { offsetWidth: w, offsetHeight: h } = menu;

      let x = position.x;
      let y = position.y;

      // Check Right Edge
      if (x + w > innerWidth) {
        x = x - w;
      }

      // Check Bottom Edge
      if (y + h > innerHeight) {
        y = y - h;
      }

      setCoords({ x, y });
    }
  }, [position]);

  // 2. Close on Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      // REMOVED: animate-in fade-in zoom-in-95 duration-75
      className="fixed z-[99999] min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
      style={{ 
        top: coords?.y ?? position.y, 
        left: coords?.x ?? position.x,
        // Keep opacity 0 initially to prevent flickering during calculation
        opacity: coords ? 1 : 0 
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center px-4 py-2.5 text-sm text-left
            ${
              item.variant === "danger"
                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            }
          `}
        >
          {item.icon && <span className="mr-3 w-4 h-4">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;