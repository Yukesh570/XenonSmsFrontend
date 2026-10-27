import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  PhoneCall,
  AlertTriangle,
  CheckCircle,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import {
  getMessageFilterRulesApi,
  createMessageFilterRuleApi,
  updateMessageFilterRuleApi,
  deleteMessageFilterRuleApi,
  validateMessageFilterRuleApi,
  type MessageFilterRule,
  type DestinationAction,
} from "../../../api/authorizationApi/messageFilterApi";

interface DestinationRulesTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

const TABLE_HEADERS = [
  "Priority",
  "Rule Name",
  "Country Scope",
  "Match Criteria",
  "Action & Target",
  "Country Warning",
  "Status",
  "Actions",
];

export const DestinationRulesTab: React.FC<DestinationRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [rules, setRules] = useState<MessageFilterRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingRule, setDeletingRule] = useState<MessageFilterRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    priority: number;
    country: number | null;
    destinationMatchType: "EXACT" | "PREFIX" | "REGEX";
    destinationPattern: string;
    action: DestinationAction;
    prefixValue: string;
    replacement: string;
    normalizationMode: string;
    stopProcessing: boolean;
    isActive: boolean;
  }>({
    name: "",
    priority: 100,
    country: null,
    destinationMatchType: "PREFIX",
    destinationPattern: "",
    action: "PREFIX_ADD",
    prefixValue: "",
    replacement: "",
    normalizationMode: "E164",
    stopProcessing: false,
    isActive: true,
  });

  // Real-time Regex Validation
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load Rules
  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await getMessageFilterRulesApi({
        client: selectedClientId || undefined,
        targetEntity: "DESTINATION",
      });
      const data = Array.isArray(res) ? res : (res as any)?.results || [];
      setRules(
        data.sort(
          (a: MessageFilterRule, b: MessageFilterRule) => a.priority - b.priority
        )
      );
    } catch (err: any) {
      console.error("Failed to load destination rules", err);
      toast.error(err.response?.data?.detail || "Failed to load destination rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [selectedClientId]);

  // Debounced Regex Validation
  useEffect(() => {
    if (
      formData.destinationMatchType !== "REGEX" ||
      !formData.destinationPattern
    ) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "DESTINATION",
          destinationMatchType: "REGEX",
          destinationPattern: formData.destinationPattern,
          action: formData.action,
          replacement: formData.replacement,
        });

        setValidationResult({
          isValid: res.valid,
          error: res.error || undefined,
        });
      } catch (e: any) {
        setValidationResult({
          isValid: false,
          error: e.response?.data?.error || "Regex validation failed",
        });
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    formData.destinationPattern,
    formData.destinationMatchType,
    formData.action,
    formData.replacement,
  ]);

  const handleOpenAdd = () => {
    setEditingRuleId(null);
    setFormData({
      name: "",
      priority:
        rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 10 : 100,
      country: null,
      destinationMatchType: "PREFIX",
      destinationPattern: "",
      action: "PREFIX_ADD",
      prefixValue: "",
      replacement: "",
      normalizationMode: "E164",
      stopProcessing: false,
      isActive: true,
    });
    setValidationResult(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: MessageFilterRule) => {
    setEditingRuleId(rule.id || null);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      country: rule.country,
      destinationMatchType:
        (rule.destinationMatchType as "EXACT" | "PREFIX" | "REGEX") || "PREFIX",
      destinationPattern: rule.destinationPattern || "",
      action: (rule.action as DestinationAction) || "PREFIX_ADD",
      prefixValue: rule.prefixValue || "",
      replacement: rule.replacement || "",
      normalizationMode: rule.normalizationMode || "E164",
      stopProcessing: rule.stopProcessing,
      isActive: rule.isActive,
    });
    setValidationResult(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (
      formData.action !== "NORMALIZE" &&
      !formData.destinationPattern.trim()
    ) {
      toast.error("Destination pattern is required");
      return;
    }
    if (validationResult && !validationResult.isValid) {
      toast.error(`Rule validation failed: ${validationResult.error}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<MessageFilterRule> = {
        client: selectedClientId || 0,
        targetEntity: "DESTINATION",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        destinationMatchType: formData.destinationMatchType,
        destinationPattern: formData.destinationPattern.trim() || null,
        action: formData.action,
        prefixValue:
          ["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action)
            ? formData.prefixValue.trim()
            : null,
        replacement:
          ["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action)
            ? formData.replacement.trim()
            : null,
        normalizationMode:
          formData.action === "NORMALIZE" ? formData.normalizationMode : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRuleId) {
        await updateMessageFilterRuleApi(editingRuleId, payload);
        toast.success("Destination rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Destination rule created successfully");
      }
      setShowModal(false);
      loadRules();
    } catch (err: any) {
      const detail =
        err.response?.data?.destinationPattern?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save destination rule";
      toast.error(String(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule?.id) return;
    setIsDeleting(true);
    try {
      await deleteMessageFilterRuleApi(deletingRule.id);
      toast.success("Destination rule deleted");
      setDeletingRule(null);
      loadRules();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (rule: MessageFilterRule) => {
    if (!rule.id) return;
    try {
      await updateMessageFilterRuleApi(rule.id, {
        isActive: !rule.isActive,
        status: !rule.isActive ? "ACTIVE" : "INACTIVE",
      });
      toast.success(
        `Rule "${rule.name}" ${!rule.isActive ? "activated" : "deactivated"}`
      );
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? { ...r, isActive: !r.isActive, status: !r.isActive ? "ACTIVE" : "INACTIVE" }
            : r
        )
      );
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // Filter Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.destinationPattern &&
          r.destinationPattern.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.replacement &&
          r.replacement.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.prefixValue &&
          r.prefixValue.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && r.isActive) ||
        (statusFilter === "INACTIVE" && !r.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [rules, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Client Selector */}
          <div className="w-64">
            <Select
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
              options={[
                { value: "", label: "All Clients (Global & Direct)" },
                ...clients.map((c) => ({
                  value: String(c.id),
                  label: c.name ? (c.companyName ? `${c.name} (${c.companyName})` : c.name) : (c.companyName || `Client #${c.id}`),
                })),
              ]}
              placeholder="Filter by Client"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by rule name, pattern, or replacement..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || "ALL")}
              options={[
                { value: "ALL", label: "All Status" },
                { value: "ACTIVE", label: "Active Only" },
                { value: "INACTIVE", label: "Inactive Only" },
              ]}
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={16} />
          <span>Add Destination Rule</span>
        </Button>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <LoadingSpinner />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-text-secondary dark:text-gray-400">
            <PhoneCall size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
            <p className="text-base font-semibold">No destination rules found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Destination rules allow prefix normalization, country stripping, and regex number translation for inbound SMS.
            </p>
            <Button
              variant="secondary"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Create First Destination Rule
            </Button>
          </div>
        ) : (
          <DataTable
            headers={TABLE_HEADERS}
            data={filteredRules}
            renderRow={(rule) => {
              const country = countries.find(
                (c) =>
                  c.id === rule.country || c.value === String(rule.country)
              );
              const isPotentialCountryCross =
                rule.action === "PREFIX_ADD" ||
                rule.action === "FIXED_REPLACE" ||
                rule.action === "REGEX_REPLACE";

              return (
                <tr
                  key={rule.id}
                  className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-primary dark:text-gray-200 font-semibold">
                    #{rule.priority}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-text-primary dark:text-white">
                      {rule.name}
                    </div>
                    {rule.client_name && (
                      <span className="text-[11px] text-text-secondary dark:text-gray-400">
                        Client: {rule.client_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {country ? (
                      <div className="flex items-center gap-2">
                        <CountryFlag iso2={country.iso2} width={18} height={12} />
                        <span className="text-xs text-text-primary dark:text-gray-200 font-medium">
                          {country.name}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        Global (All Countries)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {rule.destinationMatchType || "ANY"}
                      </span>
                      {rule.destinationPattern && (
                        <code
                          className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-text-primary dark:text-gray-200 max-w-[140px] truncate block"
                          title={rule.destinationPattern}
                        >
                          {rule.destinationPattern}
                        </code>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {rule.action}
                      </span>
                      {rule.prefixValue && (
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                          Prefix: <strong>{rule.prefixValue}</strong>
                        </div>
                      )}
                      {rule.replacement && (
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                          Replace: <strong>{rule.replacement}</strong>
                        </div>
                      )}
                      {rule.action === "NORMALIZE" && (
                        <div className="text-xs text-text-secondary dark:text-gray-400">
                          Mode: {rule.normalizationMode || "E.164"}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isPotentialCountryCross ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                        title="Action alters phone digits; subject to cross-country policy validation."
                      >
                        <AlertTriangle size={11} />
                        Monitored
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Safe</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={rule.isActive}
                      onChange={() => handleToggleStatus(rule)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rule)}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                        title="Edit Rule"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRule(rule)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>

      {/* Add / Edit Destination Rule Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-xl"
        title={
          editingRuleId ? "Update Destination Rule" : "Add Destination Rule"
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. UK Domestic 0-Prefix Normalization"
              required
            />

            <Input
              label="Priority (Evaluation Order)"
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: Number(e.target.value) })
              }
              min={1}
              max={99999}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country Scope"
              value={formData.country ? String(formData.country) : ""}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  country: val ? Number(val) : null,
                })
              }
              options={[
                { value: "", label: "Global (All Countries)" },
                ...countries.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  icon: <CountryFlag iso2={c.iso2} width={16} height={12} />,
                })),
              ]}
              placeholder="Select Country Scope"
            />

            <Select
              label="Match Type"
              value={formData.destinationMatchType}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  destinationMatchType: val as "EXACT" | "PREFIX" | "REGEX",
                })
              }
              options={[
                { value: "PREFIX", label: "Prefix Match (e.g. ^07 or 0)" },
                { value: "EXACT", label: "Exact Match" },
                { value: "REGEX", label: "Regex Pattern" },
              ]}
            />
          </div>

          {/* Pattern Input */}
          <div>
            <Input
              label={
                formData.destinationMatchType === "REGEX"
                  ? "Destination Regex Pattern"
                  : "Destination Match Number / Prefix"
              }
              value={formData.destinationPattern}
              onChange={(e) =>
                setFormData({ ...formData, destinationPattern: e.target.value })
              }
              placeholder={
                formData.destinationMatchType === "REGEX"
                  ? "^0([7-9]\\d{9})$"
                  : "0"
              }
              required={formData.action !== "NORMALIZE"}
            />
          </div>

          {/* Action Select & Dynamic Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Translation Action"
              value={formData.action}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  action: val as DestinationAction,
                })
              }
              options={[
                { value: "PREFIX_ADD", label: "Prefix Add (e.g. +44)" },
                { value: "PREFIX_REMOVE", label: "Prefix Remove (e.g. 0)" },
                { value: "FIXED_REPLACE", label: "Fixed Replace" },
                { value: "REGEX_REPLACE", label: "Regex Replace (Groups $1)" },
                { value: "NORMALIZE", label: "E.164 Normalization Only" },
              ]}
            />

            {["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action) && (
              <Input
                label="Prefix Digits"
                value={formData.prefixValue}
                onChange={(e) =>
                  setFormData({ ...formData, prefixValue: e.target.value })
                }
                placeholder={formData.action === "PREFIX_ADD" ? "44" : "0"}
                required
              />
            )}

            {["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action) && (
              <Input
                label="Replacement Value"
                value={formData.replacement}
                onChange={(e) =>
                  setFormData({ ...formData, replacement: e.target.value })
                }
                placeholder={
                  formData.action === "REGEX_REPLACE" ? "44$1" : "447700900000"
                }
                required
              />
            )}
          </div>

          {/* Validation Feedback */}
          {isValidating && (
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              <span>Validating regex safety...</span>
            </div>
          )}

          {validationResult && !validationResult.isValid && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Validation Error / ReDoS Warning:</strong>
                <span>{validationResult.error}</span>
              </div>
            </div>
          )}

          {validationResult && validationResult.isValid && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle size={15} />
              <span>Safe and valid regex pattern.</span>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={formData.stopProcessing}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stopProcessing: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5"
              />
              <div className="flex flex-col">
                <span className="font-medium">Stop processing further rules</span>
                <span className="text-xs text-text-secondary dark:text-gray-400">
                  Skip lower-priority rules if this rule matches.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span>Active</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                (validationResult !== null && !validationResult.isValid)
              }
            >
              {editingRuleId ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingRule && (
        <DeleteModal
          isOpen={true}
          onClose={() => setDeletingRule(null)}
          onConfirm={handleDelete}
          title="Delete Destination Rule"
          message={`Are you sure you want to permanently delete rule "${deletingRule.name}"? Active message flows matching this pattern will no longer be modified.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
