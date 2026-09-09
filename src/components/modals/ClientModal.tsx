import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

// --- APIs ---
import {
  createClientApi,
  updateClientApi,
  generateCredentialsApi,
  type ClientData,
} from "../../api/clientApi/clientApi";
import { getCompaniesApi } from "../../api/companyApi/companyApi";
import {
  getIpWhitelistApi,
  createIpWhitelistApi,
  deleteIpWhitelistApi,
} from "../../api/ipWhitelistApi/ipWhitelistApi";

// --- Policy APIs ---
import {
  createClientPolicyApi,
  updateClientPolicyApi,
} from "../../api/policyApi/clientPolicyApi";

// --- Components ---
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Modal from "../ui/Modal";
import ToggleSwitch from "../ui/ToggleSwitch";
import TextArea from "../ui/TextArea";
// import MultiEmailInput from "../ui/multiEmailInput";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingClient: ClientData | null;
  isViewMode?: boolean;
}

interface Option {
  label: string;
  value: string;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingClient,
  isViewMode = false,
}) => {
  // --- State with Default Values ---
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    status: "ACTIVE",
    route: "DIRECT",
    paymentTerms: "POSTPAID",
    invoicePolicy: "ON_SUBMIT",
    allowNetting: false,
    enableDlr: true,
    ipWhitelist: "",
    hostnameWhitelist: "",
    smppUsername: "",
    smppPassword: "",
    internalNotes: "",
    bindStatus: "OFFLINE",
    session: "0/2",

    // Policy Fields Defaults
    maxTps: "20",
    maxQueueDepth: "",
    maxWindowPerSession: "",
    maxWindowGlobal: "",
    maxSessions: "2",
    idleTimeoutSec: "15",
    submitTimeoutSec: "20",
    senderIdPolicy: "",
  });

  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAuth, setIsGeneratingAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingPolicyId, setExistingPolicyId] = useState<number | null>(null);

  // --- Helper: Validate IP ---
  const isValidIp = (ip: string) => {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Check = ip.includes(":");
    return ipv4Regex.test(ip) || ipv6Check;
  };

  // --- Static Options ---
  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Trial", value: "TRIAL" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  const routeOptions: Option[] = [
    { label: "Direct", value: "DIRECT" },
    { label: "High Quality", value: "HIGH QUALITY" },
    { label: "SIM", value: "SIM" },
    { label: "Wholesale", value: "WHOLESALE" },
    { label: "Full", value: "FULL" },
    { label: "Spam", value: "SPAM" },
    { label: "MKT", value: "MKT" },
    { label: "Local By Pass", value: "LOCAL_BY_PASS" },
    { label: "WhatsApp", value: "WHATSAPP" },
    { label: "Bulk", value: "BULK" }
  ];


  const paymentTermOptions = [
    { label: "Prepaid", value: "PREPAID" },
    { label: "Postpaid", value: "POSTPAID" },
    // { label: "Net 7", value: "NET7" },
    // { label: "Net 15", value: "NET15" },
    // { label: "Net 30", value: "NET30" },
  ];

  const invoicePolicyOptions = [
    { label: "On Attempt", value: "ON_ATTEMPT" },
    { label: "On Submit", value: "ON_SUBMIT" },
    { label: "On Delivered", value: "ON_DELIVERED" },
  ];

  // --- Fetch Global Dropdowns ---
  useEffect(() => {
    if (isOpen) {
      getCompaniesApi("company", 1, 1000)
        .then((res: any) => {
          let list = [];
          if (res && res.results) list = res.results;
          else if (Array.isArray(res)) list = res;
          setCompanyOptions(
            list.map((c: any) => ({ label: c.name, value: String(c.id) })),
          );
        })
        .catch((err: any) => console.error("Failed to load companies", err));
    }
  }, [isOpen]);

  // --- Fetch Client Details & Access Controls ---
  useEffect(() => {
    const loadData = async () => {
      if (isOpen) {
        setExistingPolicyId(null);
        setFormData({
          company: "",
          name: "",
          status: "ACTIVE",
          route: "DIRECT",
          paymentTerms: "POSTPAID",
          invoicePolicy: "ON_SUBMIT",
          allowNetting: false,
          enableDlr: true,
          ipWhitelist: "",
          hostnameWhitelist: "",
          smppUsername: "",
          smppPassword: "",
          internalNotes: "",
          bindStatus: "OFFLINE",
          session: "0/2",
          maxTps: "20",
          maxQueueDepth: "",
          maxWindowPerSession: "",
          maxWindowGlobal: "",
          maxSessions: "2",
          idleTimeoutSec: "15",
          submitTimeoutSec: "20",
          senderIdPolicy: "",
        });
      }

      if (isOpen && editingClient) {
        setExistingPolicyId(editingClient.clientPolicy?.id || null);

        setFormData((prev) => ({
          ...prev,
          company: String(editingClient.company || ""),
          name: editingClient.name,
          status: editingClient.status,
          route: editingClient.route,
          paymentTerms: editingClient.paymentTerms || "POSTPAID",
          invoicePolicy: editingClient.invoicePolicy || "ON_SUBMIT",
          allowNetting: editingClient.allowNetting,
          enableDlr: editingClient.enableDlr,
          smppUsername: editingClient.smppUsername || "",
          smppPassword: editingClient.smppPassword || "",
          internalNotes: editingClient.internalNotes || "",
          bindStatus: editingClient.bindStatus || "OFFLINE",
          session: editingClient.session || "0/2",

          ipWhitelist: "",
          hostnameWhitelist: "",

          maxTps: editingClient.clientPolicy?.maxTps != null ? String(editingClient.clientPolicy.maxTps) : "20",
          maxQueueDepth: editingClient.clientPolicy?.maxQueueDepth != null ? String(editingClient.clientPolicy.maxQueueDepth) : "",
          maxWindowPerSession: editingClient.clientPolicy?.maxWindowPerSession != null ? String(editingClient.clientPolicy.maxWindowPerSession) : "",
          maxWindowGlobal: editingClient.clientPolicy?.maxWindowGlobal != null ? String(editingClient.clientPolicy.maxWindowGlobal) : "",
          maxSessions: editingClient.clientPolicy?.maxSessions != null ? String(editingClient.clientPolicy.maxSessions) : "2",
          idleTimeoutSec: editingClient.clientPolicy?.idleTimeoutSec != null ? String(editingClient.clientPolicy.idleTimeoutSec) : "15",
          submitTimeoutSec: editingClient.clientPolicy?.submitTimeoutSec != null ? String(editingClient.clientPolicy.submitTimeoutSec) : "20",
          senderIdPolicy: editingClient.clientPolicy?.senderIdPolicy || "",
        }));

        if (editingClient.id) {
          getIpWhitelistApi("ipWhitelist", 1, 1000, {
            client: editingClient.id,
          })
            .then((res) => {
              const myRecords = (res.results || []).filter(
                (r: any) => r.client === editingClient.id
              );
              const ips = myRecords.filter((r: any) => r.access_type === "IP").map((r: any) => r.ip).join(",");
              const hosts = myRecords.filter((r: any) => r.access_type === "HOST" || r.access_type === "HOSTNAME").map((r: any) => r.hostname).join(",");

              setFormData((prev) => ({
                ...prev,
                ipWhitelist: ips,
                hostnameWhitelist: hosts
              }));
            })
            .catch((err: any) => console.error("Failed to fetch Access Controls", err));
        }
      }
    };

    loadData();
  }, [isOpen, editingClient]);

  // --- Handlers ---
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleToggle = (name: string, value: boolean) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleGenerateCredentials = async () => {
    setIsGeneratingAuth(true);
    try {
      const credentials = await generateCredentialsApi();
      setFormData((prev) => ({
        ...prev,
        smppUsername: credentials.username,
        smppPassword: credentials.password,
      }));
      toast.success("Credentials generated successfully!");
    } catch (error) {
      console.error("Failed to generate credentials", error);
      toast.error("Failed to generate credentials.");
    } finally {
      setIsGeneratingAuth(false);
    }
  };

  const handleAccessControlSync = async (clientId: number, ipList: string[], hostList: string[]) => {
    const existingRes = await getIpWhitelistApi("ipWhitelist", 1, 1000, {
      client: clientId,
    });
    const allFetched = existingRes.results || [];
    const existingRecords = allFetched.filter((r) => r.client === clientId);

    const existingIps = existingRecords.filter(r => r.access_type === "IP");
    const existingHosts = existingRecords.filter(r => r.access_type === "HOST" || r.access_type === "HOSTNAME");

    const existingIpSet = new Set(existingIps.map((r) => r.ip));
    const existingHostSet = new Set(existingHosts.map((r) => r.hostname));

    const ipsToAdd = ipList.filter((ip) => !existingIpSet.has(ip));
    const ipsToDelete = existingIps.filter((r) => !ipList.includes(r.ip!));

    const hostsToAdd = hostList.filter((h) => !existingHostSet.has(h));
    const hostsToDelete = existingHosts.filter((r) => !hostList.includes(r.hostname!));

    const promises = [
      ...ipsToAdd.map((ip) =>
        createIpWhitelistApi({ ip, client: clientId, access_type: "IP" }, "ipWhitelist"),
      ),
      ...hostsToAdd.map((hostname) =>
        createIpWhitelistApi({ hostname, client: clientId, access_type: "HOST" }, "ipWhitelist"),
      ),
      ...ipsToDelete.map((r) => deleteIpWhitelistApi(r.id!, "ipWhitelist")),
      ...hostsToDelete.map((r) => deleteIpWhitelistApi(r.id!, "ipWhitelist")),
    ];

    await Promise.all(promises);
  };

  // --- Auto-provision a Route Group + Customer Rate Group with the same
  // name as the client, and link both back onto the newly created client.
  // Only runs for brand new clients (not on edit).
  // const handleAutoProvisionLinkedGroups = async (
  //   clientId: number,
  //   clientName: string,
  //   clientStatus: string,
  // ) => {
  //   const groupStatus = clientStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";

  //   const [routeGroup, rateGroup] = await Promise.all([
  //     createRouteGroupApi({ name: clientName, status: groupStatus }, moduleName),
  //     createCustomerRateGroupApi({ name: clientName, status: groupStatus }, moduleName),
  //   ]);

  //   await updateClientApi(
  //     clientId,
  //     {
  //       routeGroup: routeGroup.id,
  //       customerRateGroup: rateGroup.id,
  //     },
  //     moduleName,
  //   );
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!editingClient && !formData.company.trim()) {
      toast.error("Company is required.");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Client Name is required.");
      return;
    }
    if (!formData.invoicePolicy) {
      toast.error("Invoice Policy is required.");
      return;
    }

    // --- SMPP Credentials Validation ---
    if (!formData.smppUsername.trim()) {
      toast.error("SMPP Username is required.");
      return;
    }

    if (!formData.smppPassword.trim()) {
      toast.error("SMPP Password is required.");
      return;
    }
    if (formData.smppPassword.trim().length > 8) {
      toast.error("SMPP Password must not exceed 8 characters.");
      return;
    }

    const ipList = editingClient
      ? formData.ipWhitelist
        .split(/[\n,]+/)
        .map((ip) => ip.trim())
        .filter((ip) => ip !== "")
      : [];

    if (editingClient) {
      for (const ip of ipList) {
        if (!isValidIp(ip)) {
          toast.error(`Invalid IP address format: "${ip}"`);
          return;
        }
      }
    }

    const hostList = editingClient
      ? formData.hostnameWhitelist
        .split(/[\n,]+/)
        .map((h) => h.trim())
        .filter((h) => h !== "")
      : [];

    setIsSubmitting(true);

    try {
      const {
        ipWhitelist,
        hostnameWhitelist,
        maxTps,
        maxQueueDepth,
        maxWindowPerSession,
        maxWindowGlobal,
        maxSessions,
        idleTimeoutSec,
        submitTimeoutSec,
        senderIdPolicy,
        ...clientPayload
      } = formData;

      const payload: any = {
        ...clientPayload,
      };

      if (formData.company) {
        payload.company = Number(formData.company);
      }

      let savedClientId: number;

      if (editingClient) {
        await updateClientApi(editingClient.id!, payload, moduleName);
        savedClientId = editingClient.id!;
      } else {
        const newClient = await createClientApi(payload, moduleName);
        savedClientId = newClient.id!;
      }

      if (editingClient) {
        await handleAccessControlSync(savedClientId, ipList, hostList);
      }

      // On creation only, auto-create linked Route Group / Customer Rate
      // Group with the same name and attach them to the client.
      // if (isNewClient && savedClientId) {
      //   try {
      //     await handleAutoProvisionLinkedGroups(
      //       savedClientId,
      //       formData.name,
      //       formData.status,
      //     );
      //   } catch (linkErr) {
      //     console.error("Failed to auto-provision Route/Rate groups:", linkErr);
      //     toast.warning(
      //       "Client saved, but auto-creating the linked Route Group / Customer Rate Group failed.",
      //     );
      //   }
      // }

      if (savedClientId) {
        const policyPayload: any = {};

        if (formData.senderIdPolicy !== "")
          policyPayload.senderIdPolicy = formData.senderIdPolicy;
        if (formData.maxTps !== "")
          policyPayload.maxTps = Number(formData.maxTps);
        if (formData.maxQueueDepth !== "")
          policyPayload.maxQueueDepth = Number(formData.maxQueueDepth);
        if (formData.maxWindowPerSession !== "")
          policyPayload.maxWindowPerSession = Number(
            formData.maxWindowPerSession,
          );
        if (formData.maxWindowGlobal !== "")
          policyPayload.maxWindowGlobal = Number(formData.maxWindowGlobal);
        if (formData.maxSessions !== "")
          policyPayload.maxSessions = Number(formData.maxSessions);
        if (formData.idleTimeoutSec !== "")
          policyPayload.idleTimeoutSec = Number(formData.idleTimeoutSec);
        if (formData.submitTimeoutSec !== "")
          policyPayload.submitTimeoutSec = Number(formData.submitTimeoutSec);

        try {
          if (existingPolicyId) {
            await updateClientPolicyApi(existingPolicyId, policyPayload);
          } else {
            policyPayload.client = savedClientId;
            await createClientPolicyApi(policyPayload);
          }
        } catch (policyErr) {
          console.error("Policy configuration save error:", policyErr);
          toast.warning("Client saved, but policy settings failed to save.");
        }
      }

      toast.success(
        editingClient
          ? "Client updated successfully!"
          : "Client created successfully!",
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;

      if (serverError && typeof serverError === "object") {
        if (serverError.ip) {
          toast.error(`IP Error: ${serverError.ip[0]}`);
        } else {
          Object.entries(serverError).forEach(([key, msgs]) => {
            const msgText = Array.isArray(msgs)
              ? msgs.join(", ")
              : String(msgs);
            toast.error(`${key}: ${msgText}`);
          });
        }
      } else {
        toast.error("Failed to save client.");
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
          ? "View Client"
          : editingClient
            ? "Edit Client"
            : "Add New Client"
      }
      className="max-w-4xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-h-[80vh] overflow-y-auto px-1"
        noValidate
      >
        {/* Identity */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identity
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Company"
              value={formData.company}
              onChange={(v) => handleSelect("company", v)}
              options={companyOptions}
              placeholder="Select Company"
              disabled={isViewMode || Boolean(editingClient)}
              required={!editingClient}
            />
            <Input
              label="Client Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Unique Client Name"
              required
              disabled={isViewMode}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(v) => handleSelect("status", v)}
              options={statusOptions}
              disabled={isViewMode}
            />
            <Select
              label="Route Types"
              value={formData.route}
              onChange={(v) => handleSelect("route", v)}
              options={routeOptions}
              disabled={isViewMode}
            />
          </div>
        </fieldset>

        {isViewMode && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Route & Rate Plan
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Route Group"
                name="routeGroupView"
                value={editingClient?.routeGroupName || "-"}
                disabled={true}
              />
              <Input
                label="Customer Rate Group"
                name="customerRateGroupView"
                value={editingClient?.customerRateGroupName || "-"}
                disabled={true}
              />
            </div>
          </fieldset>
        )}

        {/* Commercials */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Commercials & Alerts
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Payment Terms"
              value={formData.paymentTerms}
              onChange={(v) => handleSelect("paymentTerms", v)}
              options={paymentTermOptions}
              disabled={isViewMode}
            />
            <Select
              label="Invoice Policy"
              value={formData.invoicePolicy}
              onChange={(v) => handleSelect("invoicePolicy", v)}
              options={invoicePolicyOptions}
              placeholder="Select Invoice Policy"
              disabled={isViewMode}
              required
            />
          </div>
        </fieldset>

        {/* Connectivity */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 pb-4 pt-2">
          <legend className="text-sm font-semibold text-primary px-2">
            Connectivity & Security
          </legend>

          {!isViewMode && (
            <div className="flex justify-end -mt-2 -mb-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateCredentials}
                disabled={isGeneratingAuth}
              >
                {isGeneratingAuth ? "Generating..." : "Generate Credentials"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMPP Username (System ID)"
              name="smppUsername"
              value={formData.smppUsername}
              onChange={handleChange}
              disabled={isViewMode}
              placeholder="System ID"
              required
            />
            <Input
              label="SMPP Password"
              name="smppPassword"
              type={showPassword ? "text" : "password"}
              value={formData.smppPassword}
              onChange={handleChange}
              disabled={isViewMode}
              placeholder="Max. 8 characters"
              maxLength={8}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {editingClient && (
              <>
                <Input
                  label="Live Bind Status"
                  name="bindStatus"
                  value={formData.bindStatus}
                  disabled={true}
                  className={
                    formData.bindStatus === "ONLINE"
                      ? "text-green-600 font-bold"
                      : "text-gray-500"
                  }
                />
                <Input
                  label="Active Sessions"
                  name="session"
                  value={formData.session}
                  disabled={true}
                />
              </>
            )}

            {/* {editingClient && (!isViewMode || formData.ipWhitelist) && (
              <div className="md:col-span-2">
                <MultiEmailInput
                  label="IP Whitelist"
                  name="ipWhitelist"
                  value={formData.ipWhitelist}
                  onChange={handleSelect}
                  placeholder="Enter IPs and press Enter or comma"
                  disabled={isViewMode}
                />
              </div>
            )}

            {editingClient && (!isViewMode || formData.hostnameWhitelist) && (
              <div className="md:col-span-2">
                <MultiEmailInput
                  label="Hostname Whitelist"
                  name="hostnameWhitelist"
                  value={formData.hostnameWhitelist}
                  onChange={handleSelect}
                  placeholder="Enter Hostnames and press Enter or comma"
                  disabled={isViewMode}
                />
              </div>
            )} */}
          </div>
        </fieldset>

        {/* Policy: Throughput & Limits */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Throughput & Limits
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="TPS"
              name="maxTps"
              type="number"
              value={formData.maxTps}
              onChange={handleChange}
              placeholder="20"
              disabled={isViewMode}
            />
            <Input
              label="Max Sessions"
              name="maxSessions"
              type="number"
              value={formData.maxSessions}
              onChange={handleChange}
              placeholder="2"
              disabled={isViewMode}
            />
            <Input
              label="Idle Timeout (Seconds)"
              name="idleTimeoutSec"
              type="number"
              value={formData.idleTimeoutSec}
              onChange={handleChange}
              placeholder="15"
              disabled={isViewMode}
            />
            <Input
              label="Submit Timeout (Seconds)"
              name="submitTimeoutSec"
              type="number"
              value={formData.submitTimeoutSec}
              onChange={handleChange}
              placeholder="20"
              disabled={isViewMode}
            />
            {/* <Input
              label="Max Queue Depth"
              name="maxQueueDepth"
              type="number"
              value={formData.maxQueueDepth}
              onChange={handleChange}
              placeholder="10000"
              disabled={isViewMode}
            /> */}
            {/* <Input
              label="Max Window (Global)"
              name="maxWindowGlobal"
              type="number"
              value={formData.maxWindowGlobal}
              onChange={handleChange}
              placeholder="50"
              disabled={isViewMode}
            /> */}
            {/* <Input
              label="Max Window (Per Session)"
              name="maxWindowPerSession"
              type="number"
              value={formData.maxWindowPerSession}
              onChange={handleChange}
              placeholder="10"
              disabled={isViewMode}
            /> */}
          </div>
        </fieldset>

        {/* Policy: Timeouts */}
        {/* <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Timeouts
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Idle Timeout (Seconds)"
              name="idleTimeoutSec"
              type="number"
              value={formData.idleTimeoutSec}
              onChange={handleChange}
              placeholder="60"
              disabled={isViewMode}
            /> */}
        {/* <Input
              label="Submit Timeout (Seconds)"
              name="submitTimeoutSec"
              type="number"
              value={formData.submitTimeoutSec}
              onChange={handleChange}
              placeholder="60"
              disabled={isViewMode}
            /> */}
        {/* </div>
        </fieldset> */}

        {/* Settings & Extra */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Settings & Rules
          </legend>
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Sender ID Policy"
              name="senderIdPolicy"
              value={formData.senderIdPolicy}
              onChange={handleChange}
              placeholder="DEFAULT"
              disabled={isViewMode}
            />
          </div> */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={isViewMode ? "pointer-events-none opacity-50" : ""}>
              <ToggleSwitch
                label="Allow Netting"
                checked={formData.allowNetting}
                onChange={(v) => handleToggle("allowNetting", v)}
              />
            </div>
            <div className={isViewMode ? "pointer-events-none opacity-50" : ""}>
              <ToggleSwitch
                label="Enable Dlr"
                checked={formData.enableDlr}
                onChange={(v) => handleToggle("enableDlr", v)}
              />
            </div>
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-2">
          <legend className="text-sm font-semibold text-primary px-2">
            Notes
          </legend>
          <TextArea
            label="Internal Notes"
            name="internalNotes"
            value={formData.internalNotes}
            onChange={handleChange}
            disabled={isViewMode}
            rows={2}
          />
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingClient
                  ? "Update Client"
                  : "Add Client"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;