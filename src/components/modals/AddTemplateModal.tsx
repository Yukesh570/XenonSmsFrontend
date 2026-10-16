import React, { useState, useEffect } from "react";
// @ts-ignore
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../../quillDark.css";
import { toast } from "react-toastify";
import {
  createTemplate,
  updateTemplateApi,
  type templateData,
} from "../../api/campaignApi/campaignApi";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingTemplate: templateData | null;
  isViewMode?: boolean;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "list",
  "link",
  "clean",
];

export const AddTemplateModal: React.FC<AddTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingTemplate,
  isViewMode = false,
}) => {
  const [name, setName] = useState("");
  const [quillContent, setQuillContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDataReady(false);

      if (editingTemplate) {
        setName(editingTemplate.name);
        setQuillContent(editingTemplate.content);
        setIsDataReady(true);
      } else {
        setName("");
        setQuillContent("");
        setIsDataReady(true);
      }
    } else {
      setIsDataReady(false);
    }
  }, [isOpen, editingTemplate]);

  const isContentEmpty = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.trim().length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return; // Block submit

    if (!name.trim()) {
      toast.error("Template Name is required.");
      return;
    }
    if (isContentEmpty(quillContent)) {
      toast.error("Content cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    const dataToSend = { name, content: quillContent };

    try {
      if (editingTemplate) {
        await updateTemplateApi(editingTemplate.id!, dataToSend, moduleName);
        toast.success("Template updated successfully!");
      } else {
        await createTemplate(dataToSend, moduleName);
        toast.success("Template saved successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving template:", error);
      const serverError = error.response?.data;
      if (serverError) {
        if (typeof serverError === "object") {
          Object.entries(serverError).forEach(([key, msgs]) => {
            toast.error(`${key}: ${Array.isArray(msgs) ? msgs[0] : msgs}`);
          });
        } else {
          toast.error(String(serverError));
        }
      } else {
        toast.error("Failed to save template.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isViewMode
          ? "View Template"
          : editingTemplate
          ? "Edit Template"
          : "Create New Template"
      }
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Template Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter Template Name"
          required
          disabled={isViewMode}
        />

        <div>
          <label className="mb-1.5 text-xs font-medium text-text-secondary">
            Template Content <span className="text-red-500">*</span>
          </label>
          <div className="quill-container dark:quill-dark">
            {isDataReady ? (
              <ReactQuill
                theme="snow"
                value={quillContent}
                onChange={setQuillContent}
                modules={quillModules}
                formats={quillFormats}
                readOnly={isViewMode}
              />
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
                Loading editor...
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving"
                : editingTemplate
                ? "Save Changes"
                : "Save Template"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
