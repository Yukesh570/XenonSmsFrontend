import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { addCreditApi, getCompaniesApi } from "../../../api/companyApi/companyApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName?: string;
  editingCompany: any | null;
  creditType: "customer" | "vendor"; // Tells the modal which field to update
}

interface Option { label: string; value: string; }

export const CreditModal: React.FC<CreditModalProps> = ({
  isOpen, onClose, onSuccess, moduleName = "company", editingCompany, creditType
}) => {
  const [formData, setFormData] = useState({
    companyId: "",
    creditLimit: "",
    remarks: "",
  });

  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustomer = creditType === "customer";
  const labelPrefix = isCustomer ? "Customer" : "Vendor";

  useEffect(() => {
    if (isOpen) {
      getCompaniesApi(moduleName, 1, 1000).then((res: any) => {
        const list = res.results || (Array.isArray(res) ? res : []);
        setCompanyOptions(
          list
            .map((c: any) => ({ label: c.name, value: String(c.id) }))
            .sort((a: Option, b: Option) => a.label.localeCompare(b.label))
        );
      }).catch(console.error);
    }
  }, [isOpen, moduleName]);

  useEffect(() => {
    if (isOpen && editingCompany) {
      // Pick the correct credit limit based on the type
      const existingLimit = isCustomer ? editingCompany.customerCreditLimit : editingCompany.vendorCreditLimit;

      setFormData({
        companyId: String(editingCompany.id),
        creditLimit: existingLimit ? String(existingLimit) : "",
        remarks: "",
      });
    } else if (isOpen) {
      setFormData({ companyId: "", creditLimit: "", remarks: "" });
    }
  }, [isOpen, editingCompany, isCustomer]);

  const handleSelect = (name: string, value: string) => setFormData({ ...formData, [name]: value });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.creditLimit) {
      return toast.error("Company and Credit Limit are required.");
    }

    setIsSubmitting(true);

    // Dynamically build payload based on type
    const payload = {
      company: Number(formData.companyId),
      creditType: isCustomer ? "CLIENT" : "VENDOR",
      creditAmount: Number(formData.creditLimit),
      remarks: formData.remarks,
    };

    try {
      await addCreditApi(payload, moduleName);
      toast.success(`${labelPrefix} credit limit updated successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update credit limit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCompany ? `Edit ${labelPrefix} Credit` : `Add ${labelPrefix} Credit`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <Select
            label="Company"
            value={formData.companyId}
            onChange={(v) => handleSelect("companyId", v)}
            options={companyOptions}
            placeholder="Select Company"
            disabled={!!editingCompany} // Locks company dropdown if editing existing row
          />
          <Input
            label={`${labelPrefix} Credit Limit Amount`}
            name="creditLimit"
            type="number"
            step="0.01"
            // value={formData.creditLimit}
            onChange={handleChange}
            placeholder="e.g. 5000.00"
            required
          />
          <Input
            label="Remarks (Optional)"
            name="remarks"
            type="text"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Add a short note..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Credit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};