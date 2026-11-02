import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { updateImportMailApi, type ImportMailData } from "../../../../api/rateApi/ImportVendor/importMailApi";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Select from "../../../ui/Select";
import Modal from "../../../ui/Modal";
import TextArea from "../../../ui/TextArea";
import { formatDateTime } from "../../../../helper/dateFormatter";

interface ImportMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingData: ImportMailData | null;
  isViewMode?: boolean;
}

export const ImportMailModal: React.FC<ImportMailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingData,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    messageId: "",
    senderEmail: "",
    subject: "",
    rawMailPath: "",
    dedupeHash: "",
    failureReason: "",
    status: "RECEIVED",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && editingData) {
      setFormData({
        messageId: editingData.messageId || "",
        senderEmail: editingData.senderEmail || "",
        subject: editingData.subject || "",
        rawMailPath: editingData.rawMailPath || "",
        dedupeHash: editingData.dedupeHash || "",
        failureReason: editingData.failureReason || "",
        status: editingData.status || "RECEIVED",
      });
    }
  }, [isOpen, editingData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelect = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode || !editingData?.id) return;

    setIsSubmitting(true);
    try {
      // Omit isDeleted and pass along required uneditable associations
      const payload = {
        messageId: formData.messageId,
        senderEmail: formData.senderEmail,
        subject: formData.subject,
        rawMailPath: formData.rawMailPath,
        dedupeHash: formData.dedupeHash,
        status: formData.status,
        receivedAt: editingData.receivedAt,
        vendor: editingData.vendor,
        sourceProfile: editingData.sourceProfile,
      };

      await updateImportMailApi(editingData.id, payload, moduleName);
      toast.success("Import Mail updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update Import Mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isViewMode ? "View Import Mail" : "Edit Import Mail"}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">Mail Details</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Message ID"
                name="messageId"
                value={formData.messageId}
                onChange={handleChange}
                disabled={true}
              />
            </div>
            <Input
              label="Sender Email"
              name="senderEmail"
              type="email"
              value={formData.senderEmail}
              onChange={handleChange}
              disabled={true}
            />
            <Select
              label="Processing Status"
              value={formData.status}
              onChange={(v: string) => handleSelect("status", v)}
              options={[
                { label: "Received", value: "RECEIVED" },
                { label: "Identified", value: "IDENTIFIED" },
                { label: "Duplicate", value: "DUPLICATE" },
                { label: "Manual Review", value: "MANUAL_REVIEW" },
                { label: "Failed", value: "FAILED" },
              ]}
              disabled={isViewMode}
            />
            <div className="md:col-span-2">
              <Input
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                disabled={true}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Raw Mail Path"
                name="rawMailPath"
                value={formData.rawMailPath}
                onChange={handleChange}
                disabled={true}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Dedupe Hash"
                name="dedupeHash"
                value={formData.dedupeHash}
                onChange={handleChange}
                disabled={true}
              />
            </div>
            <div className="md:col-span-2">
              <TextArea
                label="Failure Reason"
                name="failureReason"
                value={formData.failureReason}
                onChange={handleChange}
                disabled={true}
                rows={2}
                placeholder="-"
              />
            </div>

            {editingData?.receivedAt && (
              <div className="md:col-span-2">
                <Input
                  label="Received At"
                  name="receivedAt"
                  value={formatDateTime(editingData.receivedAt)}
                  disabled={true}
                  onChange={() => { }}
                />
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} className={isViewMode ? "" : "mr-2"}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};