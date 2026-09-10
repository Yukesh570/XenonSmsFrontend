import React, { useContext, useRef, useState, useEffect } from "react";
import { TabContext, type TabItem } from "../../context/TabContext";
import * as Icons from "lucide-react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu";

export const PageTabs: React.FC = () => {
  const {
    tabs,
    activeTabPath,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
  } = useContext(TabContext);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextTargetTab, setContextTargetTab] = useState<TabItem | null>(null);

  const renderIcon = (iconName?: string) => {
    const IconComponent = iconName && (Icons as any)[iconName] ? (Icons as any)[iconName] : Icons.FileText;
    return <IconComponent size={13} className="flex-shrink-0" />;
  };

  // Scroll active tab into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active-tab="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
      }
    }
  }, [activeTabPath]);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tab: TabItem) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextTargetTab(tab);
  };

  const menuItems: ContextMenuItem[] = contextTargetTab
    ? [
        ...(contextTargetTab.closable
          ? [
              {
                label: "Close Tab",
                icon: <X size={14} />,
                onClick: () => closeTab(contextTargetTab.path),
              },
            ]
          : []),
        {
          label: "Close Other Tabs",
          icon: <Icons.CopyX size={14} />,
          onClick: () => closeOtherTabs(contextTargetTab.path),
        },
        {
          label: "Close Tabs to Right",
          icon: <Icons.ArrowRightToLine size={14} />,
          onClick: () => closeTabsToRight(contextTargetTab.path),
        },
        {
          label: "Close All Tabs",
          icon: <Icons.Trash2 size={14} />,
          variant: "danger" as const,
          onClick: () => closeAllTabs(),
        },
      ]
    : [];

  return (
    <div className="flex items-center h-9 bg-gray-100 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-2 select-none relative z-40 shrink-0">
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={() => handleScroll("left")}
        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shrink-0 mr-1"
        title="Scroll left"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex-1 flex items-end h-full gap-1 overflow-x-auto tab-scrollbar pt-1"
      >
        {tabs.map((tab) => {
          const isActive =
            activeTabPath === tab.path ||
            (tab.path !== "/dashboard" && activeTabPath.startsWith(`${tab.path}/`));

          return (
            <div
              key={tab.id}
              data-active-tab={isActive ? "true" : "false"}
              onClick={() => switchTab(tab.path)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              className={`group relative flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-t-lg transition-all cursor-pointer border-t-2 shrink-0 max-w-[200px] sm:max-w-[240px] ${
                isActive
                  ? "bg-white dark:bg-gray-900 text-primary border-primary shadow-sm font-semibold"
                  : "bg-gray-200/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-transparent hover:bg-white/80 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {/* Icon */}
              <span className={isActive ? "text-primary" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"}>
                {renderIcon(tab.icon)}
              </span>

              {/* Title */}
              <span className="truncate flex-1">{tab.title}</span>

              {/* Close Button */}
              {tab.closable ? (
                <button
                  type="button"
                  onClick={(e) => closeTab(tab.path, e)}
                  className="p-0.5 ml-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              ) : (
                <span className="w-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={() => handleScroll("right")}
        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shrink-0 ml-1"
        title="Scroll right"
      >
        <ChevronRight size={14} />
      </button>

      {/* Context Menu for right-clicked tab */}
      <ContextMenu
        position={contextMenuPos}
        items={menuItems}
        onClose={() => {
          setContextMenuPos(null);
          setContextTargetTab(null);
        }}
      />
    </div>
  );
};

export default PageTabs;