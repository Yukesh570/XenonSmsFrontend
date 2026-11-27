import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import TextArea from "../../ui/TextArea";
import { formatDateTime } from "../../../helper/dateFormatter";
import { UserCheck, User as UserIcon } from "lucide-react";
import type {
  OperationalAlertRow,
  AssignableUser,
  AlertAcknowledgmentRow,
} from "../../../api/reportApi/r4MonitoringApi";

interface OperationalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewRow: OperationalAlertRow | null;
  assignableUsers: AssignableUser[];
  history: AlertAcknowledgmentRow[];
  isHistoryLoading: boolean;
  ackNote: string;
  setAckNote: (note: string) => void;
  ackAssignTo: string;
  setAckAssignTo: (val: string) => void;
  isAcknowledging: boolean;
  onAcknowledge: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL_INTEGRITY: "Financial Integrity",
  SMPP_RELIABILITY: "SMPP Reliability",
  INFRASTRUCTURE: "Infrastructure",
  RELIABILITY_ALERT: "Reliability Alert",
};

export const OperationalAlertModal: React.FC<OperationalAlertModalProps> = ({
  isOpen,
  onClose,
  viewRow,
  assignableUsers,
  history,
  isHistoryLoading,
  ackNote,
  setAckNote,
  ackAssignTo,
  setAckAssignTo,
  isAcknowledging,
  onAcknowledge,
}) => {
  if (!isOpen || !viewRow) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alert Details & Incident Ownership"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1">
        {/* Overview & Status */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Incident Overview
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Severity" value={viewRow.severity || "-"} disabled className="capitalize" />
            <Input label="Status" value={viewRow.status || "-"} disabled className="capitalize" />
            <Input label="Category" value={CATEGORY_LABELS[viewRow.category] || viewRow.category} disabled />
            <Input label="Event Type" value={viewRow.event_type} disabled />
          </div>
        </fieldset>

        {/* Identifiers & Assignment */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Subject & Assignment
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Subject Reference"
              value={
                viewRow.financial_review_restricted
                  ? "Restricted -- contact an ADMIN or FINANCE user"
                  : viewRow.subject_ref || "-"
              }
              disabled
            />
            <Input
              label="Assigned Ownership"
              value={viewRow.assigned_to_username ? viewRow.assigned_to_username : "Unassigned"}
              disabled
            />
          </div>
        </fieldset>

        {/* Message */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Incident Description / Message
          </legend>
          <TextArea
            label=""
            value={viewRow.message || "No message recorded."}
            disabled
            rows={3}
            className="font-mono text-xs"
          />
        </fieldset>

        {/* Timestamps & Occurrences */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timestamps & Frequency
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="First Detected" value={formatDateTime(viewRow.first_detected_at)} disabled />
            <Input label="Last Detected" value={formatDateTime(viewRow.last_detected_at)} disabled />
            <Input label="Occurrences" value={String(viewRow.occurrence_count)} disabled />
            <Input label="Resolved At" value={viewRow.resolved_at ? formatDateTime(viewRow.resolved_at) : "-"} disabled />
          </div>
        </fieldset>

        {/* Acknowledge / Reassign Action */}
        {viewRow.status !== "RESOLVED" && (
          <fieldset className="border border-primary/30 dark:border-primary/40 rounded-lg p-4 bg-primary/[0.02]">
            <legend className="text-sm font-semibold text-primary px-2">
              Acknowledge & Assign Ownership
            </legend>
            <p className="text-xs text-text-secondary dark:text-gray-400 mb-3">
              Acknowledging records that you or the assigned user have taken operational responsibility. Resolution occurs automatically once the underlying condition clears.
            </p>
            <div className="space-y-3">
              <TextArea
                label="Action Note (optional)"
                rows={2}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="Describe current investigation or remediation steps..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Select
                  label="Assign Ownership"
                  value={ackAssignTo}
                  onChange={setAckAssignTo}
                  options={assignableUsers.map((u) => ({
                    value: String(u.id),
                    label: u.username,
                  }))}
                  placeholder="Defaults to yourself"
                  clearable
                />
                <div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onAcknowledge}
                    leftIcon={<UserCheck size={15} />}
                    disabled={isAcknowledging}
                  >
                    {isAcknowledging ? "Acknowledging..." : "Acknowledge Incident"}
                  </Button>
                </div>
              </div>
            </div>
          </fieldset>
        )}

        {/* Acknowledgment History */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Acknowledgment Audit History
          </legend>
          {isHistoryLoading ? (
            <p className="text-xs text-text-secondary dark:text-gray-400 py-2">Loading audit history...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-text-secondary dark:text-gray-400 py-2 italic">
              No acknowledgment records logged for this alert yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex items-start gap-3"
                >
                  <UserIcon size={14} className="text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <span className="font-semibold text-text-primary dark:text-white">
                        {h.acknowledged_by || "System User"}
                      </span>
                      <span className="text-text-secondary dark:text-gray-400">
                        {formatDateTime(h.acknowledged_at)}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-xs text-text-secondary dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
                        {h.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
