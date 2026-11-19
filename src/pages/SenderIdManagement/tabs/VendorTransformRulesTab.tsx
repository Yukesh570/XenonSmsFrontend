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
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ContextMenu from "../../../components/ui/ContextMenu";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";

import type {
  VendorTransformPolicy,
  VendorTransformRule,
  VendorTransformAction,
  VendorTransformMatchType,
} from "../../../api/authorizationApi/vendorTransformApi";
import {
  getVendorTransformPoliciesApi,
  createVendorTransformPolicyApi,
  updateVendorTransformPolicyApi,
  getVendorTransformRulesApi,
  createVendorTransformRuleApi,
  updateVendorTransformRuleApi,
  deleteVendorTransformRuleApi,
  validateVendorTransformRuleApi,
  getVendorTransformCacheStatusApi,
  rebuildVendorTransformCacheApi,
  getClientRouteVendorsApi,
} from "../../../api/authorizationApi/vendorTransformApi";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";
import { getSenderPoolsApi, type SenderPool } from "../../../api/authorizationApi/senderPoolApi";

interface VendorTransformRulesTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
  countries: any[];
}

interface ColumnDef {
  key: string;
  label: string;
  className?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "priority", label: "Priority", className: "px-4 py-3 font-mono text-xs w-16" },
  { key: "name", label: "Rule Name", className: "px-4 py-3 font-semibold text-text-primary dark:text-white" },
  { key: "targetEntity", label: "Target", className: "px-4 py-3 w-28" },
  { key: "vendor", label: "Vendor", className: "px-4 py-3" },
  { key: "country", label: "Country", className: "px-4 py-3" },
  { key: "match", label: "Match Criteria", className: "px-4 py-3 font-mono text-xs" },
  { key: "action", label: "Action", className: "px-4 py-3" },
  { key: "replacement", label: "Replacement / Output", className: "px-4 py-3 font-mono text-xs" },
  { key: "status", label: "Status", className: "px-4 py-3 w-24" },
];

export const VendorTransformRulesTab: React.FC<VendorTransformRulesTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
  countries,
}) => {
  const [innerTab, setInnerTab] = useState<"policy" | "rules">("rules");
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<VendorTransformPolicy | null>(null);
  const [rules, setRules] = useState<VendorTransformRule[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [clientVendors, setClientVendors] = useState<{ id: number; profileName: string }[]>([]);
  const [modalVendors, setModalVendors] = useState<{ id: number; profileName: string }[]>([]);
  const [pools, setPools] = useState<SenderPool[]>([]);

  // Filters
  const [filterVendorId, setFilterVendorId] = useState<string>("");
  const [filterCountryId, setFilterCountryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Rule Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<Partial<VendorTransformRule>>({
    name: "",
    targetEntity: "SENDER_ID",
    matchType: "EXACT",
    pattern: "",
    action: "FIXED_REPLACE",
    replacement: "",
    truncateLength: 11,
    priority: 100,
    stopProcessing: true,
    status: "ACTIVE",
    isActive: true,
  });

  // Context Menu & Delete Modal
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowRule, setSelectedRowRule] = useState<VendorTransformRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache state
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [isRebuildingCache, setIsRebuildingCache] = useState(false);

  // Load vendors once
  useEffect(() => {
    getVendorsApi(undefined, 1, 1000)
      .then((res: any) => {
        const vList = res?.results || (Array.isArray(res) ? res : []);
        setVendors(vList);
      })
      .catch((e) => console.error("Failed to load vendors", e));
  }, []);

  // Load client data when selected
  const loadClientData = async (cId: number) => {
    setLoading(true);
    try {
      const [policiesRes, rulesRes, poolsRes, clientVendorsRes] = await Promise.all([
        getVendorTransformPoliciesApi(cId).catch(() => []),
        getVendorTransformRulesApi({ client: cId }).catch(() => []),
        getSenderPoolsApi(cId).catch(() => []),
        getClientRouteVendorsApi(cId).catch(() => []),
      ]);

      const foundPolicy = Array.isArray(policiesRes) && policiesRes.length > 0 ? policiesRes[0] : null;
      setPolicy(foundPolicy);
      setRules(rulesRes);
      setPools(poolsRes);
      setClientVendors(clientVendorsRes);
      setModalVendors(clientVendorsRes);

      // Cache status
      getVendorTransformCacheStatusApi({ client: cId })
        .then((cs) => setCacheStatus(cs))
        .catch(() => setCacheStatus(null));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load vendor transformation rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      loadClientData(selectedClientId);
    } else {
      setPolicy(null);
      setRules([]);
      setClientVendors([]);
      setModalVendors([]);
      setCacheStatus(null);
    }
  }, [selectedClientId]);

  // Update modal vendors when Target Country in rule modal changes
  useEffect(() => {
    if (selectedClientId && showModal) {
      getClientRouteVendorsApi(selectedClientId, ruleFormData.country || null)
        .then((scoped) => {
          if (scoped && scoped.length > 0) {
            setModalVendors(scoped);
          } else {
            setModalVendors(clientVendors);
          }
        })
        .catch(() => setModalVendors(clientVendors));
    } else {
      setModalVendors(clientVendors);
    }
  }, [selectedClientId, ruleFormData.country, showModal, clientVendors]);

  // Handle Policy update or create
  const handleSavePolicy = async (updates: Partial<VendorTransformPolicy>) => {
    if (!selectedClientId) return;
    try {
      if (policy && policy.id) {
        const updated = await updateVendorTransformPolicyApi(policy.id, updates);
        setPolicy(updated);
        toast.success("Vendor transform policy updated successfully");
      } else {
        const created = await createVendorTransformPolicyApi({
          client: selectedClientId,
          isActive: true,
          failureMode: "FAIL_CLOSED",
          allowSenderRewrite: true,
          maxCandidates: 10,
          ...updates,
        });
        setPolicy(created);
        toast.success("Vendor transform policy created successfully");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to save policy");
    }
  };

  // Cache Rebuild
  const handleRebuildCache = async () => {
    if (!selectedClientId) return;
    setIsRebuildingCache(true);
    try {
      await rebuildVendorTransformCacheApi({ client: selectedClientId });
      toast.success("Redis cache invalidated and generation bumped!");
      const cs = await getVendorTransformCacheStatusApi({ client: selectedClientId });
      setCacheStatus(cs);
    } catch (e) {
      toast.error("Failed to invalidate cache");
    } finally {
      setIsRebuildingCache(false);
    }
  };

  // Rule pre-validation
  const handleValidateRule = async () => {
    setIsValidating(true);
    try {
      const res = await validateVendorTransformRuleApi({
        ...ruleFormData,
        client: selectedClientId || undefined,
      });
      if (res.valid) {
        toast.success("Rule configuration and regex pattern are valid!");
      } else {
        toast.error("Validation failed: " + JSON.stringify(res.errors));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.errors?.pattern?.[0] || e.response?.data?.error || "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  // Submit Rule Form
  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    if (!ruleFormData.name?.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    if (ruleFormData.action === "FIXED_REPLACE" && !ruleFormData.replacement?.trim()) {
      toast.error("Please provide a replacement Sender ID");
      return;
    }

    if (
      ["APPROVED_POOL_SEQUENTIAL", "APPROVED_POOL_RANDOM"].includes(ruleFormData.action || "") &&
      !ruleFormData.senderPool
    ) {
      toast.error("Please select a Sender Pool");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<VendorTransformRule> = {
        ...ruleFormData,
        client: selectedClientId,
        vendor: ruleFormData.vendor ? Number(ruleFormData.vendor) : null,
        country: ruleFormData.country ? Number(ruleFormData.country) : null,
        senderPool: ruleFormData.senderPool ? Number(ruleFormData.senderPool) : null,
        replacementList: ruleFormData.replacementList ? Number(ruleFormData.replacementList) : null,
      };

      if (editingRuleId) {
        await updateVendorTransformRuleApi(editingRuleId, payload);
        toast.success("Vendor transform rule updated successfully");
      } else {
        await createVendorTransformRuleApi(payload);
        toast.success("Vendor transform rule created successfully");
      }

      setShowModal(false);
      setEditingRuleId(null);
      loadClientData(selectedClientId);
    } catch (e: any) {
      console.error(e);
      const errMsg =
        e.response?.data?.pattern?.[0] ||
        e.response?.data?.senderPool?.[0] ||
        e.response?.data?.replacement?.[0] ||
        e.response?.data?.error ||
        "Failed to save vendor transform rule";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRule = (rule: VendorTransformRule) => {
    setEditingRuleId(rule.id!);
    setRuleFormData({
      ...rule,
      vendor: rule.vendor || null,
      country: rule.country || null,
      senderPool: rule.senderPool || null,
      replacementList: rule.replacementList || null,
    });
    setShowModal(true);
    setContextMenuPos(null);
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId || !selectedClientId) return;
    setIsDeleting(true);
    try {
      await deleteVendorTransformRuleApi(deleteRuleId);
      toast.success("Vendor transform rule deleted successfully");
      setDeleteRuleId(null);
      setSelectedRowRule(null);
      loadClientData(selectedClientId);
    } catch (e) {
      toast.error("Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter rules
  const filteredRules = rules.filter((r) => {
    if (filterVendorId && String(r.vendor) !== filterVendorId) return false;
    if (filterCountryId && String(r.country) !== filterCountryId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchPattern = r.pattern?.toLowerCase().includes(q);
      const matchRepl = r.replacement?.toLowerCase().includes(q);
      const matchVendor = r.vendor__profileName?.toLowerCase().includes(q);
      if (!matchName && !matchPattern && !matchRepl && !matchVendor) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Client Selector Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full max-w-md">
            <Select
              label="Client"
              placeholder="Select Client"
              value={selectedClientId ? String(selectedClientId) : ""}
              onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
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

      {!selectedClientId && (
        <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-2.5 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={16} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please select a client to configure Vendor & Route-Aware transformation policies, rules, and cache settings.
          </p>
        </div>
      )}

      {selectedClientId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Sub Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-2 gap-6 bg-white dark:bg-gray-800">
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                innerTab === "rules"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setInnerTab("rules")}
            >
              <List size={15} />
              <span>Vendor / Route Rules ({rules.length})</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                innerTab === "policy"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setInnerTab("policy")}
            >
              <Settings size={15} />
              <span>Client Policy & Cache</span>
            </button>
          </div>

          {/* TAB 1: RULES TABLE */}
          {innerTab === "rules" && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="w-48">
                    <Select
                      placeholder="All Vendors"
                      value={filterVendorId}
                      onChange={(v) => setFilterVendorId(v)}
                      options={[
                        { value: "", label: "All Vendors" },
                        ...(clientVendors.length > 0 ? clientVendors : vendors).map((v) => ({
                          value: String(v.id),
                          label: v.profileName || `Vendor ${v.id}`,
                        })),
                      ]}
                    />
                  </div>
                  <div className="w-44">
                    <Select
                      placeholder="All Countries"
                      value={filterCountryId}
                      onChange={(c) => setFilterCountryId(c)}
                      options={[
                        { value: "", label: "All Countries" },
                        ...countries.map((c) => ({ value: String(c.id), label: c.name })),
                      ]}
                    />
                  </div>
                  <div className="w-56">
                    <Input
                      placeholder="Search rule, pattern, vendor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setEditingRuleId(null);
                    setRuleFormData({
                      name: "",
                      targetEntity: "SENDER_ID",
                      matchType: "EXACT",
                      pattern: "",
                      action: "FIXED_REPLACE",
                      replacement: "",
                      truncateLength: 11,
                      priority: 100,
                      stopProcessing: true,
                      status: "ACTIVE",
                      isActive: true,
                    });
                    setShowModal(true);
                  }}
                  leftIcon={<Plus size={16} />}
                >
                  Add Vendor Rule
                </Button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner size="md" text="Loading vendor transform rules..." />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-text-secondary dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {DEFAULT_COLUMNS.map((col) => (
                          <th key={col.key} className={col.className}>
                            {col.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRules.length === 0 ? (
                        <tr>
                          <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-8 text-center text-gray-400 text-xs">
                            No vendor transform rules configured for this client.
                          </td>
                        </tr>
                      ) : (
                        filteredRules.map((rule) => {
                          const countryObj = countries.find((c) => c.id === rule.country);
                          return (
                            <tr
                              key={rule.id}
                              className="hover:bg-gray-50/60 dark:hover:bg-gray-750 transition-colors"
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenuPos({ x: e.clientX, y: e.clientY });
                                setSelectedRowRule(rule);
                              }}
                            >
                              <td className="px-4 py-3 font-mono text-xs">{rule.priority}</td>
                              <td className="px-4 py-3 font-medium text-text-primary dark:text-white">
                                {rule.name}
                                {rule.remarks && (
                                  <span className="block text-[11px] text-gray-400 font-normal">
                                    {rule.remarks}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    rule.targetEntity === "DESTINATION"
                                      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                      : rule.targetEntity === "MESSAGE_TEXT"
                                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  }`}
                                >
                                  {rule.targetEntity === "DESTINATION"
                                    ? "Destination"
                                    : rule.targetEntity === "MESSAGE_TEXT"
                                    ? "Message Text"
                                    : "Sender ID"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {rule.vendor__profileName ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                                    {rule.vendor__profileName}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs italic">All Vendors</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {countryObj ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <CountryFlag iso2={countryObj.iso2} />
                                    <span>{countryObj.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs italic">Global</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">
                                <span className="text-gray-500 dark:text-gray-400">{rule.matchType}:</span>{" "}
                                <span className="font-semibold text-text-primary dark:text-white">
                                  {rule.pattern || "*"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                  {rule.action}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">
                                {rule.action === "FIXED_REPLACE" && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {rule.replacement}
                                  </span>
                                )}
                                {rule.action === "TRUNCATE" && (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Cut to {rule.truncateLength} chars
                                  </span>
                                )}
                                {rule.action === "APPROVED_POOL_SEQUENTIAL" && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Pool Seq (#{rule.senderPool})
                                  </span>
                                )}
                                {rule.action === "APPROVED_POOL_RANDOM" && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Pool Rand (#{rule.senderPool})
                                  </span>
                                )}
                                {rule.action === "NO_CHANGE" && <span className="text-gray-400">-</span>}
                                {rule.action === "STRIP" && <span className="text-rose-500">Strip</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    rule.isActive && rule.status === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {rule.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditRule(rule)}
                                    title="Edit Rule"
                                  >
                                    <Edit size={14} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteRuleId(rule.id!);
                                      setSelectedRowRule(rule);
                                    }}
                                    title="Delete Rule"
                                    className="text-rose-600 hover:text-rose-700"
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POLICY & CACHE SETTINGS */}
          {innerTab === "policy" && (
            <div className="p-6 max-w-3xl space-y-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/50 dark:bg-gray-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-text-primary dark:text-white">
                      Vendor Transformation Engine Status
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      When enabled, routes are validated for vendor compatibility and transformed dynamically.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.isActive || false}
                    onChange={(checked) => handleSavePolicy({ isActive: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                      Failure Mode
                    </label>
                    <Select
                      value={policy?.failureMode || "FAIL_CLOSED"}
                      onChange={(v) => handleSavePolicy({ failureMode: v as any })}
                      options={[
                        { value: "FAIL_CLOSED", label: "FAIL_CLOSED (Strict - Exclude incompatible route)" },
                        { value: "FAIL_OPEN", label: "FAIL_OPEN (Send effective payload as-is)" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-300 mb-1">
                      Max Candidate Routes to Evaluate
                    </label>
                    <Input
                      type="number"
                      value={policy?.maxCandidates || 10}
                      onChange={(e) => handleSavePolicy({ maxCandidates: Number(e.target.value) || 10 })}
                    />
                    <span className="text-[11px] text-gray-400">
                      Upper bound for route preflight checks (default 10).
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Sender ID Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to rewrite Sender IDs to match downstream vendor format.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowSenderRewrite ?? true}
                    onChange={(checked) => handleSavePolicy({ allowSenderRewrite: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Destination Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to adapt destination numbers (e.g. vendor-specific prefixes 00/+).
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowDestinationRewrite ?? false}
                    onChange={(checked) => handleSavePolicy({ allowDestinationRewrite: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Allow Message Text Rewrite
                    </p>
                    <p className="text-xs text-gray-400">
                      Authorize rules to adapt message content (e.g. append vendor opt-out footers or regex).
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={policy?.allowTextRewrite ?? false}
                    onChange={(checked) => handleSavePolicy({ allowTextRewrite: checked })}
                  />
                </div>
              </div>

              {/* Cache Management Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
                      <RefreshCw size={15} className="text-blue-500" />
                      Redis Warm-Cache & Generation Status
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Generation: <span className="font-mono font-bold text-primary">{cacheStatus?.client?.generation || policy?.configGeneration || 1}</span> | 
                      Cached: <span className="font-semibold">{cacheStatus?.client?.policy_cached ? "YES" : "NO"}</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    isLoading={isRebuildingCache}
                    onClick={handleRebuildCache}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Invalidate & Rebuild Cache
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT RULE MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRuleId ? "Edit Vendor Transform Rule" : "Add Vendor Transform Rule"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmitRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Rule Name *</label>
              <Input
                placeholder="e.g. India Vendor X Numeric Rewrite"
                value={ruleFormData.name || ""}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Target Entity *</label>
              <Select
                value={ruleFormData.targetEntity || "SENDER_ID"}
                onChange={(t) => {
                  const target = t as any;
                  let defaultAction: any = "FIXED_REPLACE";
                  if (target === "DESTINATION") defaultAction = "PREFIX_ADD";
                  if (target === "MESSAGE_TEXT") defaultAction = "FIXED_REPLACE";
                  setRuleFormData({
                    ...ruleFormData,
                    targetEntity: target,
                    action: defaultAction,
                  });
                }}
                options={[
                  { value: "SENDER_ID", label: "Sender ID" },
                  { value: "DESTINATION", label: "Destination Number" },
                  { value: "MESSAGE_TEXT", label: "Message Text / SMS Content" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Target Vendor (Optional)
                {modalVendors.length > 0 && (
                  <span className="text-[10px] text-primary ml-1.5 font-normal">
                    (Filtered to client's Route Group{ruleFormData.country ? " & Country" : ""})
                  </span>
                )}
              </label>
              <Select
                placeholder={modalVendors.length > 0 ? "All Vendors in Route Group (Wildcard)" : "All Vendors (Global)"}
                value={ruleFormData.vendor ? String(ruleFormData.vendor) : ""}
                onChange={(v) => setRuleFormData({ ...ruleFormData, vendor: v ? Number(v) : null })}
                options={[
                  {
                    value: "",
                    label: modalVendors.length > 0 ? "All Vendors in Route Group (Wildcard)" : "All Vendors (Global)",
                  },
                  ...(modalVendors.length > 0 ? modalVendors : vendors).map((ven) => ({
                    value: String(ven.id),
                    label: ven.profileName || `Vendor ${ven.id}`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Target Country (Optional)</label>
              <Select
                placeholder="Global (All Countries)"
                value={ruleFormData.country ? String(ruleFormData.country) : ""}
                onChange={(c) => setRuleFormData({ ...ruleFormData, country: c ? Number(c) : null })}
                options={[
                  { value: "", label: "Global (All Countries)" },
                  ...countries.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Match Type</label>
              <Select
                value={ruleFormData.matchType || "EXACT"}
                onChange={(m) => setRuleFormData({ ...ruleFormData, matchType: m as VendorTransformMatchType })}
                options={[
                  { value: "EXACT", label: "EXACT String" },
                  { value: "REGEX", label: "REGEX Pattern" },
                  { value: "ANY", label: "ANY (Match Everything)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Pattern {ruleFormData.matchType !== "ANY" && "*"}
              </label>
              <Input
                placeholder={ruleFormData.matchType === "REGEX" ? "^YANGO.*$" : "YANGO"}
                value={ruleFormData.pattern || ""}
                onChange={(e) => setRuleFormData({ ...ruleFormData, pattern: e.target.value })}
                disabled={ruleFormData.matchType === "ANY"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Action *</label>
              <Select
                value={ruleFormData.action || "FIXED_REPLACE"}
                onChange={(a) => setRuleFormData({ ...ruleFormData, action: a as VendorTransformAction })}
                options={
                  ruleFormData.targetEntity === "DESTINATION"
                    ? [
                        { value: "PREFIX_ADD", label: "PREFIX_ADD (Add prefix digits e.g. 00 or +)" },
                        { value: "PREFIX_REMOVE", label: "PREFIX_REMOVE (Strip prefix digits e.g. 0 or +)" },
                        { value: "FIXED_REPLACE", label: "FIXED_REPLACE (Replace with specific number)" },
                        { value: "NORMALIZE", label: "NORMALIZE (Standardize to E.164 digits)" },
                        { value: "REGEX_REPLACE", label: "REGEX_REPLACE (Regex substitution)" },
                        { value: "NO_CHANGE", label: "NO_CHANGE (Pass-through)" },
                      ]
                    : ruleFormData.targetEntity === "MESSAGE_TEXT"
                    ? [
                        { value: "FIXED_REPLACE", label: "FIXED_REPLACE (Replace full text)" },
                        { value: "PREFIX_ADD", label: "PREFIX_ADD (Prepend text header)" },
                        { value: "REGEX_REPLACE", label: "REGEX_REPLACE (Regex text substitution)" },
                        { value: "NO_CHANGE", label: "NO_CHANGE (Pass-through)" },
                      ]
                    : [
                        { value: "FIXED_REPLACE", label: "FIXED_REPLACE (Replace with approved Sender ID)" },
                        { value: "TRUNCATE", label: "TRUNCATE (Cut to max length)" },
                        { value: "STRIP", label: "STRIP (Remove non-alphanumeric/spaces)" },
                        { value: "APPROVED_POOL_SEQUENTIAL", label: "APPROVED_POOL_SEQUENTIAL (Round Robin)" },
                        { value: "APPROVED_POOL_RANDOM", label: "APPROVED_POOL_RANDOM (Random Pool)" },
                        { value: "NO_CHANGE", label: "NO_CHANGE (Pass-through)" },
                      ]
                }
              />
            </div>

            {["FIXED_REPLACE", "PREFIX_ADD", "PREFIX_REMOVE", "REGEX_REPLACE"].includes(ruleFormData.action || "") && (
              <div className={ruleFormData.targetEntity === "MESSAGE_TEXT" ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold mb-1">
                  {ruleFormData.targetEntity === "DESTINATION"
                    ? ruleFormData.action === "PREFIX_ADD"
                      ? "Prefix to Add *"
                      : ruleFormData.action === "PREFIX_REMOVE"
                      ? "Prefix to Remove *"
                      : "Replacement Destination *"
                    : ruleFormData.targetEntity === "MESSAGE_TEXT"
                    ? ruleFormData.action === "PREFIX_ADD"
                      ? "Header Text to Prepend *"
                      : "Replacement Text / Template *"
                    : "Replacement Sender ID *"}
                </label>
                {ruleFormData.targetEntity === "MESSAGE_TEXT" ? (
                  <textarea
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter message text, disclaimer, or regex replacement..."
                    value={ruleFormData.replacement || ""}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, replacement: e.target.value })}
                    required
                  />
                ) : (
                  <Input
                    placeholder={
                      ruleFormData.targetEntity === "DESTINATION"
                        ? ruleFormData.action === "PREFIX_ADD"
                          ? "e.g. 00 or +"
                          : ruleFormData.action === "PREFIX_REMOVE"
                          ? "e.g. + or 0"
                          : "e.g. 977980111111"
                        : "e.g. 9801111111"
                    }
                    value={ruleFormData.replacement || ""}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, replacement: e.target.value })}
                    required
                  />
                )}
              </div>
            )}

            {ruleFormData.action === "TRUNCATE" && (
              <div>
                <label className="block text-xs font-semibold mb-1">Truncate Length *</label>
                <Input
                  type="number"
                  value={ruleFormData.truncateLength || 11}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, truncateLength: Number(e.target.value) })}
                  required
                />
              </div>
            )}

            {["APPROVED_POOL_SEQUENTIAL", "APPROVED_POOL_RANDOM"].includes(ruleFormData.action || "") && (
              <div>
                <label className="block text-xs font-semibold mb-1">Sender Pool *</label>
                <Select
                  placeholder="Select Sender Pool"
                  value={ruleFormData.senderPool ? String(ruleFormData.senderPool) : ""}
                  onChange={(p) => setRuleFormData({ ...ruleFormData, senderPool: p ? Number(p) : null })}
                  options={pools.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                  }))}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">Priority</label>
              <Input
                type="number"
                value={ruleFormData.priority || 100}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <Select
                value={ruleFormData.status || "ACTIVE"}
                onChange={(s) => setRuleFormData({ ...ruleFormData, status: s as any, isActive: s === "ACTIVE" })}
                options={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "DRAFT", label: "DRAFT" },
                  { value: "INACTIVE", label: "INACTIVE" },
                ]}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1">Remarks</label>
              <Input
                placeholder="Optional notes or documentation"
                value={ruleFormData.remarks || ""}
                onChange={(e) => setRuleFormData({ ...ruleFormData, remarks: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isValidating}
              onClick={handleValidateRule}
              leftIcon={<TestTube size={14} />}
            >
              Test Regex / Validate
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingRuleId ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <DeleteModal
        isOpen={Boolean(deleteRuleId)}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Delete Vendor Transform Rule"
        message={`Are you sure you want to delete rule "${selectedRowRule?.name}"? This action will invalidate the cache.`}
        isDeleting={isDeleting}
      />

      {/* CONTEXT MENU */}
      {contextMenuPos && selectedRowRule && (
        <ContextMenu
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          items={[
            {
              label: "Edit Rule",
              icon: <Edit size={14} />,
              onClick: () => handleEditRule(selectedRowRule),
            },
            {
              label: "Delete Rule",
              icon: <Trash size={14} className="text-rose-500" />,
              onClick: () => {
                setDeleteRuleId(selectedRowRule.id!);
                setContextMenuPos(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
};
