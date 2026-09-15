import React, { useContext, useState, useRef, useEffect, useLayoutEffect } from "react";
import { TabContext, type TabItem } from "../../context/TabContext";
import * as Icons from "lucide-react";
import { X, ChevronDown, Search } from "lucide-react";
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

  const [visibleCount, setVisibleCount] = useState<number>(tabs.length);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextTargetTab, setContextTargetTab] = useState<TabItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(() => {
    return typeof window !== "undefined" ? window.innerWidth : 1200;
  });

  const renderIcon = (iconName?: string) => {
    const IconComponent = iconName && (Icons as any)[iconName] ? (Icons as any)[iconName] : Icons.FileText;
    return <IconComponent size={12} className="flex-shrink-0" />;
  };

  // Monitor container width using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update dropdown position when opened or resized
  const handleToggleDropdown = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
      setDropdownPos(null);
      setSearchQuery("");
    } else if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const isNearRight = window.innerWidth - rect.left < 310;
      if (isNearRight) {
        setDropdownPos({
          top: rect.bottom + 4,
          right: Math.max(8, window.innerWidth - rect.right),
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 4,
          left: Math.max(8, rect.left),
        });
      }
      setIsDropdownOpen(true);
    }
  };

  // Close dropdown on outside click, window resize, or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
        setDropdownPos(null);
        setSearchQuery("");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setDropdownPos(null);
        setSearchQuery("");
      }
    };
    const handleScrollOrResize = () => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
        setDropdownPos(null);
        setSearchQuery("");
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isDropdownOpen]);

  // Primary calculation: Strict 2 Lines with guaranteed space for "+N more" button on Line 2
  useLayoutEffect(() => {
    if (!hiddenContainerRef.current) return;
    const items = hiddenContainerRef.current.children;
    if (items.length === 0) {
      setVisibleCount(tabs.length);
      return;
    }

    const firstItem = items[0] as HTMLElement;
    const firstTop = firstItem.offsetTop;

    // Line 1: top ~ 0px. Line 2: top ~ 29px. Line 3: top ~ 58px.
    const thresholdY = 32;

    let firstOverflowIndex = -1;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      if (item.offsetTop - firstTop > thresholdY) {
        firstOverflowIndex = i;
        break;
      }
    }

    if (firstOverflowIndex === -1) {
      // Every tab fits comfortably in 1 or 2 lines!
      setVisibleCount(tabs.length);
    } else {
      let count = firstOverflowIndex;
      const cWidth = hiddenContainerRef.current.clientWidth;

      // Ensure the "+N more" button (~95px) fits on Line 2 without wrapping to Line 3
      while (count > 1) {
        const lastItem = items[count - 1] as HTMLElement;
        if (lastItem.offsetTop - firstTop > thresholdY) {
          count--;
          continue;
        }

        const itemRight = lastItem.offsetLeft + lastItem.offsetWidth;
        const remainingSpace = cWidth - itemRight;

        // Need at least 100px for "+N more" button
        if (remainingSpace < 100) {
          count--;
        } else {
          break;
        }
      }

      setVisibleCount(Math.max(1, count));
    }
  }, [tabs, containerWidth]);

  // Secondary safety check: If the real rendered button ever lands on Line 3, immediately step back
  useLayoutEffect(() => {
    if (moreButtonRef.current && containerRef.current) {
      const firstTabEl = containerRef.current.querySelector('[data-active-tab]') as HTMLElement;
      if (firstTabEl) {
        const firstTop = firstTabEl.offsetTop;
        if (moreButtonRef.current.offsetTop - firstTop > 32) {
          setVisibleCount((prev) => Math.max(1, prev - 1));
        }
      }
    }
  });

  const handleContextMenu = (e: React.MouseEvent, tab: TabItem) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextTargetTab(tab);
  };

  const visibleTabs = tabs.slice(0, visibleCount);
  const overflowTabs = tabs.slice(visibleCount);

  // Check if active tab is among overflow tabs
  const isActiveInOverflow = overflowTabs.some(
    (tab) =>
      activeTabPath === tab.path ||
      (tab.path !== "/dashboard" && activeTabPath.startsWith(`${tab.path}/`))
  );

  const filteredOverflowTabs = searchQuery.trim()
    ? overflowTabs.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : overflowTabs;

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
    <div className="w-full bg-gray-100 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-2 py-1 select-none relative z-50 shrink-0">
      {/* Hidden Mirror Container with identical dimensions, icon, and text for exact measurement */}
      <div
        ref={hiddenContainerRef}
        className="invisible absolute top-1 left-2 right-2 pointer-events-none -z-50 flex flex-wrap items-center gap-1"
        aria-hidden="true"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="flex items-center gap-1.5 h-[25px] px-2 text-[11.5px] font-medium border shrink-0 max-w-[160px] sm:max-w-[210px]"
          >
            <span className="flex-shrink-0">{renderIcon(tab.icon)}</span>
            <span className="truncate flex-1 leading-none">{tab.title}</span>
            {tab.closable && (
              <span className="p-0.5 flex-shrink-0">
                <X size={11} />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Main Visible Tabs Container */}
      <div
        ref={containerRef}
        className="flex flex-wrap items-center gap-1 w-full"
      >
        {visibleTabs.map((tab) => {
          const isActive =
            activeTabPath === tab.path ||
            (tab.path !== "/dashboard" && activeTabPath.startsWith(`${tab.path}/`));

          return (
            <div
              key={tab.id}
              data-active-tab={isActive ? "true" : "false"}
              onClick={() => switchTab(tab.path)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              className={`group relative flex items-center gap-1.5 h-[25px] px-2 text-[11.5px] font-medium rounded transition-all cursor-pointer border shrink-0 max-w-[160px] sm:max-w-[210px] ${
                isActive
                  ? "bg-white dark:bg-gray-900 text-primary border-primary/40 shadow-xs font-semibold"
                  : "bg-gray-200/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-transparent hover:bg-white/80 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span
                className={
                  isActive
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                }
              >
                {renderIcon(tab.icon)}
              </span>

              <span className="truncate flex-1 leading-none">{tab.title}</span>

              {tab.closable ? (
                <button
                  type="button"
                  onClick={(e) => closeTab(tab.path, e)}
                  className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Close tab"
                >
                  <X size={11} />
                </button>
              ) : null}
            </div>
          );
        })}

        {/* "+N more ▾" Overflow Dropdown Button - Locked strictly on Line 2 */}
        {overflowTabs.length > 0 && (
          <button
            ref={moreButtonRef}
            type="button"
            onClick={handleToggleDropdown}
            className={`flex items-center gap-1 h-[25px] px-2 text-[11.5px] font-semibold rounded border transition-all shrink-0 ${
              isDropdownOpen || isActiveInOverflow
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-gray-200 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-gray-300/60 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700"
            }`}
            title="More open tabs"
          >
            <span>+{overflowTabs.length} more</span>
            <ChevronDown
              size={11}
              className={`transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Floating Dropdown Menu - Rendered with fixed positioning so it NEVER gets clipped */}
      {isDropdownOpen && dropdownPos && (
        <div
          ref={dropdownRef}
          style={{
            top: `${dropdownPos.top}px`,
            ...(dropdownPos.left !== undefined ? { left: `${dropdownPos.left}px` } : {}),
            ...(dropdownPos.right !== undefined ? { right: `${dropdownPos.right}px` } : {}),
          }}
          className="fixed w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[9999] overflow-hidden text-xs"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Additional Tabs ({overflowTabs.length})
            </span>
            <button
              type="button"
              onClick={() => {
                overflowTabs.forEach((tab) => {
                  if (tab.closable) closeTab(tab.path);
                });
                setIsDropdownOpen(false);
                setDropdownPos(null);
              }}
              className="text-[11px] text-red-500 hover:text-red-600 font-medium hover:underline"
            >
              Close all extra
            </button>
          </div>

          {/* Search if more than 4 items */}
          {overflowTabs.length > 4 && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tabs..."
                  className="w-full pl-6 pr-2 py-1 text-[11.5px] bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-primary text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* List of Overflow Tabs */}
          <div className="max-h-64 overflow-y-auto tab-scrollbar py-1">
            {filteredOverflowTabs.length === 0 ? (
              <div className="px-3 py-3 text-center text-gray-400 text-[11px]">
                No matching tabs
              </div>
            ) : (
              filteredOverflowTabs.map((tab) => {
                const isActive =
                  activeTabPath === tab.path ||
                  (tab.path !== "/dashboard" && activeTabPath.startsWith(`${tab.path}/`));

                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      switchTab(tab.path);
                      setIsDropdownOpen(false);
                      setDropdownPos(null);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, tab)}
                    className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <span className={isActive ? "text-primary" : "text-gray-400"}>
                        {renderIcon(tab.icon)}
                      </span>
                      <span className="truncate">{tab.title}</span>
                    </div>

                    {tab.closable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.path);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Close tab"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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