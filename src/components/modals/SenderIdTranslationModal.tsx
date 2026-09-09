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
  TestTranslationResponse
} from "../../api/authorizationApi/senderIdTranslationApi";
import {
  getSenderTranslationPolicyApi,
  updateSenderTranslationPolicyApi,
  getSenderTranslationRulesApi,
  createSenderTranslationRuleApi,
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
      await createSenderTranslationRuleApi(clientId, newRule as SenderIdTranslationRule);
      setShowAddForm(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to add rule");
    }
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
      const res = await testSenderTranslationApi(clientId, { sender_id: testSource, destination: testDest });
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
          <Settings className="text-blue-500" />
          Sender ID Translation (Phase 2)
        </div>
      }
    >
      <div className="w-full max-h-[80vh] overflow-y-auto">

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
              <button
                className={`py-2 px-4 border-b-2 font-medium ${activeTab === "policy" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("policy")}
              >
                Policy Settings
              </button>
              <button
                className={`py-2 px-4 border-b-2 font-medium ${activeTab === "rules" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("rules")}
              >
                Translation Rules
              </button>
              <button
                className={`py-2 px-4 border-b-2 font-medium ${activeTab === "test" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("test")}
              >
                Dry-Run Simulation
              </button>
            </div>

            {activeTab === "policy" && policy && (
              <div className="space-y-6">
                <div className="p-6 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Enable Phase 2 Translation</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Deterministically replaces, strips, or truncates Sender IDs after they pass Phase 1 authorization.
                    </p>
                  </div>
                  <button
                    onClick={handlePolicyToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${policy.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${policy.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? "Cancel" : "Add Translation Rule"}
                  </Button>
                </div>

                {showAddForm && (
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Select
                          label="Target Country"
                          value={newRule.country ? String(newRule.country) : ""}
                          onChange={(val) => setNewRule({ ...newRule, country: val ? Number(val) : null })}
                          options={[
                            { value: "", label: "Global (All Countries)" },
                            ...countries.map(c => ({
                              value: String(c.id),
                              label: c.name,
                              icon: <CountryFlag iso2={c.iso2} width={16} height={12} />
                            }))
                          ]}
                          placeholder="Select Country"
                        />
                      </div>
                      <div>
                        <Input
                          label="Source Sender ID (Exact Match)"
                          value={newRule.sourceSenderId || ""}
                          onChange={(e) => setNewRule({ ...newRule, sourceSenderId: e.target.value })}
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
                        />
                      </div>
                      {newRule.action === "FIXED_REPLACE" && (
                        <div>
                          <Input
                            label="Replacement Value"
                            value={newRule.replacementSenderId || ""}
                            onChange={(e) => setNewRule({ ...newRule, replacementSenderId: e.target.value })}
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
                          />
                        </div>
                      )}
                      {newRule.action === "STRIP" && (
                        <div className="col-span-2 p-3 bg-yellow-50 text-yellow-800 rounded text-sm border border-yellow-200">
                          <strong>Warning:</strong> Not all downstream vendors accept empty Sender IDs. Ensure your routes support it before enabling STRIP.
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleAddRule}>Save Rule</Button>
                    </div>
                  </div>
                )}

                <DataTable
                  data={rules}
                  headers={["Country", "Original", "Action", "Output Param", "Actions"]}
                  renderRow={(rule: SenderIdTranslationRule) => (
                    <tr key={rule.id} className="border-b dark:border-gray-700 text-sm">
                      <td className="p-3">{rule.country ? countries.find(c => c.id === rule.country)?.name || rule.country : "Global"}</td>
                      <td className="p-3">{rule.sourceSenderId}</td>
                      <td className="p-3">{rule.action}</td>
                      <td className="p-3">{rule.action === "FIXED_REPLACE" ? rule.replacementSenderId : rule.action === "TRUNCATE" ? `Max len: ${rule.truncateLength}` : "Empty"}</td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteRule(rule.id!)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                      </td>
                    </tr>
                  )}
                />
              </div>
            )}

            {activeTab === "test" && (
              <div className="space-y-6">
                <form onSubmit={handleRunTest} className="grid grid-cols-2 gap-4 items-end bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border dark:border-gray-700">
                  <div>
                    <Input label="Source Sender ID" value={testSource} onChange={e => setTestSource(e.target.value)} placeholder="Enter sender ID to test" required />
                  </div>
                  <div>
                    <Input label="Destination Number" value={testDest} onChange={e => setTestDest(e.target.value)} placeholder="Enter MSISDN" required />
                  </div>
                  <Button type="submit" disabled={testLoading} className="col-span-2 mt-2">
                    {testLoading ? "Simulating..." : "Run Test"}
                  </Button>
                </form>

                {testResult && (
                  <div className={`p-6 rounded-lg border-2 ${testResult.is_system_error ? "border-red-500 bg-red-50" : testResult.matched ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"} dark:bg-gray-900`}>
                    <div className="flex items-center gap-2 mb-4">
                      {testResult.is_system_error ? (
                        <X className="text-red-600" />
                      ) : testResult.matched ? (
                        <Shield className="text-green-600" />
                      ) : null}
                      <h4 className={`text-xl font-bold ${testResult.is_system_error ? "text-red-700" : testResult.matched ? "text-green-700" : "text-gray-700 dark:text-gray-300"}`}>
                        {testResult.is_system_error ? "SYSTEM ERROR" : testResult.matched ? "RULE MATCHED" : "NO MATCH (UNCHANGED)"}
                      </h4>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                      <li><strong>Original Sender:</strong> {testResult.original_sender}</li>
                      <li><strong>Effective Sender:</strong> <span className="font-mono bg-white dark:bg-black px-2 py-1 rounded">{testResult.effective_sender || "(empty)"}</span></li>
                      <li><strong>Action Taken:</strong> {testResult.action}</li>
                      <li><strong>Rule ID:</strong> {testResult.matched_rule_description || testResult.matched_rule_id || "N/A"}</li>
                      {/* <li><strong>Evaluation Source:</strong> {testResult.source}</li> */}
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
