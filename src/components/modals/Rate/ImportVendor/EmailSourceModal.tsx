import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  createEmailSourceApi,
  updateEmailSourceApi,
  type EmailSourceData,
} from "../../../../api/rateApi/ImportVendor/emailSourceApi";
import { getVendorsApi } from "../../../../api/connectivityApi/vendorApi";
import { getMappingSetupsApi } from "../../../../api/mappingSetupApi/mappingSetupApi";
import { getCompaniesApi } from "../../../../api/companyApi/companyApi";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Select from "../../../ui/Select";
import Modal from "../../../ui/Modal";
import ToggleSwitch from "../../../ui/ToggleSwitch";

interface EmailSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingData: EmailSourceData | null;
  isViewMode?: boolean;
}

interface Option {
  label: string;
  value: string;
}

// ─── Multi-tag input ────────────────────────────────────────────────────
interface MultiTagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  disabled?: boolean;
  label: string;
  placeholder: string;
  hint?: string;
  validatePattern?: RegExp;
  validateErrorMsg?: string;
}

const MultiTagInput: React.FC<MultiTagInputProps> = ({
  tags,
  onAdd,
  onRemove,
  disabled = false,
  label,
  placeholder,
  hint,
  validatePattern,
  validateErrorMsg,
}) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commitTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (validatePattern && !validatePattern.test(tag)) {
      toast.error(`"${tag}" ${validateErrorMsg || "is not valid."}`);
      return;
    }
    if (tags.map((t) => t.toLowerCase()).includes(tag)) {
      toast.info(`${label} already added.`);
      return;
    }
    onAdd(tag);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", "Tab"].includes(e.key)) {
      e.preventDefault();
      commitTag(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.clipboardData.getData("text").split(/[,;\s]+/).forEach(commitTag);
  };

  return (
    <div className="flex flex-col w-full">
      <label className="mb-1.5 text-xs font-medium text-text-secondary dark:text-gray-400">
        {label}
      </label>

      <div
        className={[
          "w-full min-h-[34px] rounded-lg border px-2 py-1 text-xs sm:text-sm shadow-input transition duration-150 ease-in-out flex flex-wrap gap-1.5 items-center cursor-text",
          disabled
            ? "bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed"
            : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary/40",
        ].join(" ")}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 border border-primary/20"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemove(tag); }}
                className="ml-0.5 rounded-full hover:bg-primary/20 transition-colors p-0.5 leading-none"
                aria-label={`Remove ${tag}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => { if (inputValue.trim()) commitTag(inputValue); }}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        )}
      </div>

      {!disabled && hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export const EmailSourceModal: React.FC<EmailSourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingData,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    vendor: "",
    mappingSetup: "",
    allowedDomain: "",
    strictDomainMatch: false,
    subjectPattern: "",
    uniqueId: "",
    active: true,
  });

  // Manually added extra emails
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [extraDomains, setExtraDomains] = useState<string[]>([]);

  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [mappingOptions, setMappingOptions] = useState<Option[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derive company email (locked) from selected vendor ──────────────────────
  // const companyEmail = (() => {
  //   if (formData.vendor) {
  //     const selectedVendor = vendorsList.find((v) => String(v.id) === String(formData.vendor));
  //     if (selectedVendor?.company) {
  //       const selectedCompany = companiesList.find((c) => String(c.id) === String(selectedVendor.company));
  //       if (selectedCompany) {
  //         return selectedCompany.ratesEmail || selectedCompany.companyEmail || "";
  //       }
  //     }
  //   }
  //   return "";
  // })();

  // ── Fetch reference data ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      getVendorsApi("vendor", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setVendorsList(list);
          setVendorOptions(list.map((v: any) => ({
            label: v.profileName || v.name || `Vendor ${v.id}`,
            value: String(v.id),
          })));
        })
        .catch((err: any) => console.error("Failed to load vendors", err));

      getCompaniesApi("company", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setCompaniesList(list);
        })
        .catch((err: any) => console.error("Failed to load companies", err));

      getMappingSetupsApi("mappingSetup", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setMappingOptions(list.map((m: any) => ({
            label: m.name || `Setup ${m.id}`,
            value: String(m.id),
          })));
        })
        .catch((err: any) => console.error("Failed to load mappings", err));
    }
  }, [isOpen]);

  // ── Populate form when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (editingData) {
        const saved = editingData.allowedEmail || "";
        const parsed = saved.split(",").map((e: string) => e.trim()).filter(Boolean);

        const savedDomains = editingData.allowedDomain || "";
        const parsedDomains = savedDomains.split(",").map((e: string) => e.trim()).filter(Boolean);

        setFormData({
          vendor: editingData.vendor ? String(editingData.vendor) : "",
          mappingSetup: editingData.mappingSetup ? String(editingData.mappingSetup) : "",
          allowedDomain: editingData.allowedDomain || "",
          strictDomainMatch: editingData.strictDomainMatch ?? false,
          subjectPattern: editingData.subjectPattern || "",
          uniqueId: editingData.uniqueId || "",
          active: editingData.active ?? true,
        });
        setExtraEmails(parsed);
        setExtraDomains(parsedDomains);
      } else {
        setFormData({ vendor: "", mappingSetup: "", allowedDomain: "", strictDomainMatch: false, subjectPattern: "", uniqueId: "", active: true });
        setExtraEmails([]);
        setExtraDomains([]);
      }
    }
  }, [isOpen, editingData]);



  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });

    // When vendor is manually changed, auto-fill its emails, tags, and systemId
    if (name === "vendor") {
      const selectedVendor = vendorsList.find((v) => String(v.id) === value);

      let newUniqueId = formData.uniqueId;
      if (!newUniqueId) {
        newUniqueId = "UID-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      setFormData((prev) => ({ ...prev, vendor: value, uniqueId: newUniqueId }));

      if (selectedVendor?.company) {
        // Safely extract the company ID whether it's a primitive number/string or a nested object
        const vendorCompanyId = 
          typeof selectedVendor.company === "object" 
            ? (selectedVendor.company as any).id 
            : selectedVendor.company;

        const selectedCompany = companiesList.find(
          (c) => String(c.id) === String(vendorCompanyId)
        );
        
        if (selectedCompany) {
          const cEmail = selectedCompany.ratesEmail || selectedCompany.companyEmail || "";
          const emailsToAdd = cEmail.split(",").map((e: string) => e.trim()).filter(Boolean);
          setExtraEmails(emailsToAdd);
          return;
        }
      }
      setExtraEmails([]);
      setExtraDomains([]);
    }
  };

  const handleToggle = (name: string, value: boolean) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (isViewMode) return;
    setIsSubmitting(true);
    try {
      // Send all emails as a comma-separated string
      const payload: any = {
        allowedDomain: extraDomains.join(", ") || null,
        strictDomainMatch: formData.strictDomainMatch,
        allowedEmail: extraEmails.join(", ") || null,
        subjectPattern: formData.subjectPattern,
        active: formData.active,
        vendor: parseInt(formData.vendor),
        mappingSetup: parseInt(formData.mappingSetup),
        uniqueId: formData.uniqueId || null,
      };

      if (editingData && editingData.id) {
        await updateEmailSourceApi(editingData.id, payload, moduleName);
        toast.success("Email Source updated successfully!");
      } else {
        await createEmailSourceApi(payload, moduleName);
        toast.success("Email Source created successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;
      if (serverError && typeof serverError === "object") {
        Object.entries(serverError).forEach(([key, msgs]) => {
          const msgText = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
          toast.error(`${key}: ${msgText}`);
        });
      } else {
        toast.error("Failed to save Email Source.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isViewMode
          ? "View Email Source"
          : editingData
            ? "Edit Email Source"
            : "Add Email Source"
      }
      className="max-w-xl"
    >
      <div className="space-y-4 px-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <legend className="text-sm font-semibold text-primary px-2">
            Configuration
          </legend>
          <div className="grid grid-cols-1 gap-2">
            <Select
              label="Vendor"
              value={formData.vendor}
              onChange={(v: string) => handleSelect("vendor", v)}
              options={vendorOptions}
              placeholder="Select Vendor"
              disabled={isViewMode}
            />
            <Select
              label="Mapping Setup"
              value={formData.mappingSetup}
              onChange={(v: string) => handleSelect("mappingSetup", v)}
              options={mappingOptions}
              placeholder="Select Mapping Setup"
              disabled={isViewMode}
            />

            <div className="relative">
              <Input
                label="Unique ID"
                name="uniqueId"
                value={formData.uniqueId}
                onChange={handleChange}
                placeholder="Enter a unique ID (e.g. UID-XXXX)"
                disabled={isViewMode}
              />
              <button
                type="button"
                onClick={() => {
                  if (formData.uniqueId) {
                    navigator.clipboard.writeText(formData.uniqueId);
                    toast.success("Unique ID copied to clipboard!");
                  }
                }}
                className="absolute right-2 top-8 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!formData.uniqueId}
              >
                Copy
              </button>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                The vendor must include this ID in their email subject or body.
              </p>
            </div>

            {/* Multi-email tag input */}
            <MultiTagInput
              tags={extraEmails}
              onAdd={(email) => setExtraEmails((prev) => [...prev, email])}
              onRemove={(email) => setExtraEmails((prev) => prev.filter((e) => e !== email))}
              disabled={isViewMode}
              label="Allowed Email"
              placeholder="Add email and press Enter"
              hint="Press Enter or comma to add. Emails are pre-filled from the vendor's Company email."
              validatePattern={/^[^\s@]+@[^\s@]+\.[^\s@]+$/}
              validateErrorMsg="is not a valid email address."
            />

            <MultiTagInput
              tags={extraDomains}
              onAdd={(domain) => setExtraDomains((prev) => [...prev, domain])}
              onRemove={(domain) => setExtraDomains((prev) => prev.filter((d) => d !== domain))}
              disabled={isViewMode}
              label="Allowed Domain"
              placeholder="example.com"
              hint="Press Enter or comma to add."
            />
            <Input
              label="Subject Pattern"
              name="subjectPattern"
              value={formData.subjectPattern}
              onChange={handleChange}
              placeholder="e.g. *Invoice*"
              disabled={isViewMode}
            />
            <div className={`mt-2 flex flex-wrap items-center gap-6 ${isViewMode ? "pointer-events-none opacity-50" : ""}`}>
              <ToggleSwitch
                label="Strict Domain Match"
                checked={formData.strictDomainMatch}
                onChange={(v: boolean) => handleToggle("strictDomainMatch", v)}
              />
              <ToggleSwitch
                label="Active Status"
                checked={formData.active}
                onChange={(v: boolean) => handleToggle("active", v)}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="button" variant="primary" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Saving..." : editingData ? "Update" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
