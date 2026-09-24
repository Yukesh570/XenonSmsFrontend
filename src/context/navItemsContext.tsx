import { createContext, useEffect, useState } from "react";
import type { navUserData } from "../api/navUserRelationApi/navUserRelationApi";
import { getUserSideBarApi } from "../api/navUserRelationApi/navUserRelationApi";
import type { PaginatedResponse } from "../api/emailTemplateApi/emailTemplateApi";
// 1. Import AuthContext to listen for login/logout events
import { useAuth } from "./AuthContext";

interface NavItemsContextType {
  navItems: PaginatedResponse<navUserData>;
  refreshNavItems: () => Promise<void>;
  loading: boolean;
  error: boolean; // ⚡️ FIX: Added error state
}

export const NavItemsContext = createContext<NavItemsContextType>({
  navItems: { count: 0, next: null, previous: null, results: [] },
  refreshNavItems: async () => {},
  loading: true,
  error: false,
});

export const NavItemProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // 2. Get the authentication state
  const { isAuthenticated } = useAuth();

  // Define initial empty state
  const initialData: PaginatedResponse<navUserData> = {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };

  const [navItems, setNavItems] =
    useState<PaginatedResponse<navUserData>>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); // ⚡️ FIX: Initialize error state

  // Function to fetch data from API
  const refreshNavItems = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getUserSideBarApi();
      console.log("Fetched nav items:", data);
      setNavItems(data);
    } catch (error: any) {
      console.error("Error fetching nav items:", error);
      // Do not trigger "Connection Failed" screen for auth/token errors (401/403)
      // axiosInstance will handle token refresh or redirect to /login
      const status = error?.response?.status;
      if (status !== 401 && status !== 403) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to wipe data
  const clearNavItems = () => {
    console.log("Clearing Nav Items (Logout)");
    setNavItems(initialData);
    setError(false);
  };

  // 3. THE LOGIC FIX:
  // Instead of running once on mount, we run whenever 'isAuthenticated' changes.
  useEffect(() => {
    if (isAuthenticated) {
      // User is logged in -> Fetch their specific sidebar
      refreshNavItems();
    } else {
      // User is logged out -> Wipe the sidebar state immediately
      clearNavItems();
    }
  }, [isAuthenticated]); // Dependency array ensures strict sync with Auth state

  return (
    <NavItemsContext.Provider value={{ navItems, refreshNavItems, loading, error }}>
      {children}
    </NavItemsContext.Provider>
  );
};