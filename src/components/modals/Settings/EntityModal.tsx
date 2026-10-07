import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  createEntityApi,
  updateEntityApi,
  type EntityData,
} from "../../../api/settingApi/entityApi/entityApi";
import Input from "../../ui/Input";
import TextArea from "../../ui/TextArea";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
// FIXED: Imported your brand new reusable component
import ImageUpload from "../../ui/ImageUpload";

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingEntity: EntityData | null;
  isViewMode?: boolean;
}

export const EntityModal: React.FC<EntityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingEntity,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    companyName: "",
    legalEntityName: "",
    weekCommencing: "SUNDAY",
    vatRegistrationNumber: "",
    phone: "",
    emailAddress: "",
    businessAddress: "",
    bankAccountDetail: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const imageBase = import.meta.env.VITE_IMAGE_URL || "";

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingEntity) {
        setFormData({
          companyName: editingEntity.companyName || "",
          legalEntityName: editingEntity.legalEntityName || "",
          weekCommencing: editingEntity.weekCommencing || "SUNDAY",
          vatRegistrationNumber: editingEntity.vatRegistrationNumber || "",
          phone: editingEntity.phone || "",
          emailAddress: editingEntity.emailAddress || "",
          businessAddress: editingEntity.businessAddress || "",
          bankAccountDetail: editingEntity.bankAccountDetail || "",
        });
        if (editingEntity.companyLogoPath) {
          const fullUrl = `${imageBase}${editingEntity.companyLogoPath}`;
          setLogoPreview(fullUrl);
        } else {
          setLogoPreview(null);
        }
        setLogoFile(null);
      } else {
        setFormData({
          companyName: "",
          legalEntityName: "",
          weekCommencing: "SUNDAY",
          vatRegistrationNumber: "",
          phone: "",
          emailAddress: "",
          businessAddress: "",
          bankAccountDetail: "",
        });
        setLogoPreview(null);
        setLogoFile(null);
      }
    }
  }, [isOpen, editingEntity]);

  useEffect(() => {
    return () => {
      if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoFile, logoPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.companyName.trim()) {
      toast.error("Company Name is required");
      return;
    }

    if (!formData.legalEntityName.trim()) {
      toast.error("Legal Entity Name is required");
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value);
    });

    if (logoFile) {
      payload.append("companyLogo", logoFile);
    }

    try {
      if (editingEntity) {
        await updateEntityApi(editingEntity.id!, payload, moduleName);
        toast.success("Entity updated successfully!");
      } else {
        await createEntityApi(payload, moduleName);
        toast.success("Entity added successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
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
        toast.error("Failed to save entity.");
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
          ? "View Entity"
          : editingEntity
            ? "Edit Entity"
            : "Add Entity"
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* FIXED: Neatly centered logo upload using the new reusable component */}
        <div className="flex justify-center pt-2 pb-4">
          <ImageUpload
            previewUrl={logoPreview}
            onChange={handleFileChange}
            onClear={clearLogo}
            isViewMode={isViewMode}
            label="Upload Company Logo"
            id="entityLogoUpload"
          />
        </div>

        {/* FIXED: Perfect 2-column grid for all inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Xenon SMS"
            required
            disabled={isViewMode}
          />
          <Input
            label="Legal Entity Name"
            name="legalEntityName"
            value={formData.legalEntityName}
            onChange={handleChange}
            placeholder="Xenon SMS Pvt. Ltd."
            required
            disabled={isViewMode}
          />
          <Input
            label="Business Address"
            name="businessAddress"
            value={formData.businessAddress}
            onChange={handleChange}
            placeholder="123 Street Name"
            disabled={isViewMode}
          />
          {/* <Select
            label="Week Commencing"
            value={formData.weekCommencing}
            onChange={handleSelectChange}
            options={[
              { label: "Sunday", value: "SUNDAY" },
              { label: "Monday", value: "MONDAY" }
            ]}
            disabled={isViewMode}
          /> */}
          <Input
            label="VAT Registration Number"
            name="vatRegistrationNumber"
            value={formData.vatRegistrationNumber}
            onChange={handleChange}
            placeholder="Enter VAT number"
            disabled={isViewMode}
          />
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+977-9800000000"
            disabled={isViewMode}
          />
          <Input
            label="Email Address"
            name="emailAddress"
            type="email"
            value={formData.emailAddress}
            onChange={handleChange}
            placeholder="contact@company.com"
            disabled={isViewMode}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Bank Account Detail"
              name="bankAccountDetail"
              value={formData.bankAccountDetail}
              onChange={handleChange}
              placeholder="Bank info..."
              disabled={isViewMode}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingEntity
                  ? "Save Changes"
                  : "Add Entity"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};