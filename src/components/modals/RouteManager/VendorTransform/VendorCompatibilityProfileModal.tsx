import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import Input from "../../../ui/Input";
import Select from "../../../ui/Select";
import ToggleSwitch from "../../../ui/ToggleSwitch";
import LoadingSpinner from "../../../ui/LoadingSpinner";
import type {
  VendorCompatibilityProfile,
  SenderFormat,
  VerificationStatus,
} from "../../../../api/routeManagerApi/vendorTransformApi";
import {
  createVendorCompatibilityProfileApi,
  updateVendorCompatibilityProfileApi,
} from "../../../../api/routeManagerApi/vendorTransformApi";

interface VendorCompatibilityProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProfile: VendorCompatibilityProfile | null;
  vendors: any[];
  countries: any[];
  canCreate: boolean;
  canUpdate: boolean;
}

const senderFormatOptions = [
  { value: "ANY", label: "Any (No Format Restrictions)" },
  { value: "NUMERIC_ONLY", label: "Numeric Only (E.164 / MSISDN)" },
  { value: "ALPHANUMERIC_ONLY", label: "Alphanumeric Only (Brand String)" },
  { value: "SHORTCODE_ONLY", label: "Shortcode Only (3-6 Digits)" },
  { value: "NO_SPACES", label: "No Spaces Permitted" },
];

const verificationStatusOptions = [
  { value: "UNVERIFIED", label: "Unverified (Default)" },
  { value: "VERIFIED", label: "Verified (Production Ready)" },
  { value: "FAILED", label: "Failed / Incompatible" },
];

export const VendorCompatibilityProfileModal: React.FC<VendorCompatibilityProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProfile,
  vendors,
  countries,
  canCreate,
  canUpdate,
}) => {
  const [formData, setFormData] = useState<Partial<VendorCompatibilityProfile>>({
    senderFormat: "ANY",
    maxSenderLength: 15,
    allowBlank: false,
    verificationStatus: "VERIFIED",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingProfile) {
        setFormData({
          vendor: editingProfile.vendor,
          country: editingProfile.country,
          senderFormat: editingProfile.senderFormat || "ANY",
          maxSenderLength: editingProfile.maxSenderLength || 15,
          allowBlank: editingProfile.allowBlank || false,
          verificationStatus: editingProfile.verificationStatus || "VERIFIED",
          remarks: editingProfile.remarks || "",
        });
      } else {
        setFormData({
          senderFormat: "ANY",
          maxSenderLength: 15,
          allowBlank: false,
          verificationStatus: "VERIFIED",
          remarks: "",
        });
      }
    }
  }, [isOpen, editingProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor) {
      toast.error("Please select a vendor");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<VendorCompatibilityProfile> = {
        vendor: Number(formData.vendor),
        country: formData.country ? Number(formData.country) : null,
        senderFormat: formData.senderFormat || "ANY",
        maxSenderLength: Number(formData.maxSenderLength) || 15,
        allowBlank: Boolean(formData.allowBlank),
        verificationStatus: formData.verificationStatus || "VERIFIED",
        remarks: formData.remarks || "",
      };

      if (editingProfile?.id) {
        await updateVendorCompatibilityProfileApi(editingProfile.id, payload);
        toast.success("Vendor compatibility profile updated successfully");
      } else {
        await createVendorCompatibilityProfileApi(payload);
        toast.success("Vendor compatibility profile created successfully");
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Failed to save compatibility profile", e);
      toast.error(e?.response?.data?.message || "Failed to save compatibility profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editingProfile?.id);
  const isDisabled = isEditing ? !canUpdate : !canCreate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Vendor Compatibility Profile" : "Add Vendor Compatibility Profile"}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Vendor"
              placeholder="Select Vendor"
              value={formData.vendor ? String(formData.vendor) : ""}
              onChange={(v: string) => setFormData({ ...formData, vendor: v ? Number(v) : undefined })}
              options={vendors.map((ven) => ({
                value: String(ven.id),
                label: ven.profileName || `Vendor ${ven.id}`,
              }))}
              required
              disabled={isDisabled}
            />
          </div>

          <div>
            <Select
              label="Target Country (Optional)"
              placeholder="Global (All Countries)"
              value={formData.country ? String(formData.country) : ""}
              onChange={(c: string) => setFormData({ ...formData, country: c ? Number(c) : null })}
              options={[
                { value: "", label: "Global (All Countries)" },
                ...countries.map((c: any) => ({ value: String(c.id), label: c.name })),
              ]}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Allowed Sender ID Format"
              value={formData.senderFormat || "ANY"}
              onChange={(f: string) => setFormData({ ...formData, senderFormat: f as SenderFormat })}
              options={senderFormatOptions}
              required
              clearable={false}
              disabled={isDisabled}
            />
          </div>

          <div>
            <Input
              type="number"
              label="Max Sender ID Length"
              value={formData.maxSenderLength || 15}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, maxSenderLength: Number(e.target.value) || 15 })
              }
              required
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Verification Status"
              value={formData.verificationStatus || "VERIFIED"}
              onChange={(v: string) =>
                setFormData({ ...formData, verificationStatus: v as VerificationStatus })
              }
              options={verificationStatusOptions}
              required
              clearable={false}
              disabled={isDisabled}
            />
          </div>

          <div>
            <Input
              label="Remarks"
              placeholder="e.g. AU Optus strict alpha registration rules"
              value={formData.remarks || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="flex items-center pt-1">
          <ToggleSwitch
            label="Allow Blank / Missing Sender ID"
            checked={formData.allowBlank || false}
            onChange={(c: boolean) => setFormData({ ...formData, allowBlank: c })}
            disabled={isDisabled}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isDisabled}
            leftIcon={isSubmitting ? <LoadingSpinner size="sm" /> : undefined}
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Profile" : "Add Profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VendorCompatibilityProfileModal;
