import React, { useState, useEffect, useContext, useMemo } from "react";
import { useLocation, UNSAFE_LocationContext as LocationContext } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PageTabs from "./PageTabs";
import { NavItemsContext } from "../../context/navItemsContext";
import { TabContext } from "../../context/TabContext";
import { getGeneralSettingsApi } from "../../api/settingApi/generalSettingsApi/generalSettingsApi";
import { getComponentByPath } from "../../routes/AppRoutes";

// Scoped Tab Pane: Freezes the location for this tab so background pages never detect global URL changes
const TabPane: React.FC<{
  tabPath: string;
  tabId: string;
  isActive: boolean;
  Component: React.ComponentType<any>;
}> = React.memo(
  ({ tabPath, tabId, isActive, Component }) => {
    const scopedLocationValue = useMemo(
      () => ({
        location: {
          pathname: tabPath,
          search: "",
          hash: "",
          state: null,
          key: tabId,
        },
        navigationType: "PUSH" as any,
      }),
      [tabPath, tabId]
    );

    return (
      <div
        className={isActive ? "w-full" : "hidden"}
        style={{ display: isActive ? "block" : "none" }}
      >
        <LocationContext.Provider value={scopedLocationValue}>
          <Component />
        </LocationContext.Provider>
      </div>
    );
  },
  (prev, next) => prev.isActive === next.isActive && prev.tabPath === next.tabPath
);

const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState ? JSON.parse(savedState) : false;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const { navItems } = useContext(NavItemsContext);
  const { tabs } = useContext(TabContext);

  // Normalize initial path so /dashboard is always marked as visited from start
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => {
    const currentPath = window.location.pathname === "/" ? "/dashboard" : window.location.pathname;
    return {
      "/dashboard": true,
      [currentPath]: true,
    };
  });

  // Mark the active tab as visited when navigating
  useEffect(() => {
    const activePath = location.pathname === "/" ? "/dashboard" : location.pathname;
    if (!visitedTabs[activePath]) {
      setVisitedTabs((prev) => ({ ...prev, [activePath]: true }));
    }
  }, [location.pathname, visitedTabs]);

  // Clean up visited tabs list when tabs are closed
  useEffect(() => {
    const openPaths = new Set(tabs.map((t) => t.path));
    openPaths.add("/dashboard");
    setVisitedTabs((prev) => {
      const next: Record<string, boolean> = { "/dashboard": true };
      Object.keys(prev).forEach((path) => {
        if (openPaths.has(path)) next[path] = true;
      });
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(
      "sidebar_collapsed",
      JSON.stringify(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const initializeTimezone = async () => {
      try {
        const response = await getGeneralSettingsApi("generalSettings");
        if (response && response.defaultTimezone) {
          localStorage.setItem("app_timezone", response.defaultTimezone);
          window.dispatchEvent(new Event("timezoneChanged"));
        }
      } catch (error) {
        console.error("Failed to fetch initial timezone settings:", error);
      }
    };

    initializeTimezone();
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const currentPath = location.pathname.replace(/^\//, "");
    let title = "Xenon SMS";

    let found = false;
    if (navItems?.results) {
      for (const parent of navItems.results) {
        if (parent.url === currentPath) {
          title = `${parent.label} - Xenon SMS`;
          found = true;
          break;
        }
        if (parent.children) {
          const child = parent.children.find((c) => c.url === currentPath);
          if (child) {
            title = `${child.label} - ${parent.label} - Xenon SMS`;
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      if (currentPath.includes("change-password"))
        title = "Change Password - Xenon SMS";
      else if (currentPath.includes("login")) title = "Login - Xenon SMS";
    }
    document.title = title;
  }, [location, navItems]);

  const activeNormalizedPath = location.pathname === "/" ? "/dashboard" : location.pathname;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <PageTabs />

        <Navbar onToggleSidebar={toggleSidebar} />

        <div className="flex-1 relative overflow-hidden flex flex-col w-full">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary dark:bg-gray-900 p-2.5 md:px-4 md:py-3 w-full relative">
            {tabs.map((tab) => {
              const isActive =
                activeNormalizedPath === tab.path ||
                (tab.path !== "/dashboard" && activeNormalizedPath.startsWith(`${tab.path}/`));

              const hasBeenVisited = visitedTabs[tab.path] || isActive || tab.path === "/dashboard";

              if (!hasBeenVisited) return null;

              const Component = getComponentByPath(tab.path);

              return (
                <TabPane
                  key={tab.id}
                  tabId={tab.id}
                  tabPath={tab.path}
                  isActive={isActive}
                  Component={Component}
                />
              );
            })}
          </main>
          <div id="page-modal-root" className="pointer-events-none absolute inset-0 z-30" />
        </div>
      </div>
    </div>
  );
};

export default Layout;