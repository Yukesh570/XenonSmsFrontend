import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { adjustmentApi } from "../../../api/financeApi/accountTransactionApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import Select, { type SelectOption } from "../../ui/Select";

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: any | null;
  accountType?: "CLIENT" | "VENDOR";
  defaultAccountType?: "CLIENT" | "VENDOR";
}

const adjustmentOptions: SelectOption[] = [
  { value: "CREDIT_ADJUSTMENT", label: "Credit Adjustment (+ Increases Balance / Reduces Debt)" },
  { value: "DEBIT_ADJUSTMENT", label: "Debit Adjustment (- Decreases Balance / Increases Debt)" },
];

export const ManualAdjustmentModal: React.FC<ManualAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
  accountType: propAccountType,
  defaultAccountType = "CLIENT",
}) => {
  const accountType = propAccountType || defaultAccountType;
  const [transactionType, setTransactionType] = useState<"CREDIT_ADJUSTMENT" | "DEBIT_ADJUSTMENT">("CREDIT_ADJUSTMENT");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTransactionType("CREDIT_ADJUSTMENT");
      setAmount("");
      setReferenceNo("");
      setRemarks("");
    }
  }, [isOpen, accountType, company]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return toast.error("Please enter a valid positive adjustment amount.");
    }

    if (!remarks.trim()) {
      return toast.error("A reason / remark is mandatory for manual adjustments.");
    }

    const companyId = company.id || company.companyId;

    setIsSubmitting(true);
    try {
      await adjustmentApi({
        companyId,
        accountType,
        transactionType,
        amount: amountNum,
        referenceNo: referenceNo.trim() || undefined,
        remarks: remarks.trim(),
      });
      toast.success(`${transactionType === "CREDIT_ADJUSTMENT" ? "Credit" : "Debit"} Adjustment applied successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to process manual adjustment.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manual Adjustment - ${company.companyName || company.name}`}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex">
            <div
              className={`w-full py-2 text-sm font-semibold rounded-lg border text-center select-none ${
                accountType === "CLIENT"
                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
                  : "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700"
              }`}
            >
              {accountType === "CLIENT" ? "Client Side" : "Vendor Side"}
            </div>
          </div>

          <Select
            label="Adjustment Type"
            value={transactionType}
            onChange={(val) => setTransactionType(val as any)}
            options={adjustmentOptions}
            clearable={false}
          />

          <Input
            label="Adjustment Amount"
            name="amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 250.00"
            required
          />

          <Input
            label="Reference No. (Optional)"
            name="referenceNo"
            type="text"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="e.g. ADJ-2026-001"
          />

          <Input
            label="Reason / Remarks (Required for Audit)"
            name="remarks"
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Approved billing correction for ticket #4812"
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Applying..." : "Apply Adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
