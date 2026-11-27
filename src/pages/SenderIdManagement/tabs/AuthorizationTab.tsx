import React, { useState, useEffect, useMemo } from "react";
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

interface TableColDef {
  key: string;
  label: string;
}

const DEFAULT_RULE_COLS: TableColDef[] = [
  { key: "sn", label: "S.N." },
  { key: "senderId", label: "Sender ID" },
  { key: "action", label: "Action" },
  { key: "country", label: "Country" },
  { key: "status", label: "Status" },
];

const DEFAULT_AUDIT_COLS: TableColDef[] = [
  { key: "sn", label: "S.N." },
  { key: "createdAt", label: "Date" },
  { key: "systemId", label: "System ID" },
  { key: "clientIp", label: "IP Address" },
  { key: "sessionId", label: "Session ID" },
  { key: "senderId", label: "Sender ID" },
  { key: "destination", label: "Destination" },
  { key: "country", label: "Country" },
  { key: "reasonCode", label: "Reason" },
  { key: "policyMode", label: "Mode" },
  { key: "decision", label: "Decision" },
  { key: "matchedRule", label: "Matched Rule" },
  { key: "smppStatus", label: "SMPP Code" },
];

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

  const isPolicyActive = Boolean(
    policy &&
    policy.mode !== "DISABLED" &&
    (policy.isActive !== undefined
      ? policy.isActive
      : (policy as any).is_active !== undefined
      ? (policy as any).is_active
      : true)
  );
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

  // Rules Advanced Table State (Sort & Reorder)
  const [rulesColumns, setRulesColumns] = useState<TableColDef[]>(DEFAULT_RULE_COLS);
  const [rulesSortConfig, setRulesSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const handleRulesSort = (columnIndex: number) => {
    const col = rulesColumns[columnIndex];
    if (!col || col.key === "sn") return;
    setRulesSortConfig((prev) => {
      if (prev?.key === col.key) {
        if (prev.direction === "asc") return { key: col.key, direction: "desc" };
        return null;
      }
      return { key: col.key, direction: "asc" };
    });
  };

  const handleReorderRulesColumns = (fromIdx: number, toIdx: number) => {
    setRulesColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedRules = useMemo(() => {
    if (!rulesSortConfig) return rules;
    return [...rules].sort((a, b) => {
      let aVal = (a as any)[rulesSortConfig.key];
      let bVal = (b as any)[rulesSortConfig.key];
      if (rulesSortConfig.key === "country") {
        aVal = countries.find((c) => c.value === a.country?.toString())?.label || a.country || "";
        bVal = countries.find((c) => c.value === b.country?.toString())?.label || b.country || "";
      }
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return rulesSortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [rules, rulesSortConfig, countries]);

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

  // Audit Advanced Table State (Sort & Reorder)
  const [auditColumns, setAuditColumns] = useState<TableColDef[]>(DEFAULT_AUDIT_COLS);
  const [auditSortConfig, setAuditSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const handleAuditSort = (columnIndex: number) => {
    const col = auditColumns[columnIndex];
    if (!col || col.key === "sn") return;
    setAuditSortConfig((prev) => {
      if (prev?.key === col.key) {
        if (prev.direction === "asc") return { key: col.key, direction: "desc" };
        return null;
      }
      return { key: col.key, direction: "asc" };
    });
  };

  const handleReorderAuditColumns = (fromIdx: number, toIdx: number) => {
    setAuditColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const sortedAudits = useMemo(() => {
    if (!auditSortConfig) return audits;
    return [...audits].sort((a, b) => {
      let aVal = (a as any)[auditSortConfig.key];
      let bVal = (b as any)[auditSortConfig.key];
      if (auditSortConfig.key === "country") {
        aVal = countries.find((c) => c.value === a.country?.toString())?.label || a.country || "";
        bVal = countries.find((c) => c.value === b.country?.toString())?.label || b.country || "";
      }
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return auditSortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [audits, auditSortConfig, countries]);

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
    let item: any = null;
    if (Array.isArray(data)) item = data.length > 0 ? data[0] : null;
    else if (data && typeof data === "object") {
      if (Array.isArray(data.results)) item = data.results.length > 0 ? data.results[0] : null;
      else if (data.id || data.mode || data.is_active !== undefined || data.isActive !== undefined) item = data;
    }
    if (!item) return null;
    const active =
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : item.is_active !== undefined
        ? Boolean(item.is_active)
        : item.mode !== "DISABLED";
    return {
      ...item,
      id: item.id,
      client: item.client,
      mode: item.mode || "WHITELIST_ONLY",
      isActive: active,
      is_active: active,
    };
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
    const targetMode = nextActive
      ? (policy?.mode && policy.mode !== "DISABLED" ? policy.mode : currentMode)
      : "DISABLED";

    setIsSavingPolicy(true);
    try {
      const payload: any = {
        isActive: nextActive,
        is_active: nextActive,
        mode: targetMode,
      };

      if (policy?.id) {
        const updated = await updateSenderPolicyApi(selectedClientId, policy.id, payload);
        const normalized = normalizePolicy(updated);
        setPolicy(
          normalized
            ? { ...normalized, isActive: nextActive, is_active: nextActive, mode: targetMode }
            : ({ ...(policy || {}), id: policy?.id, client: selectedClientId, ...payload } as any)
        );
      } else {
        try {
          const createPayload = {
            client: selectedClientId,
            ...payload,
          };
          const created = await createSenderPolicyApi(selectedClientId, createPayload);
          const normalized = normalizePolicy(created);
          setPolicy(
            normalized
              ? { ...normalized, isActive: nextActive, is_active: nextActive, mode: targetMode }
              : ({ id: (created as any)?.id, client: selectedClientId, ...payload } as any)
          );
        } catch (createErr: any) {
          // If already exists, fetch existing policy and update via PATCH (edit API)
          const existing = await getSenderPolicyApi(selectedClientId);
          const found = normalizePolicy(existing);
          if (found?.id) {
            const updated = await updateSenderPolicyApi(selectedClientId, found.id, payload);
            const normalized = normalizePolicy(updated);
            setPolicy(
              normalized
                ? { ...normalized, isActive: nextActive, is_active: nextActive, mode: targetMode }
                : ({ ...found, ...payload } as any)
            );
          } else {
            throw createErr;
          }
        }
      }
      if (nextActive) {
        toast.success("Authorization policy enabled");
      } else {
        toast.error("Authorization policy disabled");
      }
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
      const payload: any = {
        mode: newMode,
        isActive: true,
        is_active: true,
      };

      if (policy?.id) {
        const updated = await updateSenderPolicyApi(selectedClientId, policy.id, payload);
        const normalized = normalizePolicy(updated);
        setPolicy(
          normalized
            ? { ...normalized, mode: newMode, isActive: true, is_active: true }
            : ({ ...(policy || {}), mode: newMode, isActive: true, is_active: true } as any)
        );
      } else {
        try {
          const createPayload = {
            client: selectedClientId,
            ...payload,
          };
          const created = await createSenderPolicyApi(selectedClientId, createPayload);
          const normalized = normalizePolicy(created);
          setPolicy(
            normalized
              ? { ...normalized, mode: newMode, isActive: true, is_active: true }
              : ({ id: (created as any)?.id, client: selectedClientId, ...payload } as any)
          );
        } catch (createErr: any) {
          const existing = await getSenderPolicyApi(selectedClientId);
          const found = normalizePolicy(existing);
          if (found?.id) {
            const updated = await updateSenderPolicyApi(selectedClientId, found.id, payload);
            const normalized = normalizePolicy(updated);
            setPolicy(
              normalized
                ? { ...normalized, mode: newMode, isActive: true, is_active: true }
                : ({ ...found, mode: newMode, isActive: true, is_active: true } as any)
            );
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
              <div className="w-full space-y-4">
                {policyLoading ? (
                  <LoadingSpinner size="sm" text="Loading policy..." className="py-8" />
                ) : (
                  <div className="p-5 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm space-y-5">
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
                      <div className="pt-5 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white">
                            Evaluation Mode
                          </label>
                          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                            Choose how Sender ID rules are evaluated for this client.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div
                            onClick={() => !isSavingPolicy && handleModeChange("WHITELIST_ONLY")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
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
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
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
                  data={sortedRules}
                  totalItems={rulesTotal}
                  currentPage={rulesPage}
                  rowsPerPage={rulesRowsPerPage}
                  onPageChange={setRulesPage}
                  onRowsPerPageChange={setRulesRowsPerPage}
                  isLoading={rulesLoading}
                  headers={rulesColumns.map((c) => c.label)}
                  onSort={handleRulesSort}
                  sortColumnIndex={
                    rulesSortConfig ? rulesColumns.findIndex((c) => c.key === rulesSortConfig.key) : null
                  }
                  sortDirection={rulesSortConfig?.direction || null}
                  onReorderColumns={handleReorderRulesColumns}
                  resizableColumns={true}
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
                  renderRow={(rule: SenderIdRuleData, index: number) => {
                    const rowNumber = (rulesPage - 1) * rulesRowsPerPage + index + 1;
                    return (
                      <tr
                        key={rule.id || index}
                        onContextMenu={(e) => handleContextMenu(e, rule)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
                      >
                        {rulesColumns.map((col) => {
                          if (col.key === "sn") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-primary dark:text-white">
                                {rowNumber}
                              </td>
                            );
                          }
                          if (col.key === "senderId") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
                                <span
                                  className="font-semibold text-primary cursor-pointer hover:underline"
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setIsRuleFormOpen(true);
                                  }}
                                >
                                  {rule.senderId}
                                </span>
                              </td>
                            );
                          }
                          if (col.key === "action") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
                                <StatusBadge
                                  status={rule.action === "ALLOW" ? "ACTIVE" : "FAILED"}
                                  customText={rule.action}
                                />
                              </td>
                            );
                          }
                          if (col.key === "country") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                                {rule.country ? (
                                  <div className="flex items-center gap-2">
                                    {countries.find((c) => c.value === rule.country?.toString())?.iso2 && (
                                      <CountryFlag
                                        iso2={countries.find((c) => c.value === rule.country?.toString())!.iso2!}
                                        width={16}
                                        height={12}
                                      />
                                    )}
                                    <span>
                                      {countries.find((c) => c.value === rule.country?.toString())?.label ||
                                        rule.country}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-text-secondary dark:text-gray-400">Global</span>
                                )}
                              </td>
                            );
                          }
                          if (col.key === "status") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
                                <StatusBadge
                                  status={rule.isActive ? "ACTIVE" : "OFFLINE"}
                                  customText={rule.isActive ? "Active" : "Inactive"}
                                />
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    );
                  }}
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
              <div className="space-y-4 w-full">
                <form
                  onSubmit={handleTestPolicy}
                  className="space-y-4 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  data={sortedAudits}
                  totalItems={auditTotal}
                  currentPage={auditPage}
                  rowsPerPage={auditRowsPerPage}
                  onPageChange={setAuditPage}
                  onRowsPerPageChange={setAuditRowsPerPage}
                  isLoading={auditLoading}
                  headers={auditColumns.map((c) => c.label)}
                  onSort={handleAuditSort}
                  sortColumnIndex={
                    auditSortConfig ? auditColumns.findIndex((c) => c.key === auditSortConfig.key) : null
                  }
                  sortDirection={auditSortConfig?.direction || null}
                  onReorderColumns={handleReorderAuditColumns}
                  resizableColumns={true}
                  renderRow={(audit: SenderIdAuditData, index: number) => {
                    const rowNumber = (auditPage - 1) * auditRowsPerPage + index + 1;
                    return (
                      <tr
                        key={audit.id || index}
                        onContextMenu={(e) => handleAuditContextMenu(e, audit)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm transition-colors cursor-context-menu"
                      >
                        {auditColumns.map((col) => {
                          if (col.key === "sn") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-primary dark:text-white">
                                {rowNumber}
                              </td>
                            );
                          }
                          if (col.key === "createdAt") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">
                                {audit.createdAt ? formatDateTime(audit.createdAt) : "-"}
                              </td>
                            );
                          }
                          if (col.key === "systemId") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-primary dark:text-white">
                                {audit.systemId || "-"}
                              </td>
                            );
                          }
                          if (col.key === "clientIp") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-secondary dark:text-gray-300">
                                {audit.clientIp || "-"}
                              </td>
                            );
                          }
                          if (col.key === "sessionId") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-secondary dark:text-gray-300">
                                {audit.sessionId || "-"}
                              </td>
                            );
                          }
                          if (col.key === "senderId") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
                                <span
                                  className="font-semibold text-primary cursor-pointer hover:underline"
                                  onClick={() => {
                                    setSelectedRowAudit(audit);
                                    setIsAuditDetailOpen(true);
                                  }}
                                >
                                  {audit.senderId}
                                </span>
                              </td>
                            );
                          }
                          if (col.key === "destination") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-primary dark:text-white">
                                {audit.destination}
                              </td>
                            );
                          }
                          if (col.key === "country") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
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
                                    <span className="text-text-secondary dark:text-gray-300">
                                      {countries.find((c) => c.value === audit.country?.toString())
                                        ?.label || audit.country}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-text-secondary dark:text-gray-400">-</span>
                                )}
                              </td>
                            );
                          }
                          if (col.key === "reasonCode") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 font-mono">
                                {audit.reasonCode}
                              </td>
                            );
                          }
                          if (col.key === "policyMode") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300">
                                {audit.policyMode}
                              </td>
                            );
                          }
                          if (col.key === "decision") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm">
                                <StatusBadge
                                  status={audit.decision === "ALLOWED" ? "ACTIVE" : "FAILED"}
                                  customText={audit.decision}
                                />
                              </td>
                            );
                          }
                          if (col.key === "matchedRule") {
                            return (
                              <td
                                key={col.key}
                                className="px-4 py-3.5 text-sm text-text-secondary dark:text-gray-300 max-w-[140px] truncate"
                                title={audit.matched_rule_description || String(audit.matchedRule || "")}
                              >
                                {audit.matched_rule_description || audit.matchedRule || "-"}
                              </td>
                            );
                          }
                          if (col.key === "smppStatus") {
                            return (
                              <td key={col.key} className="px-4 py-3.5 text-sm font-mono text-text-secondary dark:text-gray-300">
                                {audit.smppStatus}
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    );
                  }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sender ID"
                value={selectedRowRule.senderId || "-"}
                disabled
              />
              <Input
                label="Action"
                value={selectedRowRule.action || "-"}
                disabled
              />
              <Input
                label="Status"
                value={selectedRowRule.isActive ? "Active" : "Inactive"}
                disabled
              />
              <Input
                label="Country"
                value={
                  countries.find((c) => c.value === selectedRowRule.country?.toString())?.label ||
                  (selectedRowRule.country ? String(selectedRowRule.country) : "Global (All Countries)")
                }
                disabled
              />
              <Input
                label="Valid From"
                value={selectedRowRule.validFrom ? formatDateTime(selectedRowRule.validFrom) : "-"}
                disabled
              />
              <Input
                label="Valid To"
                value={selectedRowRule.validTo ? formatDateTime(selectedRowRule.validTo) : "-"}
                disabled
              />
            </div>

            <Input
              label="Remarks"
              value={selectedRowRule.remarks || "-"}
              disabled
            />

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sender ID"
                value={selectedRowAudit.senderId || "-"}
                disabled
              />
              <Input
                label="Decision"
                value={selectedRowAudit.decision || "-"}
                disabled
              />
              <Input
                label="Timestamp"
                value={selectedRowAudit.createdAt ? formatDateTime(selectedRowAudit.createdAt) : "-"}
                disabled
              />
              <Input
                label="Destination MSISDN"
                value={selectedRowAudit.destination || "-"}
                disabled
              />
              <Input
                label="Country"
                value={
                  countries.find((c) => c.value === selectedRowAudit.country?.toString())?.label ||
                  (selectedRowAudit.country ? String(selectedRowAudit.country) : "-")
                }
                disabled
              />
              <Input
                label="Reason Code"
                value={selectedRowAudit.reasonCode || "-"}
                disabled
              />
              <Input
                label="Policy Mode"
                value={selectedRowAudit.policyMode || "-"}
                disabled
              />
              <Input
                label="SMPP Status / Code"
                value={String(selectedRowAudit.smppStatus ?? "-")}
                disabled
              />
              <Input
                label="System ID"
                value={selectedRowAudit.systemId || "-"}
                disabled
              />
              <Input
                label="Client IP"
                value={selectedRowAudit.clientIp || "-"}
                disabled
              />
              <Input
                label="Session ID"
                value={selectedRowAudit.sessionId || "-"}
                disabled
              />
              <Input
                label="Matched Rule"
                value={
                  selectedRowAudit.matched_rule_description ||
                  (selectedRowAudit.matchedRule ? `Rule #${selectedRowAudit.matchedRule}` : "None")
                }
                disabled
              />
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
