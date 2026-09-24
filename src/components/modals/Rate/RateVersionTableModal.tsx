import React, { useState, useEffect } from "react";
import Modal from "../../ui/Modal";
import ModalDataTable from "../../ui/ModalDataTable";
import { Edit, Trash, Info, Eye } from "lucide-react";
import { StatusBadge } from "../../ui/StatusBadge";
import { DeleteModal } from "../DeleteModal";
import { toast } from "react-toastify";
import ContextMenu, { type ContextMenuItem } from "../../ui/ContextMenu";
import { getCountriesApi } from "../../../api/settingApi/countryApi/countryApi";
import { CountryFlag } from "../../ui/CountryFlag";

interface RateVersionTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratePlan: string | null;
  ratePlanFilter?: any; // ⚡️ FIX: This is now the actual row object we clicked on
  moduleName: string;
  fetchApi: any;
  deleteApi: any;
  onEdit: (rate: any) => void;
  onView: (rate: any) => void;
  onRefresh: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  countryMap?: Record<string, string>;
  isVendorMode?: boolean;
}

export const RateVersionTableModal: React.FC<RateVersionTableModalProps> = ({
  isOpen,
  onClose,
  ratePlan,
  ratePlanFilter,
  moduleName,
  fetchApi,
  deleteApi,
  onEdit,
  onView,
  onRefresh,
  canUpdate,
  canDelete,
  countryMap = {},
  isVendorMode = false,
}) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  const [countryOptions, setCountryOptions] = useState<any[]>([]);

  const DEFAULT_COLUMNS = [
    "version", "country", "MCC", "MNC", "network", "countryCode", "rate", "remark", "status", "effectiveFrom", "effectiveTo"
  ];
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getCountriesApi("country", 1, 1000);
        const data = res.results || (Array.isArray(res) ? res : []);
        setCountryOptions(
          data.map((item: any) => ({
            label: item.name || "Unknown",
            value: item.name || String(item.id),
            iso2: item.iso2,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch countries", error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (isOpen && ratePlan) {
      fetchVersions();
    } else {
      setVersions([]);
    }
  }, [isOpen, ratePlan, ratePlanFilter]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      // ⚡️ FIX: Build searchParams explicitly based on what backend requires
      const searchParams: any = { 
        rateGroup__name: ratePlan 
      };

      // Extract filter values from the passed object
      if (ratePlanFilter) {
        if (ratePlanFilter.country) searchParams.country = ratePlanFilter.country;
        if (ratePlanFilter.MCC) searchParams.MCC = ratePlanFilter.MCC;
        if (ratePlanFilter.MNC) searchParams.MNC = ratePlanFilter.MNC;
        
        if (isVendorMode && ratePlanFilter.network) {
          searchParams.network = ratePlanFilter.network;
        }
      }
      
      const res = await fetchApi(moduleName, 1, 1000, searchParams);
      let list = res.results || (Array.isArray(res) ? res : []);
      list.sort((a: any, b: any) => (b.version || 0) - (a.version || 0));
      setVersions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteApi(deleteId, moduleName);
      toast.success("Rate version deleted successfully.");
      fetchVersions();
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete rate version.");
    }
    setDeleteId(null);
    setSelectedVersion(null);
  };

  const handleContextMenu = (e: React.MouseEvent, version: any, isLatest: boolean) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedVersion({ ...version, __isLatest: isLatest });
  };

  const menuItems: ContextMenuItem[] = selectedVersion ? [
    { label: "View Details", icon: <Eye size={16} />, onClick: () => onView(selectedVersion) },
    ...(canUpdate && selectedVersion.__isLatest ? [{ label: "Edit Latest", icon: <Edit size={16} />, onClick: () => onEdit(selectedVersion) }] : []),
    ...(canDelete ? [{ label: "Delete", icon: <Trash size={16} />, variant: "danger" as const, onClick: () => setDeleteId(selectedVersion.id) }] : []),
  ] : [];

  const COLUMN_LABELS: Record<string, string> = {
    version: "Version",
    country: "Country",
    MCC: "MCC",
    MNC: "MNC",
    network: "Network",
    countryCode: "Country Code",
    rate: "Rate",
    remark: "Remark",
    status: "Status",
    effectiveFrom: "Effective From",
    effectiveTo: "Effective To",
  };

  const handleSort = (idx: number) => {
    const colKey = columns[idx];
    if (!colKey) return;
    setSortConfig((prev) => {
      if (prev?.key === colKey) {
        if (prev.direction === "asc") return { key: colKey, direction: "desc" };
        return null;
      }
      return { key: colKey, direction: "asc" };
    });
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedVersions = React.useMemo(() => {
    if (!sortConfig) return versions;
    return [...versions].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortConfig.direction === "asc" ? res : -res;
    });
  }, [versions, sortConfig]);

  const renderCountry = (rate: any) => { 
    const countryNameStr = rate.countryName || countryMap[String(rate.country)] || String(rate.country || "-");
    const match = countryOptions.find((opt) => opt.label === countryNameStr || opt.value === String(rate.country));
    return (
      <div className="flex items-center gap-1.5">
        {match?.iso2 && <CountryFlag iso2={match.iso2} />}
        <span>{countryNameStr}</span>
      </div>
    );
  };
  
  const title = `Rate Plan Versions: ${ratePlan || ""}`;

  const versionName = selectedVersion
    ? `v${selectedVersion.version || 0} (${selectedVersion.countryName || countryMap[String(selectedVersion.country)] || selectedVersion.network || ratePlan || "-"})`
    : "";

  const renderCell = (colKey: string, v: any, isLatest: boolean) => {
    switch (colKey) {
      case "version":
        return (
          <td key={colKey} className="py-2.5 px-3 font-medium text-text-primary dark:text-white whitespace-nowrap">
            {isLatest && (
              <span className="mr-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Latest
              </span>
            )}
            v{v.version || 0}
          </td>
        );
      case "country":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{renderCountry(v)}</td>;
      case "MCC":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MCC || "-"}</td>;
      case "MNC":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.MNC || "-"}</td>;
      case "network":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.network || "-"}</td>;
      case "countryCode":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.countryCode || "-"}</td>;
      case "rate":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 font-medium whitespace-nowrap">{v.rate || "-"}</td>;
      case "remark":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.remark || "-"}</td>;
      case "status":
        return <td key={colKey} className="py-2.5 px-3"><StatusBadge status={v.status} /></td>;
      case "effectiveFrom":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.effectiveFrom ? new Date(v.effectiveFrom).toLocaleString() : "-"}</td>;
      case "effectiveTo":
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v.effectiveTo ? new Date(v.effectiveTo).toLocaleString() : "-"}</td>;
      default:
        return <td key={colKey} className="py-2.5 px-3 text-text-secondary dark:text-gray-300 whitespace-nowrap">{v[colKey] || "-"}</td>;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="max-w-full w-full" 
      >
        <div className="p-1 w-full min-w-0 flex flex-col space-y-4" onClick={() => setContextMenuPos(null)}>
          <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span>
                The highlighted row represents the latest active version. Only the
                latest version can be edited to trigger an upgrade.
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Right-click a row for view, edit, or delete options.
              </span>
            </div>
          </div>

          <ModalDataTable
            data={sortedVersions}
            headers={columns.map((c) => COLUMN_LABELS[c] || c)}
            renderRow={(v, i) => {
              const isLatest = i === 0;
              return (
                <tr
                  key={v.id}
                  onContextMenu={(e) => handleContextMenu(e, v, isLatest)}
                  className={`group border-b border-gray-100 dark:border-gray-700 cursor-context-menu transition-colors ${
                    isLatest
                      ? "bg-blue-50/50 dark:bg-blue-900/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  {columns.map((colKey) => renderCell(colKey, v, isLatest))}
                </tr>
              );
            }}
            isLoading={isLoading}
            serverSide={false}
            onReorderColumns={handleReorderColumns}
            onSort={handleSort}
            sortColumnIndex={sortConfig ? columns.findIndex((c) => c === sortConfig.key) : null}
            sortDirection={sortConfig?.direction || null}
            columnKeys={columns}
            storageKey="rate_version_modal_table"
            emptyMessage="No versions found."
          />
        </div>

        <ContextMenu
          position={contextMenuPos}
          items={menuItems}
          onClose={() => setContextMenuPos(null)}
        />
      </Modal>

      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setSelectedVersion(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Version"
        message={`Are you sure you want to delete version "${versionName}"? This action cannot be undone.`}
      />
    </>
  );
};