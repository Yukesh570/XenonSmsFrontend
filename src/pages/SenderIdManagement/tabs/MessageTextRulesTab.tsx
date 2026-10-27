import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  FileText,
  AlertTriangle,
  CheckCircle,
  Search,
  Sparkles,
  Shuffle,
  Layers,
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
  getMessageTextReplacementListsApi,
  type MessageFilterRule,
  type TextAction,
  type MessageTextReplacementList,
} from "../../../api/authorizationApi/messageFilterApi";

interface MessageTextRulesTabProps {
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
  "Action & Replacement",
  "Macros / List",
  "Stop",
  "Status",
  "Actions",
];

export const MessageTextRulesTab: React.FC<MessageTextRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [rules, setRules] = useState<MessageFilterRule[]>([]);
  const [replacementLists, setReplacementLists] = useState<MessageTextReplacementList[]>([]);
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
    textMatchType: "EXACT" | "CONTAINS" | "REGEX";
    textPattern: string;
    action: TextAction;
    replacement: string;
    replacementList: number | null;
    stopProcessing: boolean;
    isActive: boolean;
  }>({
    name: "",
    priority: 100,
    country: null,
    textMatchType: "CONTAINS",
    textPattern: "",
    action: "STRING_REPLACE",
    replacement: "",
    replacementList: null,
    stopProcessing: false,
    isActive: true,
  });

  // Real-time Regex & Macro Validation
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load Rules & Replacement Lists
  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, listsRes] = await Promise.all([
        getMessageFilterRulesApi({
          client: selectedClientId || undefined,
          targetEntity: "MESSAGE_TEXT",
        }),
        getMessageTextReplacementListsApi(selectedClientId || undefined),
      ]);

      const ruleList = Array.isArray(rulesRes)
        ? rulesRes
        : (rulesRes as any)?.results || [];
      setRules(
        ruleList.sort(
          (a: MessageFilterRule, b: MessageFilterRule) => a.priority - b.priority
        )
      );

      const listArray = Array.isArray(listsRes)
        ? listsRes
        : (listsRes as any)?.results || [];
      setReplacementLists(listArray);
    } catch (err: any) {
      console.error("Failed to load text rules or lists", err);
      toast.error(err.response?.data?.detail || "Failed to load message text rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  // Debounced Regex Validation
  useEffect(() => {
    if (
      formData.textMatchType !== "REGEX" ||
      !formData.textPattern
    ) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "MESSAGE_TEXT",
          textMatchType: "REGEX",
          textPattern: formData.textPattern,
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
  }, [formData.textPattern, formData.textMatchType, formData.action, formData.replacement]);

  // Insert macro helper pill into replacement string
  const handleInsertMacro = (macroToken: string) => {
    setFormData((prev) => ({
      ...prev,
      replacement: (prev.replacement || "") + macroToken,
    }));
  };

  const handleOpenAdd = () => {
    setEditingRuleId(null);
    setFormData({
      name: "",
      priority: rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 10 : 100,
      country: null,
      textMatchType: "CONTAINS",
      textPattern: "",
      action: "STRING_REPLACE",
      replacement: "",
      replacementList: replacementLists[0]?.id || null,
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
      textMatchType: (rule.textMatchType as "EXACT" | "CONTAINS" | "REGEX") || "CONTAINS",
      textPattern: rule.textPattern || "",
      action: (rule.action as TextAction) || "STRING_REPLACE",
      replacement: rule.replacement || "",
      replacementList: rule.replacementList || null,
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
    if (!formData.textPattern.trim()) {
      toast.error("Match pattern is required");
      return;
    }
    if (
      ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) &&
      !formData.replacementList
    ) {
      toast.error("Please select a text replacement list");
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
        targetEntity: "MESSAGE_TEXT",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        textMatchType: formData.textMatchType,
        textPattern: formData.textPattern.trim(),
        action: formData.action,
        replacement: ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)
          ? null
          : formData.replacement,
        replacementList: ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)
          ? formData.replacementList
          : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRuleId) {
        await updateMessageFilterRuleApi(editingRuleId, payload);
        toast.success("Message text rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Message text rule created successfully");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      const detail =
        err.response?.data?.textPattern?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save message text rule";
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
      toast.success("Message text rule deleted");
      setDeletingRule(null);
      loadData();
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
      toast.success(`Rule "${rule.name}" ${!rule.isActive ? "activated" : "deactivated"}`);
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? { ...r, isActive: !rule.isActive, status: !rule.isActive ? "ACTIVE" : "INACTIVE" }
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
        (r.textPattern && r.textPattern.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.replacement && r.replacement.toLowerCase().includes(searchTerm.toLowerCase()));
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
          <span>Add Text Rule</span>
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
            <FileText size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
            <p className="text-base font-semibold">No message text rules found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Message text rules allow deep content inspection, regex replacement, brand appending, and dynamic random token macros (${"{RANDINT}"}, ${"{RANDHEX}"}).
            </p>
            <Button
              variant="secondary"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Create First Text Rule
            </Button>
          </div>
        ) : (
          <DataTable
            headers={TABLE_HEADERS}
            data={filteredRules}
            renderRow={(rule) => {
              const country = countries.find(
                (c) => c.id === rule.country || c.value === String(rule.country)
              );
              const hasMacros =
                rule.replacement && /\$\{RAND[A-Z0-9_:]+\}/.test(rule.replacement);

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
                        {rule.textMatchType || "CONTAINS"}
                      </span>
                      {rule.textPattern && (
                        <code
                          className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-text-primary dark:text-gray-200 max-w-[150px] truncate block"
                          title={rule.textPattern}
                        >
                          {rule.textPattern}
                        </code>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {rule.action || "STRING_REPLACE"}
                      </span>
                      {rule.replacement && (
                        <div
                          className="text-xs font-mono text-gray-600 dark:text-gray-300 max-w-[200px] truncate"
                          title={rule.replacement}
                        >
                          &quot;{rule.replacement}&quot;
                        </div>
                      )}
                      {rule.replacementList_name && (
                        <div className="text-xs text-primary font-medium flex items-center gap-1">
                          <Layers size={12} />
                          <span>{rule.replacementList_name}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {hasMacros ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        <Sparkles size={11} />
                        Random Macro
                      </span>
                    ) : rule.replacementList ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                        <Shuffle size={11} />
                        List Item
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Static</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rule.stopProcessing ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Stop
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-mono">Chain</span>
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

      {/* Add / Edit Message Text Rule Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-2xl"
        title={editingRuleId ? "Update Message Text Rule" : "Add Message Text Rule"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Brand Name Masking / Dynamic OTP Token"
              required
            />

            <Input
              label="Priority (Evaluation Order)"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              min={1}
              max={99999}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country Scope"
              value={formData.country ? String(formData.country) : ""}
              onChange={(val) => setFormData({ ...formData, country: val ? Number(val) : null })}
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
              value={formData.textMatchType}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  textMatchType: val as "EXACT" | "CONTAINS" | "REGEX",
                })
              }
              options={[
                { value: "CONTAINS", label: "Contains (Sub-string)" },
                { value: "EXACT", label: "Exact Match" },
                { value: "REGEX", label: "Regex Pattern" },
              ]}
            />
          </div>

          {/* Pattern Input with validation */}
          <div>
            <Input
              label={formData.textMatchType === "REGEX" ? "Search Pattern (Regex)" : "Search Text"}
              value={formData.textPattern}
              onChange={(e) => setFormData({ ...formData, textPattern: e.target.value })}
              placeholder={
                formData.textMatchType === "REGEX"
                  ? "(?:code|otp):?\\s*(\\d{4,6})"
                  : "AcmeBank"
              }
              required
            />
          </div>

          {/* Action & Replacement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Action"
              value={formData.action}
              onChange={(val) => setFormData({ ...formData, action: val as TextAction })}
              options={[
                { value: "STRING_REPLACE", label: "String Replace (First Match)" },
                { value: "REPLACE_ALL", label: "Replace All Matches" },
                { value: "REGEX_REPLACE", label: "Regex Replace (Supports $1, $2)" },
                { value: "APPEND", label: "Append to End" },
                { value: "PREPEND", label: "Prepend to Beginning" },
                { value: "LIST_SEQUENTIAL", label: "Replacement List (Sequential)" },
                { value: "LIST_RANDOM", label: "Replacement List (Random)" },
              ]}
            />

            {["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) ? (
              <Select
                label="Text Replacement List"
                value={formData.replacementList ? String(formData.replacementList) : ""}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    replacementList: val ? Number(val) : null,
                  })
                }
                options={replacementLists.map((l) => ({
                  value: String(l.id),
                  label: `${l.name} (${l.selectionMode || "RANDOM"})`,
                }))}
                placeholder="Select Replacement List"
              />
            ) : (
              <div>
                <Input
                  label="Replacement Text"
                  value={formData.replacement}
                  onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                  placeholder="e.g. SecretBrand or [REF: ${RANDINT:1000:9999}]"
                />
              </div>
            )}
          </div>

          {/* Macro Quick-Insert Helper Pills */}
          {!["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) && (
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-900/50 dark:to-gray-800/50 p-3 rounded-lg border border-blue-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                <Sparkles size={14} className="text-primary" />
                <span>Controlled Random Macro Quick-Insert:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertMacro("${RANDINT:1000:9999}")}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-md hover:border-primary hover:text-primary transition-all font-mono font-medium text-text-primary dark:text-white"
                  title="Generates a random 4-digit number"
                >
                  + {"${RANDINT:1000:9999}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMacro("${RANDHEX:8}")}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-md hover:border-primary hover:text-primary transition-all font-mono font-medium text-text-primary dark:text-white"
                  title="Generates an 8-character hex string"
                >
                  + {"${RANDHEX:8}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMacro("${RANDTEXT:6}")}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-md hover:border-primary hover:text-primary transition-all font-mono font-medium text-text-primary dark:text-white"
                  title="Generates a 6-character alphanumeric string"
                >
                  + {"${RANDTEXT:6}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMacro("${RANDLETTERS:6}")}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-md hover:border-primary hover:text-primary transition-all font-mono font-medium text-text-primary dark:text-white"
                  title="Generates 6 uppercase random letters"
                >
                  + {"${RANDLETTERS:6}"}
                </button>
              </div>
            </div>
          )}

          {/* Validation Feedback & Warnings */}
          {isValidating && (
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              <span>Checking regex safety and macro expansion limits...</span>
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
                onChange={(e) => setFormData({ ...formData, stopProcessing: e.target.checked })}
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
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
              disabled={isSubmitting || (validationResult !== null && !validationResult.isValid)}
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
          title="Delete Message Text Rule"
          message={`Are you sure you want to permanently delete rule "${deletingRule.name}"? Active message flows matching this pattern will no longer be modified.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
