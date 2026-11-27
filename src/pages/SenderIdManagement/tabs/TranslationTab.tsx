import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash,
  Settings,
  List,
  TestTube,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DataTable from "../../../components/ui/DataTable";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ContextMenu from "../../../components/ui/ContextMenu";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import type {
  SenderIdTranslationPolicy,
  SenderIdTranslationRule,
  TestTranslationResponse,
} from "../../../api/authorizationApi/senderIdTranslationApi";
import {
  getSenderTranslationPolicyApi,
  updateSenderTranslationPolicyApi,
  getSenderTranslationRulesApi,
  createSenderTranslationRuleApi,
  updateSenderTranslationRuleApi,
  deleteSenderTranslationRuleApi,
  testSenderTranslationApi,
} from "../../../api/authorizationApi/senderIdTranslationApi";
import { getReplacementListsApi, type ReplacementList } from "../../../api/authorizationApi/replacementListApi";
import { getSenderPoolsApi, type SenderPool } from "../../../api/authorizationApi/senderPoolApi";

interface TranslationTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

interface RuleColumnDef {
  key: string;
  label: string;
}

const DEFAULT_RULE_COLUMNS: RuleColumnDef[] = [
  { key: "sn", label: "S.N." },
  { key: "id", label: "ID" },
  { key: "country", label: "Country" },
  { key: "sourceSenderId", label: "Original" },
  { key: "action", label: "Action" },
  { key: "outputParam", label: "Output Param" },
];

export const TranslationTab: React.FC<TranslationTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [activeTab, setActiveTab] = useState<"policy" | "rules" | "test">("policy");
  const [policy, setPolicy] = useState<SenderIdTranslationPolicy | null>(null);
  const [rules, setRules] = useState<SenderIdTranslationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<ReplacementList[]>([]);
  const [pools, setPools] = useState<SenderPool[]>([]);

  // Rule form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<SenderIdTranslationRule>>({
    action: "FIXED_REPLACE",
    matchType: "EXACT",
    stopProcessing: true,
    isActive: true,
  });

  const [ruleColumns, setRuleColumns] = useState<RuleColumnDef[]>(DEFAULT_RULE_COLUMNS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const handleSort = (columnIndex: number) => {
    const col = ruleColumns[columnIndex];
    if (!col || col.key === "sn") return;
    setSortConfig((prev) => {
      if (prev?.key === col.key) {
        if (prev.direction === "asc") return { key: col.key, direction: "desc" };
        return null;
      }
      return { key: col.key, direction: "asc" };
    });
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    setRuleColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedRules = useMemo(() => {
    if (!sortConfig) return rules;
    return [...rules].sort((a, b) => {
      let aVal = (a as any)[sortConfig.key];
      let bVal = (b as any)[sortConfig.key];
      if (sortConfig.key === "country") {
        aVal = countries.find((c) => c.id === a.country)?.name || a.country || "";
        bVal = countries.find((c) => c.id === b.country)?.name || b.country || "";
      }
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [rules, sortConfig, countries]);

  // Context Menu & Delete Modal State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowRule, setSelectedRowRule] = useState<SenderIdTranslationRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  // Test form
  const [testSource, setTestSource] = useState("");
  const [testDest, setTestDest] = useState("");
  const [testResult, setTestResult] = useState<TestTranslationResponse | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Load auxiliary lists & pools once
  useEffect(() => {
    loadAuxiliaryData();
  }, []);

  const loadAuxiliaryData = async () => {
    try {
      const [lRes, pRes] = await Promise.all([
        getReplacementListsApi().catch(() => []),
        getSenderPoolsApi().catch(() => []),
      ]);
      setLists(Array.isArray(lRes) ? lRes : []);
      setPools(Array.isArray(pRes) ? pRes : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      loadData(selectedClientId);
    } else {
      setPolicy(null);
      setRules([]);
      setTestResult(null);
    }
  }, [selectedClientId]);

  const normalizePolicy = (data: any): SenderIdTranslationPolicy | null => {
    let item: any = null;
    if (Array.isArray(data)) item = data.length > 0 ? data[0] : null;
    else if (data && typeof data === "object") {
      if (Array.isArray(data.results)) item = data.results.length > 0 ? data.results[0] : null;
      else if (data.id || data.is_active !== undefined || data.isActive !== undefined) item = data;
    }
    if (!item) return null;
    const active =
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : item.is_active !== undefined
        ? Boolean(item.is_active)
        : false;
    return {
      ...item,
      id: item.id,
      client: item.client,
      isActive: active,
      is_active: active,
    };
  };

  const isPolicyActive = Boolean(
    policy && (policy.isActive !== undefined ? policy.isActive : (policy as any).is_active)
  );

  const loadData = async (clientId: number) => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        getSenderTranslationPolicyApi(clientId).catch(() => null),
        getSenderTranslationRulesApi(clientId).catch(() => []),
      ]);
      setPolicy(normalizePolicy(p));
      setRules(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load translation settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePolicy = async () => {
    if (!selectedClientId) return;
    const newStatus = !isPolicyActive;
    try {
      const res = await updateSenderTranslationPolicyApi(selectedClientId, newStatus);
      const normalized = normalizePolicy(res);
      setPolicy(
        normalized
          ? { ...normalized, isActive: newStatus, is_active: newStatus }
          : ({ ...(policy || {}), id: policy?.id, client: selectedClientId, isActive: newStatus, is_active: newStatus } as any)
      );
      if (newStatus) {
        toast.success("Translation policy enabled");
      } else {
        toast.error("Translation policy disabled");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update policy status");
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    if (!newRule.action) {
      toast.error("Action is required");
      return;
    }

    if (newRule.matchType === "REGEX" && !newRule.senderPattern) {
      toast.error("Sender pattern regex is required");
      return;
    } else if (newRule.matchType !== "REGEX" && !newRule.sourceSenderId) {
      toast.error("Source sender ID is required");
      return;
    }

    if (newRule.action === "FIXED_REPLACE" && !newRule.replacementSenderId) {
      toast.error("Replacement sender ID is required");
      return;
    }
    if (newRule.action === "TRUNCATE" && !newRule.truncateLength) {
      toast.error("Truncate length is required");
      return;
    }
    if (["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(newRule.action) && !newRule.replacementList) {
      toast.error("Please select a Replacement List");
      return;
    }
    if (["POOL_SEQUENTIAL", "POOL_RANDOM"].includes(newRule.action) && !newRule.senderPool) {
      toast.error("Please select a Sender Pool");
      return;
    }

    setIsSubmittingRule(true);
    try {
      if (editingRuleId) {
        await updateSenderTranslationRuleApi(editingRuleId, newRule);
        toast.success("Translation rule updated successfully");
      } else {
        await createSenderTranslationRuleApi(selectedClientId, newRule as SenderIdTranslationRule);
        toast.success("Translation rule added successfully");
      }
      setShowAddForm(false);
      setEditingRuleId(null);
      setNewRule({
        action: "FIXED_REPLACE",
        matchType: "EXACT",
        stopProcessing: true,
        isActive: true,
      });
      loadData(selectedClientId);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || e.response?.data?.detail || "Failed to save rule");
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleEditRule = (rule: SenderIdTranslationRule) => {
    setEditingRuleId(rule.id!);
    setNewRule({ ...rule });
    setShowAddForm(true);
    setContextMenuPos(null);
  };

  const handleContextMenu = (e: React.MouseEvent, rule: SenderIdTranslationRule) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowRule(rule);
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId || !selectedClientId) return;
    setIsDeletingRule(true);
    try {
      await deleteSenderTranslationRuleApi(deleteRuleId);
      toast.success("Translation rule deleted successfully");
      setDeleteRuleId(null);
      setSelectedRowRule(null);
      loadData(selectedClientId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete translation rule");
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setTestLoading(true);
    try {
      const res = await testSenderTranslationApi(selectedClientId, {
        sender_id: testSource,
        destination: testDest,
      });
      setTestResult(res);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Test translation simulation failed");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Sleek, Compact Selector Box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => {
                setSelectedClientId(val ? Number(val) : null);
              }}
              options={clients.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedClientId(null)}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Instruction Note if no client selected */}
      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to configure its Sender ID translation policy, rewrite rules, and simulations.
          </p>
        </div>
      )}

      {/* Configuration Area when client is selected */}
      {selectedClientId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-2 gap-6 bg-white dark:bg-gray-800 overflow-x-auto">
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeTab === "policy"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("policy")}
            >
              <Settings size={15} />
              <span>Policy Settings</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeTab === "rules"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("rules")}
            >
              <List size={15} />
              <span>Translation Rules</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeTab === "test"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("test")}
            >
              <TestTube size={15} />
              <span>Dry-Run Simulation</span>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* POLICY TAB */}
            {activeTab === "policy" && (
              <div className="w-full space-y-4">
                {loading ? (
                  <LoadingSpinner size="sm" text="Loading translation policy..." className="py-8" />
                ) : (
                  <div className="p-5 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
                        Enable Translation
                      </h3>
                      <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-1">
                        Applies active Sender ID translation rules to rewrite matching sender values before delivery upstream.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPolicyActive}
                      onClick={handleTogglePolicy}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isPolicyActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isPolicyActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === "rules" && (
              <div className="space-y-4">
                <DataTable
                  density="compact"
                  storageKey="sender_id_translation_rules_table"
                  data={sortedRules}
                  isLoading={loading}
                  headers={ruleColumns.map((c) => c.label)}
                  onSort={handleSort}
                  sortColumnIndex={
                    sortConfig ? ruleColumns.findIndex((c) => c.key === sortConfig.key) : null
                  }
                  sortDirection={sortConfig?.direction || null}
                  onReorderColumns={handleReorderColumns}
                  resizableColumns={true}
                  headerActions={
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditingRuleId(null);
                        setNewRule({
                          action: "FIXED_REPLACE",
                          matchType: "EXACT",
                          stopProcessing: true,
                          isActive: true,
                        });
                        setShowAddForm(true);
                      }}
                      leftIcon={<Plus size={15} />}
                    >
                      Add Translation Rule
                    </Button>
                  }
                  renderRow={(rule: SenderIdTranslationRule, index: number) => (
                    <tr
                      key={rule.id || index}
                      onContextMenu={(e) => handleContextMenu(e, rule)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
                    >
                      {ruleColumns.map((col) => {
                        if (col.key === "sn") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm text-text-primary dark:text-white">
                              {index + 1}
                            </td>
                          );
                        }
                        if (col.key === "id") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm">
                              <span
                                className="font-mono font-semibold text-primary cursor-pointer hover:underline"
                                onClick={() => handleEditRule(rule)}
                              >
                                #{rule.id}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === "country") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                              {rule.country ? (
                                <div className="flex items-center gap-2">
                                  {countries.find((c) => c.id === rule.country)?.iso2 && (
                                    <CountryFlag
                                      iso2={countries.find((c) => c.id === rule.country)!.iso2!}
                                      width={16}
                                      height={12}
                                    />
                                  )}
                                  <span>
                                    {countries.find((c) => c.id === rule.country)?.name || rule.country}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-text-secondary dark:text-gray-400">Global</span>
                              )}
                            </td>
                          );
                        }
                        if (col.key === "sourceSenderId") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm">
                              <span
                                className="font-semibold text-primary cursor-pointer hover:underline"
                                onClick={() => handleEditRule(rule)}
                              >
                                {rule.matchType === "REGEX" ? rule.senderPattern : rule.sourceSenderId}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === "action") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm">
                              <StatusBadge status="SENT_TO_VENDOR" customText={rule.action} />
                            </td>
                          );
                        }
                        if (col.key === "outputParam") {
                          return (
                            <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-secondary dark:text-gray-300">
                              {rule.action === "FIXED_REPLACE"
                                ? rule.replacementSenderId
                                : rule.action === "TRUNCATE"
                                ? `Max len: ${rule.truncateLength}`
                                : ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(rule.action)
                                ? `List: ${rule.replacementList}`
                                : ["POOL_SEQUENTIAL", "POOL_RANDOM"].includes(rule.action)
                                ? `Pool: ${rule.senderPool}`
                                : "-"}
                            </td>
                          );
                        }
                        return null;
                      })}
                    </tr>
                  )}
                />

                {/* Context Menu for Rules */}
                <ContextMenu
                  position={contextMenuPos}
                  items={
                    selectedRowRule
                      ? [
                          {
                            label: "Edit Translation Rule",
                            icon: <Edit size={16} />,
                            onClick: () => handleEditRule(selectedRowRule),
                          },
                          {
                            label: "Delete Translation Rule",
                            icon: <Trash size={16} />,
                            variant: "danger",
                            onClick: () => setDeleteRuleId(selectedRowRule.id!),
                          },
                        ]
                      : []
                  }
                  onClose={() => setContextMenuPos(null)}
                />

                {/* Delete Rule Modal */}
                <DeleteModal
                  isOpen={!!deleteRuleId}
                  onClose={() => {
                    setDeleteRuleId(null);
                    setSelectedRowRule(null);
                  }}
                  onConfirm={handleDeleteRule}
                  title="Delete Translation Rule"
                  message="Are you sure you want to delete this translation rule? This action cannot be undone."
                  isDeleting={isDeletingRule}
                />
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === "test" && (
              <div className="space-y-4 w-full">
                <form
                  onSubmit={handleRunTest}
                  className="space-y-4 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Source Sender ID"
                      value={testSource}
                      onChange={(e) => setTestSource(e.target.value)}
                      placeholder="Enter source sender ID"
                      required
                    />
                    <Input
                      label="Destination Number"
                      value={testDest}
                      onChange={(e) => setTestDest(e.target.value)}
                      placeholder="Enter destination MSISDN"
                      required
                    />
                  </div>
                  <div className="flex justify-start">
                    <Button type="submit" variant="primary" size="sm" disabled={testLoading}>
                      {testLoading ? "Simulating..." : "Run Test"}
                    </Button>
                  </div>
                </form>

                {testResult && (
                  <div
                    className={`p-5 rounded-xl border shadow-card ${
                      testResult.is_system_error
                        ? "border-red-200 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
                        : testResult.matched
                        ? "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : "border-gray-200 bg-gray-50/70 dark:bg-gray-900/60 dark:border-gray-700"
                    }`}
                  >
                    <h4 className="text-base font-bold text-text-primary dark:text-white mb-2">
                      {testResult.is_system_error
                        ? "Error during simulation"
                        : testResult.matched
                        ? "Rule Matched & Translated"
                        : "No Rule Matched"}
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-text-secondary dark:text-gray-300">
                      <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                        <strong className="text-text-primary dark:text-white">Input Sender ID:</strong>
                        <span className="font-mono">{testResult.original_sender || testResult.input_sender_id}</span>
                      </li>
                      <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                        <strong className="text-text-primary dark:text-white">Output Sender ID:</strong>
                        <span className="font-mono font-bold text-primary">{testResult.effective_sender || testResult.output_sender_id}</span>
                      </li>
                      {testResult.country_id && (
                        <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                          <strong className="text-text-primary dark:text-white">Detected Country:</strong>
                          <span>
                            {countries.find((c) => c.value === String(testResult.country_id))?.label ||
                              testResult.country_name ||
                              testResult.country_id}
                          </span>
                        </li>
                      )}
                      {(testResult.action || testResult.action_applied) && (
                        <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                          <strong className="text-text-primary dark:text-white">Action Applied:</strong>
                          <span>{testResult.action || testResult.action_applied}</span>
                        </li>
                      )}
                      {(testResult.matched_rule_description || testResult.reason) && (
                        <li className="flex justify-between">
                          <strong className="text-text-primary dark:text-white">Details:</strong>
                          <span>{testResult.matched_rule_description || testResult.reason}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Translation Rule Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setEditingRuleId(null);
        }}
        className="max-w-lg"
        title={editingRuleId ? "Update Translation Rule" : "Add Translation Rule"}
      >
        <form onSubmit={handleAddRule} className="space-y-4">
          <Select
            label="Target Country"
            value={newRule.country ? String(newRule.country) : ""}
            onChange={(val) => setNewRule({ ...newRule, country: val ? Number(val) : null })}
            options={[
              { value: "", label: "Global (All Countries)" },
              ...countries.map((c) => ({
                value: String(c.id),
                label: c.name,
                icon: <CountryFlag iso2={c.iso2} width={16} height={12} />,
              })),
            ]}
            placeholder="Select Country"
          />

          <Select
            label="Match Type"
            value={newRule.matchType || "EXACT"}
            onChange={(val) => setNewRule({ ...newRule, matchType: val as any })}
            options={[
              { value: "EXACT", label: "Exact Match" },
              { value: "REGEX", label: "Regex Match" },
              { value: "PREFIX", label: "Prefix Match" },
            ]}
          />

          {newRule.matchType === "REGEX" ? (
            <Input
              label="Sender Pattern (Regex)"
              value={newRule.senderPattern || ""}
              onChange={(e) => setNewRule({ ...newRule, senderPattern: e.target.value })}
              placeholder="e.g. ^OTP[0-9]+$"
              required
            />
          ) : (
            <Input
              label="Source Sender ID"
              value={newRule.sourceSenderId || ""}
              onChange={(e) => setNewRule({ ...newRule, sourceSenderId: e.target.value })}
              placeholder="Enter original sender ID"
              required
            />
          )}

          <Select
            label="Action"
            value={newRule.action || "FIXED_REPLACE"}
            onChange={(val) => setNewRule({ ...newRule, action: val as any })}
            options={[
              { value: "FIXED_REPLACE", label: "Fixed Replace" },
              { value: "TRUNCATE", label: "Truncate" },
              { value: "LIST_SEQUENTIAL", label: "Replacement List (Sequential)" },
              { value: "LIST_RANDOM", label: "Replacement List (Random)" },
              { value: "POOL_SEQUENTIAL", label: "Sender Pool (Sequential)" },
              { value: "POOL_RANDOM", label: "Sender Pool (Random)" },
            ]}
          />

          {newRule.action === "FIXED_REPLACE" && (
            <Input
              label="Replacement Sender ID"
              value={newRule.replacementSenderId || ""}
              onChange={(e) => setNewRule({ ...newRule, replacementSenderId: e.target.value })}
              placeholder="e.g. BRAND_NAME"
              required
            />
          )}

          {newRule.action === "TRUNCATE" && (
            <Input
              label="Max Length (Truncate)"
              type="number"
              value={newRule.truncateLength || 11}
              onChange={(e) => setNewRule({ ...newRule, truncateLength: Number(e.target.value) })}
              min={1}
              max={30}
              required
            />
          )}

          {["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(newRule.action || "") && (
            <Select
              label="Replacement List"
              value={newRule.replacementList ? String(newRule.replacementList) : ""}
              onChange={(val) => setNewRule({ ...newRule, replacementList: val ? Number(val) : undefined })}
              options={lists.map((l) => ({ value: String(l.id), label: l.name }))}
              placeholder="Select Replacement List"
            />
          )}

          {["POOL_SEQUENTIAL", "POOL_RANDOM"].includes(newRule.action || "") && (
            <Select
              label="Sender Pool"
              value={newRule.senderPool ? String(newRule.senderPool) : ""}
              onChange={(val) => setNewRule({ ...newRule, senderPool: val ? Number(val) : undefined })}
              options={pools.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Select Sender Pool"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <ToggleSwitch
              label="Stop processing on match"
              description="Skip remaining rules on match"
              checked={newRule.stopProcessing ?? true}
              onChange={(checked) => setNewRule({ ...newRule, stopProcessing: checked })}
            />
            <ToggleSwitch
              label="Active"
              description="Active in live translation"
              checked={newRule.isActive ?? true}
              onChange={(checked) => setNewRule({ ...newRule, isActive: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setEditingRuleId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingRule}>
              {editingRuleId ? "Update Rule" : "Add Rule"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
