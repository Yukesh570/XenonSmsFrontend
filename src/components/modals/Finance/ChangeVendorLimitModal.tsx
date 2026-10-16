import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { changeVendorLimitApi } from "../../../api/financeApi/accountTransactionApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

interface ChangeVendorLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: any | null;
}

export const ChangeVendorLimitModal: React.FC<ChangeVendorLimitModalProps> = ({
  isOpen, onClose, onSuccess, company
}) => {
  const [newLimit, setNewLimit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const limit = company?.vendorCreditLimit;
      setNewLimit(limit ? parseFloat(limit).toString() : "");
      setRemarks("");
    }
  }, [isOpen, company]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const limitNum = Number(newLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      return toast.error("Enter a valid new credit limit.");
    }

    setIsSubmitting(true);
    try {
      await changeVendorLimitApi({
        companyId: company.id,
        newLimit: limitNum,
        remarks: remarks.trim(),
      });
      toast.success("Vendor Limit change request submitted for verification!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.detail || "Failed to submit limit change.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Change Vendor Credit Limit - ${company.name}`} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <Input
            label="New Credit Limit"
            name="newLimit"
            type="number"
            step="any"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            placeholder="e.g. 5000.00"
            required
          />
          <Input
            label="Remarks"
            name="remarks"
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Increased vendor limit"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Limit Change"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
