import { useContext, useEffect, useState, Fragment, useRef } from "react";
import {
  getNavByUserType,
  type navUserData,
  updateNavUserRelationBulk,
} from "../../api/navUserRelationApi/navUserRelationApi";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import { toast } from "react-toastify";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import { NavItemsContext } from "../../context/navItemsContext";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { actionHelper } from "../../helper/action";

const userTypeOptions = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "SALES", label: "SALES" },
  { value: "SUPPORT", label: "SUPPORT" },
  { value: "NOC", label: "NOC" },
  { value: "RATE", label: "RATE" },
  { value: "FINANCE", label: "FINANCE" },
  { value: "ACCOUNT_MANAGER", label: "Account Manager" },

];

type PermissionKeys = "read" | "write" | "delete" | "put";

const PermissionsTable = () => {
  const [permissions, setPermissions] = useState<navUserData[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<navUserData[]>(
    []
  );
  const [selectedUserType, setSelectedUserType] = useState("ADMIN");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const { refreshNavItems } = useContext(NavItemsContext);

  const handleToggle = (id: number, key: PermissionKeys) => {
    const updatePermissions = (items: navUserData[]): navUserData[] => {
      return items.map((item) => {
        if (item.permission?.NavRelationid === id) {
          return {
            ...item,
            permission: {
              ...item.permission,
              [key]: !item.permission[key],
            },
          };
        }
        if (item.children) {
          return {
            ...item,
            children: updatePermissions(item.children),
          };
        }
        return item;
      });
    };
    setPermissions((prev) => updatePermissions(prev));
  };

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const fetctSideBar = async () => {
      setIsLoading(true);
      try {
        const data = await getNavByUserType({ userType: selectedUserType });
        setPermissions(data);
        setOriginalPermissions(data);
      } catch (error) {
        toast.error(`Failed to load permissions for ${selectedUserType}.`);
        setPermissions([]);
        setOriginalPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetctSideBar();
  }, [selectedUserType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const flattenItems = (items: navUserData[]): navUserData[] =>
        items.flatMap((item) =>
          item.children ? [item, ...flattenItems(item.children)] : [item]
        );

      const flatPermissions = flattenItems(permissions);
      const flatOriginal = flattenItems(originalPermissions);

      const changedPermissions = flatPermissions.filter((currentItem) => {
        const originalItem = flatOriginal.find((i) => i.id === currentItem.id);
        if (
          !originalItem ||
          !currentItem.permission ||
          !originalItem.permission
        ) {
          return false;
        }
        return (
          currentItem.permission.read !== originalItem.permission.read ||
          currentItem.permission.write !== originalItem.permission.write ||
          currentItem.permission.delete !== originalItem.permission.delete ||
          currentItem.permission.put !== originalItem.permission.put
        );
      });

      if (changedPermissions.length === 0) {
        toast.info("No changes to save.");
        setIsSaving(false);
        return;
      }
      const dataToSave = changedPermissions.map((item) => ({
        id: item.permission!.NavRelationid,
        read: item.permission!.read,
        write: item.permission!.write,
        delete: item.permission!.delete,
        put: item.permission!.put,
      }));

      await updateNavUserRelationBulk(dataToSave);
      toast.success(`Permissions for ${selectedUserType} saved successfully!`);
      setOriginalPermissions(permissions);
      refreshNavItems();
    } catch (error) {
      toast.error(`Failed to save permissions for ${selectedUserType}.`);
    } finally {
      setIsSaving(false);
    }
  };
  const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      // The setTimeout is CRUCIAL here to wait for the sidebar to update
      setTimeout(() => {
        const activeLinks = document.querySelectorAll('aside a.active, nav a.active');
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = activeItem?.innerText?.split('\n')[0].trim() || "Module";

        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100); // Waits 0.1 seconds

      hasLoggedOpening.current = true;
    }
  }, []);

  const renderRows = (items: navUserData[], level = 0) => {
    return items.map((item) => {
      if (!item.permission) {
        return null;
      }

      const hasChildren = item.children && item.children.length > 0;

      return (
        <Fragment key={item.permission.NavRelationid}>
          <tr
            className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800`}
          >
            <td
              className="px-6 py-3 font-medium text-gray-900 dark:text-white flex items-center"
              style={{ paddingLeft: `${level * 20 + 24}px` }}
            >
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.permission!.NavRelationid!)}
                  className="mr-2 focus:outline-none text-gray-500 hover:text-primary"
                >
                  {expandedRows.includes(item.permission!.NavRelationid!) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              {!hasChildren && level > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2"></span>
              )}
              {item.label || "No label"}
            </td>

            {(["read", "write", "delete", "put"] as PermissionKeys[]).map(
              (key) => {
                if (hasChildren && key !== "read") {
                  return (
                    <td key={key} className="px-6 py-2 text-center">
                      <span className="text-gray-300 dark:text-gray-600 select-none">
                        -
                      </span>
                    </td>
                  );
                }

                return (
                  <td key={key} className="px-6 py-2 text-center">
                    <div className="flex justify-center">
                      <ToggleSwitch
                        checked={item.permission![key]}
                        onChange={() =>
                          handleToggle(item.permission!.NavRelationid!, key)
                        }
                      />
                    </div>
                  </td>
                );
              }
            )}
          </tr>

          {hasChildren &&
            expandedRows.includes(item.permission!.NavRelationid!) &&
            renderRows(item.children!, level + 1)}
        </Fragment>
      );
    });
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Permissions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage access levels for different user roles.
          </p>
        </div>

        <div className="w-full md:w-64">
          <Select
            label="User Role"
            value={selectedUserType}
            onChange={setSelectedUserType}
            options={userTypeOptions}
            placeholder="Select User Type"
            clearable={false}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-card border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Module
                </th>
                {["Read", "Create (Write)", "Delete", "Update (Put)"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">Loading permissions...</span>
                    </div>
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No permissions found for this role.
                  </td>
                </tr>
              ) : (
                renderRows(permissions)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-8"
        >
          {isSaving ? "Saving Changes" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default PermissionsTable;
