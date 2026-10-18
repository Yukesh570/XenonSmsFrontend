import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { RotateCcw } from "lucide-react";

interface RetryCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaignName?: string;
  recipientCount?: number;
  isLoading?: boolean;
}

export const RetryCampaignModal: React.FC<RetryCampaignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  campaignName,
  recipientCount,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <RotateCcw size={18} className="text-primary" />
          <span>Retry Campaign</span>
        </div>
      }
      className="max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-4 pt-1">
        <div className="p-3 bg-primary/10 rounded-full text-primary dark:bg-primary/20">
          <RotateCcw size={32} />
        </div>

        <div className="space-y-1.5">
          <p className="text-text-primary dark:text-white text-base font-semibold">
            Retry sending &ldquo;{campaignName || "this campaign"}&rdquo;?
          </p>
          <p className="text-text-secondary dark:text-gray-400 text-xs leading-relaxed">
            This will re-dispatch messages to all{" "}
            <strong className="text-text-primary dark:text-white font-medium">
              {recipientCount ?? 0} {recipientCount === 1 ? "contact" : "contacts"}
            </strong>{" "}
            in this campaign.
          </p>
        </div>

        <div className="flex justify-center space-x-3 w-full pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-1/2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            leftIcon={<RotateCcw size={15} className={isLoading ? "animate-spin" : ""} />}
            className="w-1/2"
          >
            {isLoading ? "Retrying..." : "Retry Now"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
