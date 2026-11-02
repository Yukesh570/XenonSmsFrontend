import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Plus,
  Sliders,
  Calendar,
  ChevronDown,
  RotateCcw,
  Copy,
  ShieldAlert,
  DollarSign,
} from "lucide-react";
import Button from "../../components/ui/Button";
import type { WorkspaceTab, CustomWidgetDefinition } from "./customWidgetTypes";
import { DEFAULT_WORKSPACE_TABS } from "./customWidgetTypes";
import { CustomWidgetCard } from "./CustomWidgetCard";
import { CustomWidgetBuilderModal } from "./CustomWidgetBuilderModal";
import { AddTabModal } from "./AddTabModal";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

const STORAGE_KEY = "xenon_custom_data_workspace_v8";

const RANGE_OPTIONS: { key: "today" | "yesterday" | "7d" | "30d" | "all"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All Available" },
];

export const CustomDashboard: React.FC = () => {
  // Theme listener (Light vs Dark)
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_WORKSPACE_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabs[0]?.id || "tab-vendor-watch";
  });

  // Modal States
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingWidget, setEditingWidget] = useState<CustomWidgetDefinition | null>(null);
  const [isAddTabOpen, setIsAddTabOpen] = useState<boolean>(false);

  // Global Date Filter
  const [globalDatePreset, setGlobalDatePreset] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("all");
  const [rangeOpen, setRangeOpen] = useState<boolean>(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  // Close timeframe dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(event.target as Node)) {
        setRangeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter dropdown data
  const [clientsList, setClientsList] = useState<{ id?: string | number; name: string }[]>([]);
  const [vendorsList, setVendorsList] = useState<{ id?: string | number; profileName?: string; name?: string }[]>([]);
  const [countriesList, setCountriesList] = useState<{ id?: string | number; name: string; countryCode?: string }[]>([]);

  // Drag and drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // Ignore quota errors
    }
  }, [tabs]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [cRes, vRes, cnRes] = await Promise.allSettled([
          getClientsApi("client", 1, 1000),
          getVendorsApi("", 1, 1000),
          getCountriesApi("", 1, 500),
        ]);

        if (cRes.status === "fulfilled" && cRes.value?.results) {
          setClientsList(cRes.value.results);
        }
        if (vRes.status === "fulfilled" && vRes.value?.results) {
          setVendorsList(vRes.value.results);
        }
        if (cnRes.status === "fulfilled" && cnRes.value?.results) {
          setCountriesList(cnRes.value.results);
        }
      } catch {
        // Soft fail
      }
    };
    fetchOptions();
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Tab operations
  const handleAddTab = (newTab: WorkspaceTab) => {
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleDuplicateTab = () => {
    if (!activeTab) return;
    const dup: WorkspaceTab = {
      ...activeTab,
      id: `tab-${Date.now()}`,
      name: `${activeTab.name} (Copy)`,
      widgets: activeTab.widgets.map((w) => ({
        ...w,
        id: `cw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    setTabs((prev) => [...prev, dup]);
    setActiveTabId(dup.id);
  };

  const handleDeleteTab = (tabId: string) => {
    if (tabs.length <= 1) {
      alert("At least one workspace tab is required.");
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[0]?.id || "");
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all workspace tabs and custom widgets to default templates?")) {
      setTabs(DEFAULT_WORKSPACE_TABS);
      setActiveTabId(DEFAULT_WORKSPACE_TABS[0].id);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Widget operations
  const handleSaveWidget = (widget: CustomWidgetDefinition) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const exists = tab.widgets.some((w) => w.id === widget.id);
        const newWidgets = exists
          ? tab.widgets.map((w) => (w.id === widget.id ? widget : w))
          : [...tab.widgets, widget];
        return { ...tab, widgets: newWidgets };
      })
    );
  };

  const handleRemoveWidget = (widgetId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          widgets: tab.widgets.filter((w) => w.id !== widgetId),
        };
      })
    );
  };

  const handleResizeWidget = (widgetId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          widgets: tab.widgets.map((w) => {
            if (w.id !== widgetId) return w;
            const nextSize =
              w.size === "small" ? "medium" : w.size === "medium" ? "large" : "small";
            return { ...w, size: nextSize };
          }),
        };
      })
    );
  };

  // Drag and drop reordering
  const handleDragStart = (id: string) => {
    setDraggedWidgetId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) {
      setDraggedWidgetId(null);
      return;
    }

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const widgets = [...tab.widgets];
        const fromIdx = widgets.findIndex((w) => w.id === draggedWidgetId);
        const toIdx = widgets.findIndex((w) => w.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return tab;

        const [moved] = widgets.splice(fromIdx, 1);
        widgets.splice(toIdx, 0, moved);
        return { ...tab, widgets };
      })
    );
    setDraggedWidgetId(null);
  };

  return (
    <div className="container mx-auto pb-6">
      {/* Page Header */}
      <div className="mb-3.5 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary dark:text-white">
            Custom Data Workspace
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-0.5">
            Build custom rule-based widgets with your own entity grouping, metric thresholds, and visualizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe Dropdown */}
          <div className="relative" ref={rangeDropdownRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((o) => !o)}
              className="h-[34px] flex items-center gap-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-text-primary dark:text-white shadow-sm hover:border-primary hover:text-primary transition-colors"
            >
              <Calendar size={14} className="text-primary" />
              <span>Timeframe: {RANGE_OPTIONS.find((o) => o.key === globalDatePreset)?.label || "All Available"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${rangeOpen ? "rotate-180" : ""}`}
              />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setGlobalDatePreset(opt.key);
                      setRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm transition-colors ${
                      globalDatePreset === opt.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Defaults */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetDefaults}
            leftIcon={<RotateCcw size={13} />}
            title="Reset all tabs to default"
          >
            Reset
          </Button>

          {/* Build Custom Widget Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingWidget(null);
              setIsBuilderOpen(true);
            }}
            leftIcon={<Plus size={15} />}
          >
            Build Custom Widget
          </Button>
        </div>
      </div>

      {/* Workspace Tabs Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 pt-1 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 pb-2.5 pt-2 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Layers size={14} className={isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"} />
                  <span className="truncate max-w-[160px]">{tab.name}</span>
                  <span
                    className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {tab.widgets.length}
                  </span>

                  {tabs.length > 1 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-0.5 text-sm leading-none text-gray-400 hover:text-red-500"
                      title="Delete Tab"
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}

            {/* Add Tab Button */}
            <button
              type="button"
              onClick={() => setIsAddTabOpen(true)}
              className="flex items-center gap-1 pb-2.5 pt-2 px-2.5 text-xs sm:text-sm font-medium text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors border-b-2 border-transparent -mb-px whitespace-nowrap"
            >
              <Plus size={14} />
              Add Tab
            </button>
          </div>

          {/* Active Tab Actions */}
          <div className="flex items-center gap-2 pb-2 sm:pb-1">
            <button
              type="button"
              onClick={handleDuplicateTab}
              className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Duplicate current tab"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Duplicate Tab</span>
            </button>
          </div>
        </div>

        {/* Active Tab Subtitle / Description */}
        {activeTab?.description && (
          <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-text-secondary dark:text-gray-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>{activeTab.description}</span>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div>
        {/* Empty State when Tab has no widgets */}
        {(!activeTab?.widgets || activeTab.widgets.length === 0) && (
          <div className="py-12 px-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 max-w-xl mx-auto shadow-sm my-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
              <Sliders size={22} />
            </div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white">This workspace tab is empty</h2>
            <p className="text-xs text-text-secondary dark:text-gray-400 max-w-md mx-auto mt-1 mb-5">
              Create your own customized query widget. Choose your target entity (Vendors, Clients, Countries, Failures), primary metric, threshold condition, and chart type.
            </p>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingWidget(null);
                setIsBuilderOpen(true);
              }}
              leftIcon={<Plus size={15} />}
            >
              Build Your First Custom Widget
            </Button>

            {/* Quick Starter Cards */}
            <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-700 text-left">
              <div className="text-[11px] font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2.5">
                Or quickly insert a recommended monitor:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveWidget({
                      id: `w-quick-${Date.now()}`,
                      title: "Degraded Vendors — DLR < 90%",
                      entity: "vendor",
                      primaryMetric: "dlr_percent",
                      visualization: "table",
                      size: "medium",
                      filters: { datePreset: "all" },
                      condition: { metric: "dlr_percent", operator: "lt", value: 90, mode: "filter" },
                      sortBy: "metric_asc",
                      limit: 15,
                    });
                  }}
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-left transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary dark:text-white">
                    <ShieldAlert size={14} className="text-amber-500" />
                    Degraded Vendors (DLR &lt; 90%)
                  </div>
                  <div className="text-[11px] text-text-secondary dark:text-gray-400 mt-1">
                    Filters only vendor trunks with deliverability below 90%.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveWidget({
                      id: `w-quick-${Date.now()}`,
                      title: "Client Margin Performance",
                      entity: "client",
                      primaryMetric: "profit_margin",
                      visualization: "table",
                      size: "medium",
                      filters: { datePreset: "all" },
                      sortBy: "metric_desc",
                      limit: 15,
                    });
                  }}
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-left transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary dark:text-white">
                    <DollarSign size={14} className="text-emerald-500" />
                    Client Profit Margins
                  </div>
                  <div className="text-[11px] text-text-secondary dark:text-gray-400 mt-1">
                    Ranks clients by profit margin and message revenue.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widgets Grid */}
        {activeTab?.widgets && activeTab.widgets.length > 0 && (
          <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
            {activeTab.widgets.map((widget) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(widget.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(widget.id)}
                className={`transition-all ${
                  widget.size === "small"
                    ? "col-span-12 md:col-span-6 lg:col-span-4"
                    : widget.size === "medium"
                    ? "col-span-12 lg:col-span-6"
                    : "col-span-12"
                }`}
              >
                <CustomWidgetCard
                  widget={widget}
                  globalDatePreset={globalDatePreset}
                  isDark={isDark}
                  onEdit={(w) => {
                    setEditingWidget(w);
                    setIsBuilderOpen(true);
                  }}
                  onRemove={handleRemoveWidget}
                  onResize={handleResizeWidget}
                  isDragging={draggedWidgetId === widget.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomWidgetBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleSaveWidget}
        editingWidget={editingWidget}
        clientsList={clientsList}
        vendorsList={vendorsList}
        countriesList={countriesList}
      />

      <AddTabModal
        isOpen={isAddTabOpen}
        onClose={() => setIsAddTabOpen(false)}
        onCreateTab={handleAddTab}
      />
    </div>
  );
};

export default CustomDashboard;
