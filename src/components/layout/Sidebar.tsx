import { NavLink, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useContext, useState, useEffect, useRef } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { NavItemsContext } from "../../context/navItemsContext";
import { ThemeContext } from "../../context/themeContext";
import LightLogo from "../../assets/logos/Primary.png";
import DarkLogo from "../../assets/logos/Primary White.png";
import type { navUserData } from "../../api/navUserRelationApi/navUserRelationApi";
import type { PaginatedResponse } from "../../api/sidebarApi/sideBarApi";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

const Tooltip = ({ text, top, left }: { text: string; top: number; left: number; }) => {
  return createPortal(
    <div
      className="fixed z-[9999] px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg pointer-events-none transform -translate-y-1/2 animate-in fade-in zoom-in-95 duration-100 dark:bg-gray-700 border border-gray-700/50"
      style={{ top, left }}
    >
      {text}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
    </div>,
    document.body
  );
};

const Sidebar = ({ isCollapsed, isMobileOpen, closeMobileSidebar }: SidebarProps) => {
  const { navItems } = useContext(NavItemsContext);
  const { theme } = useContext(ThemeContext);
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number; left: number; } | null>(null);

  const currentLogo = theme === "dark" ? DarkLogo : LightLogo;

  useEffect(() => {
    if (navItems.results) {
      navItems.results.forEach((parent) => {
        if (parent.children) {
          const hasActiveChild = parent.children.some((child) => location.pathname.startsWith(`/${child.url}`));
          if (hasActiveChild && parent.id) {
            setOpenItems((prev) => ({ ...prev, [parent.id!]: true }));
          }
        }
      });
    }
  }, [location.pathname, navItems]);

  // Auto-scroll active item into view only on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navRef.current) {
        const activeElement = navRef.current.querySelector('[data-active="true"]');
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const toggleItem = (id?: number) => {
    if (!id) return;
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderIcon = (iconName: string | undefined, size: number) => {
    const IconComponent = iconName && (Icons as any)[iconName] ? (Icons as any)[iconName] : Icons.HelpCircle;
    return <IconComponent size={size} className="flex-shrink-0" />;
  };

  const handleMouseEnter = (e: React.MouseEvent, label: string) => {
    if (isCollapsed && window.innerWidth >= 768) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredItem({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
    }
  };

  const handleMouseLeave = () => setHoveredItem(null);

  const renderNavItems = (items: PaginatedResponse<navUserData>, level = 0) => {
    return items.results.map((item) => {
      if (!item.permission?.read) return null;

      const hasChildren = item.children && item.children.length > 0;
      const isOpen = item.id ? openItems[item.id] : false;
      const itemPath = `/${item.url}`;

      const isActive = location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
      const baseClasses = "group flex items-center rounded-lg transition-all duration-200 mb-1 relative cursor-pointer select-none";
      const isActuallyCollapsed = isCollapsed && window.innerWidth >= 768;
      const layoutClasses = isActuallyCollapsed ? "justify-center py-3 px-0 w-full" : `justify-between py-2.5 px-3`;
      const colorClasses = isActive ? "bg-sidebar-active-bg dark:bg-transparent text-sidebar-active-text font-medium" : "text-text-secondary hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white";
      const paddingLeftStyle = !isActuallyCollapsed ? { paddingLeft: `${level * 12 + 12}px` } : {};
      const iconSize = level === 0 ? 20 : 18;

      return (
        <div key={item.id} className="w-full">
          <NavLink
            to={itemPath}
            data-active={isActive ? "true" : "false"}
            className={`${baseClasses} ${layoutClasses} ${colorClasses}`}
            style={paddingLeftStyle}
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                toggleItem(item.id);
              } else {
                if (window.innerWidth < 768) closeMobileSidebar();
              }
            }}
            onMouseEnter={(e) => handleMouseEnter(e, item.label)}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`flex items-center ${isActuallyCollapsed ? "justify-center" : "gap-3"}`}>
              {renderIcon(item.icon, iconSize)}
              {!isActuallyCollapsed && <span className="text-sm leading-tight">{item.label}</span>}
            </div>
            {!isActuallyCollapsed && hasChildren && (
              <div className="text-gray-400">{isOpen ? <Icons.ChevronDown size={15} /> : <Icons.ChevronRight size={15} />}</div>
            )}
            {isActuallyCollapsed && isActive && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full"></div>
            )}
          </NavLink>
          {hasChildren && isOpen && (
            <div className={`overflow-hidden transition-all duration-300 ${isActuallyCollapsed ? "bg-gray-100 dark:bg-gray-800/50 rounded-xl mx-1 mb-2 py-1 border border-gray-100 dark:border-gray-700" : "border-l-2 border-gray-100 dark:border-gray-700 ml-5 my-1"}`}>
              {renderNavItems({ count: 0, next: null, previous: null, results: item.children! }, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden" onClick={closeMobileSidebar} />}
      <aside className={`fixed md:static inset-y-0 left-0 z-[100] md:z-40 flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl md:shadow-sm transition-all duration-300 ease-in-out transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${isCollapsed ? "md:w-[88px]" : "md:w-64"} w-64`}>
        <div className="h-16 flex-shrink-0 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 mb-2 px-2">
          <NavLink to="/dashboard" className="flex items-center justify-center w-full h-full transition-transform hover:scale-105 active:scale-95 py-2" onClick={() => { if (window.innerWidth < 768) closeMobileSidebar(); }}>
            <img src={currentLogo} alt="App Logo" className={`w-full h-full object-contain ${isCollapsed && window.innerWidth >= 768 ? "max-w-[72px]" : "max-w-[180px]"}`} />
          </NavLink>
        </div>
        <nav ref={navRef} className="flex-1 px-3 py-2 overflow-y-auto scrollbar-hide space-y-0.5">
          {renderNavItems(navItems)}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800"></div>
      </aside>
      {hoveredItem && <Tooltip text={hoveredItem.label} top={hoveredItem.top} left={hoveredItem.left} />}
    </>
  );
};

export default Sidebar;