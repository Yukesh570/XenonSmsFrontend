import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import { type VendorTransactionData } from "../../../api/transactionApi/transactionApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface VendorTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewData: VendorTransactionData | null;
}

export const VendorTransactionModal: React.FC<VendorTransactionModalProps> = ({
  isOpen,
  onClose,
  viewData,
}) => {
  if (!isOpen || !viewData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vendor Transaction Details" className="max-w-3xl">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Input label="Transaction ID" value={viewData.id || "-"} disabled />
          <Input label="Message ID" value={viewData.message_id || "-"} disabled />
          <Input label="Transaction Type" value={viewData.transactionType || "-"} disabled className="capitalize" />
          <Input label="Vendor Name" value={viewData.vendorProfileName || "-"} disabled />
          <Input label="Status" value={viewData.status || "-"} disabled />
          <Input label="Charge Policy" value={viewData.chargePolicy || "-"} disabled />
          <Input label="Currency" value={viewData.currencyCode || "-"} disabled />
          <Input label="Segments" value={String(viewData.segments || "0")} disabled />
          <Input label={`Rate Per Segment ${viewData.currencyCode ? `(${viewData.currencyCode})` : ""}`} value={String(viewData.ratePerSegment || "0")} disabled />
          <Input label={`Exchange Rate to Base ${viewData.baseCurrencyCode ? `(${viewData.baseCurrencyCode})` : ""}`} value={String(viewData.exchangeRateToBase || "0")} disabled />
          <Input label={`Amount ${viewData.currencyCode ? `(${viewData.currencyCode})` : ""}`} value={String(viewData.amount || "0")} disabled />
          <Input label={`Base Amount ${viewData.baseCurrencyCode ? `(${viewData.baseCurrencyCode})` : ""}`} value={String(viewData.baseAmount || "0")} disabled />
          <Input label={`Balance Spent ${viewData.currencyCode ? `(${viewData.currencyCode})` : ""}`} value={String(viewData.balanceSpent || "0")} disabled />
          <Input label="Created At" value={viewData.createdAt ? formatDateTime(viewData.createdAt) : "-"} disabled />
        </div>

        <div className="mt-4">
          <TextArea
            label="Description"
            value={viewData.description || "No description available."}
            disabled
            rows={3}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};