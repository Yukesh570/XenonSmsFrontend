import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  createCustomerRateApi,
  updateCustomerRateApi,
  type CustomerRateData,
} from "../../../api/rateApi/customerRateApi";
import { getCountriesApi } from "../../../api/settingApi/countryApi/countryApi";
import {
  getOperatorNetworkCodelookupApi,
  getOperatorNetworkCodesApi,
} from "../../../api/operatorNetworkCodeApi/operatorNetworkCodeApi";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import { CountryFlag } from "../../ui/CountryFlag";
import TextArea from "../../ui/TextArea";
import CustomDatePicker from "../../ui/DatePicker";
import ToggleSwitch from "../../ui/ToggleSwitch";
import MultiSelectDropdown from "../../ui/MultiSelectDropdown";

interface CustomerRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (isBulkUpgrade?: boolean) => void;
  moduleName: string;
  editingRate: CustomerRateData | null;
  isViewMode?: boolean;
  rateGroupId?: number | null;
}

interface Option {
  label: string;
  value: string;
  displayLabel?: string;
  icon?: React.ReactNode;
}

interface CountryData {
  id: number;
  name: string;
  countryCode: string;
  iso2: string;
  region: string;
  subRegion: string;
}

export const CustomerRateModal: React.FC<CustomerRateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingRate,
  isViewMode = false,
  rateGroupId,
}) => {
  const [formData, setFormData] = useState({
    country: "",
    MCC: "",
    MNC: "",
    network: "",
    countryCode: "",
    rate: "",
    remark: "",
    status: "ACTIVE",
    version: "0",
  });

  const [effectiveFromDate, setEffectiveFromDate] = useState<Date | null>(new Date());
  const [effectiveToDate, setEffectiveToDate] = useState<Date | null>(null);

  // Track whether user manually picked a custom date in the DatePicker
  const [hasUserSelectedCustomDate, setHasUserSelectedCustomDate] = useState(false);
  const [applyForAll, setApplyForAll] = useState(false);

  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [fullCountriesList, setFullCountriesList] = useState<CountryData[]>([]);
  const [mccOptions, setMccOptions] = useState<Option[]>([]);
  const [mncOptions, setMncOptions] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions: Option[] = [
    { label: "DRAFT", value: "DRAFT" },
    { label: "ACTIVE", value: "ACTIVE" },
    { label: "EXPIRED", value: "EXPIRED" },
  ];

  useEffect(() => {
    if (isOpen) {
      getCountriesApi("country", 1, 1000).then((res: any) => {
        const list = res.results || (Array.isArray(res) ? res : []);
        setFullCountriesList(list);
        setCountryOptions(
          list.map((c: any) => ({
            label: c.name,
            value: String(c.id),
            ...(c.iso2 ? { icon: <CountryFlag iso2={c.iso2} /> } : {})
          }))
        );
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.country && fullCountriesList.length > 0) {
      setMccOptions([]);
      setMncOptions([]);

      const selectedCountry = fullCountriesList.find(
        (c) => String(c.id) === formData.country
      );
      const countryNameParam = selectedCountry ? selectedCountry.name : "";

      getOperatorNetworkCodelookupApi(1, 1000, { country__name: countryNameParam })
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);

          const uniqueMccs = Array.from(new Set(list.map((item: any) => item.MCC))).filter(Boolean);
          setMccOptions(uniqueMccs.map((mcc) => ({ label: String(mcc), value: String(mcc) })));

          const mncMap = new Map<string, string>();
          list.forEach((item: any) => {
            const mncStr = String(item.MNC || "").trim();
            if (mncStr && !mncMap.has(mncStr)) {
              const operatorName = String(item.operator || item.operatorName || "").trim();
              const label = operatorName ? `${mncStr} (${operatorName})` : mncStr;
              mncMap.set(mncStr, label);
            }
          });

          const formattedMncOptions: Option[] = Array.from(mncMap.entries()).map(([value, label]) => ({
            label,               // Shown in dropdown list e.g. "1 (Afghan Wireless Communication Company)"
            value,               // Form state & API value e.g. "1"
            displayLabel: value, // Shown in closed input box e.g. "1"
          }));

          setMncOptions(formattedMncOptions);

          setFormData((prev) => ({
            ...prev,
            MCC: uniqueMccs.length === 1 ? String(uniqueMccs[0]) : prev.MCC,
            MNC: formattedMncOptions.length === 1 ? String(formattedMncOptions[0].value) : prev.MNC,
          }));
        })
        .catch(console.error);
    } else {
      setMccOptions([]);
      setMncOptions([]);
    }
  }, [formData.country, fullCountriesList]);

  useEffect(() => {
    if (formData.country && formData.MCC && formData.MNC && fullCountriesList.length > 0) {
      const selectedCountry = fullCountriesList.find(
        (c) => String(c.id) === formData.country
      );
      const countryNameParam = selectedCountry ? selectedCountry.name : "";

      if (formData.MNC.includes(",")) {
        setFormData((prev) => ({ ...prev, network: "Multiple" }));
      } else {
        getOperatorNetworkCodesApi("operatorNetworkCode", 1, 10, {
          country__name: countryNameParam,
          MCC: formData.MCC,
          MNC: formData.MNC,
        })
          .then((res: any) => {
            const list = res.results || (Array.isArray(res) ? res : []);
            const match = list[0];
            if (match?.operator) {
              setFormData((prev) => ({ ...prev, network: match.operator }));
            }
          })
          .catch(console.error);
      }
    }
  }, [formData.country, formData.MCC, formData.MNC, fullCountriesList]);

  // Handle Date Initialization on Modal Open
  useEffect(() => {
    if (isOpen) {
      setHasUserSelectedCustomDate(false);

      if (editingRate) {
        setFormData({
          country: String(editingRate.country || ""),
          MCC: String(editingRate.MCC || ""),
          MNC: String(editingRate.MNC || ""),
          network: String(editingRate.network || ""),
          countryCode: String(editingRate.countryCode || ""),
          rate: String(editingRate.rate || ""),
          remark: editingRate.remark || "",
          status: editingRate.status || "ACTIVE",
          version: String(editingRate.version ?? "0"),
        });

        if (isViewMode) {
          // View Mode: Display the actual historical date
          if (editingRate.effectiveFrom) {
            const d = new Date(editingRate.effectiveFrom);
            setEffectiveFromDate(!isNaN(d.getTime()) ? d : new Date());
          } else {
            setEffectiveFromDate(new Date());
          }
        } else {
          // Edit/Upgrade Mode: Default to current live date/time
          setEffectiveFromDate(new Date());
        }

        if (editingRate.effectiveTo) {
          const d = new Date(editingRate.effectiveTo);
          setEffectiveToDate(!isNaN(d.getTime()) ? d : null);
        } else {
          setEffectiveToDate(null);
        }
      } else {
        // Create Mode: Default to current date/time
        setFormData({
          country: "",
          MCC: "",
          MNC: "",
          network: "",
          countryCode: "",
          rate: "",
          remark: "",
          status: "ACTIVE",
          version: "0",
        });
        setEffectiveFromDate(new Date());
        setEffectiveToDate(null);
      }
    }
  }, [isOpen, editingRate, isViewMode]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "MCC" || name === "MNC") {
      setFormData({ ...formData, [name]: value, network: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelect = (name: string, value: string) => {
    if (name === "country") {
      if (!value) {
        setFormData({
          ...formData,
          country: "",
          countryCode: "",
          MCC: "",
          MNC: "",
          network: "",
        });
        return;
      }

      const selectedCountry = fullCountriesList.find(
        (c) => String(c.id) === value
      );

      setFormData({
        ...formData,
        [name]: value,
        countryCode: selectedCountry?.countryCode
          ? String(selectedCountry.countryCode)
          : "",
        MCC: "",
        MNC: "",
        network: "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    const isEditMode = !!editingRate;

    if (isEditMode) {
      if (!formData.rate.trim()) {
        toast.error("Rate is required.");
        return;
      }
    } else {
      if (!formData.country.trim()) {
        toast.error("Country is required.");
        return;
      }
      if (!formData.countryCode.trim()) {
        toast.error("Country Code is required.");
        return;
      }
      if (!formData.MCC) {
        toast.error("MCC is required.");
        return;
      }
      if (!formData.MNC) {
        toast.error("MNC is required.");
        return;
      }
      if (!formData.rate) {
        toast.error("Rate is required.");
        return;
      }
    }

    setIsSubmitting(true);

    // Calculate live submission timestamp dynamically
    const submissionTimestamp = new Date().toISOString();
    const finalEffectiveFrom =
      hasUserSelectedCustomDate && effectiveFromDate
        ? effectiveFromDate.toISOString()
        : submissionTimestamp;

    let payload: any;

    if (isEditMode) {
      payload = {
        rate: Number(formData.rate),
        status: formData.status,
        effectiveFrom: finalEffectiveFrom,
      };
      if (applyForAll) {
        payload.applyForAll = true;
      }
    } else {
      payload = {
        country: Number(formData.country),
        MCC: Number(formData.MCC),
        rate: Number(formData.rate),
        effectiveFrom: finalEffectiveFrom,
      };

      if (rateGroupId) {
        payload.rateGroup = Number(rateGroupId);
      } else if (editingRate && (editingRate as any).rateGroup) {
        payload.rateGroup = Number((editingRate as any).rateGroup);
      }

      if (formData.MNC) {
        payload.MNC = isNaN(Number(formData.MNC)) ? formData.MNC : Number(formData.MNC);
      }
      if (formData.network) payload.network = formData.network;

      if (formData.countryCode) payload.countryCode = Number(formData.countryCode);
      if (formData.status) payload.status = formData.status;
      if (formData.remark) payload.remark = formData.remark;
    }

    try {
      if (editingRate) {
        await updateCustomerRateApi(editingRate.id!, payload, moduleName);
        toast.success("Rate upgraded successfully!");
      } else {
        await createCustomerRateApi(payload, moduleName);
        toast.success("Rate plan created!");
      }
      onSuccess(isEditMode ? applyForAll : false);

      onClose();
    } catch (error: any) {
      console.error(error);
      const data = error.response?.data;
      let backendMessage = "";

      if (typeof data === "string") {
        backendMessage = data;
      } else if (data?.detail) {
        backendMessage = data.detail;
      } else if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        backendMessage = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }

      toast.error(backendMessage || "Failed to save rate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!editingRate && !isViewMode;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-6">
          <span>
            {isViewMode
              ? "View Customer Rate"
              : editingRate
                ? "Edit/Upgrade Customer Rate"
                : "Create Customer Rate"}
          </span>
          {editingRate && !isViewMode && (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <ToggleSwitch
                label="Apply for all"
                checked={applyForAll}
                onChange={setApplyForAll}
              />
            </div>
          )}
        </div>
      }
      className="max-w-4xl"
    >
      {!isEditMode && !isViewMode && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
          <span className="font-semibold">Note:</span> MCC and MNC options are
          loaded based on the selected country. Please select a country first to
          enable them.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {!isEditMode && (
            <>
              <Input
                label="Version"
                name="version"
                type="number"
                value={formData.version}
                onChange={handleChange}
                placeholder="0"
                disabled={true}
              />
              <Select
                label="Country"
                value={formData.country}
                onChange={(v) => handleSelect("country", v)}
                options={countryOptions}
                placeholder="Select Country"
                disabled={isViewMode}
                required
              />
              <Input
                label="Country Code"
                name="countryCode"
                type="number"
                value={formData.countryCode}
                onChange={handleChange}
                placeholder="977"
                disabled={isViewMode}
                required
              />
              <Select
                label="MCC"
                value={formData.MCC}
                onChange={(v) => handleSelect("MCC", v)}
                options={mccOptions}
                placeholder={
                  formData.country ? "Select MCC" : "Select Country First"
                }
                disabled={!formData.country || isViewMode}
                required
              />
              <MultiSelectDropdown
                label="MNC"
                selected={formData.MNC ? formData.MNC.split(',') : []}
                onChange={(selectedValues, clickedOption) => {
                  let newSelected = [...selectedValues];
                  const allValues = mncOptions.map(opt => String(opt.value));
                  const allOptionValue = allValues.find(v => v.toUpperCase() === "ALL");
                  const allNormalValues = allValues.filter(v => v !== allOptionValue);

                  if (clickedOption && clickedOption.value.toUpperCase() === "ALL") {
                    if (selectedValues.includes(clickedOption.value)) {
                      newSelected = allValues;
                    } else {
                      newSelected = [];
                    }
                  } else if (clickedOption && allOptionValue) {
                    if (selectedValues.includes(clickedOption.value)) {
                      const hasAllNormal = allNormalValues.every(v => selectedValues.includes(v));
                      if (hasAllNormal && !selectedValues.includes(allOptionValue)) {
                        newSelected.push(allOptionValue);
                      }
                    } else {
                      newSelected = selectedValues.filter(v => v !== allOptionValue);
                    }
                  }
                  handleSelect("MNC", newSelected.join(','));
                }}
                options={mncOptions}
                placeholder={
                  formData.country ? "Select MNC" : "Select Country First"
                }
                disabled={!formData.country || isViewMode}
              />
            </>
          )}
          <Input
            label="Rate"
            name="rate"
            type="number"
            step="0.0001"
            value={formData.rate}
            onChange={handleChange}
            placeholder="0.0000"
            required
            disabled={isViewMode}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(v) => handleSelect("status", v)}
            options={statusOptions}
            placeholder="Select Status"
            disabled={isViewMode}
          />
          <CustomDatePicker
            label="Effective From"
            selected={effectiveFromDate}
            onChange={(date) => {
              setEffectiveFromDate(date);
              setHasUserSelectedCustomDate(true);
            }}
            showTimeSelect
            disabled={isViewMode}
            placeholder="Select Date & Time"
            isClearable
          />
          {!isEditMode && editingRate && (
            <CustomDatePicker
              label="Effective To"
              selected={effectiveToDate}
              onChange={() => { }}
              showTimeSelect
              disabled={true}
              placeholder="-"
            />
          )}
        </div>

        {!isEditMode && (
          <TextArea
            label="Remark"
            name="remark"
            value={formData.remark}
            onChange={handleChange}
            disabled={isViewMode}
            rows={2}
            placeholder="Optional remarks"
          />
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving"
                : editingRate
                  ? "Upgrade/Save Details"
                  : "Create Rate"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};