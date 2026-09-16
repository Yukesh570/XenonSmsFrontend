import React, { useState, useRef, useEffect } from "react";
import { Send, Home, Paperclip, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { sendEmailApi } from "../../api/sendMailApi/sendMailApi";
import {
  getEmailTemplatesApi,
  type EmailTemplateData,
} from "../../api/emailTemplateApi/emailTemplateApi";
import {
  getSmtpServersApi,
  type SmtpServerData,
} from "../../api/settingApi/smtpApi/smtpApi";
import ReactQuill from "react-quill-new";
import "../../quillDark.css";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import { actionHelper } from "../../helper/action";

interface Option {
  label: string;
  value: string;
  subject?: string;
  content?: string;
  email?: string;
}

const SendMailPage: React.FC = () => {
  const [recipientList, setRecipientList] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [templateOptions, setTemplateOptions] = useState<Option[]>([]);
  const [emailHostOptions, setEmailHostOptions] = useState<Option[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEmailHost, setSelectedEmailHost] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateModuleName = "emailTemplate";
  const smtpModuleName = "smtp";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Templates (Requesting 1000 to get all for dropdown)
        const templatesResponse: any = await getEmailTemplatesApi(
          templateModuleName,
          1,
          1000
        );

        // FIX: Extract array from paginated response
        let templatesData: EmailTemplateData[] = [];
        if (templatesResponse && templatesResponse.results) {
          templatesData = templatesResponse.results;
        } else if (Array.isArray(templatesResponse)) {
          templatesData = templatesResponse;
        }

        setTemplateOptions(
          templatesData.map((t: EmailTemplateData) => ({
            value: t.id!.toString(),
            label: t.name,
            subject: t.subject,
            content: t.content,
          }))
        );

        // 2. Fetch Email Hosts (Requesting 1000 to get all for dropdown)
        const hostsResponse: any = await getSmtpServersApi(
          smtpModuleName,
          1,
          1000
        );

        // FIX: Extract array from paginated response
        let hostsData: SmtpServerData[] = [];
        if (hostsResponse && hostsResponse.results) {
          hostsData = hostsResponse.results;
        } else if (Array.isArray(hostsResponse)) {
          hostsData = hostsResponse;
        }

        setEmailHostOptions(
          hostsData.map((h: SmtpServerData) => ({
            value: h.id!.toString(),
            label: h.name,
            email: h.name,
          }))
        );
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load dropdown options.");
      }
    };
    fetchData();
  }, []);

  const handleTemplateChange = (value: string) => {
    const template = templateOptions.find((t) => t.value === value);
    setSelectedTemplate(value);
    if (template) {
      setSubject(template.subject || "");
      setContent(template.content || "");
    } else {
      setSubject("");
      setContent("");
    }
  };

  const handleEmailHostChange = (value: string) => {
    const host = emailHostOptions.find((h) => h.value === value);
    setSelectedEmailHost(value);
    if (host && host.email) {
      setFromEmail(host.email);
    } else {
      setFromEmail("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
      toast.info(`File "${e.target.files[0].name}" selected.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmailHost) {
      toast.error("Please select an Email Host (Sender).");
      return;
    }

    setIsSubmitting(true);

    const dataToUpload = new FormData();
    dataToUpload.append("email_host_id", selectedEmailHost);
    dataToUpload.append("content", content);
    dataToUpload.append("subject", subject);
    dataToUpload.append("from_email", fromEmail);
    dataToUpload.append("recipient_list", recipientList);

    if (attachment) {
      dataToUpload.append("attachments", attachment, attachment.name);
    }

    try {
      await sendEmailApi(dataToUpload);
      toast.success("Email sent successfully!");

      setRecipientList("");
      setSubject("");
      setContent("");
      setAttachment(null);
      setSelectedTemplate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Error sending email:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Failed to send email.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

const hasLoggedOpening = useRef(false);

  useEffect(() => {
    if (!hasLoggedOpening.current) {
      // The setTimeout is CRUCIAL here to wait for the sidebar to update
      setTimeout(() => {
        const activeLinks = document.querySelectorAll('aside a.active, nav a.active');
        const activeItem = activeLinks[activeLinks.length - 1] as HTMLElement;
        let moduleLabel = activeItem?.innerText?.split('\n')[0].trim() || "Module";
        
        actionHelper(moduleLabel, `Opened ${moduleLabel} Module`, false);
      }, 100); // Waits 0.1 seconds
      
      hasLoggedOpening.current = true;
    }
  }, []);

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
          Send Mail
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Send Mail</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-card dark:bg-gray-800">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <Select
            label="From (Email Host)"
            value={selectedEmailHost}
            onChange={handleEmailHostChange}
            options={[...emailHostOptions]}
            placeholder="Select the email server to send from"
          />

          <Select
            label="Select Template (Optional)"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            options={[...templateOptions]}
            placeholder="Select a template to auto-fill Body"
          />

          <hr className="dark:border-gray-700" />

          <Input
            label="To (Recipient List)"
            type="text"
            value={recipientList}
            onChange={(e) => setRecipientList(e.target.value)}
            placeholder="recipient@example.com, other@example.com"
            required
          />

          <Input
            label="Subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your email subject"
            required
          />

          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">
              Content
            </label>
            <div className="quill-container dark:quill-dark">
              <ReactQuill value={content} onChange={setContent} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 text-xs font-medium text-text-secondary">
              Attachment (Optional)
            </label>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Paperclip size={16} />}
                onClick={() => fileInputRef.current?.click()}
              >
                {attachment ? "Change File" : "Choose File"}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {attachment && (
                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                  <span>{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="w-full md:w-auto text-lg py-3 px-6"
              leftIcon={<Send size={20} />}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending" : "Send Mail"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMailPage;
