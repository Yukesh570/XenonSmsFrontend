import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Sliders,
  Calendar,
  RotateCcw,
  Copy,
  ShieldAlert,
  DollarSign,
} from "lucide-react";
import type { WorkspaceTab, CustomWidgetDefinition } from "./customWidgetTypes";
import { DEFAULT_WORKSPACE_TABS } from "./customWidgetTypes";
import { CustomWidgetCard } from "./CustomWidgetCard";
import { CustomWidgetBuilderModal } from "./CustomWidgetBuilderModal";
import { AddTabModal } from "./AddTabModal";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getVendorsApi } from "../../api/connectivityApi/vendorApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

const STORAGE_KEY = "xenon_custom_data_workspace_v5";

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
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-900 text-text-primary dark:text-white flex flex-col transition-colors">
      {/* Top Header & Workspaces */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Sliders size={18} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Custom Data Workspace</h1>
            </div>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              Build custom rule-based widgets with your own entity grouping, metric thresholds, and visualizations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Global Date Preset */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-text-secondary dark:text-gray-300 shadow-sm">
              <Calendar size={13} className="text-gray-400" />
              <span>Timeframe:</span>
              <select
                value={globalDatePreset}
                onChange={(e) => setGlobalDatePreset(e.target.value as any)}
                className="bg-transparent text-gray-800 dark:text-gray-100 font-medium focus:outline-none cursor-pointer"
              >
                <option value="today" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">Today</option>
                <option value="yesterday" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">Yesterday</option>
                <option value="7d" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">Last 7 Days</option>
                <option value="30d" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">Last 30 Days</option>
                <option value="all" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">All Available</option>
              </select>
            </div>

            {/* Reset Defaults */}
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reset all tabs to default"
            >
              <RotateCcw size={12} />
              Reset
            </button>

            {/* Build Custom Widget Button (Primary Action) */}
            <button
              onClick={() => {
                setEditingWidget(null);
                setIsBuilderOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.98]"
            >
              <Plus size={15} />
              Build Custom Widget
            </button>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 pt-1">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/40 shadow-sm"
                      : "bg-transparent text-text-secondary dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-text-primary dark:hover:text-white"
                  }`}
                >
                  <Layers size={13} className={isActive ? "text-primary dark:text-blue-400" : "text-gray-400 dark:text-gray-500"} />
                  <span className="truncate max-w-[150px]">{tab.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? "bg-primary/20 text-primary dark:bg-blue-500/30 dark:text-blue-200"
                        : "bg-gray-200/60 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {tab.widgets.length}
                  </span>

                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-1"
                      title="Delete Tab"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Tab Button */}
            <button
              onClick={() => setIsAddTabOpen(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-dashed border-gray-300 dark:border-gray-700"
            >
              <Plus size={13} />
              Add Tab
            </button>
          </div>

          {/* Active Tab Actions */}
          <div className="hidden sm:flex items-center gap-2 py-1">
            <button
              onClick={handleDuplicateTab}
              className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
              title="Duplicate current tab"
            >
              <Copy size={12} />
              Duplicate Tab
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Tab Subtitle */}
        {activeTab?.description && (
          <div className="mb-5 text-xs text-text-secondary dark:text-gray-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>{activeTab.description}</span>
          </div>
        )}

        {/* Empty State when Tab has no widgets */}
        {(!activeTab?.widgets || activeTab.widgets.length === 0) && (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-white/60 dark:bg-gray-800/20 max-w-2xl mx-auto px-6 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary shadow-sm">
              <Sliders size={26} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">This workspace tab is empty</h2>
            <p className="text-xs text-text-secondary dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">
              Create your own customized query widget. Choose your target entity (Vendors, Clients, Countries, Failures), primary metric, threshold condition, and chart type.
            </p>

            <button
              onClick={() => {
                setEditingWidget(null);
                setIsBuilderOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all shadow-md inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Build Your First Custom Widget
            </button>

            {/* Quick Starter Cards */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700/80 text-left">
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Or quickly insert a recommended monitor:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
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
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 rounded-xl text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    <ShieldAlert size={14} className="text-amber-500" />
                    Degraded Vendors (DLR &lt; 90%)
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Filters only vendor trunks with deliverability below 90%.
                  </div>
                </button>

                <button
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
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 rounded-xl text-left transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    <DollarSign size={14} className="text-emerald-500" />
                    Client Profit Margins
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Ranks clients by profit margin and message revenue.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widgets Grid */}
        {activeTab?.widgets && activeTab.widgets.length > 0 && (
          <div className="grid grid-cols-12 gap-5">
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
