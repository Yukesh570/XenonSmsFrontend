import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import ToggleSwitch from "../../ui/ToggleSwitch";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { CountryFlag } from "../../ui/CountryFlag";
import type {
  MessageFilterRule,
  DestinationAction,
} from "../../../api/messageFilterApi/messageFilterApi";
import {
  createMessageFilterRuleApi,
  updateMessageFilterRuleApi,
  validateMessageFilterRuleApi,
} from "../../../api/messageFilterApi/messageFilterApi";

export interface DestinationRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRule: MessageFilterRule | null;
  selectedClientId: number | null;
  countries: any[];
  existingRules: MessageFilterRule[];
  canCreate: boolean;
  canUpdate: boolean;
}

export const DestinationRuleModal: React.FC<DestinationRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingRule,
  selectedClientId,
  countries,
  existingRules,
  canCreate,
  canUpdate,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    priority: number;
    country: number | null;
    destinationMatchType: "EXACT" | "PREFIX" | "REGEX";
    destinationPattern: string;
    action: DestinationAction | "PREFIX_REPLACE";
    prefixValue: string;
    replacement: string;
    normalizationMode: string;
    stopProcessing: boolean;
    isActive: boolean;
  }>({
    name: "",
    priority: 100,
    country: null,
    destinationMatchType: "PREFIX",
    destinationPattern: "",
    action: "PREFIX_REPLACE",
    prefixValue: "",
    replacement: "",
    normalizationMode: "E164",
    stopProcessing: false,
    isActive: true,
  });

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingRule) {
      const patternMatch =
        editingRule.action === "REGEX_REPLACE" && editingRule.destinationPattern
          ? editingRule.destinationPattern.match(/^\^([a-zA-Z0-9+]+)\(\.\*\)\$$/)
          : null;
      const replacementMatch =
        editingRule.action === "REGEX_REPLACE" && editingRule.replacement
          ? editingRule.replacement.match(/^([a-zA-Z0-9+]+)\$1$/)
          : null;

      if (editingRule.action === "PREFIX_REPLACE") {
        setFormData({
          name: editingRule.name,
          priority: editingRule.priority,
          country: editingRule.country,
          destinationMatchType:
            (editingRule.destinationMatchType as "EXACT" | "PREFIX" | "REGEX") || "PREFIX",
          destinationPattern: editingRule.destinationPattern || editingRule.prefixValue || "",
          action: "PREFIX_REPLACE",
          prefixValue: "",
          replacement: editingRule.replacement || "",
          normalizationMode: editingRule.normalizationMode || "E164",
          stopProcessing: editingRule.stopProcessing,
          isActive: editingRule.isActive,
        });
      } else if (patternMatch && replacementMatch) {
        setFormData({
          name: editingRule.name,
          priority: editingRule.priority,
          country: editingRule.country,
          destinationMatchType: "PREFIX",
          destinationPattern: patternMatch[1],
          action: "PREFIX_REPLACE",
          prefixValue: "",
          replacement: replacementMatch[1],
          normalizationMode: editingRule.normalizationMode || "E164",
          stopProcessing: editingRule.stopProcessing,
          isActive: editingRule.isActive,
        });
      } else {
        setFormData({
          name: editingRule.name,
          priority: editingRule.priority,
          country: editingRule.country,
          destinationMatchType:
            (editingRule.destinationMatchType as "EXACT" | "PREFIX" | "REGEX") || "PREFIX",
          destinationPattern: editingRule.destinationPattern || "",
          action: (editingRule.action as DestinationAction) || "PREFIX_ADD",
          prefixValue: editingRule.prefixValue || "",
          replacement: editingRule.replacement || "",
          normalizationMode: editingRule.normalizationMode || "E164",
          stopProcessing: editingRule.stopProcessing,
          isActive: editingRule.isActive,
        });
      }
      setShowHint(false);
    } else {
      setFormData({
        name: "",
        priority:
          existingRules.length > 0
            ? Math.max(...existingRules.map((r) => r.priority)) + 10
            : 100,
        country: null,
        destinationMatchType: "PREFIX",
        destinationPattern: "",
        action: "PREFIX_REPLACE",
        prefixValue: "",
        replacement: "",
        normalizationMode: "E164",
        stopProcessing: false,
        isActive: true,
      });
      setShowHint(true);
    }
    setValidationResult(null);
  }, [isOpen, editingRule, existingRules]);

  // Modal priority collision detection
  const conflictingRule = useMemo(() => {
    if (!formData.priority) return null;
    return existingRules.find(
      (r) =>
        r.priority === Number(formData.priority) &&
        r.id !== (editingRule ? editingRule.id : null)
    );
  }, [existingRules, formData.priority, editingRule]);

  // Debounced Regex Validation
  useEffect(() => {
    if (
      !isOpen ||
      formData.destinationMatchType !== "REGEX" ||
      !formData.destinationPattern
    ) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "DESTINATION",
          destinationMatchType: "REGEX",
          destinationPattern: formData.destinationPattern,
          action: formData.action === "PREFIX_REPLACE" ? "REGEX_REPLACE" : formData.action,
          replacement: formData.replacement,
        });

        setValidationResult({
          isValid: res.valid,
          error: res.error || undefined,
        });
      } catch (e: any) {
        setValidationResult({
          isValid: false,
          error: e.response?.data?.error || "Regex validation failed",
        });
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    formData.destinationPattern,
    formData.destinationMatchType,
    formData.action,
    formData.replacement,
  ]);

  // Static reference preview for destination transformation actions
  const getTransformationPreview = () => {
    const action = formData.action || "PREFIX_REPLACE";

    if (action === "PREFIX_REPLACE") {
      return {
        input: "07412345678",
        output: "447412345678",
        note: "Prefix Replace (0 \u2192 44)",
        explanation:
          "Replaces leading domestic prefix '0' with international prefix '44' and preserves subscriber digits.",
      };
    }

    if (action === "PREFIX_ADD") {
      return {
        input: "412345678",
        output: "+44412345678",
        note: "Prefix Addition (+44)",
        explanation:
          "Prepends carrier country code or international exit digits to the destination number.",
      };
    }

    if (action === "PREFIX_REMOVE") {
      return {
        input: "0447309692",
        output: "447309692",
        note: "Prefix Stripping (0)",
        explanation:
          "Strips leading domestic trunk prefix '0' to standardize destination for vendor delivery.",
      };
    }

    if (action === "FIXED_REPLACE") {
      return {
        input: "0412345678",
        output: "447700900000",
        note: "Fixed Destination Reroute",
        explanation:
          "Reroutes all matching destination numbers to a designated fixed termination number.",
      };
    }

    if (action === "REGEX_REPLACE") {
      return {
        input: "07412345678",
        output: "447412345678",
        note: "Regex Group Substitution",
        explanation:
          "Matches regex capture groups (^0(.*)$) and substitutes groups into replacement template (44$1).",
      };
    }

    if (action === "NORMALIZE") {
      return {
        input: "+(61) 0412-345-678",
        output: "61412345678",
        note: "E.164 Standardization",
        explanation:
          "Strips non-digit characters (spaces, brackets, hyphens) to format the destination into standard international digits.",
      };
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!formData.priority || Number(formData.priority) < 1) {
      toast.error("A valid priority number (1 or greater) is required");
      return;
    }
    if (conflictingRule) {
      toast.error(
        `Priority ${formData.priority} is already used by rule "${conflictingRule.name}" (#${conflictingRule.id}). Priority must be unique.`
      );
      return;
    }
    if (
      formData.action !== "NORMALIZE" &&
      !formData.destinationPattern.trim()
    ) {
      toast.error(
        formData.destinationMatchType === "EXACT"
          ? "Exact destination number is required"
          : formData.destinationMatchType === "REGEX"
            ? "Destination regex pattern is required"
            : "Destination prefix is required"
      );
      return;
    }
    if (formData.action === "PREFIX_REPLACE" && !formData.replacement.trim()) {
      toast.error("Replacement prefix is required");
      return;
    }
    if (validationResult && !validationResult.isValid) {
      toast.error(`Rule validation failed: ${validationResult.error}`);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMatchType = formData.destinationMatchType;
      let finalPattern = formData.destinationPattern.trim() || null;
      let finalAction: DestinationAction = formData.action as DestinationAction;
      let finalReplacement: string | null = null;
      let finalPrefixValue: string | null = null;

      if (formData.action === "PREFIX_REPLACE") {
        finalMatchType = formData.destinationMatchType || "PREFIX";
        finalPattern = formData.destinationPattern.trim();
        finalAction = "PREFIX_REPLACE";
        finalReplacement = formData.replacement.trim();
        finalPrefixValue = formData.destinationPattern.trim();
      } else {
        finalPrefixValue = ["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action)
          ? formData.prefixValue.trim()
          : null;
        finalReplacement = ["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action)
          ? formData.replacement.trim()
          : null;
      }

      const payload: Partial<MessageFilterRule> = {
        client: selectedClientId || 0,
        targetEntity: "DESTINATION",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        destinationMatchType: finalMatchType,
        destinationPattern: finalPattern,
        action: finalAction,
        prefixValue: finalPrefixValue,
        replacement: finalReplacement,
        normalizationMode:
          formData.action === "NORMALIZE" ? formData.normalizationMode : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRule && editingRule.id) {
        await updateMessageFilterRuleApi(editingRule.id, payload);
        toast.success("Destination rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Destination rule created successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail =
        err.response?.data?.destinationPattern?.[0] ||
        err.response?.data?.prefixValue?.[0] ||
        err.response?.data?.replacement?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save destination rule";
      toast.error(String(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      contentClassName="pr-2 sm:pr-3"
      title={editingRule ? "Update Destination Rule" : "Add Destination Rule"}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Rule Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="e.g. UK Domestic 0-Prefix Normalization"
            required
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          <div>
            <Input
              label="Priority (Evaluation Order)"
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: Number(e.target.value) })
              }
              min={1}
              max={99999}
              required
              disabled={editingRule ? !canUpdate : !canCreate}
            />
            {conflictingRule && (
              <p className="text-[11px] mt-1 text-text-secondary dark:text-gray-400">
                Priority {formData.priority} is also assigned to rule "{conflictingRule.name}" (#{conflictingRule.id})
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Country Scope"
            value={formData.country ? String(formData.country) : ""}
            onChange={(val) =>
              setFormData({
                ...formData,
                country: val ? Number(val) : null,
              })
            }
            options={[
              { value: "", label: "Global (All Countries)" },
              ...countries.map((c) => ({
                value: String(c.id),
                label: c.name,
                icon: <CountryFlag iso2={c.iso2} width={16} height={12} />,
              })),
            ]}
            placeholder="Select Country Scope"
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          <Select
            label="Match Type"
            value={formData.destinationMatchType}
            onChange={(val) =>
              setFormData({
                ...formData,
                destinationMatchType: val as "EXACT" | "PREFIX" | "REGEX",
              })
            }
            options={[
              { value: "PREFIX", label: "Prefix Match (e.g. ^07 or 0)" },
              { value: "EXACT", label: "Exact Match" },
              { value: "REGEX", label: "Regex Pattern" },
            ]}
            disabled={editingRule ? !canUpdate : !canCreate}
          />
        </div>

        {/* Pattern Input */}
        <div>
          <Input
            label={
              formData.destinationMatchType === "REGEX"
                ? "Destination Regex Pattern"
                : formData.destinationMatchType === "EXACT"
                  ? "Exact Destination Number"
                  : "Destination Prefix"
            }
            value={formData.destinationPattern}
            onChange={(e) => {
              const nextVal = e.target.value;
              setFormData((prev) => {
                const shouldSync =
                  prev.destinationMatchType === "PREFIX" &&
                  prev.action === "PREFIX_REMOVE" &&
                  (!prev.prefixValue || prev.prefixValue === prev.destinationPattern);
                return {
                  ...prev,
                  destinationPattern: nextVal,
                  prefixValue: shouldSync ? nextVal : prev.prefixValue,
                };
              });
            }}
            placeholder={
              formData.destinationMatchType === "REGEX"
                ? "^0([7-9]\\d{9})$"
                : formData.destinationMatchType === "EXACT"
                  ? "61412345678"
                  : "0"
            }
            required={formData.action !== "NORMALIZE"}
            disabled={editingRule ? !canUpdate : !canCreate}
          />
        </div>

        {/* Action Select & Dynamic Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Translation Action"
            value={formData.action}
            onChange={(val) => {
              const nextAction = val as DestinationAction | "PREFIX_REPLACE";
              setFormData((prev) => {
                let nextPrefix = prev.prefixValue;
                if (
                  nextAction === "PREFIX_REMOVE" &&
                  prev.destinationMatchType === "PREFIX" &&
                  (!nextPrefix || nextPrefix === "44")
                ) {
                  nextPrefix = prev.destinationPattern || "0";
                } else if (
                  nextAction === "PREFIX_ADD" &&
                  (!nextPrefix || nextPrefix === "0" || nextPrefix === prev.destinationPattern)
                ) {
                  nextPrefix = "+44";
                }
                return {
                  ...prev,
                  action: nextAction,
                  prefixValue: nextPrefix,
                };
              });
            }}
            options={[
              { value: "PREFIX_REPLACE", label: "Prefix Replace (e.g. 0 \u2192 44)" },
              { value: "PREFIX_ADD", label: "Prefix Add (e.g. +44)" },
              { value: "PREFIX_REMOVE", label: "Prefix Remove (e.g. 0)" },
              { value: "FIXED_REPLACE", label: "Fixed Replace (Reroute Number)" },
              { value: "NORMALIZE", label: "E.164 Normalization Only" },
              { value: "REGEX_REPLACE", label: "Advanced: Regex Replace (Groups $1)" },
            ]}
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          {formData.action === "PREFIX_REPLACE" && (
            <Input
              label="Replacement Prefix"
              value={formData.replacement}
              onChange={(e) =>
                setFormData({ ...formData, replacement: e.target.value })
              }
              placeholder="e.g. 44"
              required
              disabled={editingRule ? !canUpdate : !canCreate}
            />
          )}

          {["PREFIX_ADD", "PREFIX_REMOVE"].includes(formData.action) && (
            <div>
              <Input
                label={
                  formData.action === "PREFIX_ADD"
                    ? "Prefix to Add"
                    : "Prefix to Remove"
                }
                value={formData.prefixValue}
                onChange={(e) =>
                  setFormData({ ...formData, prefixValue: e.target.value })
                }
                placeholder={
                  formData.action === "PREFIX_ADD"
                    ? "+44"
                    : formData.destinationMatchType === "PREFIX"
                      ? formData.destinationPattern || "0"
                      : "0"
                }
                required
                disabled={editingRule ? !canUpdate : !canCreate}
              />
              {(() => {
                if (
                  formData.action !== "PREFIX_REMOVE" ||
                  !formData.destinationPattern ||
                  !formData.prefixValue
                ) {
                  return null;
                }

                const hasMismatch =
                  formData.destinationMatchType === "PREFIX"
                    ? formData.prefixValue !== formData.destinationPattern
                    : !formData.destinationPattern.startsWith(formData.prefixValue);

                if (!hasMismatch) return null;

                return (
                  <div className="flex items-center justify-between text-[11px] mt-1 text-amber-600 dark:text-amber-400">
                    <span>
                      {formData.destinationMatchType === "PREFIX"
                        ? `Differs from match prefix (${formData.destinationPattern})`
                        : `Number does not begin with "${formData.prefixValue}"`}
                    </span>
                    {formData.destinationMatchType === "PREFIX" && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            prefixValue: prev.destinationPattern,
                          }))
                        }
                        className="text-primary hover:underline font-medium"
                        disabled={editingRule ? !canUpdate : !canCreate}
                      >
                        Reset to match
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {["FIXED_REPLACE", "REGEX_REPLACE"].includes(formData.action) && (
            <Input
              label="Replacement Value"
              value={formData.replacement}
              onChange={(e) =>
                setFormData({ ...formData, replacement: e.target.value })
              }
              placeholder={
                formData.action === "REGEX_REPLACE" ? "44$1" : "447700900000"
              }
              required
              disabled={editingRule ? !canUpdate : !canCreate}
            />
          )}
        </div>

        {/* Live Translation Preview with Toggle */}
        {(() => {
          const preview = getTransformationPreview();
          if (!preview) return null;

          if (!showHint) {
            return (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-transparent border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs mr-0.5">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs">
                  <Info size={14} className="text-primary" />
                  Action Example: <span className="font-medium text-text-primary dark:text-gray-200">[{preview.note}]</span>
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

                <span className="text-gray-400 font-bold text-sm shrink-0">{"\u2794"}</span>

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

        {/* Validation Feedback */}
        {isValidating && (
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <LoadingSpinner size="sm" />
            <span>Validating regex safety...</span>
          </div>
        )}

        {validationResult && !validationResult.isValid && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
            <div>
              <strong className="block font-semibold">Validation Error / ReDoS Warning:</strong>
              <span>{validationResult.error}</span>
            </div>
          </div>
        )}

        {/* Settings Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <ToggleSwitch
            label="Stop Processing Further Rules"
            description="Skip remaining rules on match"
            checked={formData.stopProcessing}
            onChange={(checked) =>
              setFormData({ ...formData, stopProcessing: checked })
            }
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          <ToggleSwitch
            label="Active Status"
            description="Active in live routing"
            checked={formData.isActive}
            onChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
            disabled={editingRule ? !canUpdate : !canCreate}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting ||
              (editingRule ? !canUpdate : !canCreate) ||
              (validationResult !== null && !validationResult.isValid)
            }
          >
            {editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
