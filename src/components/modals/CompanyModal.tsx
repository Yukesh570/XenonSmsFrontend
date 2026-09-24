import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  createCompanyApi,
  updateCompanyApi,
  type CompanyData,
} from "../../api/companyApi/companyApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { getCompanyCategoryApi } from "../../api/settingApi/companyCategoryApi/companyCategoryApi";
import { getCurrenciesApi } from "../../api/settingApi/currencyApi/currencyApi";
import { getCompanyStatusApi } from "../../api/settingApi/companyStatusApi/companyStatusApi";
import { getTimezoneApi } from "../../api/settingApi/timezoneApi/timezoneApi";
import { getallAMUserApi } from "../../api/userApi/userApi";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Modal from "../ui/Modal";
import TextArea from "../ui/TextArea";
import MultiEmailInput from "../ui/multiEmailInput";
import { CountryFlag } from "../ui/CountryFlag";

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingCompany: CompanyData | null;
  isViewMode?: boolean;
}

interface Option {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingCompany,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    phone: "",
    companyEmail: "",
    supportEmail: "",
    billingEmail: "",
    amEmail: "",
    ratesEmail: "",
    lowBalanceAlertEmail: "",
    country: "",
    category: "",
    status: "",
    currency: "",
    timeZone: "",
    customerCreditLimit: "",
    vendorCreditLimit: "",
    balanceAlertAmount: "",
    usedCustomerCredit: "",
    usedVendorCredit: "",
    referenceNumber: "",
    address: "",
    validityPeriod: "LTD",
    defaultEmail: "CMP",
    onlinePayment: false,
    companyBlocked: false,
    allowWhiteListedCards: false,
    sendDailyReports: false,
    allowNetting: false,
    showHlrApi: false,
    enableVendorPanel: false,
    accountManager: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [countries, setCountries] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [currencies, setCurrencies] = useState<Option[]>([]);
  const [timeZones, setTimeZones] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadOptions = async (apiCall: any, module: string, setter: any, searchParams: any = {}) => {
        try {
          const res = await apiCall(module, 1, 1000, searchParams);
          const list = res.results || (Array.isArray(res) ? res : []);
          setter(
            list.map((item: any) => ({
              label: item.username || item.name || item.legalEntityName || item.companyName,
              value: String(item.id),
              ...(item.iso2 ? { icon: <CountryFlag iso2={item.iso2} /> } : {})
            })),
          );
        } catch (e) {
          console.error(`Failed to load ${module}`, e);
        }
      };

      loadOptions(getCountriesApi, "country", setCountries);
      loadOptions(getCompanyCategoryApi, "companyCategory", setCategories);
      loadOptions(getCurrenciesApi, "currency", setCurrencies);
      if (typeof getCompanyStatusApi === "function")
        loadOptions(getCompanyStatusApi, "companyStatus", setStatuses);
      if (typeof getTimezoneApi === "function")
        loadOptions(getTimezoneApi, "timeZone", setTimeZones);

      getallAMUserApi()
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setUsers(
            list.map((item: any) => ({
              label: item.username || item.name || item.id,
              value: String(item.id),
            }))
          );
        })
        .catch((err) => console.error("Failed to load AM users:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editingCompany) {
      setFormData({
        name: editingCompany.name,
        shortName: editingCompany.shortName,
        phone: editingCompany.phone,
        companyEmail: editingCompany.companyEmail,
        supportEmail: editingCompany.supportEmail,
        billingEmail: editingCompany.billingEmail,
        amEmail: editingCompany.amEmail,
        ratesEmail: editingCompany.ratesEmail,
        lowBalanceAlertEmail: editingCompany.lowBalanceAlertEmail,
        country: String(editingCompany.country || ""),
        category: String(editingCompany.category || ""),
        status: String(editingCompany.status || ""),
        currency: String(editingCompany.currency || ""),
        timeZone: String(editingCompany.timeZone || ""),
        customerCreditLimit: editingCompany.customerCreditLimit != null ? String(editingCompany.customerCreditLimit) : "",
        vendorCreditLimit: editingCompany.vendorCreditLimit != null ? String(editingCompany.vendorCreditLimit) : "",
        balanceAlertAmount: editingCompany.balanceAlertAmount != null ? String(editingCompany.balanceAlertAmount) : "",
        usedCustomerCredit: editingCompany.usedCustomerCredit != null ? String(editingCompany.usedCustomerCredit) : "",
        usedVendorCredit: editingCompany.usedVendorCredit != null ? String(editingCompany.usedVendorCredit) : "",
        referenceNumber: editingCompany.referencNumber || "",
        address: editingCompany.address,
        validityPeriod: editingCompany.validityPeriod || "LTD",
        defaultEmail: editingCompany.defaultEmail || "CMP",
        onlinePayment: editingCompany.onlinePayment,
        companyBlocked: editingCompany.companyBlocked,
        allowWhiteListedCards: editingCompany.allowWhiteListedCards,
        sendDailyReports: editingCompany.sendDailyReports,
        allowNetting: editingCompany.allowNetting,
        showHlrApi: editingCompany.showHlrApi,
        enableVendorPanel: editingCompany.enableVendorPanel,
        accountManager: editingCompany.accountManager != null ? String(editingCompany.accountManager) : "",
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        shortName: "",
        phone: "",
        companyEmail: "",
        supportEmail: "",
        billingEmail: "",
        amEmail: "",
        ratesEmail: "",
        lowBalanceAlertEmail: "",
        country: "",
        category: "",
        status: "",
        currency: "",
        timeZone: "",
        customerCreditLimit: "",
        vendorCreditLimit: "",
        balanceAlertAmount: "",
        usedCustomerCredit: "",
        usedVendorCredit: "",
        referenceNumber: "",
        address: "",
        validityPeriod: "LTD",
        defaultEmail: "CMP",
        onlinePayment: false,
        companyBlocked: false,
        allowWhiteListedCards: false,
        sendDailyReports: false,
        allowNetting: false,
        showHlrApi: false,
        enableVendorPanel: false,
        accountManager: "",
      });
    }
  }, [isOpen, editingCompany]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.name.trim()) {
      toast.error("Company Name is required.");
      return;
    }
    if (!formData.shortName.trim()) {
      toast.error("Short Name is required.");
      return;
    }
    if (!formData.accountManager.trim()) {
      toast.error("Account Manager is required.");
      return;
    }
    if (!formData.country.trim()) {
      toast.error("Country Name is required.");
      return;
    }
    if (!formData.status.trim()) {
      toast.error("Company Status is required.");
      return;
    }
    if (!formData.currency.trim()) {
      toast.error("Currency is required.");
      return;
    }
    if (!formData.timeZone.trim()) {
      toast.error("Time Zone is required.");
      return;
    }
    if (!formData.balanceAlertAmount.trim()) {
      toast.error("Balance Alert Amount is required.");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Full Address is required.");
      return;
    }

    setIsSubmitting(true);

    const {
      usedCustomerCredit,
      usedVendorCredit,
      customerCreditLimit,
      vendorCreditLimit,
      ...restFormData
    } = formData;

    const payload = {
      ...restFormData,
      country: Number(formData.country) || null,
      category: Number(formData.category) || null,
      status: Number(formData.status) || null,
      currency: Number(formData.currency) || null,
      timeZone: Number(formData.timeZone) || null,
      accountManager: formData.accountManager ? Number(formData.accountManager) : null,
      referencNumber: formData.referenceNumber,
    };

    try {
      if (editingCompany) {
        await updateCompanyApi(editingCompany.id!, payload, moduleName);
        toast.success("Company updated successfully!");
      } else {
        await createCompanyApi(payload, moduleName);
        toast.success("Company created successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;
      if (serverError && typeof serverError === "object") {
        Object.entries(serverError).forEach(([key, msgs]) => {
          toast.error(`${key}: ${Array.isArray(msgs) ? msgs[0] : msgs}`);
        });
      } else {
        toast.error("Failed to save company.");
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
          ? "View Company"
          : editingCompany
            ? "Edit Company"
            : "Add New Company"
      }
      className="max-w-6xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-h-[80vh] overflow-y-auto px-1"
        noValidate
      >
        {/* Identity & Contacts */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Identity & Contacts
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start [&_label]:min-h-[32px] [&_label]:flex [&_label]:items-end">
            <Input
              label="Company Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Xenon SMS"
              required
              disabled={isViewMode}
            />
            <Input
              label="Short Name"
              name="shortName"
              value={formData.shortName}
              onChange={handleChange}
              placeholder="Xenon"
              required
              disabled={isViewMode}
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+977 9800000000"
              disabled={isViewMode}
            />

            <Select
              label="Account Manager"
              value={formData.accountManager}
              onChange={(v) => handleSelect("accountManager", v)}
              options={users}
              placeholder="Select Account Manager"
              required
              disabled={isViewMode}
            />
            <MultiEmailInput
              label="Company Email"
              name="companyEmail"
              value={formData.companyEmail}
              onChange={handleSelect}
              placeholder="contact@xenon.com"
              disabled={isViewMode}
            />
            <MultiEmailInput
              label="Support Email"
              name="supportEmail"
              value={formData.supportEmail}
              onChange={handleSelect}
              placeholder="support@xenon.com"
              disabled={isViewMode}
            />

            <MultiEmailInput
              label="Billing Email"
              name="billingEmail"
              value={formData.billingEmail}
              onChange={handleSelect}
              placeholder="billing@xenon.com"
              disabled={isViewMode}
            />
            <MultiEmailInput
              label="AM Email"
              name="amEmail"
              value={formData.amEmail}
              onChange={handleSelect}
              placeholder="am@xenon.com"
              disabled={isViewMode}
            />
            <MultiEmailInput
              label="Rates Email"
              name="ratesEmail"
              value={formData.ratesEmail}
              onChange={handleSelect}
              placeholder="rates@xenon.com"
              disabled={isViewMode}
            />

            <MultiEmailInput
              label="Low Balance Alert Email"
              name="lowBalanceAlertEmail"
              value={formData.lowBalanceAlertEmail}
              onChange={handleSelect}
              placeholder="finance@xenon.com"
              disabled={isViewMode}
            />
          </div>
        </fieldset>

        {/* Classification & Location */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Classification & Location
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start [&_label]:min-h-[32px] [&_label]:flex [&_label]:items-end">
            <Select
              label="Country Name"
              value={formData.country}
              onChange={(v) => handleSelect("country", v)}
              options={countries}
              placeholder="Select Country"
              disabled={isViewMode}
              required
            />
             {/* <Input
              label="State Name"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter State Name"
              disabled={isViewMode}
            /> */}
            <Select
              label="Company Category"
              value={formData.category}
              onChange={(v) => handleSelect("category", v)}
              options={categories}
              placeholder="Select Category"
              disabled={isViewMode}
            />
            <Select
              label="Company Status"
              value={formData.status}
              onChange={(v) => handleSelect("status", v)}
              options={statuses}
              placeholder="Select Status"
              disabled={isViewMode}
              required
            />
          </div>
        </fieldset>

        {/* Finance & System */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Finance & System
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start [&_label]:min-h-[32px] [&_label]:flex [&_label]:items-end">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(v) => handleSelect("currency", v)}
              options={currencies}
              placeholder="Select Currency"
              disabled={isViewMode || Boolean(editingCompany)}
              required
            />
            <Select
              label="Time Zone"
              value={formData.timeZone}
              onChange={(v) => handleSelect("timeZone", v)}
              options={timeZones}
              placeholder="Select Time Zone"
              disabled={isViewMode}
              required
            />
            <Input
              label="Balance Alert Amount"
              name="balanceAlertAmount"
              type="number"
              value={formData.balanceAlertAmount}
              onChange={handleChange}
              placeholder="500.00"
              disabled={isViewMode}
              required
            />

            <Input
              label="Reference Number"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleChange}
              placeholder="REF-2024-001"
              disabled={isViewMode}
            />

            {isViewMode && (
              <>
                <Input
                  label="Customer Credit Limit"
                  name="customerCreditLimit"
                  type="number"
                  value={formData.customerCreditLimit}
                  onChange={handleChange}
                  placeholder="5000.00"
                  disabled
                />
                <Input
                  label="Vendor Credit Limit"
                  name="vendorCreditLimit"
                  type="number"
                  value={formData.vendorCreditLimit}
                  onChange={handleChange}
                  placeholder="10000.00"
                  disabled
                />
                <Input
                  label="Used Customer Credit"
                  name="usedCustomerCredit"
                  type="number"
                  value={formData.usedCustomerCredit}
                  onChange={handleChange}
                  placeholder="500.00"
                  disabled
                />
                <Input
                  label="Used Vendor Credit"
                  name="usedVendorCredit"
                  type="number"
                  value={formData.usedVendorCredit}
                  onChange={handleChange}
                  placeholder="500.00"
                  disabled
                />
              </>
            )}
          </div>
        </fieldset>

        {/* Address */}
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Address
          </legend>
          <TextArea
            label="Full Address"
            name="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder=""
            disabled={isViewMode}
            required
          />
        </fieldset>

         {/* Policies */}
        {/* <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Policies & Settings
          </legend> */}

        {/* ⚡️ FIX: Added specific scoped label classes to force alignment baseline */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-start [&_label]:min-h-[32px] [&_label]:flex [&_label]:items-end">
            <Select
              label="Validity Period"
              value={formData.validityPeriod}
              onChange={(v) => handleSelect("validityPeriod", v)}
              options={[
                { label: "Limited", value: "LTD" },
                { label: "Unlimited", value: "UNL" },
              ]}
              placeholder="Select Validity Period"
              disabled={isViewMode}
            />
            <Select
              label="Default Email"
              value={formData.defaultEmail}
              onChange={(v) => handleSelect("defaultEmail", v)}
              options={[
                { label: "Company", value: "CMP" },
                { label: "Support", value: "SUP" },
              ]}
              placeholder="Select Default Email"
              disabled={isViewMode}
            />
          </div> */}

        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ToggleSwitch
              label="Online Payment"
              checked={formData.onlinePayment}
              onChange={(v) => handleToggle("onlinePayment", v)}
            />
            <ToggleSwitch
              label="Company Blocked"
              checked={formData.companyBlocked}
              onChange={(v) => handleToggle("companyBlocked", v)}
            />
            <ToggleSwitch
              label="Allow Whitelisted Cards"
              checked={formData.allowWhiteListedCards}
              onChange={(v) => handleToggle("allowWhiteListedCards", v)}
            />
            <ToggleSwitch
              label="Send Daily Reports"
              checked={formData.sendDailyReports}
              onChange={(v) => handleToggle("sendDailyReports", v)}
            />
            <ToggleSwitch
              label="Allow Netting"
              checked={formData.allowNetting}
              onChange={(v) => handleToggle("allowNetting", v)}
            />
            <ToggleSwitch
              label="Show HLR API"
              checked={formData.showHlrApi}
              onChange={(v) => handleToggle("showHlrApi", v)}
            />
            <ToggleSwitch
              label="Enable Vendor Panel"
              checked={formData.enableVendorPanel}
              onChange={(v) => handleToggle("enableVendorPanel", v)}
            /> */}
        {/* </div> */}
        {/* </fieldset> */}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving"
                : editingCompany
                  ? "Save Changes"
                  : "Add Company"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CompanyModal;