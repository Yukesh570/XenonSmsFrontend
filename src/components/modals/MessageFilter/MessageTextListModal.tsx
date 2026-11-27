import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import Select from "../../ui/Select";
import ToggleSwitch from "../../ui/ToggleSwitch";
import type { MessageTextReplacementList } from "../../../api/messageFilterApi/messageFilterApi";
import {
  createMessageTextReplacementListApi,
  updateMessageTextReplacementListApi,
} from "../../../api/messageFilterApi/messageFilterApi";

export interface MessageTextListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingList: MessageTextReplacementList | null;
  selectedClientId: number | null;
}

export const MessageTextListModal: React.FC<MessageTextListModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingList,
  selectedClientId,
}) => {
  const [listForm, setListForm] = useState({
    name: "",
    description: "",
    selectionMode: "RANDOM" as "SEQUENTIAL" | "RANDOM",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingList) {
      setListForm({
        name: editingList.name,
        description: editingList.description || "",
        selectionMode: editingList.selectionMode || "RANDOM",
        isActive: editingList.status === "ACTIVE",
      });
    } else {
      setListForm({
        name: "",
        description: "",
        selectionMode: "RANDOM",
        isActive: true,
      });
    }
  }, [isOpen, editingList]);

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listForm.name.trim()) {
      toast.error("List name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const statusValue: "ACTIVE" | "INACTIVE" = listForm.isActive ? "ACTIVE" : "INACTIVE";
      const payload: Partial<MessageTextReplacementList> = {
        client: selectedClientId || 0,
        name: listForm.name.trim(),
        description: listForm.description.trim(),
        selectionMode: listForm.selectionMode,
        status: statusValue,
      };

      if (editingList && editingList.id) {
        await updateMessageTextReplacementListApi(editingList.id, payload);
        toast.success("Replacement list updated successfully");
      } else {
        await createMessageTextReplacementListApi(payload);
        toast.success("Replacement list created successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save replacement list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md"
      title={editingList ? "Update Replacement List" : "Create Replacement List"}
    >
      <form onSubmit={handleSaveList} className="space-y-4">
        <Input
          label="List Name"
          value={listForm.name}
          onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
          placeholder="e.g. Promotional Footers, OTP Prefixes"
          required
        />

        <TextArea
          label="Description (Optional)"
          value={listForm.description}
          onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
          placeholder="Brief purpose of this replacement list"
          rows={2}
        />

        <Select
          label="Selection Mode"
          value={listForm.selectionMode}
          onChange={(val) =>
            setListForm({ ...listForm, selectionMode: val as "SEQUENTIAL" | "RANDOM" })
          }
          options={[
            { value: "RANDOM", label: "Random - Uniform distributed selection" },
            { value: "SEQUENTIAL", label: "Sequential - Round-robin deterministic order" },
          ]}
        />

        <div className="flex items-center pt-1">
          <ToggleSwitch
            label="Active Status"
            checked={listForm.isActive}
            onChange={(checked) => setListForm({ ...listForm, isActive: checked })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {editingList ? "Update List" : "Create List"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
