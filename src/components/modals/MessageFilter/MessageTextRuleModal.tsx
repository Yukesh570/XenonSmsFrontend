import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import ToggleSwitch from "../../ui/ToggleSwitch";
import { CountryFlag } from "../../ui/CountryFlag";
import type {
  MessageFilterRule,
  TextAction,
  MessageTextReplacementList,
} from "../../../api/messageFilterApi/messageFilterApi";
import {
  createMessageFilterRuleApi,
  updateMessageFilterRuleApi,
  validateMessageFilterRuleApi,
} from "../../../api/messageFilterApi/messageFilterApi";
import {
  generateMaskRule,
  decodeMaskRule,
  getMaskPreview,
  type ExtendedTextAction,
  type MaskDataType,
  type MaskFormat,
} from "./maskingHelpers";

export interface MessageTextRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRule: MessageFilterRule | null;
  selectedClientId: number | null;
  countries: any[];
  replacementLists: MessageTextReplacementList[];
  existingRules: MessageFilterRule[];
  canCreate: boolean;
  canUpdate: boolean;
}

const actionOptions = [
  { value: "MASK_SENSITIVE", label: "Mask Sensitive Data (OTP, PIN, Cards, Phone)" },
  { value: "STRING_REPLACE", label: "String Replace (Static Word/Phrase)" },
  { value: "REGEX_REPLACE", label: "Advanced: Regex Replace (Capture Groups $1)" },
  { value: "LIST_SEQUENTIAL", label: "List: Sequential (Round-Robin Macro)" },
  { value: "LIST_RANDOM", label: "List: Random (Distributed Macro)" },
];

export const MessageTextRuleModal: React.FC<MessageTextRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingRule,
  selectedClientId,
  countries,
  replacementLists,
  existingRules,
  canCreate,
  canUpdate,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    priority: number;
    country: number | null;
    textMatchType: "EXACT" | "CONTAINS" | "REGEX";
    textPattern: string;
    action: ExtendedTextAction;
    replacement: string;
    replacementList: number | null;
    stopProcessing: boolean;
    isActive: boolean;
    maskDataType: MaskDataType;
    maskFormat: MaskFormat;
    maskContextKeyword: string;
  }>({
    name: "",
    priority: 100,
    country: null,
    textMatchType: "CONTAINS",
    textPattern: "",
    action: "STRING_REPLACE",
    replacement: "",
    replacementList: null,
    stopProcessing: false,
    isActive: true,
    maskDataType: "OTP_6",
    maskFormat: "KEEP_FIRST_2",
    maskContextKeyword: "code is",
  });

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showLiveMaskPreview, setShowLiveMaskPreview] = useState(true);
  const [showMacroTags, setShowMacroTags] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    if (editingRule) {
      const decodedMask = decodeMaskRule(editingRule);

      if (decodedMask.isMask) {
        setFormData({
          name: editingRule.name,
          priority: editingRule.priority,
          country: editingRule.country,
          textMatchType: "REGEX",
          textPattern: editingRule.textPattern || "",
          action: "MASK_SENSITIVE",
          replacement: editingRule.replacement || "",
          replacementList: null,
          stopProcessing: editingRule.stopProcessing,
          isActive: editingRule.isActive,
          maskDataType: decodedMask.dataType || "OTP_6",
          maskFormat: decodedMask.format || "KEEP_FIRST_2",
          maskContextKeyword: decodedMask.contextKeyword || "",
        });
      } else {
        setFormData({
          name: editingRule.name,
          priority: editingRule.priority,
          country: editingRule.country,
          textMatchType:
            (editingRule.textMatchType as "EXACT" | "CONTAINS" | "REGEX") || "CONTAINS",
          textPattern: editingRule.textPattern || "",
          action: (editingRule.action as ExtendedTextAction) || "STRING_REPLACE",
          replacement: editingRule.replacement || "",
          replacementList: editingRule.replacementList || null,
          stopProcessing: editingRule.stopProcessing,
          isActive: editingRule.isActive,
          maskDataType: "OTP_6",
          maskFormat: "KEEP_FIRST_2",
          maskContextKeyword: "code is",
        });
      }
      setShowHint(false);
      setShowLiveMaskPreview(true);
      setShowMacroTags(false);
    } else {
      setFormData({
        name: "",
        priority:
          existingRules.length > 0
            ? Math.max(...existingRules.map((r) => r.priority)) + 10
            : 100,
        country: null,
        textMatchType: "CONTAINS",
        textPattern: "",
        action: "STRING_REPLACE",
        replacement: "",
        replacementList: null,
        stopProcessing: false,
        isActive: true,
        maskDataType: "OTP_6",
        maskFormat: "KEEP_FIRST_2",
        maskContextKeyword: "code is",
      });
      setShowHint(true);
      setShowLiveMaskPreview(true);
      setShowMacroTags(true);
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

  // Debounced Regex / Macro Validation
  useEffect(() => {
    if (
      !isOpen ||
      formData.action === "MASK_SENSITIVE" ||
      (formData.textMatchType !== "REGEX" &&
        !formData.replacement?.includes("${"))
    ) {
      setValidationResult(null);
      return;
    }

    if (!formData.textPattern && formData.textMatchType === "REGEX") {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await validateMessageFilterRuleApi({
          targetEntity: "MESSAGE_TEXT",
          textMatchType: formData.textMatchType,
          textPattern: formData.textPattern,
          action: formData.action === "MASK_SENSITIVE" ? "REGEX_REPLACE" : formData.action,
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
    formData.textPattern,
    formData.textMatchType,
    formData.action,
    formData.replacement,
  ]);

  const handleInsertMacro = (macroText: string) => {
    setFormData((prev) => ({
      ...prev,
      replacement: prev.replacement ? `${prev.replacement} ${macroText}` : macroText,
    }));
  };

  // Static reference preview for message text transformation actions
  const getTransformationPreview = () => {
    const action = formData.action || "STRING_REPLACE";

    if (action === "STRING_REPLACE") {
      return {
        input: "Your Uber code is 4928. Never share this code.",
        output: "Your RideApp code is 4928. Never share this code.",
        note: "Direct Word/Brand Rewrite",
        explanation:
          "Replaces static text matches ('Uber' \u2192 'RideApp') to keep brand routing compliant across aggregators.",
      };
    }

    if (action === "REGEX_REPLACE") {
      return {
        input: "Order #98231 was confirmed by system.",
        output: "Order [REF-98231] was confirmed by system.",
        note: "Regex Capture Substitution",
        explanation:
          "Captures regex groups and rewrites them according to backreferences ($1, $2).",
      };
    }

    if (action === "LIST_SEQUENTIAL") {
      return {
        input: "Thanks for using service. Reply STOP to opt out.",
        output: "Thanks for using service. Support: support@domain.com",
        note: "Sequential Template Rotation",
        explanation:
          "Picks dynamic replacement values in order from your selected text list to diversify carrier payloads.",
      };
    }

    if (action === "LIST_RANDOM") {
      return {
        input: "Hello customer! Visit our store today.",
        output: "Hi there! Visit our store today. [Promo #9418]",
        note: "Random Macro Injection",
        explanation:
          "Randomly picks replacements or dynamic variations from the assigned list.",
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

    let finalMatchType = formData.textMatchType;
    let finalPattern = formData.textPattern.trim();
    let finalAction: TextAction = (formData.action === "MASK_SENSITIVE" ? "REGEX_REPLACE" : formData.action) as TextAction;
    let finalReplacement: string | null = formData.replacement.trim() || "";

    if (formData.action === "MASK_SENSITIVE") {
      finalMatchType = "REGEX";
      finalAction = "REGEX_REPLACE";
      const generated = generateMaskRule({
        dataType: formData.maskDataType,
        format: formData.maskFormat,
        contextKeyword: formData.maskContextKeyword,
      });
      finalPattern = generated.textPattern;
      finalReplacement = generated.replacement;
    } else if (["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)) {
      finalReplacement = null;
    }

    if (!finalPattern) {
      toast.error("Search text/pattern is required");
      return;
    }
    if (validationResult && !validationResult.isValid) {
      toast.error(`Rule validation error: ${validationResult.error}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<MessageFilterRule> = {
        client: selectedClientId || 0,
        targetEntity: "MESSAGE_TEXT",
        name: formData.name.trim(),
        priority: Number(formData.priority),
        country: formData.country,
        textMatchType: finalMatchType,
        textPattern: finalPattern,
        action: finalAction,
        replacement: finalReplacement,
        replacementList:
          ["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action)
            ? formData.replacementList
            : null,
        stopProcessing: formData.stopProcessing,
        status: formData.isActive ? "ACTIVE" : "INACTIVE",
        isActive: formData.isActive,
      };

      if (editingRule && editingRule.id) {
        await updateMessageFilterRuleApi(editingRule.id, payload);
        toast.success("Message text rule updated successfully");
      } else {
        await createMessageFilterRuleApi(payload);
        toast.success("Message text rule created successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail =
        err.response?.data?.textPattern?.[0] ||
        err.response?.data?.replacement?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to save message text rule";
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
      title={editingRule ? "Update Message Text Rule" : "Add Message Text Rule"}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Rule Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Brand Name Masking / Dynamic OTP Token"
            required
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          <div>
            <Input
              label="Priority (Evaluation Order)"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              min={1}
              max={99999}
              required
              disabled={editingRule ? !canUpdate : !canCreate}
            />
            {conflictingRule && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>
                  Priority already in use by rule &quot;{conflictingRule.name}&quot; (ID #{conflictingRule.id}). Must be unique.
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Country Scope"
            value={formData.country ? String(formData.country) : ""}
            onChange={(val) => setFormData({ ...formData, country: val ? Number(val) : null })}
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
            value={formData.textMatchType}
            onChange={(val) =>
              setFormData({
                ...formData,
                textMatchType: val as "EXACT" | "CONTAINS" | "REGEX",
              })
            }
            options={[
              { value: "CONTAINS", label: "Contains (Sub-string)" },
              { value: "EXACT", label: "Exact Match" },
              { value: "REGEX", label: "Regex Pattern" },
            ]}
            disabled={editingRule ? !canUpdate : !canCreate}
          />
        </div>

        {/* Pattern Input - Only shown for standard string / regex replacement */}
        {formData.action !== "MASK_SENSITIVE" && (
          <div>
            <Input
              label={formData.textMatchType === "REGEX" ? "Search Pattern (Regex)" : "Search Text"}
              value={formData.textPattern}
              onChange={(e) => setFormData({ ...formData, textPattern: e.target.value })}
              placeholder={
                formData.textMatchType === "REGEX"
                  ? "(?:code|otp):?\\s*(\\d{4,6})"
                  : "AcmeBank"
              }
              isLoading={isValidating && formData.textMatchType === "REGEX"}
              required
              disabled={editingRule ? !canUpdate : !canCreate}
            />
            {formData.textMatchType === "REGEX" && validationResult && !validationResult.isValid && (
              <p className="text-[11px] text-red-500 mt-1 font-medium flex items-center gap-1">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{validationResult.error}</span>
              </p>
            )}
          </div>
        )}

        {/* Action & Replacement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Action"
            value={formData.action}
            onChange={(val) => {
              const nextAction = val as ExtendedTextAction;
              let nextReplacementList = formData.replacementList;
              if (nextAction === "LIST_SEQUENTIAL" || nextAction === "LIST_RANDOM") {
                const targetMode = nextAction === "LIST_SEQUENTIAL" ? "SEQUENTIAL" : "RANDOM";
                const currentSelected = replacementLists.find((l) => l.id === formData.replacementList);
                if (currentSelected && (currentSelected.selectionMode || "RANDOM").toUpperCase() !== targetMode) {
                  nextReplacementList = null;
                }
              }
              setFormData({
                ...formData,
                action: nextAction,
                replacementList: nextReplacementList,
              });
            }}
            options={actionOptions}
            disabled={editingRule ? !canUpdate : !canCreate}
          />

          {["LIST_SEQUENTIAL", "LIST_RANDOM"].includes(formData.action) ? (
            <Select
              label={`Text Replacement List (${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"})`}
              value={formData.replacementList ? String(formData.replacementList) : ""}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  replacementList: val ? Number(val) : null,
                })
              }
              options={replacementLists
                .filter((l) => {
                  const mode = (l.selectionMode || "RANDOM").toUpperCase();
                  return formData.action === "LIST_SEQUENTIAL"
                    ? mode === "SEQUENTIAL"
                    : mode === "RANDOM";
                })
                .map((l) => ({
                  value: String(l.id),
                  label: l.name,
                }))}
              placeholder={
                replacementLists.filter((l) => {
                  const mode = (l.selectionMode || "RANDOM").toUpperCase();
                  return formData.action === "LIST_SEQUENTIAL" ? mode === "SEQUENTIAL" : mode === "RANDOM";
                }).length > 0
                  ? `Select ${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"} List`
                  : `No ${formData.action === "LIST_SEQUENTIAL" ? "Sequential" : "Random"} lists found`
              }
              disabled={editingRule ? !canUpdate : !canCreate}
            />
          ) : formData.action === "MASK_SENSITIVE" ? (
            <Select
              label="Masking Format"
              value={formData.maskFormat}
              onChange={(val) =>
                setFormData({ ...formData, maskFormat: val as MaskFormat })
              }
              options={[
                { value: "KEEP_FIRST_2", label: "Show first 2 digits, mask rest (49****)" },
                { value: "KEEP_LAST_2", label: "Show last 2 digits, mask rest (****12)" },
                { value: "KEEP_LAST_4", label: "Show last 4 digits, mask rest (****6789)" },
                { value: "ALL_ASTERISKS", label: "Mask entirely with asterisks (******)" },
                { value: "REDACTED", label: "Replace with [REDACTED]" },
              ]}
              disabled={editingRule ? !canUpdate : !canCreate}
            />
          ) : (
            <div>
              <Input
                label="Replacement Text"
                value={formData.replacement}
                onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                placeholder="e.g. SecretBrand or [REF: ${RANDINT:1000:9999}]"
                disabled={editingRule ? !canUpdate : !canCreate}
              />
            </div>
          )}
        </div>

        {formData.action === "MASK_SENSITIVE" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Data to Mask"
                value={formData.maskDataType}
                onChange={(val) =>
                  setFormData({ ...formData, maskDataType: val as MaskDataType })
                }
                options={[
                  { value: "OTP_6", label: "6-Digit OTP / Verification Code (e.g. 492812)" },
                  { value: "OTP_4", label: "4-Digit PIN Code (e.g. 4812)" },
                  { value: "CARD_16", label: "16-Digit Card / Account Number" },
                  { value: "ANY_NUMBERS", label: "Any Number Sequence (4+ digits)" },
                ]}
                disabled={editingRule ? !canUpdate : !canCreate}
              />

              <Input
                label="Preceding Trigger Phrase (Optional)"
                value={formData.maskContextKeyword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maskContextKeyword: e.target.value,
                  })
                }
                placeholder="e.g. code is, OTP (or leave empty to mask anywhere)"
                disabled={editingRule ? !canUpdate : !canCreate}
              />
            </div>

            {/* Live Transformation Preview */}
            {(() => {
              const preview = getMaskPreview(
                formData.maskDataType,
                formData.maskFormat,
                formData.maskContextKeyword
              );

              if (!showLiveMaskPreview) {
                return (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-transparent border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs">
                      <Info size={14} className="text-primary" />
                      Live Transformation Preview:{" "}
                      <span className="font-medium text-text-primary dark:text-gray-200">
                        [Masking preview]
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLiveMaskPreview(true)}
                      className="text-xs font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                    >
                      Show Preview <ChevronDown size={13} />
                    </button>
                  </div>
                );
              }

              return (
                <div className="p-3.5 bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl space-y-2.5 mr-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                      <Info size={14} className="text-primary" />
                      Live Transformation Preview:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                        Masking preview
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLiveMaskPreview(false)}
                        className="text-xs text-gray-400 hover:text-text-primary dark:hover:text-white flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Hide <ChevronUp size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-transparent border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-400 tracking-wider mb-1">
                        Incoming SMS
                      </div>
                      <div className="text-xs font-mono font-medium text-gray-800 dark:text-gray-200 truncate py-0.5" title={preview.incoming}>
                        &quot;{preview.incoming}&quot;
                      </div>
                    </div>

                    <span className="text-gray-400 font-bold text-sm shrink-0">{"\u2794"}</span>

                    <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-transparent border border-emerald-300 dark:border-emerald-700 overflow-hidden">
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">
                        Delivered to Carrier
                      </div>
                      <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate py-0.5" title={preview.transformed}>
                        &quot;{preview.transformed}&quot;
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Masks matching sensitive data before delivering the message to the carrier.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Macro Quick-Insert Helper Pills */}
        {!["LIST_SEQUENTIAL", "LIST_RANDOM", "MASK_SENSITIVE"].includes(formData.action) && (
          showMacroTags ? (
            <div className="p-3.5 bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl space-y-2.5 mr-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                  <Info size={14} className="text-primary" />
                  Dynamic Random Tags Quick-Insert:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    Macro tags
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMacroTags(false)}
                    className="text-xs text-gray-400 hover:text-text-primary dark:hover:text-white flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Hide <ChevronUp size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "${RANDINT:1000:9999}", desc: "Random 4-digit number" },
                  { tag: "${RANDHEX:8}", desc: "8-char hex string" },
                  { tag: "${RANDTEXT:6}", desc: "6-char alphanumeric" },
                  { tag: "${RANDLETTERS:6}", desc: "6 random uppercase letters" },
                ].map(({ tag, desc }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertMacro(tag)}
                    disabled={editingRule ? !canUpdate : !canCreate}
                    className="px-2.5 py-1 text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono text-text-primary dark:text-white shadow-2xs"
                    title={desc}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Click any tag to append dynamic random tokens into the replacement text.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-transparent border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs mr-0.5">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs">
                <Info size={14} className="text-primary" />
                Dynamic Random Tags Quick-Insert: <span className="font-medium text-text-primary dark:text-gray-200">[4 Macro Tags]</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMacroTags(true)}
                className="text-xs font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
              >
                Show Tags <ChevronDown size={13} />
              </button>
            </div>
          )
        )}

        {/* Live Text Translation Preview with Toggle */}
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
