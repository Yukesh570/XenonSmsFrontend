import React from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { AlertTriangle } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  isDeleting?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting = false,
}) => {
  // Automatically formats and bolds any quoted text (e.g., "Belgium", "Route A")
  const renderMessage = (content: React.ReactNode) => {
    if (typeof content !== "string") return content;

    const parts = content.split(/(".*?"|'.*?')/g);
    return parts.map((part, index) => {
      if (
        (part.startsWith('"') && part.endsWith('"')) ||
        (part.startsWith("'") && part.endsWith("'"))
      ) {
        return (
          <strong
            key={index}
            className="font-bold text-text-primary dark:text-white"
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/30">
          <AlertTriangle size={36} className="text-red-600 dark:text-red-500" />
        </div>

        <p className="text-text-secondary text-sm leading-relaxed dark:text-gray-300">
          {renderMessage(message)}
        </p>

        <div className="flex justify-center space-x-3 w-full pt-3">
          <Button variant="secondary" onClick={onClose} className="w-1/2">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-1/2"
          >
            {isDeleting ? "Deleting" : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};