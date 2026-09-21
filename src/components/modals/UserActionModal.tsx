import React from "react";
import { History } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { type UserActionData } from "../../api/userActionApi/LogApi";
import { formatDateTime } from "../../helper/dateFormatter";

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewLog: UserActionData | null;
}

export const UserActionModal: React.FC<UserActionModalProps> = ({
  isOpen,
  onClose,
  viewLog,
}) => {
  if (!isOpen || !viewLog) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Details"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Username
            </label>
            <div className="mt-1 text-sm text-text-primary dark:text-white font-mono">
              {viewLog.username}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Module
            </label>
            <div className="mt-1 text-sm text-text-primary dark:text-white">
              {viewLog.title}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Time
            </label>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-text-primary dark:text-white">
              <History size={14} className="text-orange-400" />
              {formatDateTime(viewLog.createdAt)}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Action Details
          </label>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-text-secondary dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-h-[40vh] overflow-y-auto shadow-inner">
            {viewLog.action}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};