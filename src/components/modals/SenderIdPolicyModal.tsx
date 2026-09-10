import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Shield, List, Activity, Settings, Plus, X, TestTube } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Input from "../ui/Input";
import DataTable from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import { DeleteModal } from "./DeleteModal";
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

  // --- Delete Rule State ---
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<SenderIdRuleData | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

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
      setEditingRule(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save rule.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!client || !deleteRuleTarget?.id) return;
    setIsDeletingRule(true);
    try {
      await deleteSenderRuleApi(client.id, deleteRuleTarget.id);
      toast.success("Rule deleted.");
      setDeleteRuleTarget(null);
      fetchRules();
    } catch (err) {
      toast.error("Failed to delete rule.");
    } finally {
      setIsDeletingRule(false);
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
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Shield className="text-primary" size={20} />
          <span>Sender ID Authorization - {client.name}</span>
        </div>
      }
      className="max-w-6xl"
    >
      <div className="w-full max-h-[80vh] overflow-y-auto pr-1 space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6 mb-4 overflow-x-auto">
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "policy"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("policy")}
          >
            <Settings size={16} />
            <span>Policy Settings</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "rules"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("rules")}
          >
            <List size={16} />
            <span>Rules Management</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "test"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("test")}
          >
            <TestTube size={16} />
            <span>Simulation</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "audit"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("audit")}
          >
            <Activity size={16} />
            <span>Audit Logs</span>
          </button>
        </div>

        {/* POLICY TAB */}
        {activeTab === "policy" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Global Policy Configuration
              </h3>
              <Button
                type="button"
                variant={isPolicyEditing ? "secondary" : "primary"}
                size="sm"
                onClick={() => setIsPolicyEditing(!isPolicyEditing)}
              >
                {isPolicyEditing ? "Cancel" : "Edit Policy"}
              </Button>
            </div>

            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900/60">
              {policyLoading ? (
                <div className="py-8 text-center text-text-secondary dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  <span className="text-xs sm:text-sm">Loading policy...</span>
                </div>
              ) : (
                <form onSubmit={handleSavePolicy} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Policy Mode"
                      value={policy?.mode || "WHITELIST_ONLY"}
                      onChange={(val) => setPolicy(prev => ({ ...(prev as any), mode: val }))}
                      options={[
                        { label: "Disabled", value: "DISABLED" },
                        { label: "Whitelist Only", value: "WHITELIST_ONLY" },
                        { label: "Blacklist Only", value: "BLACKLIST_ONLY" },
                      ]}
                      disabled={!isPolicyEditing}
                      clearable={false}
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
                      clearable={false}
                    />
                  </div>

                  {isPolicyEditing && (
                    <div className="flex justify-start gap-2 pt-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setIsPolicyEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Sender ID Rules
              </h3>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingRule({ senderId: "", action: "ALLOW", isActive: true });
                  setIsRuleFormOpen(true);
                }}
                leftIcon={<Plus size={15} />}
              >
                Add Rule
              </Button>
            </div>

            <DataTable
              density="compact"
              serverSide
              data={rules}
              totalItems={rulesTotal}
              currentPage={rulesPage}
              rowsPerPage={rulesRowsPerPage}
              onPageChange={setRulesPage}
              onRowsPerPageChange={setRulesRowsPerPage}
              isLoading={rulesLoading}
              headers={["Sender ID", "Action", "Country", "Status", "Actions"]}
              renderRow={(rule: SenderIdRuleData, index: number) => (
                <tr
                  key={rule.id || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                    {rule.senderId}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={rule.action === "ALLOW" ? "ACTIVE" : "FAILED"}
                      customText={rule.action}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {rule.country ? (
                      <div className="flex items-center gap-2">
                        {countries.find(c => c.value === rule.country?.toString())?.iso2 && (
                          <CountryFlag
                            iso2={countries.find(c => c.value === rule.country?.toString())!.iso2!}
                            width={16}
                            height={12}
                          />
                        )}
                        <span className="text-text-primary dark:text-white font-medium">
                          {countries.find(c => c.value === rule.country?.toString())?.label || rule.country}
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-secondary dark:text-gray-400">Global</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={rule.isActive ? "ACTIVE" : "OFFLINE"}
                      customText={rule.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRule(rule);
                          setIsRuleFormOpen(true);
                        }}
                        className="text-primary hover:text-primary-dark font-medium text-xs sm:text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteRuleTarget(rule)}
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Dry-Run Simulation
            </h3>
            <form
              onSubmit={handleTestPolicy}
              className="space-y-4 bg-gray-50/70 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Sender ID"
                  value={testSenderId}
                  onChange={(e) => setTestSenderId(e.target.value)}
                  placeholder="Enter sender ID to test"
                  required
                />
                <Input
                  label="Destination"
                  value={testDestination}
                  onChange={(e) => setTestDestination(e.target.value)}
                  placeholder="Enter destination MSISDN (e.g. 14155552671)"
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
                  testResult.allowed
                    ? "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800"
                    : "border-red-200 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {testResult.allowed ? (
                    <Shield className="text-emerald-600 dark:text-emerald-400" size={20} />
                  ) : (
                    <X className="text-red-600 dark:text-red-400" size={20} />
                  )}
                  <h4
                    className={`text-base font-bold ${
                      testResult.allowed
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {testResult.allowed ? "ALLOWED" : "BLOCKED"}
                  </h4>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-text-secondary dark:text-gray-300">
                  <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                    <strong className="text-text-primary dark:text-white">Reason Code:</strong>
                    <span className="font-mono">{testResult.reason}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                    <strong className="text-text-primary dark:text-white">Policy Mode:</strong>
                    <span>{testResult.policy_mode}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                    <strong className="text-text-primary dark:text-white">Matched Rule:</strong>
                    <span>{testResult.matched_rule_description || testResult.matched_rule_id || "None"}</span>
                  </li>
                  {testResult.country_id && (
                    <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                      <strong className="text-text-primary dark:text-white">Detected Country:</strong>
                      <span className="flex items-center gap-2">
                        {countries.find(c => c.value === testResult.country_id?.toString())?.iso2 && (
                          <CountryFlag
                            iso2={countries.find(c => c.value === testResult.country_id?.toString())!.iso2!}
                            width={16}
                            height={12}
                          />
                        )}
                        <span>{countries.find(c => c.value === testResult.country_id?.toString())?.label || testResult.country_id}</span>
                      </span>
                    </li>
                  )}
                  {testResult.evaluation_source && (
                    <li className="flex justify-between">
                      <strong className="text-text-primary dark:text-white">Evaluation Source:</strong>
                      <span>{testResult.evaluation_source}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Audit Logs (Rejected Traffic)
            </h3>
            <DataTable
              density="compact"
              serverSide
              data={audits}
              totalItems={auditTotal}
              currentPage={auditPage}
              rowsPerPage={auditRowsPerPage}
              onPageChange={setAuditPage}
              onRowsPerPageChange={setAuditRowsPerPage}
              isLoading={auditLoading}
              headers={[
                "Date",
                "System ID",
                "IP Address",
                "Session ID",
                "Sender ID",
                "Destination",
                "Country",
                "Reason",
                "Mode",
                "Decision",
                "Matched Rule",
                "SMPP Code"
              ]}
              renderRow={(audit: SenderIdAuditData, index: number) => (
                <tr
                  key={audit.id || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs transition-colors"
                >
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300 whitespace-nowrap">
                    {audit.createdAt ? formatDateTime(audit.createdAt) : "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-primary dark:text-white">
                    {audit.systemId || "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-secondary dark:text-gray-300">
                    {audit.clientIp || "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-secondary dark:text-gray-300">
                    {audit.sessionId || "-"}
                  </td>
                  <td className="px-3 py-2 font-semibold text-rose-600 dark:text-rose-400">
                    {audit.senderId}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-primary dark:text-white">
                    {audit.destination}
                  </td>
                  <td className="px-3 py-2">
                    {audit.country ? (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {countries.find(c => c.value === audit.country?.toString())?.iso2 && (
                          <CountryFlag
                            iso2={countries.find(c => c.value === audit.country?.toString())!.iso2!}
                            width={14}
                            height={10}
                          />
                        )}
                        <span>{countries.find(c => c.value === audit.country?.toString())?.label || audit.country}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300 font-mono">
                    {audit.reasonCode}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {audit.policyMode}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={audit.decision === "ALLOWED" ? "ACTIVE" : "FAILED"}
                      customText={audit.decision}
                    />
                  </td>
                  <td
                    className="px-3 py-2 text-text-secondary dark:text-gray-300 max-w-[140px] truncate"
                    title={audit.matched_rule_description || String(audit.matchedRule || "")}
                  >
                    {audit.matched_rule_description || audit.matchedRule || "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-secondary dark:text-gray-300">
                    {audit.smppStatus}
                  </td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </Modal>

    {/* Edit / Create Rule Modal */}
    <Modal
      isOpen={isRuleFormOpen}
      onClose={() => {
        setIsRuleFormOpen(false);
        setEditingRule(null);
      }}
      title={editingRule?.id ? "Edit Sender ID Rule" : "Add Sender ID Rule"}
      className="max-w-xl"
    >
      <form onSubmit={handleSaveRule} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Sender ID"
            value={editingRule?.senderId || ""}
            onChange={(e) => setEditingRule(prev => ({ ...prev!, senderId: e.target.value }))}
            placeholder="e.g. SENDER_ABC or *"
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
            clearable={false}
          />
          <Select
            label="Country (Optional)"
            value={editingRule?.country ? String(editingRule.country) : ""}
            onChange={(val) => setEditingRule(prev => ({ ...prev!, country: val ? Number(val) : null }))}
            options={[{ label: "Global (Any Country)", value: "" }, ...countries]}
            placeholder="Global (Any Country)"
          />
          <Select
            label="Status"
            value={editingRule?.isActive !== false ? "true" : "false"}
            onChange={(val) => setEditingRule(prev => ({ ...prev!, isActive: val === "true" }))}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
            ]}
            clearable={false}
          />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsRuleFormOpen(false);
              setEditingRule(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {editingRule?.id ? "Update Rule" : "Save Rule"}
          </Button>
        </div>
      </form>
    </Modal>

    {/* Delete Rule Confirmation Modal */}
    <DeleteModal
      isOpen={!!deleteRuleTarget}
      onClose={() => setDeleteRuleTarget(null)}
      onConfirm={handleConfirmDelete}
      title="Delete Sender ID Rule"
      message={`Are you sure you want to delete rule for "${deleteRuleTarget?.senderId || ""}"? This action cannot be undone.`}
      isDeleting={isDeletingRule}
    />
    </>
  );
};

export default SenderIdPolicyModal;
