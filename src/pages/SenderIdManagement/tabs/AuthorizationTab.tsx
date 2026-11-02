import React, { useState, useEffect } from "react";
import {
  Plus,
  Shield,
  X,
  RotateCcw,
  Edit,
  Trash,
  Eye,
  Settings,
  List,
  TestTube,
  Activity,
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
import { formatDateTime } from "../../../helper/dateFormatter";

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
  type TestPolicyResponse,
} from "../../../api/authorizationApi/senderIdApi";

interface AuthorizationTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

export const AuthorizationTab: React.FC<AuthorizationTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [activeTab, setActiveTab] = useState<"policy" | "rules" | "test" | "audit">("policy");

  // --- Policy State ---
  const [policy, setPolicy] = useState<SenderIdPolicyData | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const isPolicyActive = Boolean(policy?.isActive && policy?.mode !== "DISABLED");
  const currentMode: "WHITELIST_ONLY" | "BLACKLIST_ONLY" =
    policy?.mode === "BLACKLIST_ONLY" ? "BLACKLIST_ONLY" : "WHITELIST_ONLY";

  // --- Rules State ---
  const [rules, setRules] = useState<SenderIdRuleData[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<SenderIdRuleData> | null>(null);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);

  const [rulesPage, setRulesPage] = useState(1);
  const [rulesRowsPerPage, setRulesRowsPerPage] = useState(10);
  const [rulesTotal, setRulesTotal] = useState(0);

  // --- Delete Rule State ---
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<SenderIdRuleData | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  // --- Context Menu & Detail State ---
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowRule, setSelectedRowRule] = useState<SenderIdRuleData | null>(null);
  const [isRuleDetailOpen, setIsRuleDetailOpen] = useState(false);

  const [auditContextMenuPos, setAuditContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowAudit, setSelectedRowAudit] = useState<SenderIdAuditData | null>(null);
  const [isAuditDetailOpen, setIsAuditDetailOpen] = useState(false);

  const handleContextMenu = (e: React.MouseEvent, rule: SenderIdRuleData) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowRule(rule);
    setAuditContextMenuPos(null);
  };

  const handleAuditContextMenu = (e: React.MouseEvent, audit: SenderIdAuditData) => {
    e.preventDefault();
    setAuditContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedRowAudit(audit);
    setContextMenuPos(null);
  };

  // --- Test / Simulation State ---
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

  // When Client changes, refresh active tab data
  useEffect(() => {
    if (selectedClientId) {
      if (activeTab === "policy") fetchPolicy();
      if (activeTab === "rules") fetchRules();
      if (activeTab === "audit") fetchAudits();
    } else {
      setPolicy(null);
      setRules([]);
      setAudits([]);
      setTestResult(null);
    }
  }, [selectedClientId, activeTab]);

  useEffect(() => {
    if (selectedClientId && activeTab === "rules") {
      fetchRules();
    }
  }, [rulesPage, rulesRowsPerPage]);

  useEffect(() => {
    if (selectedClientId && activeTab === "audit") {
      fetchAudits();
    }
  }, [auditPage, auditRowsPerPage]);

  // --- Helpers ---
  const normalizePolicy = (data: any): SenderIdPolicyData | null => {
    if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
    if (data && typeof data === "object") {
      if (Array.isArray(data.results)) return data.results.length > 0 ? data.results[0] : null;
      if (data.id) return data;
    }
    return null;
  };

  // --- API Fetchers ---
  const fetchPolicy = async () => {
    if (!selectedClientId) return;
    setPolicyLoading(true);
    try {
      const res: any = await getSenderPolicyApi(selectedClientId);
      setPolicy(normalizePolicy(res));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPolicy(null);
      } else {
        toast.error("Failed to load client sender ID policy.");
      }
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchRules = async () => {
    if (!selectedClientId) return;
    setRulesLoading(true);
    try {
      const res = await getSenderRulesApi(selectedClientId, {
        page: rulesPage,
        page_size: rulesRowsPerPage,
      });
      if (Array.isArray(res)) {
        setRules(res);
        setRulesTotal(res.length);
      } else {
        setRules(res.results || []);
        setRulesTotal(res.count || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rules.");
    } finally {
      setRulesLoading(false);
    }
  };

  const handlePolicyToggle = async () => {
    if (!selectedClientId) return;
    const nextActive = !isPolicyActive;
    setIsSavingPolicy(true);
    try {
      if (policy?.id) {
        const payload: Partial<SenderIdPolicyData> = {
          isActive: nextActive,
        };
        if (nextActive && (policy.mode === "DISABLED" || !policy.mode)) {
          payload.mode = currentMode;
        }
        const updated = await updateSenderPolicyApi(selectedClientId, policy.id, payload);
        setPolicy(normalizePolicy(updated) || updated);
      } else {
        try {
          const created = await createSenderPolicyApi(selectedClientId, {
            client: selectedClientId,
            mode: currentMode,
            isActive: nextActive,
          });
          setPolicy(normalizePolicy(created) || created);
        } catch (createErr: any) {
          // If already exists, fetch existing policy and update via PATCH (edit API)
          const existing = await getSenderPolicyApi(selectedClientId);
          const found = normalizePolicy(existing);
          if (found?.id) {
            const updated = await updateSenderPolicyApi(selectedClientId, found.id, {
              isActive: nextActive,
              mode: nextActive && (found.mode === "DISABLED" || !found.mode) ? currentMode : found.mode,
            });
            setPolicy(normalizePolicy(updated) || updated);
          } else {
            throw createErr;
          }
        }
      }
      toast.success(`Authorization policy ${nextActive ? "enabled" : "disabled"}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.client?.[0] || err?.response?.data?.detail || "Failed to update policy status");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleModeChange = async (newMode: "WHITELIST_ONLY" | "BLACKLIST_ONLY") => {
    if (!selectedClientId || newMode === currentMode) return;
    setIsSavingPolicy(true);
    try {
      if (policy?.id) {
        const updated = await updateSenderPolicyApi(selectedClientId, policy.id, {
          mode: newMode,
        });
        setPolicy(normalizePolicy(updated) || updated);
      } else {
        try {
          const created = await createSenderPolicyApi(selectedClientId, {
            client: selectedClientId,
            mode: newMode,
            isActive: isPolicyActive,
          });
          setPolicy(normalizePolicy(created) || created);
        } catch (createErr: any) {
          const existing = await getSenderPolicyApi(selectedClientId);
          const found = normalizePolicy(existing);
          if (found?.id) {
            const updated = await updateSenderPolicyApi(selectedClientId, found.id, {
              mode: newMode,
            });
            setPolicy(normalizePolicy(updated) || updated);
          } else {
            throw createErr;
          }
        }
      }
      toast.success(
        `Evaluation mode set to ${newMode === "WHITELIST_ONLY" ? "Whitelist Only" : "Blacklist Only"}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.client?.[0] || err?.response?.data?.detail || "Failed to update evaluation mode");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // --- Rule Logic ---
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !editingRule?.senderId) return;
    setIsSavingRule(true);
    try {
      if (editingRule.id) {
        await updateSenderRuleApi(selectedClientId, editingRule.id, editingRule);
        toast.success("Rule updated successfully.");
      } else {
        await createSenderRuleApi(selectedClientId, editingRule as SenderIdRuleData);
        toast.success("Rule created successfully.");
      }
      setIsRuleFormOpen(false);
      setEditingRule(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClientId || !deleteRuleTarget?.id) return;
    setIsDeletingRule(true);
    try {
      await deleteSenderRuleApi(selectedClientId, deleteRuleTarget.id);
      toast.success("Rule deleted successfully.");
      setDeleteRuleTarget(null);
      setSelectedRowRule(null);
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
    if (!selectedClientId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testSenderPolicyApi(selectedClientId, {
        sender_id: testSenderId,
        destination: testDestination,
      });
      setTestResult(res);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Simulation failed.");
    } finally {
      setTestLoading(false);
    }
  };

  // --- Audit Logic ---
  const fetchAudits = async () => {
    if (!selectedClientId) return;
    setAuditLoading(true);
    try {
      const res: any = await getSenderAuditLogsApi(selectedClientId, {
        page: auditPage,
        page_size: auditRowsPerPage,
      });
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

  return (
    <div
      className="w-full space-y-4"
      onClick={() => {
        setContextMenuPos(null);
        setAuditContextMenuPos(null);
      }}
    >
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
            <span className="font-semibold">Instruction:</span> Please select a client to configure its Sender ID authorization policy, rules, simulation, and audit logs.
          </p>
        </div>
      )}

      {/* Main Configuration Card when Client Selected */}
      {selectedClientId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Sub Tabs Navigation */}
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
              <span>Rules Management</span>
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
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeTab === "audit"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("audit")}
            >
              <Activity size={15} />
              <span>Audit Logs</span>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* POLICY TAB */}
            {activeTab === "policy" && (
              <div className="max-w-2xl space-y-4">
                {policyLoading ? (
                  <LoadingSpinner size="sm" text="Loading policy..." className="py-8" />
                ) : (
                  <div className="p-4 sm:p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900/60 space-y-5">
                    {/* Master Switch */}
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
                          Enable Authorization
                        </h3>
                        <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-1">
                          Enforces Sender ID filtering before routing SMS traffic. When disabled, policy enforcement is completely bypassed.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPolicyActive}
                        disabled={isSavingPolicy}
                        onClick={handlePolicyToggle}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isPolicyActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                        } ${isSavingPolicy ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isPolicyActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Evaluation Mode Choice - Shown when policy is active */}
                    {isPolicyActive && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white">
                            Evaluation Mode
                          </label>
                          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                            Choose how Sender ID rules are evaluated for this client.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div
                            onClick={() => !isSavingPolicy && handleModeChange("WHITELIST_ONLY")}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              currentMode === "WHITELIST_ONLY"
                                ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary shadow-sm"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                            } ${isSavingPolicy ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="evalMode"
                                checked={currentMode === "WHITELIST_ONLY"}
                                onChange={() => handleModeChange("WHITELIST_ONLY")}
                                disabled={isSavingPolicy}
                                className="text-primary focus:ring-primary h-4 w-4"
                              />
                              <span className="text-sm font-semibold text-text-primary dark:text-white">
                                Whitelist Only
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5 pl-6">
                              Only sender IDs matching active <strong>ALLOW</strong> rules are permitted. All others are rejected.
                            </p>
                          </div>

                          <div
                            onClick={() => !isSavingPolicy && handleModeChange("BLACKLIST_ONLY")}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              currentMode === "BLACKLIST_ONLY"
                                ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary shadow-sm"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                            } ${isSavingPolicy ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="evalMode"
                                checked={currentMode === "BLACKLIST_ONLY"}
                                onChange={() => handleModeChange("BLACKLIST_ONLY")}
                                disabled={isSavingPolicy}
                                className="text-primary focus:ring-primary h-4 w-4"
                              />
                              <span className="text-sm font-semibold text-text-primary dark:text-white">
                                Blacklist Only
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1.5 pl-6">
                              All sender IDs are permitted by default unless matched by an active <strong>BLOCK</strong> rule.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === "rules" && (
              <div className="space-y-4">
                <DataTable
                  density="compact"
                  serverSide
                  storageKey="sender_id_rules_page_table"
                  data={rules}
                  totalItems={rulesTotal}
                  currentPage={rulesPage}
                  rowsPerPage={rulesRowsPerPage}
                  onPageChange={setRulesPage}
                  onRowsPerPageChange={setRulesRowsPerPage}
                  isLoading={rulesLoading}
                  headerActions={
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
                  }
                  headers={["Sender ID", "Action", "Country", "Status"]}
                  renderRow={(rule: SenderIdRuleData, index: number) => (
                    <tr
                      key={rule.id || index}
                      onContextMenu={(e) => handleContextMenu(e, rule)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
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
                            {countries.find((c) => c.value === rule.country?.toString())?.iso2 && (
                              <CountryFlag
                                iso2={countries.find((c) => c.value === rule.country?.toString())!.iso2!}
                                width={16}
                                height={12}
                              />
                            )}
                            <span className="text-text-primary dark:text-white font-medium">
                              {countries.find((c) => c.value === rule.country?.toString())?.label ||
                                rule.country}
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
                            label: "View Details",
                            icon: <Eye size={16} />,
                            onClick: () => {
                              setIsRuleDetailOpen(true);
                            },
                          },
                          {
                            label: "Edit Rule",
                            icon: <Edit size={16} />,
                            onClick: () => {
                              setEditingRule(selectedRowRule);
                              setIsRuleFormOpen(true);
                            },
                          },
                          {
                            label: "Delete Rule",
                            icon: <Trash size={16} />,
                            variant: "danger",
                            onClick: () => setDeleteRuleTarget(selectedRowRule),
                          },
                        ]
                      : []
                  }
                  onClose={() => setContextMenuPos(null)}
                />
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === "test" && (
              <div className="space-y-4 max-w-2xl">
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
                        <span>
                          {testResult.matched_rule_description ||
                            testResult.matched_rule_id ||
                            "None"}
                        </span>
                      </li>
                      {testResult.country_id && (
                        <li className="flex justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-1.5">
                          <strong className="text-text-primary dark:text-white">Detected Country:</strong>
                          <span className="flex items-center gap-2">
                            {countries.find((c) => c.value === testResult.country_id?.toString())
                              ?.iso2 && (
                              <CountryFlag
                                iso2={
                                  countries.find(
                                    (c) => c.value === testResult.country_id?.toString()
                                  )!.iso2!
                                }
                                width={16}
                                height={12}
                              />
                            )}
                            <span className="text-text-primary dark:text-white font-medium">
                              {countries.find((c) => c.value === testResult.country_id?.toString())
                                ?.label || testResult.country_id}
                            </span>
                          </span>
                        </li>
                      )}
                      {testResult.evaluation_source && (
                        <li className="flex justify-between">
                          <strong className="text-text-primary dark:text-white">
                            Evaluation Source:
                          </strong>
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
                <DataTable
                  density="compact"
                  serverSide
                  storageKey="sender_id_audit_page_table"
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
                    "SMPP Code",
                  ]}
                  renderRow={(audit: SenderIdAuditData, index: number) => (
                    <tr
                      key={audit.id || index}
                      onContextMenu={(e) => handleAuditContextMenu(e, audit)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs transition-colors cursor-context-menu"
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
                            {countries.find((c) => c.value === audit.country?.toString())?.iso2 && (
                              <CountryFlag
                                iso2={
                                  countries.find(
                                    (c) => c.value === audit.country?.toString()
                                  )!.iso2!
                                }
                                width={14}
                                height={10}
                              />
                            )}
                            <span className="text-text-primary dark:text-white font-medium">
                              {countries.find((c) => c.value === audit.country?.toString())
                                ?.label || audit.country}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-secondary dark:text-gray-400">-</span>
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

                {/* Context Menu for Audits */}
                <ContextMenu
                  position={auditContextMenuPos}
                  items={
                    selectedRowAudit
                      ? [
                          {
                            label: "View Details",
                            icon: <Eye size={16} />,
                            onClick: () => {
                              setIsAuditDetailOpen(true);
                            },
                          },
                        ]
                      : []
                  }
                  onClose={() => setAuditContextMenuPos(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
              onChange={(e) =>
                setEditingRule((prev) => ({ ...prev!, senderId: e.target.value }))
              }
              placeholder="e.g. SENDER_ABC or *"
              required
            />
            <Select
              label="Action"
              value={editingRule?.action || "ALLOW"}
              onChange={(val) =>
                setEditingRule((prev) => ({ ...prev!, action: val as any }))
              }
              options={[
                { label: "Allow", value: "ALLOW" },
                { label: "Block", value: "BLOCK" },
              ]}
              clearable={false}
            />
            <Select
              label="Country (Optional)"
              value={editingRule?.country ? String(editingRule.country) : ""}
              onChange={(val) =>
                setEditingRule((prev) => ({
                  ...prev!,
                  country: val ? Number(val) : null,
                }))
              }
              options={[{ label: "Global (Any Country)", value: "" }, ...countries]}
              placeholder="Global (Any Country)"
            />
            <Select
              label="Status"
              value={editingRule?.isActive !== false ? "true" : "false"}
              onChange={(val) =>
                setEditingRule((prev) => ({ ...prev!, isActive: val === "true" }))
              }
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
            <Button type="submit" variant="primary" disabled={isSavingRule}>
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

      {/* View Rule Detail Modal */}
      <Modal
        isOpen={isRuleDetailOpen}
        onClose={() => {
          setIsRuleDetailOpen(false);
          setSelectedRowRule(null);
        }}
        title="Rule Details"
        className="max-w-xl"
      >
        {selectedRowRule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-text-secondary dark:text-gray-400">Sender ID</div>
                <div className="text-lg font-bold text-text-primary dark:text-white">
                  {selectedRowRule.senderId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={selectedRowRule.action === "ALLOW" ? "ACTIVE" : "FAILED"}
                  customText={selectedRowRule.action}
                />
                <StatusBadge
                  status={selectedRowRule.isActive ? "ACTIVE" : "OFFLINE"}
                  customText={selectedRowRule.isActive ? "Active" : "Inactive"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Country
                </div>
                <div className="flex items-center gap-2">
                  {countries.find((c) => c.value === selectedRowRule.country?.toString())?.iso2 && (
                    <CountryFlag
                      iso2={
                        countries.find((c) => c.value === selectedRowRule.country?.toString())!.iso2!
                      }
                      width={16}
                      height={12}
                    />
                  )}
                  <span className="text-text-primary dark:text-white font-medium">
                    {countries.find((c) => c.value === selectedRowRule.country?.toString())?.label ||
                      (selectedRowRule.country ? String(selectedRowRule.country) : "Global (All Countries)")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Remarks
                </div>
                <div className="text-text-primary dark:text-white">
                  {selectedRowRule.remarks || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Valid From
                </div>
                <div className="text-text-primary dark:text-white">
                  {selectedRowRule.validFrom ? formatDateTime(selectedRowRule.validFrom) : "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Valid To
                </div>
                <div className="text-text-primary dark:text-white">
                  {selectedRowRule.validTo ? formatDateTime(selectedRowRule.validTo) : "-"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsRuleDetailOpen(false);
                  setSelectedRowRule(null);
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsRuleDetailOpen(false);
                  setEditingRule(selectedRowRule);
                  setIsRuleFormOpen(true);
                }}
              >
                Edit Rule
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Audit Detail Modal */}
      <Modal
        isOpen={isAuditDetailOpen}
        onClose={() => {
          setIsAuditDetailOpen(false);
          setSelectedRowAudit(null);
        }}
        title="Audit Log Details"
        className="max-w-2xl"
      >
        {selectedRowAudit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={selectedRowAudit.decision === "ALLOWED" ? "ACTIVE" : "FAILED"}
                  customText={selectedRowAudit.decision}
                />
                <div>
                  <div className="text-xs text-text-secondary dark:text-gray-400">Sender ID</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {selectedRowAudit.senderId}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary dark:text-gray-400">Timestamp</div>
                <div className="text-xs font-medium text-text-primary dark:text-white">
                  {selectedRowAudit.createdAt ? formatDateTime(selectedRowAudit.createdAt) : "-"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Destination MSISDN
                </div>
                <div className="font-mono text-text-primary dark:text-white">
                  {selectedRowAudit.destination || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Country
                </div>
                <div className="flex items-center gap-2">
                  {countries.find((c) => c.value === selectedRowAudit.country?.toString())?.iso2 && (
                    <CountryFlag
                      iso2={
                        countries.find((c) => c.value === selectedRowAudit.country?.toString())!.iso2!
                      }
                      width={16}
                      height={12}
                    />
                  )}
                  <span className="text-text-primary dark:text-white font-medium">
                    {countries.find((c) => c.value === selectedRowAudit.country?.toString())?.label ||
                      selectedRowAudit.country ||
                      "-"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Reason Code
                </div>
                <div className="font-mono font-medium text-text-primary dark:text-white">
                  {selectedRowAudit.reasonCode || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Policy Mode
                </div>
                <div className="text-text-primary dark:text-white">
                  {selectedRowAudit.policyMode || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  SMPP Status / Code
                </div>
                <div className="font-mono text-text-primary dark:text-white">
                  {selectedRowAudit.smppStatus ?? "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  System ID
                </div>
                <div className="font-mono text-text-primary dark:text-white">
                  {selectedRowAudit.systemId || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Client IP
                </div>
                <div className="font-mono text-text-primary dark:text-white">
                  {selectedRowAudit.clientIp || "-"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                  Session ID
                </div>
                <div className="font-mono text-xs text-text-primary dark:text-white break-all">
                  {selectedRowAudit.sessionId || "-"}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
              <div className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">
                Matched Rule
              </div>
              <div className="text-sm text-text-primary dark:text-white font-mono break-all">
                {selectedRowAudit.matched_rule_description ||
                  (selectedRowAudit.matchedRule ? `Rule #${selectedRowAudit.matchedRule}` : "None")}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsAuditDetailOpen(false);
                  setSelectedRowAudit(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
