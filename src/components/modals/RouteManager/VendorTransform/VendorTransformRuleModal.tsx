import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import Input from "../../../ui/Input";
import Select from "../../../ui/Select";
import LoadingSpinner from "../../../ui/LoadingSpinner";
import type {
  VendorTransformRule,
  VendorTransformAction,
  VendorTransformMatchType,
  VendorTransformTarget,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import {
  createVendorTransformRuleApi,
  updateVendorTransformRuleApi,
  validateVendorTransformRuleApi,
  getClientRouteVendorsApi,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import type { SenderPool } from "../../../../api/authorizationApi/senderPoolApi";

interface VendorTransformRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRule: VendorTransformRule | null;
  selectedClientId: number | null;
  vendors: any[];
  clientVendors: { id: number; profileName: string }[];
  countries: any[];
  pools: SenderPool[];
  canCreate: boolean;
  canUpdate: boolean;
}

const targetEntityOptions = [
  { value: "SENDER_ID", label: "Sender ID (Default)" },
  { value: "DESTINATION", label: "Destination Phone Number" },
  { value: "MESSAGE_TEXT", label: "Message Text" },
];

const matchTypeOptions = [
  { value: "EXACT", label: "Exact Match" },
  { value: "CONTAINS", label: "Contains" },
  { value: "REGEX", label: "Regex (Regular Expression)" },
  { value: "ANY", label: "Catch-All / Any" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const VendorTransformRuleModal: React.FC<VendorTransformRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingRule,
  selectedClientId,
  vendors,
  clientVendors,
  countries,
  pools,
  canCreate,
  canUpdate,
}) => {
  const [ruleFormData, setRuleFormData] = useState<Partial<VendorTransformRule>>({
    targetEntity: "SENDER_ID",
    matchType: "EXACT",
    action: "FIXED_REPLACE",
    priority: 100,
    status: "ACTIVE",
    isActive: true,
  });

  const [modalVendors, setModalVendors] = useState<{ id: number; profileName: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Sync form state when modal opens or editingRule changes
  useEffect(() => {
    if (isOpen) {
      if (editingRule) {
        setRuleFormData({
          name: editingRule.name,
          targetEntity: editingRule.targetEntity || "SENDER_ID",
          client: editingRule.client,
          vendor: editingRule.vendor,
          country: editingRule.country,
          matchType: editingRule.matchType || "EXACT",
          pattern: editingRule.pattern,
          action: editingRule.action || "FIXED_REPLACE",
          replacement: editingRule.replacement || "",
          truncateLength: editingRule.truncateLength,
          senderPool: editingRule.senderPool,
          priority: editingRule.priority ?? 100,
          status: editingRule.status || (editingRule.isActive ? "ACTIVE" : "INACTIVE"),
          isActive: editingRule.isActive ?? (editingRule.status === "ACTIVE"),
          remarks: editingRule.remarks || "",
        });
      } else {
        setRuleFormData({
          targetEntity: "SENDER_ID",
          client: selectedClientId || undefined,
          matchType: "EXACT",
          action: "FIXED_REPLACE",
          priority: 100,
          status: "ACTIVE",
          isActive: true,
          replacement: "",
          pattern: "",
          remarks: "",
        });
      }
      setShowHint(false);
    }
  }, [isOpen, editingRule, selectedClientId]);

  // Dynamically scope vendors to client route group + target country
  useEffect(() => {
    if (isOpen && selectedClientId) {
      getClientRouteVendorsApi(selectedClientId, ruleFormData.country || null)
        .then((scoped: any) => {
          if (scoped && scoped.length > 0) {
            setModalVendors(scoped);
          } else {
            setModalVendors(clientVendors.length > 0 ? clientVendors : vendors);
          }
        })
        .catch(() => {
          setModalVendors(clientVendors.length > 0 ? clientVendors : vendors);
        });
    } else if (isOpen) {
      setModalVendors(vendors);
    }
  }, [isOpen, selectedClientId, ruleFormData.country, clientVendors, vendors]);

  const actionOptions = (() => {
    if (ruleFormData.targetEntity === "DESTINATION") {
      return [
        { value: "PREFIX_REPLACE", label: "Replace Prefix (e.g. 0 -> 61)" },
        { value: "PREFIX_ADD", label: "Add Prefix (e.g. +61)" },
        { value: "PREFIX_REMOVE", label: "Strip Prefix (e.g. 04 -> 4)" },
        { value: "REGEX_REPLACE", label: "Regex Rewrite (e.g. ^0([0-9]+)$ -> 61$1)" },
      ];
    }
    return [
      { value: "FIXED_REPLACE", label: "Fixed Sender ID (Rewrite)" },
      { value: "PREFIX_ADD", label: "Add Prefix" },
      { value: "PREFIX_REMOVE", label: "Strip Prefix" },
      { value: "REGEX_REPLACE", label: "Regex Substitution" },
      { value: "TRUNCATE", label: "Truncate Length (GSM Alpha ≤ 11)" },
      { value: "APPROVED_POOL_SEQUENTIAL", label: "Sender Pool (Sequential Cursor)" },
      { value: "APPROVED_POOL_RANDOM", label: "Sender Pool (Random Distributed)" },
    ];
  })();

  const getTransformationPreview = () => {
    const action = ruleFormData.action;
    const target = ruleFormData.targetEntity;
    const pattern = ruleFormData.pattern || "0";
    const replacement = ruleFormData.replacement || "";

    if (target === "DESTINATION") {
      if (action === "PREFIX_REPLACE") {
        return {
          input: `${pattern}412345678`,
          output: `${replacement}412345678`,
          explanation: `When destination starts with '${pattern}', it is replaced with '${replacement}'.`,
          note: "Prefix replacement",
        };
      }
      if (action === "PREFIX_ADD") {
        return {
          input: "412345678",
          output: `${replacement}412345678`,
          explanation: `Prefix '${replacement}' is prepended to the destination number.`,
          note: "Country code prepend",
        };
      }
      if (action === "PREFIX_REMOVE") {
        return {
          input: `${pattern}412345678`,
          output: "412345678",
          explanation: `Leading prefix '${pattern}' is stripped from destination.`,
          note: "Leading prefix strip",
        };
      }
      if (action === "REGEX_REPLACE") {
        return {
          input: "0412345678",
          output: replacement ? replacement.replace("$1", "412345678") : "61412345678",
          explanation: `Regex pattern transforms matching groups into target template: ${replacement || "e.g. 61$1"}.`,
          note: "Regex capture group substitution",
        };
      }
    } else if (target === "MESSAGE_TEXT") {
      if (action === "FIXED_REPLACE") {
        return {
          input: ruleFormData.pattern || "Your verification code is 1234",
          output: replacement || "Your secure code is 1234",
          explanation: `Matching text is replaced with '${replacement || "replacement text"}'.`,
          note: "Fixed text rewrite",
        };
      }
      if (action === "REGEX_REPLACE") {
        return {
          input: "Contact support at 1800-000",
          output: replacement || "Contact support at 1800-999",
          explanation: "Regex pattern substitutes matching text content.",
          note: "Regex text substitution",
        };
      }
    } else {
      if (action === "FIXED_REPLACE") {
        return {
          input: ruleFormData.pattern || "INFO_SMS",
          output: replacement || "MYBRAND",
          explanation: `Sender ID '${ruleFormData.pattern || "INFO_SMS"}' is replaced with '${replacement || "MYBRAND"}'.`,
          note: "Fixed sender rewrite",
        };
      }
      if (action === "PREFIX_ADD") {
        return {
          input: ruleFormData.pattern || "BRAND",
          output: `${replacement || "TX-"}${ruleFormData.pattern || "BRAND"}`,
          explanation: `Prefix '${replacement || "TX-"}' is prepended to Sender ID.`,
          note: "Add prefix",
        };
      }
      if (action === "PREFIX_REMOVE") {
        return {
          input: `${ruleFormData.pattern || "TX-"}BRAND`,
          output: "BRAND",
          explanation: `Prefix '${ruleFormData.pattern || "TX-"}' is stripped from Sender ID.`,
          note: "Strip prefix",
        };
      }
      if (action === "TRUNCATE") {
        const len = ruleFormData.truncateLength || 11;
        return {
          input: "VERY_LONG_ALPHA_SENDER",
          output: "VERY_LONG_ALPHA_SENDER".slice(0, len),
          explanation: `Sender ID truncated to max ${len} characters to comply with vendor/carrier GSM length limits.`,
          note: `Truncate to ${len} chars`,
        };
      }
      if (action === "REGEX_REPLACE") {
        return {
          input: ruleFormData.pattern || "AUTH_CODE",
          output: replacement ? replacement.replace("$1", "CODE") : "VERIFY_CODE",
          explanation: "Regex transformation applied to Sender ID.",
          note: "Regex group substitution",
        };
      }
      if (action === "APPROVED_POOL_SEQUENTIAL" || action === "APPROVED_POOL_RANDOM") {
        return {
          input: "PROMO_ALERT",
          output: "+18005550199 (from pool)",
          explanation: "Sender ID replaced with an active approved sender ID from the selected sender pool.",
          note: action === "APPROVED_POOL_SEQUENTIAL" ? "Round-robin pool" : "Random pool distribution",
        };
      }
    }
    return null;
  };

  const handleValidateRule = async () => {
    if (!ruleFormData.pattern && ruleFormData.matchType !== "ANY") {
      toast.error("Please provide a Pattern to validate");
      return;
    }
    setIsValidating(true);
    try {
      const res = await validateVendorTransformRuleApi({
        name: ruleFormData.name,
        targetEntity: ruleFormData.targetEntity,
        matchType: ruleFormData.matchType,
        pattern: ruleFormData.pattern,
        action: ruleFormData.action,
        replacement: ruleFormData.replacement,
        client: selectedClientId || undefined,
      });
      if (res.valid) {
        toast.success(`Rule Regex Valid! Test output: ${res.testOutput || "Match OK"}`);
      } else {
        toast.warning(res.error || "Regex did not match test pattern");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.name?.trim()) {
      toast.error("Rule Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<VendorTransformRule> = {
        name: ruleFormData.name.trim(),
        targetEntity: ruleFormData.targetEntity,
        client: selectedClientId || undefined,
        vendor: ruleFormData.vendor || null,
        country: ruleFormData.country || null,
        matchType: ruleFormData.matchType,
        pattern: ruleFormData.pattern || (ruleFormData.matchType === "ANY" ? "*" : ""),
        action: ruleFormData.action,
        replacement: ruleFormData.replacement || "",
        truncateLength: ruleFormData.action === "TRUNCATE" ? ruleFormData.truncateLength : undefined,
        senderPool: ["APPROVED_POOL_SEQUENTIAL", "APPROVED_POOL_RANDOM"].includes(ruleFormData.action || "")
          ? ruleFormData.senderPool
          : null,
        priority: ruleFormData.priority ?? 100,
        status: ruleFormData.status || "ACTIVE",
        isActive: ruleFormData.status === "ACTIVE",
        remarks: ruleFormData.remarks || "",
      };

      if (editingRule?.id) {
        await updateVendorTransformRuleApi(editingRule.id, payload);
        toast.success("Vendor transform rule updated successfully");
      } else {
        await createVendorTransformRuleApi(payload);
        toast.success("Vendor transform rule created successfully");
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Failed to save rule", e);
      toast.error(e?.response?.data?.message || "Failed to save rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editingRule?.id);
  const isDisabled = isEditing ? !canUpdate : !canCreate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Vendor Transform Rule" : "Add Vendor Transform Rule"}
      className="max-w-2xl"
      contentClassName="pr-2 sm:pr-3"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Rule Name"
              placeholder="e.g. Veritas SMS Destination Rewrite"
              value={ruleFormData.name || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleFormData({ ...ruleFormData, name: e.target.value })
              }
              required
              disabled={isDisabled}
            />
          </div>

          <div>
            <Select
              label="Target Entity"
              value={ruleFormData.targetEntity || "SENDER_ID"}
              onChange={(v: string) => {
                const newTarget = v as VendorTransformTarget;
                setRuleFormData({
                  ...ruleFormData,
                  targetEntity: newTarget,
                  action:
                    newTarget === "SENDER_ID"
                      ? "FIXED_REPLACE"
                      : newTarget === "DESTINATION"
                      ? "PREFIX_REPLACE"
                      : "FIXED_REPLACE",
                  pattern: "",
                  replacement: "",
                });
              }}
              options={targetEntityOptions}
              required
              clearable={false}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Target Vendor (Optional)"
              placeholder="All Vendors (Route Group)"
              value={ruleFormData.vendor ? String(ruleFormData.vendor) : ""}
              onChange={(v: string) => setRuleFormData({ ...ruleFormData, vendor: v ? Number(v) : null })}
              options={[
                { value: "", label: "All Vendors (Route Group)" },
                ...modalVendors.map((v) => ({
                  value: String(v.id),
                  label: v.profileName || `Vendor ${v.id}`,
                })),
              ]}
              disabled={isDisabled}
            />
          </div>

          <div>
            <Select
              label="Target Country (Optional)"
              placeholder="Global (All Countries)"
              value={ruleFormData.country ? String(ruleFormData.country) : ""}
              onChange={(c: string) => setRuleFormData({ ...ruleFormData, country: c ? Number(c) : null })}
              options={[
                { value: "", label: "Global (All Countries)" },
                ...countries.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Match Type"
              value={ruleFormData.matchType || "EXACT"}
              onChange={(m: string) =>
                setRuleFormData({ ...ruleFormData, matchType: m as VendorTransformMatchType })
              }
              options={matchTypeOptions}
              required
              clearable={false}
              disabled={isDisabled}
            />
          </div>

          <div>
            <Input
              label="Pattern"
              placeholder={
                ruleFormData.matchType === "REGEX"
                  ? "^0([0-9]+)$"
                  : ruleFormData.matchType === "ANY"
                  ? "*"
                  : "e.g. 04 or code"
              }
              value={ruleFormData.pattern || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleFormData({ ...ruleFormData, pattern: e.target.value })
              }
              required={ruleFormData.matchType !== "ANY"}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Action"
              value={ruleFormData.action || "FIXED_REPLACE"}
              onChange={(a: string) =>
                setRuleFormData({ ...ruleFormData, action: a as VendorTransformAction })
              }
              options={actionOptions}
              required
              clearable={false}
              disabled={isDisabled}
            />
          </div>

          {/* Truncate action length input */}
          {ruleFormData.action === "TRUNCATE" && (
            <div>
              <Input
                type="number"
                label="Max Length (Chars)"
                value={ruleFormData.truncateLength || 11}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleFormData({ ...ruleFormData, truncateLength: Number(e.target.value) || 11 })
                }
                required
                disabled={isDisabled}
              />
            </div>
          )}

          {/* Sender Pool dropdown for POOL actions */}
          {["APPROVED_POOL_SEQUENTIAL", "APPROVED_POOL_RANDOM"].includes(ruleFormData.action || "") && (
            <div>
              <Select
                label="Sender Pool"
                placeholder="Select Sender Pool"
                value={ruleFormData.senderPool ? String(ruleFormData.senderPool) : ""}
                onChange={(p: string) => setRuleFormData({ ...ruleFormData, senderPool: p ? Number(p) : null })}
                options={pools.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${p.selectionMode})`,
                }))}
                required
                disabled={isDisabled}
              />
            </div>
          )}

          {/* Replacement input for Replace actions */}
          {["FIXED_REPLACE", "PREFIX_ADD", "PREFIX_REMOVE", "PREFIX_REPLACE", "REGEX_REPLACE"].includes(
            ruleFormData.action || ""
          ) && (
            <div>
              <Input
                label="Replacement Text / Template"
                placeholder={
                  ruleFormData.action === "PREFIX_REPLACE"
                    ? "Replacement prefix e.g. 61"
                    : ruleFormData.action === "REGEX_REPLACE"
                    ? "Group template e.g. 61$1"
                    : "Replacement string"
                }
                value={ruleFormData.replacement || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleFormData({ ...ruleFormData, replacement: e.target.value })
                }
                required
                disabled={isDisabled}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="number"
              label="Priority (Evaluation Order)"
              value={ruleFormData.priority ?? 100}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleFormData({ ...ruleFormData, priority: Number(e.target.value) || 100 })
              }
              required
              disabled={isDisabled}
            />
          </div>

          <div>
            <Select
              label="Status"
              value={ruleFormData.status || "ACTIVE"}
              onChange={(s: string) =>
                setRuleFormData({ ...ruleFormData, status: s as any, isActive: s === "ACTIVE" })
              }
              options={statusOptions}
              clearable={false}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div>
          <Input
            label="Remarks"
            placeholder="Optional notes or documentation"
            value={ruleFormData.remarks || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRuleFormData({ ...ruleFormData, remarks: e.target.value })
            }
            disabled={isDisabled}
          />
        </div>

        {/* Action Example Preview Card matching DestinationRulesTab */}
        {(() => {
          const preview = getTransformationPreview();
          if (!preview) return null;

          if (!showHint) {
            return (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-transparent border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs">
                  <Info size={14} className="text-primary" />
                  Action Example:{" "}
                  <span className="font-medium text-text-primary dark:text-gray-200">
                    [{preview.note}]
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                >
                  Show Example <ChevronDown size={13} />
                </button>
              </div>
            );
          }

          return (
            <div className="p-3.5 bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl space-y-2.5 mr-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                  <Info size={14} className="text-primary" />
                  How this rule transforms traffic:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    {preview.note}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHint(false)}
                    className="text-xs text-gray-400 hover:text-text-primary dark:hover:text-white flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Hide <ChevronUp size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400 tracking-wider mb-1">
                    Input
                  </div>
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate py-0.5" title={preview.input}>
                    {preview.input}
                  </div>
                </div>

                <span className="text-gray-400 font-bold text-sm shrink-0">➔</span>

                <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-transparent border border-emerald-300 dark:border-emerald-700 overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">
                    Output
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate py-0.5" title={preview.output}>
                    {preview.output}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {preview.explanation}
              </p>
            </div>
          );
        })()}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleValidateRule}
            disabled={isValidating || isDisabled}
          >
            {isValidating ? "Validating..." : "Test Regex / Validate"}
          </Button>

          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isDisabled}
              leftIcon={isSubmitting ? <LoadingSpinner size="sm" /> : undefined}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Rule" : "Add Rule"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default VendorTransformRuleModal;
