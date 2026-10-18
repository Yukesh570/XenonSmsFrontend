import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Trash, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getCustomRoutesApi,
  updateCustomRouteApi,
  type CustomRouteData,
} from "../../api/routeManagerApi/customRouteApi";
import { EditableCell } from "./EditableCell";
import { formatDateTime } from "../../helper/dateFormatter";
import Select from "./Select";
import DatePicker from "./DatePicker";
import Input from "./Input";

interface SubRouteEditableTableProps {
  routeGroup: string;
  moduleName: string;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (id: number) => void;
  refreshTrigger?: number;
  onDataLoaded?: (count: number) => void;
  selectedCountryId?: string;
  selectedRoutingType?: string;
}

const ReadOnlyCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 text-text-secondary dark:text-gray-400 border-r border-b dark:border-gray-700 cursor-not-allowed select-none bg-gray-50/50 dark:bg-gray-800/20">
    {children}
  </td>
);

const FilterInput = ({
  fieldKey,
  placeholder,
  value,
  onChange,
  onEnter,
  minWidth = "120px",
}: {
  fieldKey: string;
  placeholder: string;
  value: string;
  onChange: (key: string, val: string) => void;
  onEnter: () => void;
  minWidth?: string;
}) => (
  <div className="w-full filter-control-wrapper" style={{ minWidth }}>
    <Input
      label=""
      name={fieldKey}
      value={value || ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(fieldKey, e.target.value)
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder={placeholder}
    />
  </div>
);

const rowsOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
];

export const SubRouteEditableTable: React.FC<SubRouteEditableTableProps> = ({
  routeGroup,
  moduleName,
  canUpdate,
  canDelete,
  onDelete,
  refreshTrigger,
  onDataLoaded,
  selectedCountryId,
  selectedRoutingType,
}) => {
  const [data, setData] = useState<CustomRouteData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const isDetailMode = !!selectedCountryId;
  const isPercentage = selectedRoutingType === "PERCENTAGE";

  const fetchSubRoutes = () => {
    setLoading(true);
    const searchParams: Record<string, any> = { routeGroup__name: routeGroup };

    if (selectedCountryId) {
      searchParams.country = selectedCountryId;
    }

    Object.keys(apiFilters).forEach((key) => {
      const val = apiFilters[key];
      if (val) {
        if (key === "countryName") searchParams["country__name__icontains"] = val;
        else if (key === "MCC") searchParams["MCC__icontains"] = val;
        else if (key === "MNC") searchParams["MNC__icontains"] = val;
        else if (key === "terminatingVendorProfileName") searchParams["terminatingVendor__profileName__icontains"] = val;
        else if (key === "priority") searchParams["priority"] = val;
        else if (key === "trafficPercentage") searchParams["trafficPercentage"] = val;
        else if (key === "status") searchParams["status"] = val;
        else if (key === "createdAt") searchParams["createdAt"] = val;
      }
    });

    getCustomRoutesApi(moduleName, currentPage, rowsPerPage, searchParams)
      .then((res: any) => {
        const results = res.results || [];
        const count = res.count ?? results.length;
        setData(results);
        setTotalItems(count);
        if (onDataLoaded) onDataLoaded(count);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load sub-routes");
        setLoading(false);
      });
  };

  useEffect(() => {
    setCurrentPage(1);
    setColumnFilters({});
    setApiFilters({});
  }, [routeGroup, moduleName, refreshTrigger, selectedCountryId]);

  useEffect(() => {
    if (routeGroup) fetchSubRoutes();
  }, [routeGroup, moduleName, refreshTrigger, currentPage, rowsPerPage, apiFilters, selectedCountryId]);

  const handleTableClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === "DIV" &&
      (e.target as HTMLElement).classList.contains("custom-grid-scroll")
    ) {
      setActiveCellId(null);
    }
  };

  const handleInlineSave = async (id: number, field: string, newValue: string) => {
    setActiveCellId(null);
    const originalRow = data.find((r) => r.id === id);
    if (!originalRow || String((originalRow as any)[field]) === newValue) return;

    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: newValue } : r))
    );
    try {
      await updateCustomRouteApi(id, { [field]: newValue }, moduleName);
      toast.success(`Updated ${field}`);
    } catch {
      toast.error(`Failed to update ${field}`);
      setData((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, [field]: (originalRow as any)[field] } : r
        )
      );
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    if (value === "") {
      setApiFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCurrentPage(1);
    }
  };

  const handleFilterApply = () => {
    setApiFilters(columnFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setColumnFilters({});
    setApiFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(columnFilters).some((v) => v !== "" && v !== undefined);

  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleRowsChange = (val: number) => { setRowsPerPage(val); setCurrentPage(1); };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginationLabel = `${totalItems === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + data.length, totalItems)} of ${totalItems}`;

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  // Column counts for colSpan
  // Summary: S.N. + Country + Status + Created At = 4
  // Detail: S.N. + MCC + MNC + Vendor + Priority/% + VendorRate + Status + CreatedAt [+ Action] = 8 or 9
  const summaryColSpan = 4;
  const detailColSpan = isDetailMode ? (canDelete ? 9 : 8) : summaryColSpan;

  return (
    <div className="rounded-xl bg-white shadow-card dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col relative z-0">

      {/* Pagination bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 gap-4 bg-white dark:bg-gray-800 relative z-[100]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">
              Rows per page:
            </span>
            <div className="w-24 shrink-0">
              <Select
                value={String(rowsPerPage)}
                onChange={(val: string) => handleRowsChange(Number(val))}
                options={rowsOptions}
                clearable={false}
                placement="bottom"
              />
            </div>
          </div>
          <span className="text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap">
            {paginationLabel}
          </span>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              className="rounded border border-transparent p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handlePrev}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="rounded border border-transparent p-1 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleNext}
              disabled={currentPage >= totalPages || totalItems === 0 || loading}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 transition-colors whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Scrollable table */}
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm max-h-[60vh] w-full overflow-x-auto overflow-y-auto custom-grid-scroll"
        onClick={handleTableClick}
      >
        <table className="min-w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0">
          <thead className="bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-300 sticky top-0 z-20 shadow-sm">
            {!isDetailMode ? (
              /* ── Summary header ── */
              <>
                <tr>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">S.N.</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">Country</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600 w-[140px]">Status</th>
                  <th className="px-4 py-2 font-bold border-b dark:border-gray-600 min-w-[150px]">Created At</th>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/80">
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal">
                    <FilterInput fieldKey="countryName" placeholder="Search..." value={columnFilters["countryName"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="100px" />
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal relative z-[60]">
                    <div className="w-full filter-control-wrapper" style={{ minWidth: "100px" }}>
                      <Select
                        label=""
                        value={columnFilters["status"] || ""}
                        onChange={(val: string) => {
                          handleFilterChange("status", val);
                          setApiFilters((prev) => ({ ...prev, status: val }));
                          setCurrentPage(1);
                        }}
                        options={[{ label: "All", value: "" }, ...statusOptions]}
                        placeholder="All"
                        placement="bottom"
                      />
                    </div>
                  </th>
                  <th className="p-1 border-b dark:border-gray-600 font-normal relative z-[60]">
                    <div className="w-full filter-control-wrapper" style={{ minWidth: "130px" }}>
                      <DatePicker
                        label=""
                        selected={columnFilters["createdAt"] ? new Date(columnFilters["createdAt"]) : null}
                        onChange={(date: Date | null) => {
                          const dateStr = date ? formatLocalDate(date) : "";
                          handleFilterChange("createdAt", dateStr);
                          setApiFilters((prev) => ({ ...prev, createdAt: dateStr }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </th>
                </tr>
              </>
            ) : (
              /* ── Detail header ── */
              <>
                <tr>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">S.N.</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">MCC</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">MNC</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600">Terminating Vendor</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600 w-[130px]">
                    {isPercentage ? "Traffic %" : "Priority"}
                  </th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600 w-[130px]">Vendor Rate</th>
                  <th className="px-4 py-2 font-bold border-b border-r dark:border-gray-600 w-[130px]">Status</th>
                  <th className="px-4 py-2 font-bold border-b dark:border-gray-600 min-w-[150px]">Created At</th>
                  {canDelete && (
                    <th className="px-4 py-2 font-bold border-b dark:border-gray-600 text-center sticky right-0 bg-gray-100 dark:bg-gray-800 shadow-l z-30">
                      Action
                    </th>
                  )}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/80">
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal">
                    <FilterInput fieldKey="MCC" placeholder="Search..." value={columnFilters["MCC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="70px" />
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal">
                    <FilterInput fieldKey="MNC" placeholder="Search..." value={columnFilters["MNC"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="70px" />
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal">
                    <FilterInput fieldKey="terminatingVendorProfileName" placeholder="Search..." value={columnFilters["terminatingVendorProfileName"] || ""} onChange={handleFilterChange} onEnter={handleFilterApply} minWidth="120px" />
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal">
                    <FilterInput
                      fieldKey={isPercentage ? "trafficPercentage" : "priority"}
                      placeholder="Search..."
                      value={columnFilters[isPercentage ? "trafficPercentage" : "priority"] || ""}
                      onChange={handleFilterChange}
                      onEnter={handleFilterApply}
                      minWidth="90px"
                    />
                  </th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal"></th>
                  <th className="p-1 border-b border-r dark:border-gray-600 font-normal relative z-[60]">
                    <div className="w-full filter-control-wrapper" style={{ minWidth: "100px" }}>
                      <Select
                        label=""
                        value={columnFilters["status"] || ""}
                        onChange={(val: string) => {
                          handleFilterChange("status", val);
                          setApiFilters((prev) => ({ ...prev, status: val }));
                          setCurrentPage(1);
                        }}
                        options={[{ label: "All", value: "" }, ...statusOptions]}
                        placeholder="All"
                        placement="bottom"
                      />
                    </div>
                  </th>
                  <th className="p-1 border-b dark:border-gray-600 font-normal relative z-[60]">
                    <div className="w-full filter-control-wrapper" style={{ minWidth: "130px" }}>
                      <DatePicker
                        label=""
                        selected={columnFilters["createdAt"] ? new Date(columnFilters["createdAt"]) : null}
                        onChange={(date: Date | null) => {
                          const dateStr = date ? formatLocalDate(date) : "";
                          handleFilterChange("createdAt", dateStr);
                          setApiFilters((prev) => ({ ...prev, createdAt: dateStr }));
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </th>
                  {canDelete && (
                    <th className="p-1 border-b dark:border-gray-600 sticky right-0 bg-gray-50 dark:bg-gray-800/80 shadow-l z-30"></th>
                  )}
                </tr>
              </>
            )}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={detailColSpan} className="px-4 py-12 text-center text-gray-500 animate-pulse font-medium bg-white dark:bg-gray-900">
                  Fetching details...
                </td>
              </tr>
            ) : (
              <>
                {data.map((route: CustomRouteData, index: number) =>
                  !isDetailMode ? (
                    /* ── Summary row ── */
                    <tr key={route.id} className="hover:bg-blue-50/40 dark:hover:bg-primary/5 transition-colors">
                      <ReadOnlyCell>{startIndex + index + 1}</ReadOnlyCell>
                      <ReadOnlyCell>{route.countryName || "-"}</ReadOnlyCell>
                      <td className="p-1.5 border-r border-b dark:border-gray-700 overflow-visible bg-white dark:bg-gray-900">
                        <EditableCell
                          value={route.status}
                          type="select"
                          options={statusOptions}
                          onSave={(val: string) => handleInlineSave(route.id!, "status", val)}
                          disabled={!canUpdate}
                          isEditing={activeCellId === `${route.id}-status`}
                          onEditStart={() => setActiveCellId(`${route.id}-status`)}
                          onEditEnd={() => setActiveCellId(null)}
                        />
                      </td>
                      <ReadOnlyCell>{route.createdAt ? formatDateTime(route.createdAt) : "-"}</ReadOnlyCell>
                    </tr>
                  ) : (
                    /* ── Detail row ── */
                    <tr key={route.id} className="hover:bg-blue-50/40 dark:hover:bg-primary/5 transition-colors relative z-0 hover:z-10 focus-within:z-50 group">
                      <ReadOnlyCell>{startIndex + index + 1}</ReadOnlyCell>
                      <ReadOnlyCell>{route.MCC || "-"}</ReadOnlyCell>
                      <ReadOnlyCell>{route.MNC || "-"}</ReadOnlyCell>
                      <ReadOnlyCell>{route.terminatingVendorProfileName || "-"}</ReadOnlyCell>

                      {isPercentage ? (
                        <ReadOnlyCell>{route.trafficPercentage ?? "-"}</ReadOnlyCell>
                      ) : (
                        <td className="p-1.5 border-r border-b dark:border-gray-700 overflow-visible bg-white dark:bg-gray-900">
                          <EditableCell
                            value={String(route.priority || "")}
                            type="number"
                            onSave={(val: string) => handleInlineSave(route.id!, "priority", val)}
                            disabled={!canUpdate}
                            isEditing={activeCellId === `${route.id}-priority`}
                            onEditStart={() => setActiveCellId(`${route.id}-priority`)}
                            onEditEnd={() => setActiveCellId(null)}
                          />
                        </td>
                      )}

                      <ReadOnlyCell>
                        {route.vendorRate ? (
                          <span className="font-mono text-xs text-green-700 dark:text-green-400">{route.vendorRate}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </ReadOnlyCell>

                      <td className="p-1.5 border-r border-b dark:border-gray-700 overflow-visible bg-white dark:bg-gray-900">
                        <EditableCell
                          value={route.status}
                          type="select"
                          options={statusOptions}
                          onSave={(val: string) => handleInlineSave(route.id!, "status", val)}
                          disabled={!canUpdate}
                          isEditing={activeCellId === `${route.id}-status`}
                          onEditStart={() => setActiveCellId(`${route.id}-status`)}
                          onEditEnd={() => setActiveCellId(null)}
                        />
                      </td>
                      <ReadOnlyCell>{route.createdAt ? formatDateTime(route.createdAt) : "-"}</ReadOnlyCell>

                      {canDelete && (
                        <td className="px-4 py-2 text-center sticky right-0 bg-white dark:bg-gray-900 border-l border-b dark:border-gray-700 z-10">
                          <button
                            onClick={() => onDelete(route.id!)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                            title="Delete Route"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                )}
                {data.length === 0 && (
                  <tr>
                    <td
                      colSpan={detailColSpan}
                      className="px-4 py-8 text-center text-gray-500 bg-white dark:bg-gray-900 border-b dark:border-gray-700"
                    >
                      {!isDetailMode
                        ? "Select a country above to view route details."
                        : Object.keys(apiFilters).length > 0
                          ? "No routes match your search filters."
                          : "No sub-routes configured for this country."}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-grid-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-grid-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .dark .custom-grid-scroll::-webkit-scrollbar-track { background: #1f2937; }
        .custom-grid-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-grid-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .filter-control-wrapper label { display: none !important; }
        .filter-control-wrapper > div { margin-bottom: 0 !important; }
        .filter-control-wrapper input:not(.react-datepicker-ignore-class), .filter-control-wrapper select, .filter-control-wrapper button {
           min-height: 28px !important; height: 28px !important; padding-top: 2px !important; padding-bottom: 2px !important; padding-left: 6px !important; padding-right: 6px !important; font-size: 12px !important; border-radius: 4px !important;
        }
        .filter-control-wrapper .react-datepicker__input-container input {
           min-height: 28px !important; height: 28px !important; padding-top: 2px !important; padding-bottom: 2px !important; padding-left: 34px !important; padding-right: 6px !important; font-size: 12px !important; border-radius: 4px !important;
        }
      `}} />
    </div>
  );
};
