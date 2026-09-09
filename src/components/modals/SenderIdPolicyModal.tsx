import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Shield, List, Activity, Settings, Plus, Edit, Trash, TestTube } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Input from "../ui/Input";
import DataTable from "../ui/DataTable";
import { formatDateTime } from "../../helper/dateFormatter";
import { CountryFlag } from "../ui/CountryFlag";

import {
  getSenderPolicyApi,
  createSenderPolicyApi,
  updateSenderPolicyApi,
  getSenderRulesApi,
  createSenderRuleApi,
  updateSenderRuleApi,
  deleteSenderRuleApi,
  testSenderPolicyApi,
  getSenderAuditLogsApi,
  type SenderIdPolicyData,
  type SenderIdRuleData,
  type SenderIdAuditData,
  type TestPolicyResponse
} from "../../api/authorizationApi/senderIdApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";

interface SenderIdPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: { id: number; name: string } | null;
}

const SenderIdPolicyModal: React.FC<SenderIdPolicyModalProps> = ({
  isOpen,
  onClose,
  client,
}) => {
  const [activeTab, setActiveTab] = useState<"policy" | "rules" | "test" | "audit">("policy");

  // --- Global ---
  const [countries, setCountries] = useState<{ label: string; value: string; iso2?: string; icon?: React.ReactNode }[]>([]);

  // --- Policy State ---
  const [policy, setPolicy] = useState<SenderIdPolicyData | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [isPolicyEditing, setIsPolicyEditing] = useState(false);

  // --- Rules State ---
  const [rules, setRules] = useState<SenderIdRuleData[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SenderIdRuleData | null>(null);
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesRowsPerPage, setRulesRowsPerPage] = useState(10);
  const [rulesTotal, setRulesTotal] = useState(0);

  // --- Test State ---
  const [testSenderId, setTestSenderId] = useState("");
  const [testDestination, setTestDestination] = useState("");
  const [testResult, setTestResult] = useState<TestPolicyResponse | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // --- Audit State ---
  const [audits, setAudits] = useState<SenderIdAuditData[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);

  useEffect(() => {
    if (isOpen && client) {
      fetchCountries();
      setActiveTab("policy");
      fetchPolicy();
    }
  }, [isOpen, client]);

  useEffect(() => {
    if (isOpen && client) {
      if (activeTab === "rules") fetchRules();
      if (activeTab === "audit") fetchAudits();
    }
  }, [activeTab, rulesPage, rulesRowsPerPage, auditPage, auditRowsPerPage]);

  const fetchCountries = async () => {
    try {
      const res: any = await getCountriesApi("country", 1, 1000);
      if (res.results) {
        setCountries(
          res.results.map((c: any) => ({
            label: c.name,
            value: c.id.toString(),
            iso2: c.iso2,
            ...(c.iso2 ? { icon: <CountryFlag iso2={c.iso2} /> } : {})
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Policy Logic ---
  const fetchPolicy = async () => {
    if (!client) return;
    setPolicyLoading(true);
    try {
      const res: any = await getSenderPolicyApi(client.id);
      let policyList = [];
      if (Array.isArray(res)) {
        policyList = res;
      } else if (res && Array.isArray(res.results)) {
        policyList = res.results;
      }

      if (policyList.length > 0) {
        setPolicy(policyList[0]);
      } else {
        setPolicy(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    try {
      if (policy?.id) {
        await updateSenderPolicyApi(client.id, policy.id, {
          mode: policy.mode,
          isActive: policy.isActive,
        });
        toast.success("Policy updated.");
      } else {
        await createSenderPolicyApi(client.id, {
          client: client.id,
          mode: policy?.mode || "WHITELIST_ONLY",
          isActive: policy?.isActive ?? true,
        });
        toast.success("Policy created.");
      }
      setIsPolicyEditing(false);
      fetchPolicy();
    } catch (err) {
      toast.error("Failed to save policy.");
    }
  };

  // --- Rules Logic ---
  const fetchRules = async () => {
    if (!client) return;
    setRulesLoading(true);
    try {
      const res: any = await getSenderRulesApi(client.id, { page: rulesPage, page_size: rulesRowsPerPage });
      if (Array.isArray(res)) {
        setRules(res);
        setRulesTotal(res.length);
      } else {
        setRules(res.results || []);
        setRulesTotal(res.count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !editingRule) return;
    try {
      if (editingRule.id) {
        await updateSenderRuleApi(client.id, editingRule.id, editingRule);
        toast.success("Rule updated.");
      } else {
        await createSenderRuleApi(client.id, { ...editingRule, client: client.id });
        toast.success("Rule created.");
      }
      setIsRuleFormOpen(false);
      fetchRules();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save rule.");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!client || !window.confirm("Are you sure?")) return;
    try {
      await deleteSenderRuleApi(client.id, id);
      toast.success("Rule deleted.");
      fetchRules();
    } catch (err) {
      toast.error("Failed to delete rule.");
    }
  };

  // --- Test Logic ---
  const handleTestPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testSenderPolicyApi(client.id, { sender_id: testSenderId, destination: testDestination });
      setTestResult(res);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Simulation failed.");
    } finally {
      setTestLoading(false);
    }
  };

  // --- Audit Logic ---
  const fetchAudits = async () => {
    if (!client) return;
    setAuditLoading(true);
    try {
      const res: any = await getSenderAuditLogsApi(client.id, { page: auditPage, page_size: auditRowsPerPage });
      if (Array.isArray(res)) {
        setAudits(res);
        setAuditTotal(res.length);
      } else {
        setAudits(res.results || []);
        setAuditTotal(res.count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sender ID Authorization - ${client.name}`}
      className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
        <button
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "policy" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          onClick={() => setActiveTab("policy")}
        >
          <Settings size={16} /> Policy Settings
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "rules" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          onClick={() => setActiveTab("rules")}
        >
          <List size={16} /> Rules Management
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "test" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          onClick={() => setActiveTab("test")}
        >
          <TestTube size={16} /> Simulation
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          onClick={() => setActiveTab("audit")}
        >
          <Activity size={16} /> Audit Logs
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-[400px]">
        {/* POLICY TAB */}
        {activeTab === "policy" && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Global Policy Configuration</h3>
              <Button onClick={() => setIsPolicyEditing(!isPolicyEditing)} variant={isPolicyEditing ? "secondary" : "primary"}>
                {isPolicyEditing ? "Cancel" : "Edit Policy"}
              </Button>
            </div>

            {policyLoading ? (
              <p>Loading...</p>
            ) : (
              <form onSubmit={handleSavePolicy} className="max-w-md space-y-4">
                <Select
                  label="Policy Mode"
                  value={policy?.mode || "WHITELIST_ONLY"}
                  onChange={(val) => setPolicy(prev => ({ ...(prev as any), mode: val }))}
                  options={[
                    { label: "Disabled", value: "DISABLED" },
                    { label: "Whitelist Only ", value: "WHITELIST_ONLY" },
                    { label: "Blacklist Only ", value: "BLACKLIST_ONLY" },
                  ]}
                  disabled={!isPolicyEditing}
                />

                <Select
                  label="Status"
                  value={policy?.isActive !== false ? "true" : "false"}
                  onChange={(val) => setPolicy(prev => ({ ...(prev as any), isActive: val === "true" }))}
                  options={[
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  disabled={!isPolicyEditing}
                />

                {isPolicyEditing && (
                  <Button type="submit" className="w-full">Save Changes</Button>
                )}
              </form>
            )}
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === "rules" && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Sender ID Rules</h3>
              {!isRuleFormOpen && (
                <Button onClick={() => {
                  setEditingRule({ senderId: "", action: "ALLOW", isActive: true });
                  setIsRuleFormOpen(true);
                }}>
                  <Plus size={16} className="mr-2" /> Add Rule
                </Button>
              )}
            </div>

            {isRuleFormOpen ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-4">{editingRule?.id ? "Edit Rule" : "Create Rule"}</h4>
                <form onSubmit={handleSaveRule} className="grid grid-cols-2 gap-4">
                  <Input
                    label="Sender ID"
                    value={editingRule?.senderId || ""}
                    onChange={(e) => setEditingRule(prev => ({ ...prev!, senderId: e.target.value }))}
                    required
                  />
                  <Select
                    label="Action"
                    value={editingRule?.action || "ALLOW"}
                    onChange={(val) => setEditingRule(prev => ({ ...prev!, action: val as any }))}
                    options={[
                      { label: "Allow", value: "ALLOW" },
                      { label: "Block", value: "BLOCK" },
                    ]}
                  />
                  <Select
                    label="Country (Optional)"
                    value={editingRule?.country ? String(editingRule.country) : ""}
                    onChange={(val) => setEditingRule(prev => ({ ...prev!, country: val ? Number(val) : null }))}
                    options={[{ label: "Global (Any Country)", value: "" }, ...countries]}
                  />
                  <Select
                    label="Status"
                    value={editingRule?.isActive !== false ? "true" : "false"}
                    onChange={(val) => setEditingRule(prev => ({ ...prev!, isActive: val === "true" }))}
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                  />
                  <div className="col-span-2 flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setIsRuleFormOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Rule</Button>
                  </div>
                </form>
              </div>
            ) : (
              <DataTable
                serverSide
                data={rules}
                totalItems={rulesTotal}
                currentPage={rulesPage}
                rowsPerPage={rulesRowsPerPage}
                onPageChange={setRulesPage}
                onRowsPerPageChange={setRulesRowsPerPage}
                isLoading={rulesLoading}
                headers={["Sender ID", "Action", "Country", "Status", "Actions"]}
                renderRow={(rule) => (
                  <tr key={rule.id} className="border-b dark:border-gray-700">
                    <td className="p-3">{rule.senderId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${rule.action === 'ALLOW' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      {rule.country ? (
                        <>
                          {countries.find(c => c.value === rule.country?.toString())?.label || rule.country}
                          {countries.find(c => c.value === rule.country?.toString())?.iso2 && (
                            <CountryFlag iso2={countries.find(c => c.value === rule.country?.toString())!.iso2!} />
                          )}
                        </>
                      ) : "Global"}
                    </td>
                    <td className="p-3">{rule.isActive ? "Active" : "Inactive"}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => { setEditingRule(rule); setIsRuleFormOpen(true); }} className="text-blue-500 hover:text-blue-700">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id!)} className="text-red-500 hover:text-red-700">
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                )}
              />
            )}
          </div>
        )}

        {/* TEST TAB */}
        {activeTab === "test" && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Dry-Run Simulation</h3>
            <form onSubmit={handleTestPolicy} className="flex gap-4 items-end mb-6">
              <div className="flex-1">
                <Input
                  label="Sender ID"
                  value={testSenderId}
                  onChange={(e) => setTestSenderId(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Destination"
                  value={testDestination}
                  onChange={(e) => setTestDestination(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={testLoading}>
                {testLoading ? "Simulating..." : "Run Test"}
              </Button>
            </form>

            {testResult && (
              <div className={`p-4 rounded-lg border-2 ${testResult.allowed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"} dark:bg-gray-900`}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={testResult.allowed ? "text-green-600" : "text-red-600"} />
                  <h4 className={`text-xl font-bold ${testResult.allowed ? "text-green-700" : "text-red-700"}`}>
                    {testResult.allowed ? "ALLOWED" : "BLOCKED"}
                  </h4>
                </div>
                <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                  <li><strong>Reason Code:</strong> {testResult.reason}</li>
                  <li><strong>Policy Mode:</strong> {testResult.policy_mode}</li>
                  <li><strong>Matched Rule:</strong> {testResult.matched_rule_description || testResult.matched_rule_id || "None"}</li>
                  {testResult.country_id && (
                    <li className="flex items-center gap-2">
                      <strong>Detected Country:</strong>{" "}
                      {countries.find(c => c.value === testResult.country_id?.toString())?.label || testResult.country_id}
                      {countries.find(c => c.value === testResult.country_id?.toString())?.iso2 && (
                        <CountryFlag iso2={countries.find(c => c.value === testResult.country_id?.toString())!.iso2!} />
                      )}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === "audit" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Audit Logs (Rejected Traffic)</h3>
            <DataTable
              serverSide
              data={audits}
              totalItems={auditTotal}
              currentPage={auditPage}
              rowsPerPage={auditRowsPerPage}
              onPageChange={setAuditPage}
              onRowsPerPageChange={setAuditRowsPerPage}
              isLoading={auditLoading}
              headers={["Date", "System ID", "IP Address", "Session ID", "Sender ID", "Destination", "Country", "Reason", "Mode", "Decision", "Matched Rule", "SMPP Code"]}
              renderRow={(audit) => (
                <tr key={audit.id} className="border-b dark:border-gray-700 text-sm">
                  <td className="p-3">{audit.createdAt ? formatDateTime(audit.createdAt) : "-"}</td>
                  <td className="p-3">{audit.systemId || "-"}</td>
                  <td className="p-3">{audit.clientIp || "-"}</td>
                  <td className="p-3">{audit.sessionId || "-"}</td>
                  <td className="p-3 font-semibold text-red-600 dark:text-red-400">{audit.senderId}</td>
                  <td className="p-3">{audit.destination}</td>
                  <td className="p-3 flex items-center gap-2">
                    {audit.country ? (
                      <>
                        {countries.find(c => c.value === audit.country?.toString())?.label || audit.country}
                        {countries.find(c => c.value === audit.country?.toString())?.iso2 && (
                          <CountryFlag iso2={countries.find(c => c.value === audit.country?.toString())!.iso2!} />
                        )}
                      </>
                    ) : "-"}
                  </td>
                  <td className="p-3">{audit.reasonCode}</td>
                  <td className="p-3">{audit.policyMode}</td>
                  <td className="p-3">{audit.decision}</td>
                  <td className="p-3">{audit.matched_rule_description || audit.matchedRule || "-"}</td>
                  <td className="p-3">{audit.smppStatus}</td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SenderIdPolicyModal;
