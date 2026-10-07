import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../../quillDark.css";
import { toast } from "react-toastify";
import {
  createEmailTemplateApi,
  updateEmailTemplateApi,
  getEmailTemplateVariablesApi,
  type EmailTemplateData,
} from "../../api/emailTemplateApi/emailTemplateApi";
import { getSmtpServersApi } from "../../api/settingApi/smtpApi/smtpApi";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Modal from "../ui/Modal";

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: EmailTemplateData) => void;
  moduleName: string;
  editingTemplate: EmailTemplateData | null;
  isViewMode?: boolean;
}

type FormData = Omit<EmailTemplateData, "id">;

export const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingTemplate,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState<FormData>({ name: "", subject: "", content: "", emailServer: null });
  const [quillContent, setQuillContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  const [smtpOptions, setSmtpOptions] = useState<{label: string, value: string}[]>([]);
  const [variableOptions, setVariableOptions] = useState<{label: string, value: string}[]>([]);
  
  // FIXED: Added state to memorize the exact cursor position before focus is lost
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const smtpRes = await getSmtpServersApi(moduleName, 1, 100);
        const smtpList = smtpRes.results || (Array.isArray(smtpRes) ? smtpRes : []);
        setSmtpOptions(smtpList.map((item: any) => ({ label: item.name, value: String(item.id) })));

        const varRes = await getEmailTemplateVariablesApi();
        const varList = varRes.results || (Array.isArray(varRes) ? varRes : []);
        
        // FIXED: Now it only shows the exact "label" (e.g., "Username" instead of the tag)
        const mappedVariables = varList.map((v: any) => {
          return { label: v.label || v.tag || "Unknown", value: v.tag };
        });
        
        setVariableOptions(mappedVariables);

      } catch (error) {
        console.error("Failed to load dropdown data", error);
      }
    };

    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen, moduleName]);

  useEffect(() => {
    if (isOpen) {
      setIsDataReady(false);
      setCursorPosition(null); // Reset cursor on open

      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name,
          subject: editingTemplate.subject || "",
          content: editingTemplate.content,
          emailServer: editingTemplate.emailServer || null,
        });
        setQuillContent(editingTemplate.content);
        setIsDataReady(true);
      } else {
        setFormData({ name: "", subject: "", content: "", emailServer: null });
        setQuillContent("");
        setIsDataReady(true);
      }
    } else {
      setIsDataReady(false);
    }
  }, [isOpen, editingTemplate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, emailServer: value ? Number(value) : null }));
  };

  // Track which field was last focused so we know where to insert the variable
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "content">("content");

  const handleInsertVariable = (tagString: string) => {
    if (!tagString) return;

    if (lastFocusedField === "subject") {
      const subjectInput = document.getElementById("subject") as HTMLInputElement;
      const currentSubject = formData.subject;
      
      if (subjectInput) {
        // Insert at cursor position if possible
        const startPos = subjectInput.selectionStart || currentSubject.length;
        const endPos = subjectInput.selectionEnd || currentSubject.length;
        
        const newSubject = 
          currentSubject.substring(0, startPos) + 
          tagString + 
          currentSubject.substring(endPos);
          
        setFormData((prev) => ({ ...prev, subject: newSubject }));
        
        // Restore focus to subject
        setTimeout(() => {
          subjectInput.focus();
          subjectInput.setSelectionRange(startPos + tagString.length, startPos + tagString.length);
        }, 10);
      } else {
        // Fallback: just append
        setFormData((prev) => ({ ...prev, subject: prev.subject + tagString }));
      }
    } else {
      // Default to content
      if (!quillRef.current) return;
      const editor = quillRef.current.getEditor();
      if (editor) {
        // FIXED: Use the memorized cursor position, or default to the end if they never clicked in the box
        const position = cursorPosition !== null ? cursorPosition : editor.getLength();
        
        // Insert the variable tag
        editor.insertText(position, tagString);
        
        // Calculate new position after the inserted text
        const newPosition = position + tagString.length;
        
        // Update our memorized state, tell Quill to move the cursor there, and force focus back!
        setCursorPosition(newPosition);
        editor.setSelection(newPosition);
        editor.focus();
      }
    }
  };

  const isContentEmpty = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.trim().length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.name.trim()) {
      toast.error("Template Name is required.");
      return;
    }
    if (!formData.emailServer) {
      toast.error("Email Server is required.");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("Template Subject is required.");
      return;
    }
    if (isContentEmpty(quillContent)) {
      toast.error("Content cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    const dataToSend = {
      ...formData,
      content: quillContent,
      is_active: true,
    };

    try {
      let response: EmailTemplateData;
      if (editingTemplate) {
        response = await updateEmailTemplateApi(
          editingTemplate.id!,
          dataToSend,
          moduleName
        );
        toast.success(`Template updated successfully!`);
      } else {
        response = await createEmailTemplateApi(dataToSend, moduleName);
        toast.success("Template saved successfully!");
      }
      onSuccess(response);
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
          ? "View Email Template"
          : editingTemplate
          ? "Edit Email Template"
          : "Create New Template"
      }
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        
        {/* Row 1: Template Name & Email Server */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Template Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Welcome Email"
            required
            disabled={isViewMode}
          />
          <Select
            label="Email Server"
            value={formData.emailServer ? String(formData.emailServer) : ""}
            onChange={handleSelectChange}
            options={smtpOptions}
            placeholder="Select an Email Server"
            disabled={isViewMode}
            required
          />
        </div>
        
        {/* Row 2: Subject & Variables Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div className="md:col-span-2">
            <Input
              label="Subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter Email Subject"
              required
              disabled={isViewMode}
              onFocus={() => setLastFocusedField("subject")}
            />
          </div>
          
          {!isViewMode && variableOptions.length > 0 && (
            <div className="mb-0.5">
              <Select
                label="Insert Variable"
                value="" 
                onChange={handleInsertVariable}
                options={variableOptions}
                placeholder="Choose variable..."
                disabled={isViewMode}
              />
            </div>
          )}
        </div>

        {/* Row 3: Editor Content */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Content
          </label>
          <div className="quill-container dark:quill-dark mt-1">
            {isDataReady ? (
              <ReactQuill
                ref={quillRef} 
                theme="snow"
                value={quillContent}
                onChange={setQuillContent}
                // FIXED: Actively memorize the cursor position whenever they type or click inside the editor!
                onChangeSelection={(range: any) => {
                  if (range && typeof range.index === "number") {
                    setCursorPosition(range.index);
                  }
                }}
                onFocus={() => setLastFocusedField("content")}
                readOnly={isViewMode}
              />
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
                Loading editor...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
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