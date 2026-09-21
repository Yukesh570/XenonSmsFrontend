import React, { useState, useRef, useEffect } from "react";
import { Send, Upload, Clock, Phone, Zap, FileSpreadsheet } from "lucide-react";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import SegmentedControl from "../../ui/SegmentedControl";
import CustomDatePicker from "../../ui/DatePicker";
import Modal from "../../ui/Modal";
import { toast } from "react-toastify";
import {
  createCampaignVendorApi,
  getTemplatesApi,
  type CampaignVendorFormData,
} from "../../../api/campaignApi/campaignVendorApi";
// @ts-ignore
import ReactQuill from "react-quill-new";
import "../../../quillDark.css";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";

interface VendorCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  selectedCampaign?: CampaignVendorFormData | null;
  editingCampaign?: CampaignVendorFormData | null;
  isViewMode?: boolean;
}

export const VendorCampaignModal: React.FC<VendorCampaignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  selectedCampaign,
  editingCampaign,
  isViewMode = false,
}) => {
  const activeCampaign = selectedCampaign || editingCampaign;

  const [formData, setFormData] = useState({
    campaignName: "",
    vendor: "",
    objective: "Promotion",
    audienceType: "specify",
    contactNumber: "",
    template: "",
    scheduleType: "now",
    senderId: "",
  });

  const [quillContent, setQuillContent] = useState("");
  const [isDataReady, setIsDataReady] = useState(false);

  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [templateOptions, setTemplateOptions] = useState<
    { label: string; value: string; content: string }[]
  >([]);
  const [vendorOptions, setVendorOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const objectiveOptions = [
    { label: "Promotion", value: "Promotion" },
    { label: "Announcement", value: "Announcement" },
    { label: "Re-engagement", value: "Re-engagement" },
  ];

  const audienceOptions = [
    { label: "Specify Contact", value: "specify", icon: <Phone size={16} /> },
    { label: "Import CSV/Excel", value: "import", icon: <Upload size={16} /> },
  ];

  const scheduleOptions = [
    { label: "Now", value: "now", icon: <Zap size={16} /> },
    { label: "Schedule Later", value: "datetime", icon: <Clock size={16} /> },
  ];

  useEffect(() => {
    if (isOpen) {
      setIsDataReady(false);

      getVendorsApi("vendor", 1, 1000)
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setVendorOptions(
            list.map((v: any) => ({
              label: v.profileName || v.name || `Vendor #${v.id}`,
              value: String(v.id),
            })),
          );
        })
        .catch((err) => console.error("Failed to load vendors", err));

      if (isViewMode && activeCampaign) {
        setFormData({
          campaignName: activeCampaign.name || "",
          vendor: activeCampaign.vendor ? String(activeCampaign.vendor) : "",
          objective: activeCampaign.objective || "Promotion",
          audienceType: "specify",
          contactNumber: "",
          template: activeCampaign.template
            ? String(activeCampaign.template)
            : "",
          scheduleType: "now",
          senderId: activeCampaign.senderId || "",
        });

        setQuillContent(activeCampaign.content || "");

        if (activeCampaign.schedule) {
          setScheduleDate(new Date(activeCampaign.schedule));
          setFormData((prev) => ({ ...prev, scheduleType: "datetime" }));
        }
        setTimeout(() => {
          setIsDataReady(true);
        }, 100);
      } else {
        getTemplatesApi(1, 1000).then((response: any) => {
          let data = [];
          if (response && response.results) data = response.results;
          else if (Array.isArray(response)) data = response;

          setTemplateOptions(
            data.map((t: any) => ({
              label: t.name,
              value: t.id!.toString(),
              content: t.content,
            })),
          );
        });

        setFormData({
          campaignName: "",
          vendor: "",
          objective: "Promotion",
          audienceType: "specify",
          contactNumber: "",
          template: "",
          scheduleType: "now",
          senderId: "",
        });
        setQuillContent("");
        setScheduleDate(null);
        setCsvFile(null);

        setTimeout(() => {
          setIsDataReady(true);
        }, 100);
      }
    }
  }, [isOpen, activeCampaign, isViewMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "template") {
      const selected = templateOptions.find((t) => t.value === value);
      setFormData({ ...formData, template: value });
      if (selected) {
        setQuillContent(selected.content);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      toast.info(`Selected: ${e.target.files[0].name}`);
    }
  };

  const downloadSample = () => {
    const link = document.createElement("a");
    link.href = "/sample_contacts.csv";
    link.setAttribute("download", "sample_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isContentEmpty = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.trim().length === 0;
  };

  const formatLocalTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.campaignName.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (!formData.vendor.trim()) {
      toast.error("Vendor is required.");
      return;
    }

    if (formData.audienceType === "specify" && !formData.contactNumber.trim()) {
      toast.error("Contact number is required.");
      return;
    }
    if (formData.audienceType === "import" && !csvFile) {
      toast.error("Please upload a CSV/Excel file.");
      return;
    }

    if (isContentEmpty(quillContent)) {
      toast.error("Campaign content cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToUpload = new FormData();
      dataToUpload.append("name", formData.campaignName);
      dataToUpload.append("vendor", formData.vendor);
      dataToUpload.append("objective", formData.objective);
      dataToUpload.append("content", quillContent);

      if (formData.senderId.trim()) {
        dataToUpload.append("senderId", formData.senderId.trim());
      }

      if (formData.template) dataToUpload.append("template", formData.template);

      let scheduleString = "";
      if (formData.scheduleType === "datetime" && scheduleDate) {
        scheduleString = formatLocalTime(scheduleDate);
      } else {
        scheduleString = formatLocalTime(new Date());
      }

      dataToUpload.append("schedule", scheduleString);

      if (formData.audienceType === "specify") {
        const contacts = formData.contactNumber
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        if (contacts.length === 0) {
          toast.error("Please specify at least one valid contact number.");
          setIsSubmitting(false);
          return;
        }
        contacts.forEach((c) => dataToUpload.append("contacts", c));
      } else if (csvFile) {
        dataToUpload.append("csvFile", csvFile);
      }

      await createCampaignVendorApi(dataToUpload, moduleName);
      toast.success("Vendor campaign created successfully!");

      onSuccess();
      onClose();

      setFormData({
        campaignName: "",
        vendor: "",
        objective: "Promotion",
        audienceType: "specify",
        contactNumber: "",
        template: "",
        scheduleType: "now",
        senderId: "",
      });
      setQuillContent("");
      setScheduleDate(null);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;
      if (serverError && typeof serverError === "object") {
        Object.entries(serverError).forEach(([key, msgs]) => {
          toast.error(`${key}: ${Array.isArray(msgs) ? msgs[0] : msgs}`);
        });
      } else {
        toast.error("Failed to save vendor campaign.");
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
      title={isViewMode ? "View Vendor Campaign" : "Create New Vendor Campaign"}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Campaign Name"
            name="campaignName"
            placeholder="Enter campaign name"
            value={formData.campaignName}
            onChange={handleChange}
            required
            disabled={isViewMode}
          />
          <Input
            label="Sender ID (Optional)"
            name="senderId"
            placeholder="e.g., TEST_SYSTEM"
            value={formData.senderId}
            onChange={handleChange}
            disabled={isViewMode}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Vendor"
            value={formData.vendor}
            onChange={(v) => handleSelectChange("vendor", v)}
            options={vendorOptions}
            placeholder="Select Vendor"
            required
            disabled={isViewMode}
          />
          <Select
            label="Objective"
            value={formData.objective}
            onChange={(v) => handleSelectChange("objective", v)}
            options={objectiveOptions}
            disabled={isViewMode}
          />
        </div>

        {!isViewMode && (
          <div className="space-y-3">
            <SegmentedControl
              label="Audience"
              selectedValue={formData.audienceType}
              options={audienceOptions}
              onChange={(v) =>
                setFormData({ ...formData, audienceType: v as any })
              }
            />

            {formData.audienceType === "specify" ? (
              <Input
                label="Contact Number(s)"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                placeholder="e.g., 98xxxxxxxx, 98xxxxxxxx"
              />
            ) : (
              <div className="flex items-center gap-3 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload size={16} />}
                >
                  {csvFile ? "Change File" : "Upload CSV/Excel"}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                />

                <div className="flex-1 text-sm text-gray-500 truncate">
                  {csvFile ? csvFile.name : "No file selected"}
                </div>

                <button
                  type="button"
                  onClick={downloadSample}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  title="Download Sample Format"
                >
                  <span className="hidden sm:inline">Sample Format:</span>
                  <FileSpreadsheet size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {!isViewMode && (
            <Select
              label="Template"
              value={formData.template}
              onChange={(v) => handleSelectChange("template", v)}
              options={[...templateOptions]}
              placeholder="Select Template"
              disabled={isViewMode}
            />
          )}

          <div className="quill-container dark:quill-dark mt-2">
            <label className="mb-1.5 text-xs font-medium text-text-secondary block">
              Content <span className="text-red-500">*</span>
            </label>

            {isDataReady ? (
              <ReactQuill
                theme="snow"
                value={quillContent}
                onChange={setQuillContent}
                readOnly={isViewMode}
              />
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
                Loading editor...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <SegmentedControl
            label="Schedule"
            selectedValue={formData.scheduleType}
            options={scheduleOptions}
            onChange={(v) =>
              setFormData({ ...formData, scheduleType: v as any })
            }
            disabled={isViewMode}
          />
          {formData.scheduleType === "datetime" && (
            <CustomDatePicker
              label="Select Date & Time"
              selected={scheduleDate}
              onChange={(date: Date | null) => setScheduleDate(date)}
              showTimeSelect
              disabled={isViewMode}
              isClearable={false}
            />
          )}
        </div>

        <div className="flex justify-end pt-2 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Send size={18} />}
            >
              {isSubmitting ? "Saving" : "Create Campaign"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default VendorCampaignModal;