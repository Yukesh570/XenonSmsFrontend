import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { X, Plus, Shield, Settings } from "lucide-react";
import DataTable from "../ui/DataTable";
import { CountryFlag } from "../ui/CountryFlag";
import type {
  SenderIdTranslationPolicy,
  SenderIdTranslationRule,
  TestTranslationResponse,
} from "../../api/authorizationApi/senderIdTranslationApi";
import {
  getSenderTranslationPolicyApi,
  updateSenderTranslationPolicyApi,
  getSenderTranslationRulesApi,
  createSenderTranslationRuleApi,
  updateSenderTranslationRuleApi,
  deleteSenderTranslationRuleApi,
  testSenderTranslationApi,
} from "../../api/authorizationApi/senderIdTranslationApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

export const SenderIdTranslationModal: React.FC<Props> = ({ isOpen, onClose, clientId }) => {
  const [activeTab, setActiveTab] = useState<"policy" | "rules" | "test">("policy");
  const [policy, setPolicy] = useState<SenderIdTranslationPolicy | null>(null);
  const [rules, setRules] = useState<SenderIdTranslationRule[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Rule form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [newRule, setNewRule] = useState<Partial<SenderIdTranslationRule>>({
    action: "FIXED_REPLACE",
    isActive: true,
  });

  // Test form
  const [testSource, setTestSource] = useState("");
  const [testDest, setTestDest] = useState("");
  const [testResult, setTestResult] = useState<TestTranslationResponse | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      loadData();
      loadCountries();
    }
  }, [isOpen, clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pol, rls] = await Promise.all([
        getSenderTranslationPolicyApi(clientId),
        getSenderTranslationRulesApi(clientId),
      ]);
      setPolicy(pol);
      setRules(rls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const res = await getCountriesApi(undefined, 1, 1000);
      setCountries(res.results || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePolicyToggle = async () => {
    if (!policy) return;
    const newStatus = !policy.isActive;
    try {
      const res = await updateSenderTranslationPolicyApi(clientId, newStatus);
      setPolicy(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.sourceSenderId || !newRule.action) return;
    try {
      if (editingRuleId) {
        await updateSenderTranslationRuleApi(editingRuleId, newRule);
      } else {
        await createSenderTranslationRuleApi(clientId, newRule as SenderIdTranslationRule);
      }
      setShowAddForm(false);
      setEditingRuleId(null);
      setNewRule({ action: "FIXED_REPLACE", isActive: true });
      loadData();
    } catch (e) {
      console.error(e);
      alert(editingRuleId ? "Failed to update rule" : "Failed to add rule");
    }
  };

  const handleEditRule = (rule: SenderIdTranslationRule) => {
    setEditingRuleId(rule.id!);
    setNewRule(rule);
    setShowAddForm(true);
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm("Delete rule?")) return;
    try {
      await deleteSenderTranslationRuleApi(ruleId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSource || !testDest) return;
    setTestLoading(true);
    try {
      const res = await testSenderTranslationApi(clientId, {
        sender_id: testSource,
        destination: testDest,
      });
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl"
      title={
        <div className="flex items-center gap-2">
          <Settings className="text-primary" size={20} />
          <span>Sender ID Translation (Phase 2)</span>
        </div>
      }
    >
      <div className="w-full max-h-[75vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-12 text-center text-text-secondary dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6 mb-4">
              <button
                type="button"
                className={`pb-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === "policy"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                onClick={() => setActiveTab("policy")}
              >
                Policy Settings
              </button>
              <button
                type="button"
                className={`pb-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === "rules"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                onClick={() => setActiveTab("rules")}
              >
                Translation Rules
              </button>
              <button
                type="button"
                className={`pb-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === "test"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                onClick={() => setActiveTab("test")}
              >
                Dry-Run Simulation
              </button>
            </div>

            {/* POLICY TAB */}
            {activeTab === "policy" && policy && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900/60 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
                      Enable Phase 2 Translation
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-1">
                      Deterministically replaces, strips, or truncates Sender IDs after they pass Phase 1 authorization.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={policy.isActive}
                    onClick={handlePolicyToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      policy.isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        policy.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === "rules" && (
              <div className="space-y-3">
                {showAddForm && (
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900/60 space-y-3 mb-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-text-primary dark:text-white">
                        {editingRuleId ? "Update Translation Rule" : "New Translation Rule"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingRuleId(null);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
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
                      </div>
                      <div>
                        <Input
                          label="Source Sender ID (Exact Match)"
                          value={newRule.sourceSenderId || ""}
                          onChange={(e) => setNewRule({ ...newRule, sourceSenderId: e.target.value })}
                          placeholder="e.g. SENDER_ABC"
                          required
                        />
                      </div>
                      <div>
                        <Select
                          label="Action"
                          value={newRule.action || ""}
                          onChange={(val) => setNewRule({ ...newRule, action: val as any })}
                          options={[
                            { value: "FIXED_REPLACE", label: "Fixed Replace" },
                            { value: "STRIP", label: "Strip" },
                            { value: "TRUNCATE", label: "Truncate" },
                          ]}
                          clearable={false}
                        />
                      </div>
                      {newRule.action === "FIXED_REPLACE" && (
                        <div>
                          <Input
                            label="Replacement Value"
                            value={newRule.replacementSenderId || ""}
                            onChange={(e) => setNewRule({ ...newRule, replacementSenderId: e.target.value })}
                            placeholder="e.g. NEW_SENDER"
                            required
                          />
                        </div>
                      )}
                      {newRule.action === "TRUNCATE" && (
                        <div>
                          <Input
                            label="Truncate Length"
                            type="number"
                            value={newRule.truncateLength || ""}
                            onChange={(e) => setNewRule({ ...newRule, truncateLength: Number(e.target.value) })}
                            placeholder="e.g. 11"
                            required
                          />
                        </div>
                      )}
                      {newRule.action === "STRIP" && (
                        <div className="sm:col-span-2 p-2.5 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg text-xs border border-amber-200 dark:border-amber-700">
                          <strong>Warning:</strong> Not all downstream vendors accept empty Sender IDs. Ensure your routes support it before enabling STRIP.
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingRuleId(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" variant="primary" size="sm" onClick={handleAddRule}>
                        {editingRuleId ? "Update Rule" : "Save Rule"}
                      </Button>
                    </div>
                  </div>
                )}

                <DataTable
                  data={rules}
                  headers={["Country", "Original", "Action", "Output Param", "Actions"]}
                  density="compact"
                  headerActions={
                    !showAddForm ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditingRuleId(null);
                          setNewRule({ action: "FIXED_REPLACE", isActive: true });
                          setShowAddForm(true);
                        }}
                        leftIcon={<Plus size={15} />}
                      >
                        Add Translation Rule
                      </Button>
                    ) : null
                  }
                  renderRow={(rule: SenderIdTranslationRule, index: number) => (
                    <tr
                      key={rule.id || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors"
                    >
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                        {rule.sourceSenderId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                          {rule.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-300 font-mono text-xs">
                        {rule.action === "FIXED_REPLACE"
                          ? rule.replacementSenderId
                          : rule.action === "TRUNCATE"
                          ? `Max len: ${rule.truncateLength}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditRule(rule)}
                            className="text-primary hover:text-primary-dark font-medium text-xs sm:text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id!)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs sm:text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === "test" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleRunTest}
                  className="space-y-3 bg-gray-50/70 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Source Sender ID"
                      value={testSource}
                      onChange={(e) => setTestSource(e.target.value)}
                      placeholder="Enter sender ID to test"
                      required
                    />
                    <Input
                      label="Destination Number"
                      value={testDest}
                      onChange={(e) => setTestDest(e.target.value)}
                      placeholder="Enter MSISDN"
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
                    className={`p-4 rounded-xl border shadow-card ${
                      testResult.is_system_error
                        ? "border-red-200 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
                        : testResult.matched
                        ? "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : "border-gray-200 bg-gray-50/70 dark:bg-gray-900/60 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      {testResult.is_system_error ? (
                        <X className="text-red-600 dark:text-red-400" size={18} />
                      ) : testResult.matched ? (
                        <Shield className="text-emerald-600 dark:text-emerald-400" size={18} />
                      ) : null}
                      <h4
                        className={`text-sm sm:text-base font-bold ${
                          testResult.is_system_error
                            ? "text-red-700 dark:text-red-300"
                            : testResult.matched
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-text-primary dark:text-gray-200"
                        }`}
                      >
                        {testResult.is_system_error
                          ? "SYSTEM ERROR"
                          : testResult.matched
                          ? "RULE MATCHED"
                          : "NO MATCH (UNCHANGED)"}
                      </h4>
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-text-secondary dark:text-gray-300">
                      <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1">
                        <strong className="text-text-primary dark:text-white">Original Sender:</strong>
                        <span>{testResult.original_sender}</span>
                      </li>
                      <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1">
                        <strong className="text-text-primary dark:text-white">Effective Sender:</strong>
                        <span className="font-mono font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded shadow-sm text-text-primary dark:text-white">
                          {testResult.effective_sender || "(empty)"}
                        </span>
                      </li>
                      <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1">
                        <strong className="text-text-primary dark:text-white">Action Taken:</strong>
                        <span>{testResult.action}</span>
                      </li>
                      <li className="flex justify-between">
                        <strong className="text-text-primary dark:text-white">Rule ID:</strong>
                        <span>
                          {testResult.matched_rule_description || testResult.matched_rule_id || "N/A"}
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
