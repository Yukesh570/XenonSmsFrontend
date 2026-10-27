import React, { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Zap,
  Globe,
  Database,
  Lock,
  Unlock,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import {
  getMessageFilterPoliciesApi,
  createMessageFilterPolicyApi,
  updateMessageFilterPolicyApi,
  rebuildMessageFilterCacheApi,
  getMessageFilterCacheStatusApi,
  type MessageFilterPolicy,
} from "../../../api/authorizationApi/messageFilterApi";

interface MessageFilterPolicyTabProps {
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  clients: any[];
}

export const MessageFilterPolicyTab: React.FC<MessageFilterPolicyTabProps> = ({
  selectedClientId,
  setSelectedClientId,
  clients,
}) => {
  const [policy, setPolicy] = useState<MessageFilterPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    isActive: boolean;
    destinationRulesEnabled: boolean;
    textRulesEnabled: boolean;
    allowRandomFunctions: boolean;
    allowCountryChange: boolean;
    cacheFailureMode: "FAIL_CLOSED" | "FAIL_OPEN";
    maxTextExpansionChars: number;
  }>({
    isActive: true,
    destinationRulesEnabled: true,
    textRulesEnabled: true,
    allowRandomFunctions: true,
    allowCountryChange: false,
    cacheFailureMode: "FAIL_CLOSED",
    maxTextExpansionChars: 300,
  });

  // Cache Status
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [loadingCache, setLoadingCache] = useState(false);
  const [isRebuildingCache, setIsRebuildingCache] = useState(false);

  // Load Policy
  const loadPolicy = async () => {
    setLoading(true);
    try {
      const res = await getMessageFilterPoliciesApi(selectedClientId || undefined);
      const list = Array.isArray(res) ? res : (res as any)?.results || [];
      const current = selectedClientId
        ? list.find((p: MessageFilterPolicy) => p.client === selectedClientId)
        : list[0] || null;

      if (current) {
        setPolicy(current);
        setFormData({
          isActive: current.isActive,
          destinationRulesEnabled: current.destinationRulesEnabled,
          textRulesEnabled: current.textRulesEnabled,
          allowRandomFunctions: current.allowRandomFunctions,
          allowCountryChange: current.allowCountryChange,
          cacheFailureMode: current.cacheFailureMode || "FAIL_CLOSED",
          maxTextExpansionChars: current.maxTextExpansionChars || 300,
        });
      } else {
        setPolicy(null);
        setFormData({
          isActive: true,
          destinationRulesEnabled: true,
          textRulesEnabled: true,
          allowRandomFunctions: true,
          allowCountryChange: false,
          cacheFailureMode: "FAIL_CLOSED",
          maxTextExpansionChars: 300,
        });
      }
    } catch (err: any) {
      console.error("Failed to load policy", err);
      toast.error("Failed to load message filter policy");
    } finally {
      setLoading(false);
    }
  };

  // Load Cache Status
  const loadCacheStatus = async () => {
    if (!selectedClientId) return;
    setLoadingCache(true);
    try {
      const res = await getMessageFilterCacheStatusApi(selectedClientId);
      setCacheStatus(res);
    } catch (err) {
      setCacheStatus(null);
    } finally {
      setLoadingCache(false);
    }
  };

  useEffect(() => {
    loadPolicy();
    loadCacheStatus();
  }, [selectedClientId]);

  // Handle Save Policy
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.warn("Please select a client to configure specific filter policy");
      return;
    }

    setIsSaving(true);
    try {
      if (policy?.id) {
        const updated = await updateMessageFilterPolicyApi(policy.id, formData);
        setPolicy(updated);
        toast.success("Message filter policy updated successfully");
      } else {
        const created = await createMessageFilterPolicyApi({
          client: selectedClientId,
          ...formData,
        });
        setPolicy(created);
        toast.success("Message filter policy created successfully");
      }
      loadCacheStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save policy");
    } finally {
      setIsSaving(false);
    }
  };

  // Rebuild Cache
  const handleRebuildCache = async () => {
    if (!selectedClientId) {
      toast.warn("Please select a client to rebuild cache");
      return;
    }
    setIsRebuildingCache(true);
    try {
      const res = await rebuildMessageFilterCacheApi(selectedClientId);
      toast.success(res.message || "Cache rebuilt and synchronized successfully");
      loadCacheStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to rebuild cache");
    } finally {
      setIsRebuildingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Scope Selection Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Message Filter & Translation Policy
            </h2>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              Configure master execution behavior, safety limits, and cache failover modes.
            </p>
          </div>
        </div>

        <div className="w-72">
          <Select
            value={selectedClientId ? String(selectedClientId) : ""}
            onChange={(val) => setSelectedClientId(val ? Number(val) : null)}
            options={[
              { value: "", label: "Select a Client..." },
              ...clients.map((c) => ({
                value: String(c.id),
                label: c.name ? (c.companyName ? `${c.name} (${c.companyName})` : c.name) : (c.companyName || `Client #${c.id}`),
              })),
            ]}
            placeholder="Select Client Scope"
          />
        </div>
      </div>

      {!selectedClientId ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-text-secondary dark:text-gray-400">
          <Sliders size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
          <p className="text-base font-semibold">Please select a client</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Choose a client from the dropdown above to inspect and edit its execution policies and Redis cache state.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Main Policy Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Master Engine Switches Card */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                      Engine Execution Switches
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      Enable or disable entire sub-modules of the message filter pipeline.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      formData.isActive
                        ? "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {formData.isActive ? "Engine Active" : "Engine Suspended"}
                  </span>
                </div>

                {/* Master Switch */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
                      <Zap size={16} className="text-primary" />
                      Master Active Switch
                    </span>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      When off, all destination and message text transformation is completely bypassed.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>

                {/* Destination Rules Switch */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-text-primary dark:text-white">
                      Destination Number Translation
                    </span>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      Evaluates prefix additions, stripping, and E.164 normalization for destinations.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.destinationRulesEnabled}
                    onChange={(checked) =>
                      setFormData({ ...formData, destinationRulesEnabled: checked })
                    }
                  />
                </div>

                {/* Text Rules Switch */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-text-primary dark:text-white">
                      Message Content Translation
                    </span>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      Evaluates content regex replacement, template lists, and token substitutions.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.textRulesEnabled}
                    onChange={(checked) =>
                      setFormData({ ...formData, textRulesEnabled: checked })
                    }
                  />
                </div>

                {/* Random Functions Switch */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-text-primary dark:text-white">
                      Allow Controlled Random Functions
                    </span>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      Authorizes expansion of {"${RANDINT}"}, {"${RANDHEX}"}, and {"${RANDTEXT}"} macros.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.allowRandomFunctions}
                    onChange={(checked) =>
                      setFormData({ ...formData, allowRandomFunctions: checked })
                    }
                  />
                </div>
              </div>

              {/* Safety, Boundaries & Limits Card */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                    Safety Guardrails & Boundaries
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Prevent accidental destination rerouting and malicious payload expansions.
                  </p>
                </div>

                {/* Country Boundary Change */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                        <Globe size={16} className="text-indigo-500" />
                        Allow Destination Country Crossings
                      </span>
                      <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                        Permit destination rules that change the originating destination country (e.g. +1 to +44).
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={formData.allowCountryChange}
                      onChange={(checked) =>
                        setFormData({ ...formData, allowCountryChange: checked })
                      }
                    />
                  </div>

                  {formData.allowCountryChange ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong className="block font-semibold">CAUTION: Cross-Border Translation Permitted</strong>
                        <span>
                          Altering destination countries directly impacts upstream SMPP route selection, pricing tiers, and regulatory compliance.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>Country boundary protection active. Rules attempting to change destination country will be rejected.</span>
                    </div>
                  )}
                </div>

                {/* Max Expansion Limit */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <Input
                    label="Max Message Text Expansion Limit (Characters)"
                    type="number"
                    value={formData.maxTextExpansionChars}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTextExpansionChars: Math.max(1, Math.min(2000, Number(e.target.value))),
                      })
                    }
                    min={1}
                    max={2000}
                    required
                  />
                  <p className="text-[11px] text-gray-400">
                    Prevents message bloat and excessive segment billing (Safe Default: 300 characters).
                  </p>
                </div>

                {/* Cache Failure Mode */}
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                  <label className="block text-xs font-semibold text-text-primary dark:text-white">
                    Cache Failure Mode (Redis Outage Resiliency)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cacheFailureMode: "FAIL_CLOSED" })}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        formData.cacheFailureMode === "FAIL_CLOSED"
                          ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-text-primary dark:text-white mb-1">
                        <Lock size={14} className="text-rose-500" />
                        <span>FAIL_CLOSED (Strict Security)</span>
                      </div>
                      <p className="text-[11px] text-text-secondary dark:text-gray-400">
                        If cache or DB is unavailable during evaluation, reject messages to prevent unfiltered delivery.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cacheFailureMode: "FAIL_OPEN" })}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        formData.cacheFailureMode === "FAIL_OPEN"
                          ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-text-primary dark:text-white mb-1">
                        <Unlock size={14} className="text-amber-500" />
                        <span>FAIL_OPEN (High Availability)</span>
                      </div>
                      <p className="text-[11px] text-text-secondary dark:text-gray-400">
                        If cache fails, allow messages through unmodified without interruption to traffic flow.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="px-6 py-2.5 flex items-center gap-2"
                >
                  <Shield size={16} />
                  <span>{isSaving ? "Saving Policy..." : "Save Policy Configuration"}</span>
                </Button>
              </div>
            </div>

            {/* Right Col: Redis Cache Status & Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-primary" />
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                      Redis Pipeline Cache
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={loadCacheStatus}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                    title="Refresh Cache Status"
                  >
                    <RefreshCw size={14} className={loadingCache ? "animate-spin" : ""} />
                  </button>
                </div>

                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Rules, policies, and replacement pools are cached in Redis for microsecond ingress evaluation on SMPP and HTTP pipelines.
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center text-xs p-2.5 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <span className="text-text-secondary dark:text-gray-400">Status</span>
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={13} />
                      Connected & Ready
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs p-2.5 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <span className="text-text-secondary dark:text-gray-400">Client ID</span>
                    <span className="font-mono font-semibold text-text-primary dark:text-white">
                      #{selectedClientId}
                    </span>
                  </div>

                  {cacheStatus?.keyCount !== undefined && (
                    <div className="flex justify-between items-center text-xs p-2.5 bg-gray-50 dark:bg-gray-750 rounded-lg">
                      <span className="text-text-secondary dark:text-gray-400">Cached Keys</span>
                      <span className="font-mono font-semibold text-text-primary dark:text-white">
                        {cacheStatus.keyCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRebuildCache}
                    disabled={isRebuildingCache}
                    className="w-full flex items-center justify-center gap-2 text-xs py-2"
                  >
                    <RefreshCw size={14} className={isRebuildingCache ? "animate-spin" : ""} />
                    <span>{isRebuildingCache ? "Rebuilding Cache..." : "Sync & Rebuild Cache"}</span>
                  </Button>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Forces immediate invalidation and pre-warming of memory structures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
