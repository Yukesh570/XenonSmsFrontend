import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

// --- APIs ---
import { createInvoiceSetupApi, updateInvoiceSetupApi, type InvoiceSetupData } from "../../../api/financeApi/invoiceSetupApi";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";
import { getEntityApi } from "../../../api/settingApi/entityApi/entityApi";

// --- Components ---
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import ToggleSwitch from "../../ui/ToggleSwitch";

interface InvoiceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingSetup: InvoiceSetupData | null;
  isViewMode?: boolean;
}

interface Option {
  label: string;
  value: string;
  address?: string;
}

export const InvoiceSetupModal: React.FC<InvoiceSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingSetup,
  isViewMode = false,
}) => {
  // --- State mapped to Swagger ---
  const [formData, setFormData] = useState({
    company: "",
    billingAddressOverride: "",
    businessEntity: "",
    invoiceFrequency: "MONTHLY",
    dueDays: "" as number | string,
    tax: "" as number | string, // ⚡️ FIX: Added string | number signature
    isTaxApplied: false,
  });

  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [entityOptions, setEntityOptions] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Static Options ---
  const frequencyOptions = [
    { label: "Weekly", value: "WEEKLY" },
    { label: "Bi-weekly", value: "BI-WEEKLY" },
    { label: "Monthly", value: "MONTHLY" },
    { label: "3 Months", value: "QUARTERLY" },
  ];

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      getCompaniesApi("company", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setCompanyOptions(list.map((c: any) => ({ label: c.name, value: String(c.id), address: c.address || "" })));
        }).catch(() => console.error("Failed to load companies"));

      getEntityApi("entity", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setEntityOptions(list.map((e: any) => ({
            label: e.legalEntityName || e.companyName,
            value: String(e.id)
          })));
        }).catch(() => console.error("Failed to load entities"));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editingSetup) {
      setFormData({
        company: String(editingSetup.company || ""),
        billingAddressOverride: editingSetup.billingAddressOverride || "",
        businessEntity: String(editingSetup.businessEntity || ""),
        invoiceFrequency: editingSetup.invoiceFrequency || "MONTHLY",
        dueDays: editingSetup.dueDays !== undefined && editingSetup.dueDays !== null ? editingSetup.dueDays : "",
        tax: editingSetup.tax !== undefined && editingSetup.tax !== null ? editingSetup.tax : "",
        isTaxApplied: editingSetup.isTaxApplied || false,
      });
    } else if (isOpen) {
      setFormData({
        company: "",
        billingAddressOverride: "",
        businessEntity: "",
        invoiceFrequency: "MONTHLY",
        dueDays: "",
        tax: "", // ⚡️ FIX: Reset to empty string
        isTaxApplied: false,
      });
    }
  }, [isOpen, editingSetup]);

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // ⚡️ FIX: Allow backspace for both dueDays and tax so they don't lock at 0
    setFormData((prev) => ({
      ...prev,
      [name]: ["dueDays", "tax"].includes(name) ? (value === "" ? "" : Number(value)) : value
    }));
  };

  const handleSelect = (name: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "company") {
        const selectedCompany = companyOptions.find(c => c.value === value);
        updated.billingAddressOverride = selectedCompany?.address || "Address not available";
      }
      return updated;
    });
  };

  const handleToggle = (name: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.company || !formData.businessEntity) {
      toast.error("Company and Business Profile are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ⚡️ FIX: Ensure both dueDays and tax safely convert to numbers in the API payload
      const payload = {
        ...formData,
        dueDays: formData.dueDays === "" ? 0 : Number(formData.dueDays),
        tax: formData.tax === "" ? 0 : Number(formData.tax),
        company: Number(formData.company),
        businessEntity: Number(formData.businessEntity)
      };

      if (editingSetup) {
        await updateInvoiceSetupApi(editingSetup.id!, payload, moduleName);
        toast.success("Invoice Setup updated successfully!");
      } else {
        await createInvoiceSetupApi(payload, moduleName);
        toast.success("Invoice Setup created successfully!");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const serverError = error.response?.data;
      const errorMsg = serverError?.detail ||
        (serverError && typeof serverError === 'object'
          ? Object.values(serverError).flat()[0]
          : "Failed to save Invoice Setup.");

      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? "View Invoice Setup" : editingSetup ? "Edit Invoice Setup" : "Add Invoice Setup"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Company"
            value={formData.company}
            onChange={(v) => handleSelect("company", v)}
            options={companyOptions}
            placeholder="Select Company"
            disabled={isViewMode}
          />
          <Select
            label="Business Profile"
            value={formData.businessEntity}
            onChange={(v) => handleSelect("businessEntity", v)}
            options={entityOptions}
            placeholder="Select Business Profile"
            disabled={isViewMode}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Company Address"
            name="billingAddressOverride"
            value={formData.billingAddressOverride}
            onChange={handleChange}
            placeholder="Auto-filled based on company selection"
            disabled
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Invoice Frequency"
            value={formData.invoiceFrequency}
            onChange={(v) => handleSelect("invoiceFrequency", v)}
            options={frequencyOptions}
            disabled={isViewMode}
          />
          <Input
            label="Invoice Due Days"
            name="dueDays"
            type="number"
            value={formData.dueDays}
            onChange={handleChange}
            placeholder="e.g. 15"
            required
            disabled={isViewMode}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* ⚡️ FIX: Converted to number input with decimal support */}
          <Input
            label="Tax Details (%)"
            name="tax"
            type="number"
            step="any"
            value={formData.tax}
            onChange={handleChange}
            placeholder="e.g. 13"
            disabled={isViewMode}
          />
          <div className="pt-6">
            <div className={isViewMode ? "pointer-events-none opacity-50" : ""}>
              <ToggleSwitch
                label="Tax Applied"
                checked={formData.isTaxApplied}
                onChange={(v) => handleToggle("isTaxApplied", v)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingSetup ? "Update Setup" : "Save Setup"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};