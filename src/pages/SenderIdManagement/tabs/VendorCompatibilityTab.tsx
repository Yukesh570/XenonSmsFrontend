import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Modal from "../../../components/ui/Modal";
import { DeleteModal } from "../../../components/modals/DeleteModal";
import ContextMenu from "../../../components/ui/ContextMenu";
import { CountryFlag } from "../../../components/ui/CountryFlag";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

import type {
  VendorCompatibilityProfile,
  SenderFormat,
  VerificationStatus,
} from "../../../api/authorizationApi/vendorTransformApi";
import {
  getVendorCompatibilityProfilesApi,
  createVendorCompatibilityProfileApi,
  updateVendorCompatibilityProfileApi,
  deleteVendorCompatibilityProfileApi,
} from "../../../api/authorizationApi/vendorTransformApi";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";

interface VendorCompatibilityTabProps {
  countries: any[];
}

export const VendorCompatibilityTab: React.FC<VendorCompatibilityTabProps> = ({ countries }) => {
  const [profiles, setProfiles] = useState<VendorCompatibilityProfile[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterVendorId, setFilterVendorId] = useState<string>("");
  const [filterCountryId, setFilterCountryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorCompatibilityProfile>>({
    vendor: undefined,
    country: null,
    senderFormat: "ANY",
    maxSenderLength: 15,
    allowBlank: false,
    verificationStatus: "VERIFIED",
    remarks: "",
  });

  // Delete & Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRowProfile, setSelectedRowProfile] = useState<VendorCompatibilityProfile | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load vendors and profiles
  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        getVendorsApi(undefined, 1, 1000).catch(() => ({ results: [] })),
        getVendorCompatibilityProfilesApi({
          vendor: filterVendorId ? Number(filterVendorId) : undefined,
          country: filterCountryId ? Number(filterCountryId) : undefined,
          search: searchQuery || undefined,
        }).catch(() => []),
      ]);

      const vList = vRes?.results || (Array.isArray(vRes) ? vRes : []);
      setVendors(vList);
      setProfiles(pRes);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load vendor compatibility profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterVendorId, filterCountryId, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor) {
      toast.error("Please select a Vendor");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<VendorCompatibilityProfile> = {
        ...formData,
        vendor: Number(formData.vendor),
        country: formData.country ? Number(formData.country) : null,
      };

      if (editingProfileId) {
        await updateVendorCompatibilityProfileApi(editingProfileId, payload);
        toast.success("Vendor compatibility profile updated successfully");
      } else {
        await createVendorCompatibilityProfileApi(payload);
        toast.success("Vendor compatibility profile created successfully");
      }

      setShowModal(false);
      setEditingProfileId(null);
      loadData();
    } catch (e: any) {
      console.error(e);
      const err =
        e.response?.data?.non_field_errors?.[0] ||
        e.response?.data?.maxSenderLength?.[0] ||
        e.response?.data?.error ||
        "Failed to save profile. Ensure vendor + country is unique.";
      toast.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (profile: VendorCompatibilityProfile) => {
    setEditingProfileId(profile.id!);
    setFormData({
      vendor: profile.vendor,
      country: profile.country,
      senderFormat: profile.senderFormat,
      maxSenderLength: profile.maxSenderLength,
      allowBlank: profile.allowBlank,
      verificationStatus: profile.verificationStatus,
      remarks: profile.remarks || "",
    });
    setShowModal(true);
    setContextMenuPos(null);
  };

  const handleDelete = async () => {
    if (!deleteProfileId) return;
    setIsDeleting(true);
    try {
      await deleteVendorCompatibilityProfileApi(deleteProfileId);
      toast.success("Vendor compatibility profile deleted successfully");
      setDeleteProfileId(null);
      setSelectedRowProfile(null);
      loadData();
    } catch (e) {
      toast.error("Failed to delete profile");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4" onClick={() => setContextMenuPos(null)}>
      {/* Action / Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="w-52">
              <Select
                placeholder="All Vendors"
                value={filterVendorId}
                onChange={(v) => setFilterVendorId(v)}
                options={[
                  { value: "", label: "All Vendors" },
                  ...vendors.map((ven) => ({
                    value: String(ven.id),
                    label: ven.profileName || `Vendor ${ven.id}`,
                  })),
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                placeholder="All Countries"
                value={filterCountryId}
                onChange={(c) => setFilterCountryId(c)}
                options={[
                  { value: "", label: "All Countries" },
                  ...countries.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>
            <div className="w-60">
              <Input
                placeholder="Search vendor, remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {(filterVendorId || filterCountryId || searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterVendorId("");
                  setFilterCountryId("");
                  setSearchQuery("");
                }}
                leftIcon={<RotateCcw size={14} />}
              >
                Reset
              </Button>
            )}
          </div>

          <Button
            type="button"
            onClick={() => {
              setEditingProfileId(null);
              setFormData({
                vendor: undefined,
                country: null,
                senderFormat: "ANY",
                maxSenderLength: 15,
                allowBlank: false,
                verificationStatus: "VERIFIED",
                remarks: "",
              });
              setShowModal(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Add Compatibility Profile
          </Button>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" text="Loading vendor compatibility profiles..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-text-secondary dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Country Scope</th>
                  <th className="px-4 py-3">Sender Format</th>
                  <th className="px-4 py-3">Max Length</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      No vendor compatibility profiles found.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => {
                    const countryObj = countries.find((c) => c.id === p.country);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-750 transition-colors"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenuPos({ x: e.clientX, y: e.clientY });
                          setSelectedRowProfile(p);
                        }}
                      >
                        <td className="px-4 py-3 font-semibold text-text-primary dark:text-white">
                          {p.vendor__profileName || `Vendor ${p.vendor}`}
                        </td>
                        <td className="px-4 py-3">
                          {countryObj ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <CountryFlag iso2={countryObj.iso2} />
                              <span>{countryObj.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                              Global (All Countries)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {p.senderFormat === "ALPHA" && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-semibold">
                              ALPHA ONLY
                            </span>
                          )}
                          {p.senderFormat === "NUMERIC" && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">
                              NUMERIC ONLY
                            </span>
                          )}
                          {p.senderFormat === "ANY" && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold">
                              ANY FORMAT
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{p.maxSenderLength} chars</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              p.verificationStatus === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : p.verificationStatus === "UNVERIFIED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                            }`}
                          >
                            {p.verificationStatus === "VERIFIED" && <ShieldCheck size={11} />}
                            {p.verificationStatus === "UNVERIFIED" && <Clock size={11} />}
                            {p.verificationStatus === "DEPRECATED" && <AlertCircle size={11} />}
                            {p.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary dark:text-gray-400">
                          {p.remarks || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(p)}
                              title="Edit Profile"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeleteProfileId(p.id!);
                                setSelectedRowProfile(p);
                              }}
                              title="Delete Profile"
                              className="text-rose-600 hover:text-rose-700"
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PROFILE MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProfileId ? "Edit Vendor Compatibility Profile" : "Add Vendor Compatibility Profile"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Vendor *</label>
            <Select
              placeholder="Select Vendor"
              value={formData.vendor ? String(formData.vendor) : ""}
              onChange={(v) => setFormData({ ...formData, vendor: v ? Number(v) : undefined })}
              options={vendors.map((ven) => ({
                value: String(ven.id),
                label: ven.profileName || `Vendor ${ven.id}`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Country Scope (Optional)</label>
            <Select
              placeholder="Global (Applies to all destinations)"
              value={formData.country ? String(formData.country) : ""}
              onChange={(c) => setFormData({ ...formData, country: c ? Number(c) : null })}
              options={[
                { value: "", label: "Global (Applies to all destinations)" },
                ...countries.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Sender Format *</label>
              <Select
                value={formData.senderFormat || "ANY"}
                onChange={(f) => setFormData({ ...formData, senderFormat: f as SenderFormat })}
                options={[
                  { value: "ANY", label: "ANY (Alpha & Numeric)" },
                  { value: "ALPHA", label: "ALPHA ONLY (No numbers)" },
                  { value: "NUMERIC", label: "NUMERIC ONLY (No alpha)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Max Sender Length (1–32)</label>
              <Input
                type="number"
                value={formData.maxSenderLength || 15}
                onChange={(e) => setFormData({ ...formData, maxSenderLength: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Verification Status</label>
            <Select
              value={formData.verificationStatus || "VERIFIED"}
              onChange={(s) => setFormData({ ...formData, verificationStatus: s as VerificationStatus })}
              options={[
                { value: "VERIFIED", label: "VERIFIED (Approved in Production/Staging)" },
                { value: "UNVERIFIED", label: "UNVERIFIED (Candidate must pass preflight)" },
                { value: "DEPRECATED", label: "DEPRECATED (Route will be excluded)" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Remarks</label>
            <Input
              placeholder="e.g. India DLT requires numeric Sender ID"
              value={formData.remarks || ""}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingProfileId ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <DeleteModal
        isOpen={Boolean(deleteProfileId)}
        onClose={() => setDeleteProfileId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor Compatibility Profile"
        message="Are you sure you want to delete this profile? Associated routes will fallback to vendor-global defaults."
        isDeleting={isDeleting}
      />

      {/* CONTEXT MENU */}
      {contextMenuPos && selectedRowProfile && (
        <ContextMenu
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          items={[
            {
              label: "Edit Profile",
              icon: <Edit size={14} />,
              onClick: () => handleEdit(selectedRowProfile),
            },
            {
              label: "Delete Profile",
              icon: <Trash size={14} className="text-rose-500" />,
              onClick: () => {
                setDeleteProfileId(selectedRowProfile.id!);
                setContextMenuPos(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
};
