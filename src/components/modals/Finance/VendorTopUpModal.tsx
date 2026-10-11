import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { vendorTopUpApi } from "../../../api/financeApi/accountTransactionApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

interface VendorTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: any | null;
}

export const VendorTopUpModal: React.FC<VendorTopUpModalProps> = ({
  isOpen, onClose, onSuccess, company
}) => {
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setRemarks("");
    }
  }, [isOpen, company]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return toast.error("Enter a valid amount to top-up.");
    }

    setIsSubmitting(true);
    try {
      await vendorTopUpApi({
        companyId: company.id,
        amount: amountNum,
        remarks: remarks.trim(),
      });
      toast.success("Vendor Top-Up request submitted for verification!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to submit Top-Up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vendor Prepaid Top-Up - ${company.name}`} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <Input
            label="Top-Up Amount"
            name="amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500.00"
            required
          />
          <Input
            label="Remarks"
            name="remarks"
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Topup via wire"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Top-Up"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
