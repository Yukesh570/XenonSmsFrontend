import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

// APIs
import {
  createVendorApi,
  updateVendorApi,
  type VendorData,
} from "../../../api/connectivityApi/vendorApi";
import {
  createSmppApi,
  updateSmppApi,
  getSmppByIdApi,
} from "../../../api/connectivityApi/smppApi";
import {
  createVendorPolicyApi,
  updateVendorPolicyApi,
} from "../../../api/policyApi/vendorPolicyApi";
import { getCompaniesApi } from "../../../api/companyApi/companyApi";

// UI Components
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingVendor: VendorData | null;
  isViewMode?: boolean;
}

interface Option {
  label: string;
  value: string;
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingVendor,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    company: "",
    profileName: "",
    connectionType: "SMPP",
    invoicePolicy: "ON_SUBMIT",
    smppId: 0,
    smppHost: "",
    smppPort: "",
    systemID: "",
    password: "",
    status: "ACTIVE",
    bindMode: "TRANSCEIVER", // Changed default to TRANSCEIVER
    sourceTON: "",
    sourceNPI: "",
    destTON: "",
    destNPI: "",
    rateTps: "",
    maxSession: "",
    sendQueueLimit: "",
    delayTime: "",
    responseTimeout: "60",
    enquireLinkInterval: "",
    connectionTimeout: "",
    maxMessageRetries: "",
    connectionRetryDelay: "",
    connectionRetryCount: "",
    bindRetryDelay: "",
    bindRetryCount: "",
    connectionRecoveryDelay: "",
    logLevel: "INFO",
    tlvTag: "",
    tlvValue: "",
    bindStatus: "OFFLINE",
    active_session_count: 0,
    max_allowed_sessions: 1,
  });

  // UI & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Track existing policy ID to know if we are updating or creating
  const [existingPolicyId, setExistingPolicyId] = useState<number | null>(null);

  // Dropdown Options
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);

  const connectionTypeOptions = [
    { label: "SMPP", value: "SMPP" },
    { label: "HTTP", value: "HTTP" },
  ];

  const invoicePolicyOptions = [
    { label: "On Attempt", value: "ON_ATTEMPT" },
    { label: "On Submit", value: "ON_SUBMIT" },
    { label: "On Delivered", value: "ON_DELIVERED" },
  ];
  const status = [
    { label: "Active", value: "ACTIVE" },
    { label: "Trial", value: "TRIAL" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  const bindModeOptions = [
    { label: "Transmitter", value: "TRANSMITTER" },
    { label: "Receiver", value: "RECEIVER" },
    { label: "Transceiver", value: "TRANSCEIVER" },
  ];

  // const logLevelOptions = [
  //   { label: "DEBUG", value: "DEBUG" },
  //   { label: "INFO", value: "INFO" },
  //   { label: "WARNING", value: "WARNING" },
  //   { label: "ERROR", value: "ERROR" },
  //   { label: "CRITICAL", value: "CRITICAL" },
  // ];

  // Fetch Dropdown Data on Mount
  useEffect(() => {
    if (isOpen) {
      setIsLoadingCompanies(true);
      getCompaniesApi("company", 1, 1000)
        .then((res: any) => {
          let list = [];
          if (res && res.results) list = res.results;
          else if (Array.isArray(res)) list = res;

          setCompanyOptions(
            list.map((c: any) => ({ label: c.name, value: String(c.id) })),
          );
        })
        .catch((err: any) => console.error("Failed to load companies", err))
        .finally(() => setIsLoadingCompanies(false));
    }
  }, [isOpen]);

  const isModalLoading = isLoadingDetails || (Boolean(editingVendor) && isLoadingCompanies);

  // Load Vendor, SMPP, and Policy details when editing
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && editingVendor) {
        const anyVendor = editingVendor as any;

        setExistingPolicyId(anyVendor.vendorPolicy?.id || null);

        setFormData({
          company: editingVendor.company ? String(editingVendor.company) : "",
          profileName: editingVendor.profileName,
          connectionType: editingVendor.connectionType || "",
          invoicePolicy: editingVendor.invoicePolicy || "ON_SUBMIT",
          smppId: anyVendor.smpp || 0,
          smppHost: "",
          smppPort: "",
          systemID: "",
          password: "",
          bindMode: "TRANSCEIVER",
          sourceTON: "",
          sourceNPI: "",
          destTON: "",
          destNPI: "",

          rateTps: anyVendor.vendorPolicy?.rateTps != null ? String(anyVendor.vendorPolicy.rateTps) : "",
          maxSession: anyVendor.vendorPolicy?.maxSession != null ? String(anyVendor.vendorPolicy.maxSession) : "",
          sendQueueLimit: anyVendor.vendorPolicy?.sendQueueLimit != null ? String(anyVendor.vendorPolicy.sendQueueLimit) : "",
          delayTime: anyVendor.vendorPolicy?.delayTime != null ? String(anyVendor.vendorPolicy.delayTime) : "",
          responseTimeout: anyVendor.vendorPolicy?.responseTimeout != null ? String(anyVendor.vendorPolicy.responseTimeout) : "60",
          enquireLinkInterval: anyVendor.vendorPolicy?.enquireLinkInterval != null ? String(anyVendor.vendorPolicy.enquireLinkInterval) : "",
          connectionTimeout: anyVendor.vendorPolicy?.connectionTimeout != null ? String(anyVendor.vendorPolicy.connectionTimeout) : "",
          maxMessageRetries: anyVendor.vendorPolicy?.maxMessageRetries != null ? String(anyVendor.vendorPolicy.maxMessageRetries) : "",
          connectionRetryDelay: anyVendor.vendorPolicy?.connectionRetryDelay != null ? String(anyVendor.vendorPolicy.connectionRetryDelay) : "",
          connectionRetryCount: anyVendor.vendorPolicy?.connectionRetryCount != null ? String(anyVendor.vendorPolicy.connectionRetryCount) : "",
          bindRetryDelay: anyVendor.vendorPolicy?.bindRetryDelay != null ? String(anyVendor.vendorPolicy.bindRetryDelay) : "",
          bindRetryCount: anyVendor.vendorPolicy?.bindRetryCount != null ? String(anyVendor.vendorPolicy.bindRetryCount) : "",
          connectionRecoveryDelay: anyVendor.vendorPolicy?.connectionRecoveryDelay != null ? String(anyVendor.vendorPolicy.connectionRecoveryDelay) : "",
          logLevel: anyVendor.vendorPolicy?.logLevel || "INFO",
          tlvTag: anyVendor.vendorPolicy?.tlvTag || "",
          tlvValue: anyVendor.vendorPolicy?.tlvValue || "",
          status: anyVendor.status || "ACTIVE",
          bindStatus: editingVendor.bindStatus || "OFFLINE",
          active_session_count: anyVendor.active_session_count || 0,
          max_allowed_sessions: anyVendor.vendorPolicy?.maxSession || 1,
        });

        setIsLoadingDetails(true);

        try {
          if (anyVendor.connectionType === "SMPP" && anyVendor.smpp) {
            const smppData = await getSmppByIdApi(anyVendor.smpp, "smpp");
            setFormData((prev) => ({
              ...prev,
              smppHost: smppData.smppHost || "",
              smppPort: smppData.smppPort != null ? String(smppData.smppPort) : "",
              systemID: smppData.systemID || "",
              password: smppData.password || "",
              bindMode: smppData.bindMode || "TRANSCEIVER",
              sourceTON: smppData.sourceTON != null ? String(smppData.sourceTON) : "",
              sourceNPI: smppData.sourceNPI != null ? String(smppData.sourceNPI) : "",
              destTON: smppData.destTON != null ? String(smppData.destTON) : "",
              destNPI: smppData.destNPI != null ? String(smppData.destNPI) : "",
            }));
          }
        } catch (error) {
          console.error("Failed to load details", error);
          toast.error("Could not load SMPP configuration details.");
        } finally {
          setIsLoadingDetails(false);
        }
      } else if (isOpen) {
        setExistingPolicyId(null);
        setFormData({
          company: "",
          profileName: "",
          connectionType: "SMPP",
          invoicePolicy: "ON_SUBMIT",
          status: "ACTIVE",
          smppId: 0,
          smppHost: "",
          smppPort: "",
          systemID: "",
          password: "",
          bindMode: "TRANSCEIVER",
          sourceTON: "",
          sourceNPI: "",
          destTON: "",
          destNPI: "",
          rateTps: "",
          maxSession: "",
          sendQueueLimit: "",
          delayTime: "",
          responseTimeout: "60",
          enquireLinkInterval: "",
          connectionTimeout: "",
          maxMessageRetries: "",
          connectionRetryDelay: "",
          connectionRetryCount: "",
          bindRetryDelay: "",
          bindRetryCount: "",
          connectionRecoveryDelay: "",
          logLevel: "INFO",
          tlvTag: "",
          tlvValue: "",
          bindStatus: "OFFLINE",
          active_session_count: 0,
          max_allowed_sessions: 1,
        });
      }
    };

    loadData();
  }, [isOpen, editingVendor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!editingVendor && !formData.company) {
      toast.error("Company Name is required.");
      return;
    }
    if (!formData.profileName) {
      toast.error("Profile Name is required.");
      return;
    }
    if (!formData.invoicePolicy) {
      toast.error("Invoice Policy is required.");
      return;
    }

    if (formData.connectionType === "SMPP") {
      if (!formData.smppHost) {
        toast.error("SMPP Host is required.");
        return;
      }
      if (!formData.smppPort) {
        toast.error("SMPP Port is required.");
        return;
      }
      if (!formData.systemID) {
        toast.error("System ID is required.");
        return;
      }
      if (!formData.password) {
        toast.error("Password is required.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let createdSmppId = formData.smppId;

      if (formData.connectionType === "SMPP") {
        const smppPayload = {
          smppHost: formData.smppHost,
          smppPort: Number(formData.smppPort),
          systemID: formData.systemID,
          password: formData.password,
          bindMode: formData.bindMode,
          sourceTON: formData.sourceTON !== "" ? Number(formData.sourceTON) : 1,
          sourceNPI: formData.sourceNPI !== "" ? Number(formData.sourceNPI) : 1,
          destTON: formData.destTON !== "" ? Number(formData.destTON) : 1,
          destNPI: formData.destNPI !== "" ? Number(formData.destNPI) : 1,
        };

        if (editingVendor && createdSmppId) {
          await updateSmppApi(createdSmppId, smppPayload, "smpp");
        } else {
          const smppResponse = await createSmppApi(smppPayload, "smpp");
          if (smppResponse && smppResponse.id) {
            createdSmppId = smppResponse.id;
          } else {
            throw new Error("Failed to create SMPP configuration.");
          }
        }
      }

      const finalSmppValue =
        formData.connectionType === "SMPP" && createdSmppId
          ? createdSmppId
          : null;

      const vendorPayload: any = {
        profileName: formData.profileName,
        connectionType: formData.connectionType,
        smpp: finalSmppValue,
        status: formData.status,
      };

      if (formData.company) {
        vendorPayload.company = Number(formData.company);
      }

      const validInvoicePolicies = ["ON_ATTEMPT", "ON_SUBMIT", "ON_DELIVERED"];
      if (formData.invoicePolicy && validInvoicePolicies.includes(formData.invoicePolicy)) {
        vendorPayload.invoicePolicy = formData.invoicePolicy;
      }

      let vendorId = editingVendor?.id;

      if (editingVendor) {
        await updateVendorApi(editingVendor.id!, vendorPayload, moduleName);
      } else {
        const vRes: any = await createVendorApi(vendorPayload, moduleName);
        vendorId = vRes?.id || vRes?.data?.id;
      }

      if (vendorId) {
        const policyPayload: any = {
          logLevel: formData.logLevel,
          responseTimeout: formData.responseTimeout !== "" ? Number(formData.responseTimeout) : 60,
        };

        if (formData.rateTps !== "") policyPayload.rateTps = Number(formData.rateTps);
        if (formData.maxSession !== "") policyPayload.maxSession = Number(formData.maxSession);
        if (formData.sendQueueLimit !== "") policyPayload.sendQueueLimit = Number(formData.sendQueueLimit);
        if (formData.delayTime !== "") policyPayload.delayTime = Number(formData.delayTime);
        if (formData.enquireLinkInterval !== "") policyPayload.enquireLinkInterval = Number(formData.enquireLinkInterval);
        if (formData.connectionTimeout !== "") policyPayload.connectionTimeout = Number(formData.connectionTimeout);
        if (formData.maxMessageRetries !== "") policyPayload.maxMessageRetries = Number(formData.maxMessageRetries);
        if (formData.connectionRetryDelay !== "") policyPayload.connectionRetryDelay = Number(formData.connectionRetryDelay);
        if (formData.connectionRetryCount !== "") policyPayload.connectionRetryCount = Number(formData.connectionRetryCount);
        if (formData.bindRetryDelay !== "") policyPayload.bindRetryDelay = Number(formData.bindRetryDelay);
        if (formData.bindRetryCount !== "") policyPayload.bindRetryCount = Number(formData.bindRetryCount);
        if (formData.connectionRecoveryDelay !== "") policyPayload.connectionRecoveryDelay = Number(formData.connectionRecoveryDelay);
        if (formData.tlvTag !== "") policyPayload.tlvTag = formData.tlvTag;
        if (formData.tlvValue !== "") policyPayload.tlvValue = formData.tlvValue;

        try {
          if (existingPolicyId) {
            await updateVendorPolicyApi(existingPolicyId, policyPayload);
          } else {
            policyPayload.vendor = Number(vendorId);
            await createVendorPolicyApi(policyPayload);
          }
        } catch (policyErr) {
          console.error("Policy configuration save error:", policyErr);
          toast.warning("Vendor saved, but policy settings failed to save.");
        }
      }

      toast.success(
        editingVendor
          ? "Vendor updated successfully!"
          : "Vendor added successfully!",
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to save vendor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isModalLoading}
      loadingText={editingVendor ? "Loading vendor details..." : "Loading..."}
      title={
        isViewMode
          ? "View Vendor"
          : editingVendor
            ? "Edit Vendor"
            : "Add Vendor"
      }
      className="max-w-4xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5 max-h-[80vh] overflow-y-auto px-1"
        noValidate
      >

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identity & Commercials
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Select
              label="Company Name"
              value={formData.company}
              onChange={(v) => handleSelect("company", v)}
              options={companyOptions}
              placeholder="Select Company"
              disabled={isViewMode || Boolean(editingVendor)}
              required={!editingVendor}
            />
            <Input
              label="Profile Name"
              name="profileName"
              value={formData.profileName}
              onChange={handleChange}
              placeholder="Vendor A"
              required
              disabled={isViewMode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Select
              label="Invoice Policy"
              value={formData.invoicePolicy}
              onChange={(v) => handleSelect("invoicePolicy", v)}
              options={invoicePolicyOptions}
              placeholder="Select Invoice Policy"
              disabled={isViewMode}
              required
            />
            {/* <Select
              label="Log Level"
              value={formData.logLevel}
              onChange={(v) => handleSelect("logLevel", v)}
              options={logLevelOptions}
              placeholder="Select Log Level"
              disabled={isViewMode}
            /> */}
            <Select
              label="Status"
              value={formData.status}
              onChange={(v) => handleSelect("status", v)}
              options={status}
              disabled={isViewMode}
            />
          </div>
        </fieldset>

        {isViewMode && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Rate Plan
            </legend>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Vendor Rate Group"
                name="vendorRateGroupView"
                value={editingVendor?.vendorRateGroupName || "-"}
                disabled={true}
              />
            </div>
          </fieldset>
        )}

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Connectivity
          </legend>
          <Select
            label="Connection Type"
            value={formData.connectionType}
            onChange={(v) => handleSelect("connectionType", v)}
            options={connectionTypeOptions}
            placeholder="Select Type"
            disabled={isViewMode}
          />
        </fieldset>

        {formData.connectionType === "SMPP" && (
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-primary">
              SMPP Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SMPP Host"
                name="smppHost"
                value={formData.smppHost}
                onChange={handleChange}
                placeholder="smpp.host.com"
                required
                disabled={isViewMode || isLoadingDetails}
              />
              <Input
                label="SMPP Port"
                name="smppPort"
                type="number"
                value={formData.smppPort}
                onChange={handleChange}
                placeholder="2775"
                required
                disabled={isViewMode || isLoadingDetails}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="System ID"
                name="systemID"
                value={formData.systemID}
                onChange={handleChange}
                placeholder="User ID"
                required
                disabled={isViewMode || isLoadingDetails}
              />
              <Input
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Secret"
                required
                disabled={isViewMode || isLoadingDetails}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Select
                label="Bind Mode"
                value={formData.bindMode}
                onChange={(v) => handleSelect("bindMode", v)}
                options={bindModeOptions}
                placeholder="Select Mode"
                disabled={isViewMode || isLoadingDetails}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Source TON"
                name="sourceTON"
                type="number"
                value={formData.sourceTON}
                onChange={handleChange}
                placeholder="1"
                disabled={isViewMode || isLoadingDetails}
              />
              <Input
                label="Source NPI"
                name="sourceNPI"
                type="number"
                value={formData.sourceNPI}
                onChange={handleChange}
                placeholder="1"
                disabled={isViewMode || isLoadingDetails}
              />
              <Input
                label="Dest TON"
                name="destTON"
                type="number"
                value={formData.destTON}
                onChange={handleChange}
                placeholder="1"
                disabled={isViewMode || isLoadingDetails}
              />
              <Input
                label="Dest NPI"
                name="destNPI"
                type="number"
                value={formData.destNPI}
                onChange={handleChange}
                placeholder="1"
                disabled={isViewMode || isLoadingDetails}
              />
            </div>
          </div>
        )}

        {/* Speed & Queueing */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Speed & Queueing
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="TPS"
              name="rateTps"
              type="number"
              value={formData.rateTps}
              onChange={handleChange}
              placeholder="50"
              disabled={isViewMode}
            />
            <Input
              label="Max Sessions"
              name="maxSession"
              type="number"
              value={formData.maxSession}
              onChange={handleChange}
              placeholder="2"
              disabled={isViewMode}
            />
            <Input
              label="Response Timeout (s)"
              name="responseTimeout"
              type="number"
              step="0.1"
              value={formData.responseTimeout}
              onChange={handleChange}
              placeholder="60"
              disabled={isViewMode}
            />
            {/* <Input
              label="Queue Limit"
              name="sendQueueLimit"
              type="number"
              value={formData.sendQueueLimit}
              onChange={handleChange}
              placeholder="10"
              disabled={isViewMode}
            /> */}
            {/* <Input
              label="Delay Time (Sec)"
              name="delayTime"
              type="number"
              step="0.1"
              value={formData.delayTime}
              onChange={handleChange}
              placeholder="0.0"
              disabled={isViewMode}
            /> */}
          </div>
        </fieldset>

        {/* Timeouts */}
        {/* <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timeouts
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Response Timeout (s)"
              name="responseTimeout"
              type="number"
              step="0.1"
              value={formData.responseTimeout}
              onChange={handleChange}
              placeholder="30.0"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Enquire Link Interval (s)"
              name="enquireLinkInterval"
              type="number"
              step="0.1"
              value={formData.enquireLinkInterval}
              onChange={handleChange}
              placeholder="30.0"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Connection Timeout (s)"
              name="connectionTimeout"
              type="number"
              step="0.1"
              value={formData.connectionTimeout}
              onChange={handleChange}
              placeholder="10.0"
              disabled={isViewMode}
            /> */}
        {/* </div>
        </fieldset> */}

        {/* Retries & Recovery */}
        {/* <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Retries & Recovery
          </legend>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> */}
        {/* <Input
              label="Max Msg Retries"
              name="maxMessageRetries"
              type="number"
              value={formData.maxMessageRetries}
              onChange={handleChange}
              placeholder="3"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Conn Retry Delay (s)"
              name="connectionRetryDelay"
              type="number"
              step="0.1"
              value={formData.connectionRetryDelay}
              onChange={handleChange}
              placeholder="5.0"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Conn Retry Count"
              name="connectionRetryCount"
              type="number"
              value={formData.connectionRetryCount}
              onChange={handleChange}
              placeholder="3"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Conn Recovery Delay (s)"
              name="connectionRecoveryDelay"
              type="number"
              step="0.1"
              value={formData.connectionRecoveryDelay}
              onChange={handleChange}
              placeholder="60.0"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Bind Retry Delay (s)"
              name="bindRetryDelay"
              type="number"
              step="0.1"
              value={formData.bindRetryDelay}
              onChange={handleChange}
              placeholder="5.0"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Bind Retry Count"
              name="bindRetryCount"
              type="number"
              value={formData.bindRetryCount}
              onChange={handleChange}
              placeholder="3"
              disabled={isViewMode}
            /> */}
        {/* </div>
        </fieldset> */}

        {/* TLVs */}
        {/* <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
          <legend className="text-sm font-semibold text-primary px-2">
            TLVs Configuration
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="TLV Tag"
              name="tlvTag"
              value={formData.tlvTag}
              onChange={handleChange}
              placeholder="e.g. 0x1401"
              disabled={isViewMode}
            />
            <Input
              label="TLV Value"
              name="tlvValue"
              value={formData.tlvValue}
              onChange={handleChange}
              placeholder="Enter TLV Value"
              disabled={isViewMode}
            />
          </div>
        </fieldset> */}

        {editingVendor && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50/50 dark:bg-gray-800/30">
            <legend className="text-sm font-semibold text-primary px-2">
              Live Connection Status
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Live Bind Status"
                name="bindStatus"
                value={formData.bindStatus}
                disabled={true}
                className={`font-semibold ${
                  formData.bindStatus === "ONLINE"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              />
              <Input
                label="Active Sessions / Allowed"
                name="session"
                value={`${formData.active_session_count} / ${formData.max_allowed_sessions || 0}`}
                disabled={true}
              />
            </div>
          </fieldset>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isModalLoading}
            >
              {isSubmitting ? "Saving..." : "Save Vendor"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default VendorModal;