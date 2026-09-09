import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Home, X, Plus, Shield, Settings } from "lucide-react";

import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DataTable from "../../components/ui/DataTable";
import { CountryFlag } from "../../components/ui/CountryFlag";

import { getClientsApi } from "../../api/clientApi/clientApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

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
  updateSenderTranslationRuleApi,
  deleteSenderTranslationRuleApi,
  testSenderTranslationApi,
} from "../../api/authorizationApi/senderIdTranslationApi";

const SenderIdTranslationModule: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

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
    loadClients();
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadData(selectedClientId);
    } else {
      setPolicy(null);
      setRules([]);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const res = await getClientsApi(undefined, 1, 1000);
      setClients(res.results || res || []);
    } catch (e) {
      console.error(e);
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

  const loadData = async (clientId: number) => {
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

  const handlePolicyToggle = async () => {
    if (!policy || !selectedClientId) return;
    const newStatus = !policy.isActive;
    try {
      const res = await updateSenderTranslationPolicyApi(selectedClientId, newStatus);
      setPolicy(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.sourceSenderId || !newRule.action || !selectedClientId) return;
    try {
      if (editingRuleId) {
        await updateSenderTranslationRuleApi(editingRuleId, newRule);
      } else {
        await createSenderTranslationRuleApi(selectedClientId, newRule as SenderIdTranslationRule);
      }
      setShowAddForm(false);
      setEditingRuleId(null);
      setNewRule({ action: "FIXED_REPLACE", isActive: true });
      loadData(selectedClientId);
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
    if (!selectedClientId) return;
    if (!confirm("Delete rule?")) return;
    try {
      await deleteSenderTranslationRuleApi(ruleId);
      loadData(selectedClientId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSource || !testDest || !selectedClientId) return;
    setTestLoading(true);
    try {
      const res = await testSenderTranslationApi(selectedClientId, { sender_id: testSource, destination: testDest });
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-inter transition-colors duration-200">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="text-blue-500" size={24} />
              Sender ID Translation
            </h1>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <NavLink to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home size={14} />
              Home
            </NavLink>
            <span className="mx-2">/</span>
            <span>Sender ID Translation</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Client Selector */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Select Client</h2>
            <div className="max-w-md">
              <Select
                label="Client"
                value={selectedClientId ? String(selectedClientId) : ""}
                onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
                options={[
                  { value: "", label: "-- Select a Client --" },
                  ...clients.map(c => ({
                    value: String(c.id),
                    label: c.name
                  }))
                ]}
                placeholder="Choose Client to Configure..."
              />
            </div>
          </div>

          {/* Configuration Area */}
          {selectedClientId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
                <button
                  className={`py-3 px-4 border-b-2 font-medium ${activeTab === "policy" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                  onClick={() => setActiveTab("policy")}
                >
                  Policy Settings
                </button>
                <button
                  className={`py-3 px-4 border-b-2 font-medium ${activeTab === "rules" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                  onClick={() => setActiveTab("rules")}
                >
                  Translation Rules
                </button>
                <button
                  className={`py-3 px-4 border-b-2 font-medium ${activeTab === "test" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                  onClick={() => setActiveTab("test")}
                >
                  Dry-Run Simulation
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="py-12 text-center text-gray-500">Loading Configuration...</div>
                ) : (
                  <>
                    {activeTab === "policy" && policy && (
                      <div className="space-y-6 max-w-3xl">
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
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Translation Rules</h3>
                          <Button onClick={() => {
                            setShowAddForm(!showAddForm);
                            if (showAddForm) {
                              setEditingRuleId(null);
                              setNewRule({ action: "FIXED_REPLACE", isActive: true });
                            }
                          }} className="flex items-center gap-2">
                            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showAddForm ? "Cancel" : "Add Translation Rule"}
                          </Button>
                        </div>

                        {showAddForm && (
                          <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 space-y-4 mb-6">
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
                            <div className="flex justify-end mt-4">
                              <Button onClick={handleAddRule}>{editingRuleId ? "Update Rule" : "Save Rule"}</Button>
                            </div>
                          </div>
                        )}

                        <DataTable
                          data={rules}
                          headers={["Country", "Original", "Action", "Output Param", "Actions"]}
                          renderRow={(rule: SenderIdTranslationRule) => (
                            <tr key={rule.id} className="border-b dark:border-gray-700 text-sm">
                              <td className="p-3">
                                {rule.country ? (
                                  <div className="flex items-center gap-2">
                                    <CountryFlag iso2={countries.find(c => c.id === rule.country)?.iso2 || ""} width={16} height={12} />
                                    {countries.find(c => c.id === rule.country)?.name || rule.country}
                                  </div>
                                ) : "Global"}
                              </td>
                              <td className="p-3 font-medium">{rule.sourceSenderId}</td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">{rule.action}</span>
                              </td>
                              <td className="p-3">{rule.action === "FIXED_REPLACE" ? rule.replacementSenderId : rule.action === "TRUNCATE" ? `Max len: ${rule.truncateLength}` : "-"}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => handleEditRule(rule)} className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">Edit</button>
                                  <button onClick={() => handleDeleteRule(rule.id!)} className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">Delete</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        />
                      </div>
                    )}

                    {activeTab === "test" && (
                      <div className="space-y-6 max-w-3xl">
                        <form onSubmit={handleRunTest} className="grid grid-cols-2 gap-4 items-end bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
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
                          <div className={`p-6 rounded-lg border-2 shadow-sm ${testResult.is_system_error ? "border-red-500 bg-red-50" : testResult.matched ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"} dark:bg-gray-900`}>
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
                            <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                              <li className="flex justify-between border-b pb-2 dark:border-gray-700"><strong>Original Sender:</strong> <span>{testResult.original_sender}</span></li>
                              <li className="flex justify-between border-b pb-2 dark:border-gray-700"><strong>Effective Sender:</strong> <span className="font-mono bg-white dark:bg-black px-2 py-1 rounded shadow-sm">{testResult.effective_sender || "(empty)"}</span></li>
                              <li className="flex justify-between border-b pb-2 dark:border-gray-700"><strong>Action Taken:</strong> <span>{testResult.action}</span></li>
                              <li className="flex justify-between border-b pb-2 dark:border-gray-700"><strong>Rule ID:</strong> <span>{testResult.matched_rule_description || testResult.matched_rule_id || "N/A"}</span></li>
                              {/* <li className="flex justify-between border-b pb-2 dark:border-gray-700"><strong>Evaluation Source:</strong> <span>{testResult.source}</span></li> */}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SenderIdTranslationModule;
