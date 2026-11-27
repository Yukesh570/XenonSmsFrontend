import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import DataTable from "../../../../components/ui/DataTable";
import FilterCard from "../../../../components/ui/FilterCard";
import AdvancedFilter, {
  type FilterColumn,
} from "../../../../components/ui/AdvancedFilter";
import { DeleteModal } from "../../../../components/modals/DeleteModal";
import { VendorCompatibilityProfileModal } from "../../../../components/modals/RouteManager/VendorTransform/VendorCompatibilityProfileModal";
import ContextMenu, {
  type ContextMenuItem,
} from "../../../../components/ui/ContextMenu";
import { CountryFlag } from "../../../../components/ui/CountryFlag";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { usePagePermissions } from "../../../../hooks/usePagePermissions";
import { formatDateTime } from "../../../../helper/dateFormatter";

import type {
  VendorCompatibilityProfile,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import {
  getVendorCompatibilityProfilesApi,
  deleteVendorCompatibilityProfileApi,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import { getVendorsApi } from "../../../../api/connectivityApi/vendorApi";

interface VendorCompatibilityTabProps {
  countries: any[];
}

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ColumnConfig extends Omit<FilterColumn, "type" | "key" | "label"> {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "date";
  render?: (profile: VendorCompatibilityProfile) => React.ReactNode;
  options?: Option[];
  filterKey?: string;
  isSearchOnly?: boolean;
  isSearchable?: boolean;
  tableLabel?: string;
}

const DEFAULT_SEARCH_COLUMNS = [
  "vendor",
  "country",
  "senderFormat",
  "verificationStatus",
  "remarks",
];

const DEFAULT_TABLE_COLUMNS = [
  "vendor",
  "country",
  "senderFormat",
  "maxSenderLength",
  "allowBlank",
  "verificationStatus",
  "remarks",
];

export const VendorCompatibilityTab: React.FC<VendorCompatibilityTabProps> = ({ countries }) => {
  const { canCreate, canUpdate, canDelete } = usePagePermissions();

  const [profiles, setProfiles] = useState<VendorCompatibilityProfile[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Column persistence
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vendor_compat_table_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading saved table columns", e);
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  const [searchColumns, setSearchColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vendor_compat_search_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading saved search columns", e);
    }
    return DEFAULT_SEARCH_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("vendor_compat_table_columns_v2", JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem("vendor_compat_search_columns_v2", JSON.stringify(searchColumns));
  }, [searchColumns]);

  // Filters State
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VendorCompatibilityProfile | null>(null);

  // Delete & Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowProfile, setSelectedRowProfile] = useState<VendorCompatibilityProfile | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load vendors and profiles
  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        getVendorsApi(undefined, 1, 1000).catch(() => ({ results: [] })),
        getVendorCompatibilityProfilesApi({}).catch(() => []),
      ]);

      const vList = vRes?.results || (Array.isArray(vRes) ? vRes : []);
      setVendors(vList);
      setProfiles(pRes);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load vendor compatibility profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    if (!canCreate) {
      toast.error("Action locked. You do not have permission to add compatibility profiles.");
      return;
    }
    setEditingProfile(null);
    setShowModal(true);
  };

  const handleEdit = (profile: VendorCompatibilityProfile) => {
    if (!canUpdate) {
      toast.error("Action locked. You do not have permission to edit compatibility profiles.");
      return;
    }
    setEditingProfile(profile);
    setShowModal(true);
    setContextMenuPos(null);
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Action locked. You do not have permission to delete compatibility profiles.");
      return;
    }
    if (!deleteProfileId) return;
    setIsDeleting(true);
    try {
      await deleteVendorCompatibilityProfileApi(deleteProfileId);
      toast.success("Vendor compatibility profile deleted successfully");
      setDeleteProfileId(null);
      setSelectedRowProfile(null);
      loadData();
    } catch (e) {
      toast.error("Failed to delete vendor compatibility profile");
    } finally {
      setIsDeleting(false);
    }
  };

  // Dropdown Options
  const senderFormatOptions: Option[] = [
    { label: "Any Format", value: "ANY" },
    { label: "Alpha Only", value: "ALPHA" },
    { label: "Numeric Only", value: "NUMERIC" },
  ];

  const verificationStatusOptions: Option[] = [
    { label: "Verified", value: "VERIFIED" },
    { label: "Unverified", value: "UNVERIFIED" },
    { label: "Deprecated", value: "DEPRECATED" },
  ];

  const vendorOptions: Option[] = [
    { label: "All Vendors", value: "ALL" },
    ...vendors.map((v) => ({
      value: String(v.id),
      label: v.profileName || `Vendor ${v.id}`,
    })),
  ];

  const countryOptions: Option[] = [
    { label: "Global (All Countries)", value: "GLOBAL" },
    ...countries.map((c: any) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];

  // Column definitions
  const allColumns: ColumnConfig[] = [
    {
      key: "vendor",
      label: "Vendor",
      tableLabel: "Vendor",
      type: "text",
      options: vendorOptions,
      filterKey: "vendor",
      render: (p) => (
        <span
          className="font-semibold text-primary cursor-pointer hover:underline"
          onClick={() => handleEdit(p)}
        >
          {p.vendor__profileName || `Vendor ${p.vendor}`}
        </span>
      ),
    },
    {
      key: "country",
      label: "Country Scope",
      tableLabel: "Country Scope",
      type: "text",
      options: countryOptions,
      filterKey: "country",
      render: (p) => {
        const countryObj = countries.find((c: any) => c.id === p.country);
        return countryObj ? (
          <div className="flex items-center gap-1.5">
            <CountryFlag iso2={countryObj.iso2} />
            <span>{countryObj.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic">Global (All Countries)</span>
        );
      },
    },
    {
      key: "senderFormat",
      label: "Sender Format",
      tableLabel: "Sender Format",
      type: "text",
      options: senderFormatOptions,
      filterKey: "senderFormat",
      render: (p) => {
        return (
          <StatusBadge
            status={p.senderFormat === "ALPHA" ? "SUBMITTED" : p.senderFormat === "NUMERIC" ? "PENDING" : "ACTIVE"}
            customText={
              p.senderFormat === "ALPHA"
                ? "ALPHA ONLY"
                : p.senderFormat === "NUMERIC"
                ? "NUMERIC ONLY"
                : "ANY FORMAT"
            }
          />
        );
      },
    },
    {
      key: "maxSenderLength",
      label: "Max Length",
      tableLabel: "Max Length",
      type: "number",
      filterKey: "maxSenderLength",
      render: (p) => <span>{p.maxSenderLength} chars</span>,
    },
    {
      key: "allowBlank",
      label: "Blank Allowed",
      tableLabel: "Blank Allowed",
      type: "boolean",
      filterKey: "allowBlank",
      render: (p) => (
        <StatusBadge
          status={p.allowBlank ? "ACTIVE" : "UNKNOWN"}
          customText={p.allowBlank ? "Yes" : "No"}
        />
      ),
    },
    {
      key: "verificationStatus",
      label: "Verification",
      tableLabel: "Verification",
      type: "text",
      options: verificationStatusOptions,
      filterKey: "verificationStatus",
      render: (p) => (
        <StatusBadge
          status={
            p.verificationStatus === "VERIFIED"
              ? "ACTIVE"
              : p.verificationStatus === "UNVERIFIED"
              ? "PENDING"
              : "FAILED"
          }
          customText={p.verificationStatus}
        />
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      tableLabel: "Remarks",
      type: "text",
      filterKey: "remarks",
      render: (p) => <span>{p.remarks || "-"}</span>,
    },
    {
      key: "createdAt",
      label: "Created At",
      tableLabel: "Created At",
      type: "date",
      isSearchable: false,
      render: (p: any) => (p.createdAt ? formatDateTime(p.createdAt) : "-"),
    },
  ];

  const searchableColumns = allColumns.filter((col) => col.isSearchable !== false);
  const visibleSearchFields = searchableColumns.filter((col) => searchColumns.includes(col.key));

  const visibleTableFields = tableColumns
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnConfig => Boolean(col));

  const tableHeaders = [
    "S.N.",
    ...visibleTableFields.map((col) => col.tableLabel || col.label),
  ];

  const tableFilterColumns = allColumns
    .filter((c) => !c.isSearchOnly)
    .map((c) => ({
      key: c.key,
      label: c.tableLabel || c.label,
      type: c.type,
    }));

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filterValues });
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const handleSort = (columnIndex: number) => {
    const colIndex = columnIndex - 1;
    if (colIndex >= 0 && colIndex < visibleTableFields.length) {
      const col = visibleTableFields[colIndex];
      if (col.key === "actions") return;
      setCurrentPage(1);
      setSortConfig((prev) => {
        if (prev?.key === col.key) {
          if (prev.direction === "asc") return { key: col.key, direction: "desc" };
          return null;
        }
        return { key: col.key, direction: "asc" };
      });
    }
  };

  // Filter & Sort Profiles Client-Side
  const filteredAndSortedProfiles = useMemo(() => {
    let result = profiles.filter((p) => {
      for (const [colKey, rawVal] of Object.entries(appliedFilters)) {
        const val = rawVal?.trim().toLowerCase();
        if (!val) continue;

        if (colKey === "vendor") {
          if (val === "all") continue;
          if (String(p.vendor) !== val) return false;
        } else if (colKey === "country") {
          if (val === "global") {
            if (p.country !== null && p.country !== undefined) return false;
          } else if (String(p.country) !== val) {
            return false;
          }
        } else if (colKey === "senderFormat") {
          if (p.senderFormat?.toLowerCase() !== val) return false;
        } else if (colKey === "verificationStatus") {
          if (p.verificationStatus?.toLowerCase() !== val) return false;
        } else if (colKey === "remarks") {
          if (!p.remarks?.toLowerCase().includes(val) && !p.vendor__profileName?.toLowerCase().includes(val)) {
            return false;
          }
        } else if (colKey === "maxSenderLength") {
          if (String(p.maxSenderLength) !== val) return false;
        }
      }
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [profiles, appliedFilters, sortConfig]);

  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedProfiles.slice(start, start + rowsPerPage);
  }, [filteredAndSortedProfiles, currentPage, rowsPerPage]);

  const getBaseLabel = (label: string) => {
    if (!label) return "";
    return label.split(" (")[0].trim();
  };

  // Context Menu Items
  const contextMenuItems: ContextMenuItem[] = selectedRowProfile
    ? [
        {
          label: canUpdate ? "Edit Profile" : "Edit Locked (Read-Only)",
          icon: <Edit size={16} />,
          onClick: () => {
            if (canUpdate) handleEdit(selectedRowProfile);
            else toast.error("Action locked: No permission to edit.");
          },
        },
        {
          label: canDelete ? "Delete Profile" : "Delete Locked (No Permission)",
          icon: <Trash size={16} />,
          variant: "danger",
          onClick: () => {
            if (canDelete) {
              setDeleteProfileId(selectedRowProfile.id!);
            } else {
              toast.error("Action locked: No permission to delete.");
            }
          },
        },
      ]
    : [];

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Top Controls: AdvancedFilter Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative z-20">
            <AdvancedFilter
              columns={tableFilterColumns}
              selectedColumns={tableColumns}
              defaultColumns={DEFAULT_TABLE_COLUMNS}
              onFilter={setTableColumns}
              onClear={() => setTableColumns(DEFAULT_TABLE_COLUMNS)}
              buttonLabel="Columns"
              enableReorder={true}
            />
          </div>

          <div className="relative z-20">
            <AdvancedFilter
              columns={searchableColumns}
              selectedColumns={searchColumns}
              defaultColumns={DEFAULT_SEARCH_COLUMNS}
              onFilter={(newCols) => {
                setSearchColumns(newCols);
                setFilterValues((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    if (!newCols.includes(k)) delete next[k];
                  });
                  return next;
                });
              }}
              onClear={() => setSearchColumns(DEFAULT_SEARCH_COLUMNS)}
              isLoading={loading}
              buttonLabel="Search Fields"
            />
          </div>
        </div>

        {!canCreate && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800">
            <Lock size={13} />
            <span>Create locked (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Dynamic FilterCard */}
      <FilterCard onSearch={handleSearch} onClear={handleClearFilters}>
        {visibleSearchFields.map((col) => {
          const baseLabel = getBaseLabel(col.label || "");
          if (col.options) {
            return (
              <Select
                key={col.key}
                label={`Search ${baseLabel}`}
                value={filterValues[col.key] || ""}
                onChange={(val: string) => handleFilterChange(col.key, val)}
                options={col.options}
                placeholder={`Select ${baseLabel}`}
                allowCustomValue={true}
              />
            );
          }
          return (
            <Input
              key={col.key}
              type={col.type === "number" ? "number" : "text"}
              label={`Search ${baseLabel}`}
              value={filterValues[col.key] || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange(col.key, e.target.value)}
              placeholder={`Search ${baseLabel}`}
            />
          );
        })}
      </FilterCard>

      {/* Reusable DataTable */}
      <DataTable
        density="compact"
        headers={tableHeaders}
        data={paginatedProfiles}
        totalItems={filteredAndSortedProfiles.length}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={loading}
        onSort={handleSort}
        sortColumnIndex={
          sortConfig
            ? visibleTableFields.findIndex((c) => c.key === sortConfig.key) + 1
            : null
        }
        sortDirection={sortConfig?.direction || null}
        onReorderColumns={(fromIdx, toIdx) => {
          setTableColumns((prev) => {
            const validKeys = prev.filter((key) =>
              allColumns.some((c) => c.key === key)
            );
            const next = [...validKeys];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
        }}
        headerActions={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenAdd}
              leftIcon={<Plus size={16} />}
            >
              Add Compatibility Profile
            </Button>
          ) : null
        }
        renderRow={(profile, index) => (
          <tr
            key={profile.id || index}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuPos({ x: e.clientX, y: e.clientY });
              setSelectedRowProfile(profile);
            }}
            className="hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700 cursor-context-menu transition-colors"
          >
            <td className="px-4 py-4 text-sm text-text-primary dark:text-white">
              {(currentPage - 1) * rowsPerPage + index + 1}
            </td>
            {visibleTableFields.map((col) => {
              if (col.render) {
                return (
                  <td
                    key={col.key}
                    className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                  >
                    {col.render(profile)}
                  </td>
                );
              }
              const cellData = (profile as any)[col.key];
              return (
                <td
                  key={col.key}
                  className="px-4 py-4 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap"
                >
                  {cellData ?? "-"}
                </td>
              );
            })}
          </tr>
        )}
      />

      {/* Context Menu */}
      <ContextMenu
        position={contextMenuPos}
        items={contextMenuItems}
        onClose={() => setContextMenuPos(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteProfileId}
        onClose={() => {
          setDeleteProfileId(null);
          setSelectedRowProfile(null);
        }}
        onConfirm={handleDelete}
        title="Delete Vendor Compatibility Profile"
        message={`Are you sure you want to permanently delete the compatibility profile for "${selectedRowProfile?.vendor__profileName || "this vendor"}"? Downstream verification may fail.`}
        isDeleting={isDeleting}
      />

      {/* Add / Edit Profile Modal */}
      <VendorCompatibilityProfileModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProfile(null);
        }}
        onSuccess={loadData}
        editingProfile={editingProfile}
        vendors={vendors}
        countries={countries}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
};
