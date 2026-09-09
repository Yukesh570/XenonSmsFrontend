import { useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { NavItemsContext } from "../context/navItemsContext";
import type { navUserData } from "../api/navUserRelationApi/navUserRelationApi";

export const usePagePermissions = () => {
  const { navItems } = useContext(NavItemsContext);
  const location = useLocation();

  const permissions = useMemo(() => {
    // 1. Clean current path (e.g., "/navItem/" -> "navItem")
    const currentPath = location.pathname.replace(/^\/+|\/+$/g, "");

    if (!navItems?.results || !currentPath) {
      return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    }

    // 2. Collect all items into a flat list so parent URL doesn't block children
    const allItems: navUserData[] = [];
    const flattenTree = (items: navUserData[]) => {
      for (const item of items) {
        allItems.push(item);
        if (item.children && item.children.length > 0) {
          flattenTree(item.children);
        }
      }
    };
    flattenTree(navItems.results);

    // 3. Match exact path or direct child path (e.g. "rate/vendorRate/123" -> "rate/vendorRate")
    const matchedItem = allItems.find((item) => {
      const itemUrl = (item.url || "").replace(/^\/+|\/+$/g, "");
      return itemUrl && (itemUrl === currentPath || currentPath.startsWith(`${itemUrl}/`));
    });

    // 4. Return permissions (default to false if not found)
    return {
      canRead: matchedItem?.permission?.read ?? false,
      canCreate: matchedItem?.permission?.write ?? false, // Maps to "Add" button
      canUpdate: matchedItem?.permission?.put ?? false,   // Maps to "Edit" button
      canDelete: matchedItem?.permission?.delete ?? false, // Maps to "Delete" button
    };
  }, [navItems, location.pathname]);

  return permissions;
};