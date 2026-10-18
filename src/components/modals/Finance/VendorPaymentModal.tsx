import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { vendorPaymentApi } from "../../../api/financeApi/accountTransactionApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: any | null;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
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
      return toast.error("Enter a valid payment amount.");
    }

    setIsSubmitting(true);
    try {
      await vendorPaymentApi({
        companyId: company.id,
        amount: amountNum,
        remarks: remarks.trim(),
      });
      toast.success("Vendor Payment request submitted for verification!");
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.detail || "Failed to submit payment.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Make Vendor Payment - ${company.name}`} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <Input
            label="Payment Amount"
            name="amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000.00"
            required
          />
          <Input
            label="Remarks"
            name="remarks"
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Paid invoice #INV-402"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
