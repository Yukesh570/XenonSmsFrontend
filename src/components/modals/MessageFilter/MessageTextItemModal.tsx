import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import ToggleSwitch from "../../ui/ToggleSwitch";
import type { MessageTextReplacementListItem } from "../../../api/messageFilterApi/messageFilterApi";
import {
  createMessageTextReplacementListItemApi,
  updateMessageTextReplacementListItemApi,
} from "../../../api/messageFilterApi/messageFilterApi";

export interface MessageTextItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  listId: number | null;
  editingItem: MessageTextReplacementListItem | null;
  defaultSequenceNo: number;
}

export const MessageTextItemModal: React.FC<MessageTextItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  listId,
  editingItem,
  defaultSequenceNo,
}) => {
  const [itemForm, setItemForm] = useState({
    value: "",
    sequenceNo: 1,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setItemForm({
        value: editingItem.value,
        sequenceNo: editingItem.sequenceNo,
        isActive: editingItem.status === "ACTIVE",
      });
    } else {
      setItemForm({
        value: "",
        sequenceNo: defaultSequenceNo || 1,
        isActive: true,
      });
    }
  }, [isOpen, editingItem, defaultSequenceNo]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listId) return;
    if (!itemForm.value.trim()) {
      toast.error("Item value is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem && editingItem.id) {
        await updateMessageTextReplacementListItemApi(
          listId,
          editingItem.id,
          {
            value: itemForm.value,
            sequenceNo: Number(itemForm.sequenceNo),
            status: itemForm.isActive ? "ACTIVE" : "INACTIVE",
          }
        );
        toast.success("Item updated");
      } else {
        await createMessageTextReplacementListItemApi(listId, {
          replacementList: listId,
          value: itemForm.value,
          sequenceNo: Number(itemForm.sequenceNo),
          status: itemForm.isActive ? "ACTIVE" : "INACTIVE",
        });
        toast.success("Item added to list");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save list item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md"
      title={editingItem ? "Update Text Entry" : "Add Text Entry"}
    >
      <form onSubmit={handleSaveItem} className="space-y-4">
        <TextArea
          label="Text Value / Template Content"
          value={itemForm.value}
          onChange={(e) => setItemForm({ ...itemForm, value: e.target.value })}
          rows={4}
          placeholder="Enter replacement string, dynamic macro, or multi-line template..."
          required
        />
        <div className="text-[11px] text-gray-400 -mt-2 flex justify-between">
          <span>Supports any characters, UTF-8, and emoji.</span>
          <span className="font-mono">{itemForm.value.length} characters</span>
        </div>

        <Input
          label="Sequence Number (for Sequential order)"
          type="number"
          value={itemForm.sequenceNo}
          onChange={(e) => setItemForm({ ...itemForm, sequenceNo: Number(e.target.value) })}
          min={1}
          max={99999}
          required
        />

        <div className="flex items-center pt-1">
          <ToggleSwitch
            label="Active Status"
            checked={itemForm.isActive}
            onChange={(checked) => setItemForm({ ...itemForm, isActive: checked })}
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
            {editingItem ? "Update Entry" : "Save Entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
