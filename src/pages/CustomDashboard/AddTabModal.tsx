import React, { useState } from "react";
import { Layers, Plus, ShieldAlert, DollarSign, Activity } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import type { WorkspaceTab, CustomWidgetDefinition } from "./customWidgetTypes";

interface AddTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTab: (newTab: WorkspaceTab) => void;
}

const TEMPLATES = [
  {
    id: "blank",
    title: "Blank Canvas (Recommended)",
    subtitle: "Start completely clean and build custom widgets tailored to your exact needs.",
    icon: Plus,
    badge: "Clean Slate",
    widgets: [] as CustomWidgetDefinition[],
  },
  {
    id: "vendor_watch",
    title: "Vendor DLR < 90% Watchlist",
    subtitle: "Pre-configured with rule filters tracking low-performing vendor trunks.",
    icon: ShieldAlert,
    badge: "Quality Rule",
    widgets: [
      {
        id: "w-vendor-below-90",
        title: "Degraded Vendors — DLR < 90%",
        entity: "vendor" as const,
        primaryMetric: "dlr_percent" as const,
        visualization: "table" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        condition: {
          metric: "dlr_percent" as const,
          operator: "lt" as const,
          value: 90,
          mode: "filter" as const,
        },
        sortBy: "metric_asc" as const,
        limit: 15,
      },
      {
        id: "w-vendor-dlr-bar",
        title: "Vendor Delivery Rate Ranking",
        entity: "vendor" as const,
        primaryMetric: "dlr_percent" as const,
        visualization: "bar" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        sortBy: "metric_asc" as const,
        limit: 10,
      },
    ],
  },
  {
    id: "client_margin",
    title: "Client Profitability & Margin",
    subtitle: "Pre-configured with client margins, revenue tracking, and loss-route detection.",
    icon: DollarSign,
    badge: "Commercial",
    widgets: [
      {
        id: "w-client-margin-table",
        title: "Client Margin Performance",
        entity: "client" as const,
        primaryMetric: "profit_margin" as const,
        visualization: "table" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        sortBy: "metric_desc" as const,
        limit: 15,
      },
      {
        id: "w-client-volume-bar",
        title: "Top Clients by Message Volume",
        entity: "client" as const,
        primaryMetric: "attempts" as const,
        visualization: "bar" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        sortBy: "attempts_desc" as const,
        limit: 10,
      },
    ],
  },
  {
    id: "failures",
    title: "Failures & Troubleshooting",
    subtitle: "Pre-configured with SMS error codes and country failure spike detection.",
    icon: Activity,
    badge: "Diagnostics",
    widgets: [
      {
        id: "w-failures-donut",
        title: "Failure Reasons Breakdown",
        entity: "failure_reason" as const,
        primaryMetric: "failed" as const,
        visualization: "donut" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        limit: 10,
      },
      {
        id: "w-failures-table",
        title: "Failure Code Details & Counts",
        entity: "failure_reason" as const,
        primaryMetric: "failed" as const,
        visualization: "table" as const,
        size: "medium" as const,
        filters: { datePreset: "all" as const },
        limit: 15,
      },
    ],
  },
];

export const AddTabModal: React.FC<AddTabModalProps> = ({ isOpen, onClose, onCreateTab }) => {
  const [tabName, setTabName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tabName.trim() || "New Workspace Tab";
    const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

    const newTab: WorkspaceTab = {
      id: `tab-${Date.now()}`,
      name,
      description: template.subtitle,
      widgets: template.widgets.map((w) => ({
        ...w,
        id: `${w.id}-${Date.now().toString().slice(-4)}`,
      })),
    };

    onCreateTab(newTab);
    setTabName("");
    setSelectedTemplate("blank");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Layers className="text-primary shrink-0" size={20} />
          <span>Create Workspace Tab</span>
        </div>
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleCreate} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Tab Name
          </label>
          <input
            type="text"
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            placeholder="e.g. Degraded Vendors, High Volume Clients..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Starting Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Icon size={18} className={isSelected ? "text-primary" : "text-gray-400"} />
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {tmpl.badge}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tmpl.title}</div>
                    <div className="text-xs text-text-secondary dark:text-gray-400 mt-1 line-clamp-2">{tmpl.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Create Tab
          </Button>
        </div>
      </form>
    </Modal>
  );
};
