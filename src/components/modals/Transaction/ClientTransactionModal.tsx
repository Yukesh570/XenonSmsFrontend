import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { type ClientTransactionData } from "../../../api/transactionApi/transactionApi";
import { formatDateTime } from "../../../helper/dateFormatter";

interface ClientTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewData: ClientTransactionData | null;
}

export const ClientTransactionModal: React.FC<ClientTransactionModalProps> = ({
  isOpen,
  onClose,
  viewData,
}) => {
  if (!isOpen || !viewData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Client Transaction Details" className="max-w-3xl">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Transaction ID</label>
            <div className="text-sm font-medium text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.id || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Message ID</label>
            <div className="text-sm font-mono text-primary bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.message_id || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Transaction Type</label>
            <div className="text-sm font-medium capitalize text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.transactionType || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Client Name</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.clientName || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Status</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.status || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Charge Policy</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.chargePolicy || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Currency</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.currencyCode || "-"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Segments</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.segments || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Rate Per Segment {viewData.currencyCode ? `(${viewData.currencyCode})` : ""}</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.ratePerSegment || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1"> Exchange Rate to Base {viewData.baseCurrencyCode ? `(${viewData.baseCurrencyCode})` : ""}</label>
            <div className="text-sm font-semibold text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.exchangeRateToBase || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Amount {viewData.currencyCode ? `(${viewData.currencyCode})` : ""}</label>
            <div className="text-sm font-semibold text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.amount || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Base Amount {viewData.baseCurrencyCode ? `(${viewData.baseCurrencyCode})` : ""}</label>
            <div className="text-sm font-semibold text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.baseAmount || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Balance Spent {viewData.currencyCode ? `(${viewData.currencyCode})` : ""}</label>
            <div className="text-sm font-semibold text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.balanceSpent || "0"}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Created At</label>
            <div className="text-sm text-text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700">{viewData.createdAt ? formatDateTime(viewData.createdAt) : "-"}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Description</label>
          <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[80px] text-sm text-text-primary dark:text-white whitespace-pre-wrap break-words">
            {viewData.description || <span className="text-gray-400 italic">No description available.</span>}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};