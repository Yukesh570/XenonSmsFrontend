import React from "react";
import type { ClientSessionData } from "../../../api/clientSessionApi/clientSessionApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { formatDateTime } from "../../../helper/dateFormatter";

interface ClientSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: ClientSessionData | null;
}

export const ClientSessionModal: React.FC<ClientSessionModalProps> = ({
  isOpen,
  onClose,
  sessionData,
}) => {
  if (!isOpen || !sessionData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Client Session Details"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identity & Connection
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Session ID" value={sessionData.sessionId || "-"} disabled />
            <Input label="Client Username" value={sessionData.clientUsername || "-"} disabled />
            <Input label="Company Name" value={sessionData.companyName || "-"} disabled />
            <Input label="System ID" value={sessionData.systemId || "-"} disabled />
            <Input label="Remote IP" value={sessionData.remoteIp || "-"} disabled />
            <Input label="Remote Port" value={sessionData.remotePort || ""} disabled />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Status & Timestamps
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Status" value={sessionData.status || "-"} disabled />
            <Input label="Bind Type" value={sessionData.bindType || "-"} disabled />
            <Input
              label="Connected At"
              value={formatDateTime(sessionData.connectedAt)}
              disabled
            />
            <Input
              label="Bound At"
              value={formatDateTime(sessionData.boundAt)}
              disabled
            />
            <Input
              label="Last Activity At"
              value={formatDateTime(sessionData.last_activityAt)}
              disabled
            />
            <Input
              label="Disconnected At"
              value={formatDateTime(sessionData.disconnectedAt)}
              disabled
            />
            <Input label="Disconnect Reason" value={sessionData.disconnectReason || "-"} disabled />
            <Input label="Disconnect Initiated By" value={sessionData.disconnectInitiatedBy || "-"} disabled />
          </div>
        </fieldset>

        <div className="flex justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};