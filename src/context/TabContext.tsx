import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavItemsContext } from "./navItemsContext";

export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  closable: boolean;
}

interface TabContextType {
  tabs: TabItem[];
  activeTabPath: string;
  openTab: (tab: Omit<TabItem, "id">) => void;
  closeTab: (path: string, e?: React.MouseEvent) => void;
  closeOtherTabs: (path: string) => void;
  closeTabsToRight: (path: string) => void;
  closeAllTabs: () => void;
  switchTab: (path: string) => void;
}

const DASHBOARD_TAB: TabItem = {
  id: "/dashboard",
  title: "Overview",
  path: "/dashboard",
  icon: "LayoutGrid",
  closable: false,
};

export const TabContext = createContext<TabContextType>({
  tabs: [DASHBOARD_TAB],
  activeTabPath: "/dashboard",
  openTab: () => {},
  closeTab: () => {},
  closeOtherTabs: () => {},
  closeTabsToRight: () => {},
  closeAllTabs: () => {},
  switchTab: () => {},
});

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { navItems } = useContext(NavItemsContext);

  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const saved = sessionStorage.getItem("app_open_tabs");
    let initialTabs = [DASHBOARD_TAB];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialTabs = parsed
            .filter((t) => t.path !== "/dashboard/dashboard")
            .map((t) =>
              t.path === "/dashboard"
                ? { ...t, title: "Overview", icon: "LayoutGrid" }
                : t
            );
          if (!initialTabs.some((t) => t.path === "/dashboard")) {
            initialTabs.unshift(DASHBOARD_TAB);
          }
        }
      } catch (err) {
        console.error("Failed to parse saved tabs", err);
      }
    }

    const rawPath = window.location.pathname;
    const currentPath =
      rawPath === "/dashboard/dashboard" ? "/dashboard" : rawPath;
    if (
      currentPath &&
      currentPath !== "/" &&
      currentPath !== "/login" &&
      currentPath !== "/dashboard"
    ) {
      if (!initialTabs.some((t) => t.path === currentPath)) {
        initialTabs.push({
          id: currentPath,
          title: currentPath.replace(/^\//, "").split("/").pop() || "Page",
          path: currentPath,
          icon: "FileText",
          closable: true,
        });
      }
    }

    return initialTabs;
  });

  useEffect(() => {
    sessionStorage.setItem("app_open_tabs", JSON.stringify(tabs));
  }, [tabs]);

  const findNavMeta = useCallback(
    (pathname: string): { title: string; icon?: string } => {
      const cleanPath = pathname.replace(/^\//, "");

      if (
        cleanPath === "dashboard" ||
        cleanPath === "dashboard/dashboard" ||
        cleanPath === ""
      ) {
        if (navItems?.results) {
          for (const item of navItems.results) {
            if (item.children) {
              const child = item.children.find(
                (c) => c.url === "dashboard" || c.url === "dashboard/dashboard"
              );
              if (child) {
                return {
                  title: child.label || "Overview",
                  icon: child.icon || item.icon || "LayoutGrid",
                };
              }
            }
          }
        }
        return { title: "Overview", icon: "LayoutGrid" };
      }
      if (cleanPath === "change-password") {
        return { title: "Change Password", icon: "KeyRound" };
      }
      if (cleanPath === "notifications") {
        return { title: "Notifications", icon: "Bell" };
      }

      if (navItems?.results) {
        for (const item of navItems.results) {
          if (item.url === cleanPath) {
            return { title: item.label, icon: item.icon };
          }
          if (item.children) {
            const child = item.children.find((c) => c.url === cleanPath);
            if (child) {
              return { title: child.label, icon: child.icon || item.icon };
            }
          }
        }
      }

      const fallbackTitle =
        cleanPath
          .split("/")
          .pop()
          ?.replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase()) || "Page";

      return { title: fallbackTitle, icon: "FileText" };
    },
    [navItems]
  );

  // Sync dashboard tab title if navItems provides a custom label (e.g. "Overview")
  useEffect(() => {
    if (navItems?.results && navItems.results.length > 0) {
      const meta = findNavMeta("/dashboard");
      setTabs((prev) =>
        prev.map((t) =>
          t.path === "/dashboard"
            ? { ...t, title: meta.title, icon: meta.icon }
            : t
        )
      );
    }
  }, [navItems, findNavMeta]);

  useEffect(() => {
    const currentPath = location.pathname;

    if (currentPath === "/login" || currentPath === "/") return;

    if (currentPath === "/dashboard/dashboard") {
      navigate("/dashboard", { replace: true });
      return;
    }

    setTabs((prevTabs) => {
      const exists = prevTabs.some((t) => t.path === currentPath);
      if (exists) return prevTabs;

      const meta = findNavMeta(currentPath);
      const newTab: TabItem = {
        id: currentPath,
        title: meta.title,
        path: currentPath,
        icon: meta.icon,
        closable: currentPath !== "/dashboard",
      };

      return [...prevTabs, newTab];
    });
  }, [location.pathname, findNavMeta, navigate]);

  const switchTab = (path: string) => {
    const targetPath =
      path === "/dashboard/dashboard" ? "/dashboard" : path;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const openTab = (newTab: Omit<TabItem, "id">) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.path === newTab.path);
      if (exists) return prev;
      return [...prev, { ...newTab, id: newTab.path }];
    });
    navigate(newTab.path);
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (path === "/dashboard") return;

    setTabs((prevTabs) => {
      const targetIndex = prevTabs.findIndex((t) => t.path === path);
      if (targetIndex === -1) return prevTabs;

      const nextTabs = prevTabs.filter((t) => t.path !== path);

      if (location.pathname === path) {
        const nextActiveIndex = targetIndex >= nextTabs.length ? nextTabs.length - 1 : targetIndex;
        const nextActivePath = nextTabs[nextActiveIndex]?.path || "/dashboard";
        navigate(nextActivePath);
      }

      return nextTabs;
    });
  };

  const closeOtherTabs = (path: string) => {
    setTabs((prev) => prev.filter((t) => t.path === path || !t.closable));
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const closeTabsToRight = (path: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.path === path);
      if (index === -1) return prev;

      const keptTabs = prev.filter((t, idx) => idx <= index || !t.closable);
      const isCurrentActiveClosed = !keptTabs.some((t) => t.path === location.pathname);

      if (isCurrentActiveClosed) {
        navigate(path);
      }

      return keptTabs;
    });
  };

  const closeAllTabs = () => {
    setTabs([DASHBOARD_TAB]);
    navigate("/dashboard");
  };

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabPath: location.pathname,
        openTab,
        closeTab,
        closeOtherTabs,
        closeTabsToRight,
        closeAllTabs,
        switchTab,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = () => useContext(TabContext);