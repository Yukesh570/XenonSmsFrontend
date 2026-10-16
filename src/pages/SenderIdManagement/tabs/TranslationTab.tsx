import React, { useState, useEffect } from "react";
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
  className?: string;
}

const DEFAULT_RULE_COLUMNS: RuleColumnDef[] = [
  { key: "country", label: "Country", className: "px-4 py-3" },
  { key: "sourceSenderId", label: "Original", className: "px-4 py-3 font-semibold text-text-primary dark:text-white" },
  { key: "action", label: "Action", className: "px-4 py-3" },
  { key: "outputParam", label: "Output Param", className: "px-4 py-3 text-text-secondary dark:text-gray-300 font-mono text-xs" },
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

  const [ruleColumns] = useState<RuleColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem("sender_id_translation_rule_columns");
      if (saved) {
        const rawKeys: string[] = JSON.parse(saved);
        if (Array.isArray(rawKeys) && rawKeys.length > 0) {
          const parsedKeys = rawKeys.filter((k) => k !== "actions");
          const reordered = parsedKeys
            .map((k) => DEFAULT_RULE_COLUMNS.find((c) => c.key === k))
            .filter((c): c is RuleColumnDef => Boolean(c));
          const missing = DEFAULT_RULE_COLUMNS.filter((c) => !parsedKeys.includes(c.key));
          return [...reordered, ...missing];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_RULE_COLUMNS;
  });

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

  const loadData = async (clientId: number) => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        getSenderTranslationPolicyApi(clientId),
        getSenderTranslationRulesApi(clientId),
      ]);
      setPolicy(p);
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
    try {
      const newStatus = !policy?.isActive;
      const res = await updateSenderTranslationPolicyApi(selectedClientId, newStatus);
      setPolicy(res);
      toast.success(`Translation policy ${newStatus ? "enabled" : "disabled"}`);
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
              <div className="max-w-2xl space-y-4">
                {loading ? (
                  <LoadingSpinner size="sm" text="Loading translation policy..." className="py-8" />
                ) : (
                  <div className="p-4 sm:p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900/60 flex items-center justify-between gap-4">
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
                      aria-checked={Boolean(policy?.isActive)}
                      onClick={handleTogglePolicy}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        policy?.isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          policy?.isActive ? "translate-x-5" : "translate-x-0"
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
                  data={rules}
                  isLoading={loading}
                  headers={ruleColumns.map((c) => c.label)}
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
                        if (col.key === "country") {
                          return (
                            <td key={col.key} className={col.className}>
                              {rule.country ? (
                                <div className="flex items-center gap-2">
                                  <CountryFlag
                                    iso2={countries.find((c) => c.id === rule.country)?.iso2 || ""}
                                    width={16}
                                    height={12}
                                  />
                                  <span className="text-text-primary dark:text-white font-medium">
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
                            <td key={col.key} className={col.className}>
                              {rule.matchType === "REGEX" ? rule.senderPattern : rule.sourceSenderId}
                            </td>
                          );
                        }
                        if (col.key === "action") {
                          return (
                            <td key={col.key} className={col.className}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                                {rule.action}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === "outputParam") {
                          return (
                            <td key={col.key} className={col.className}>
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
              <div className="space-y-4 max-w-2xl">
                <form
                  onSubmit={handleRunTest}
                  className="space-y-4 bg-gray-50/70 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={newRule.stopProcessing ?? true}
                onChange={(e) => setNewRule({ ...newRule, stopProcessing: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              Stop processing on match
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary dark:text-white">
              <input
                type="checkbox"
                checked={newRule.isActive ?? true}
                onChange={(e) => setNewRule({ ...newRule, isActive: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              Active
            </label>
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
