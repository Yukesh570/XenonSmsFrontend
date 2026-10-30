import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { CountryFlag } from "../../ui/CountryFlag";
import Select from "../../ui/Select";
import { RatesHoverDropdown } from "../../ui/RatesHoverDropdown";
import { getMncMarginInfo } from "./SubRouteTableModal";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "../../ui/MultiSelectDropdown";
import {
  createCustomRouteApi,
  updateCustomRouteApi,
  updateRouteGroupApi,
  createRouteGroupApi,
  getCustomRoutesApi,
  type CustomRouteData,
} from "../../../api/routeManagerApi/customRouteApi";
import { getClientsApi } from "../../../api/clientApi/clientApi";
import { findCustomerRateApi } from "../../../api/rateApi/customerRateApi";
import { findVendorRateApi } from "../../../api/rateApi/vendorRateApi";
import { getCountriesApi } from "../../../api/settingApi/countryApi/countryApi";
import { getVendorsApi } from "../../../api/connectivityApi/vendorApi";
import {
  getOperatorNetworkCodelookupApi,
  getOperatorNetworkCodesApi,
} from "../../../api/operatorNetworkCodeApi/operatorNetworkCodeApi";

interface CustomRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdGroup?: any) => void;
  moduleName: string;
  editingRoute: CustomRouteData | null;
  isViewMode?: boolean;
  lockedName?: string;
  isEditingGroupStatus?: boolean;
  groupData?: any;
  isCreatingGroup?: boolean;
  isFirstRoute?: boolean;
  allowedCountryIds?: string[];
}

interface CountryData {
  id?: number;
  name: string;
  countryCode: string;
  iso2: string;
  region: string;
  subRegion: string;
}

export const CustomRouteModal: React.FC<CustomRouteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingRoute,
  isViewMode = false,
  lockedName,
  isEditingGroupStatus = false,
  groupData = null,
  isCreatingGroup = false,
  isFirstRoute = false,
  allowedCountryIds,
}) => {
  const [formData, setFormData] = useState<any>({
    name: "",
    routingType: "PRIORITY",
    priority: "",
    status: "ACTIVE",
    country: 0,
    MCC: [],
    MNC: [],
    network: "",
    terminatingVendor: 0,
  });

  const [countryOptions, setCountryOptions] = useState<MultiSelectOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<MultiSelectOption[]>([]);
  const [mccOptions, setMccOptions] = useState<MultiSelectOption[]>([]);
  const [mncOptions, setMncOptions] = useState<MultiSelectOption[]>([]);

  const [fullCountriesList, setFullCountriesList] = useState<CountryData[]>([]);
  const [fullNetworkList, setFullNetworkList] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(false);

  // Dynamic Rate States
  const [dynamicCustomerRate, setDynamicCustomerRate] = useState<string | null>(null);
  const [dynamicCustomerRateBase, setDynamicCustomerRateBase] = useState<number | null>(null);
  const [dynamicCustomerCurrency, setDynamicCustomerCurrency] = useState<string | null>(null);
  const [dynamicAllCustomerRates, setDynamicAllCustomerRates] = useState<any[] | null>(null);

  const [dynamicVendorRate, setDynamicVendorRate] = useState<string | null>(null);
  const [dynamicVendorRateBase, setDynamicVendorRateBase] = useState<number | null>(null);
  const [dynamicVendorCurrency, setDynamicVendorCurrency] = useState<string | null>(null);
  const [dynamicAllVendorRates, setDynamicAllVendorRates] = useState<any[] | null>(null);

  const [dynamicBaseCurrency, setDynamicBaseCurrency] = useState<string | null>(null);
  const [selectedRateMnc, setSelectedRateMnc] = useState<string | null>(null);

  const isFieldDisabled = isViewMode || isEditingGroupStatus;

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const extractOptions = (
    response: any,
    labelKey: string = "name",
    isCountry = false
  ): MultiSelectOption[] => {
    let data: any[] = [];
    if (response && response.results) {
      data = response.results;
    } else if (Array.isArray(response)) {
      data = response;
    } else if (response && Array.isArray(response.data)) {
      data = response.data;
    }
    return data.map((item: any) => ({
      label: item[labelKey] || item.name || "Unknown",
      value: String(item.id),
      ...(isCountry && item.iso2 ? { icon: <CountryFlag iso2={item.iso2} /> } : {})
    }));
  };

  useEffect(() => {
    if (isOpen && !isEditingGroupStatus && !isCreatingGroup) {
      setIsFetchingOptions(true);
      const fetchAllOptions = async () => {
        try {
          const [, countries, vendors] = await Promise.all([
            getClientsApi("client", 1, 1000),
            getCountriesApi("country", 1, 1000),
            getVendorsApi("vendor", 1, 1000),
          ]);

          const fullList =
            countries.results ||
            (Array.isArray(countries) ? countries : (countries as any).data) ||
            [];
          setFullCountriesList(fullList);

          const allCountryOptions = extractOptions(countries, "name", true);
          const filteredCountryOptions =
            allowedCountryIds && allowedCountryIds.length > 0
              ? allCountryOptions.filter((o) => allowedCountryIds.includes(o.value))
              : allCountryOptions;
          setCountryOptions(filteredCountryOptions);

          if (filteredCountryOptions.length === 1) {
            setFormData((prev: any) => ({
              ...prev,
              country: Number(filteredCountryOptions[0].value),
            }));
          }

          setVendorOptions(extractOptions(vendors, "profileName"));
        } catch (error) {
          console.error("Failed to load dropdown options", error);
          toast.error("Could not load form options.");
        } finally {
          setIsFetchingOptions(false);
        }
      };
      fetchAllOptions();
    }
  }, [isOpen, isEditingGroupStatus, isCreatingGroup]);

  useEffect(() => {
    if (
      !isEditingGroupStatus &&
      !isCreatingGroup &&
      formData.country &&
      fullCountriesList.length > 0
    ) {
      const selectedCountry = fullCountriesList.find(
        (c) => String(c.id) === String(formData.country),
      );
      const countryNameParam = selectedCountry ? selectedCountry.name : "";

      getOperatorNetworkCodelookupApi(1, 1000, {
        country__name: countryNameParam,
      })
        .then((res: any) => {
          const list = res.results || (Array.isArray(res) ? res : []);
          setFullNetworkList(list);

          const uniqueMccs = Array.from(
            new Set(list.map((item: any) => String(item.MCC))),
          ).filter(Boolean);
          const mccOpts: MultiSelectOption[] = [];

          if (uniqueMccs.length > 1) {
            mccOpts.push({
              label: "All MCCs",
              value: "ALL_MCC",
              isAll: true,
              isUiOnly: true,
            });
          }
          uniqueMccs.forEach((mcc) =>
            mccOpts.push({
              label: String(mcc),
              value: String(mcc),
              isAll: false,
              isUiOnly: false,
            }),
          );

          setMccOptions(mccOpts);

          if (uniqueMccs.length === 1 && formData.MCC.length === 0) {
            setFormData((prev: any) => ({
              ...prev,
              MCC: [String(uniqueMccs[0])],
            }));
          }
        })
        .catch(console.error);
    } else if (!isEditingGroupStatus) {
      setFullNetworkList([]);
      setMccOptions([]);
      setMncOptions([]);
    }
  }, [formData.country, fullCountriesList, isEditingGroupStatus, isCreatingGroup]);

  useEffect(() => {
    if (
      !isEditingGroupStatus &&
      !isCreatingGroup &&
      formData.MCC &&
      formData.MCC.length > 0 &&
      fullNetworkList.length > 0
    ) {
      const newMncOptions: MultiSelectOption[] = [];
      let groupIdx = 0;

      formData.MCC.forEach((mcc: string) => {
        if (mcc === "ALL_MCC") return;

        const specificMncs = fullNetworkList.filter(
          (n) => String(n.MCC) === mcc,
        );
        const uniqueMncs = Array.from(
          new Set(specificMncs.map((n) => String(n.MNC))),
        ).filter(Boolean);

        if (uniqueMncs.length > 0) {
          const dbAllMnc = uniqueMncs.find(
            (m) => m.toLowerCase() === "all" || m.toLowerCase() === "in rest",
          );

          if (dbAllMnc) {
            newMncOptions.push({
              label: dbAllMnc,
              value: `${mcc}(${dbAllMnc})`,
              isAll: true,
              isUiOnly: false,
              groupIndex: groupIdx,
            });
          } else if (uniqueMncs.length > 1) {
            newMncOptions.push({
              label: "All",
              value: `${mcc}(All)`,
              isAll: true,
              isUiOnly: true,
              groupIndex: groupIdx,
            });
          }

          uniqueMncs.forEach((mnc) => {
            if (mnc !== dbAllMnc) {
              const labelText = `${mnc}`;

              newMncOptions.push({
                label: labelText,
                value: `${mcc}(${mnc})`,
                isAll: false,
                isUiOnly: false,
                groupIndex: groupIdx,
              });
            }
          });

          groupIdx++;
        }
      });
      setMncOptions(newMncOptions);
    } else if (!isEditingGroupStatus) {
      if (mncOptions.length > 0) {
        setMncOptions([]);
      }
      if (!editingRoute && !isViewMode) {
        if (formData.MNC && formData.MNC.length > 0) {
          setFormData((prev: any) => ({ ...prev, MNC: [] }));
        }
      }
    }
  }, [
    formData.MCC,
    fullNetworkList,
    editingRoute,
    isViewMode,
    isEditingGroupStatus,
    isCreatingGroup,
  ]);

  // AUTO-CALCULATE +1 PRIORITY FOR SPECIFIC MNC WHEN ADDING A ROUTE
  useEffect(() => {
    if (!editingRoute && !isViewMode && formData.country && formData.MCC.length === 1 && formData.MNC.length === 1 && (lockedName || formData.name)) {
      const cleanMcc = formData.MCC[0] === "ALL_MCC" ? "ALL" : formData.MCC[0];
      const cleanMnc = extractCleanMncString(formData.MNC);
      if (cleanMcc !== "ALL" && cleanMnc !== "ALL") {
        getCustomRoutesApi(moduleName, 1, 100, {
          country: formData.country,
          routeGroup__name: lockedName || formData.name,
          MCC: cleanMcc,
          MNC: cleanMnc,
        })
          .then((res: any) => {
            const list = res.results || (Array.isArray(res) ? res : []);
            const priorities = list.map((r: any) => Number(r.priority) || 0);
            const maxP = priorities.length > 0 ? Math.max(...priorities) : 0;
            setFormData((prev: any) => ({
              ...prev,
              priority: String(maxP + 1),
            }));
          })
          .catch(() => { });
      }
    }
  }, [formData.country, formData.MCC, formData.MNC, editingRoute, isViewMode, lockedName, formData.name, moduleName]);

  // Dynamic rate fetching
  useEffect(() => {
    if (editingRoute) {
      const allCust = (editingRoute as any).allCustomerRates && (editingRoute as any).allCustomerRates.length > 1
        ? (editingRoute as any).allCustomerRates
        : null;
      const allVend = (editingRoute as any).allVendorRates && (editingRoute as any).allVendorRates.length > 1
        ? (editingRoute as any).allVendorRates
        : null;

      setDynamicAllCustomerRates(allCust);
      setDynamicCustomerRate(allCust ? "Multiple Rates" : ((editingRoute as any).customerRate ? String((editingRoute as any).customerRate) : null));

      setDynamicAllVendorRates(allVend);
      setDynamicVendorRate(allVend ? "Multiple Rates" : ((editingRoute as any).vendorRate ? String((editingRoute as any).vendorRate) : null));

      setDynamicCustomerCurrency((editingRoute as any).clientCurrencyCode || (editingRoute as any).customerCurrencyCode || null);
      setDynamicVendorCurrency((editingRoute as any).vendorCurrencyCode || null);
      setDynamicBaseCurrency((editingRoute as any).baseCurrencyCode || null);
      setDynamicCustomerRateBase((editingRoute as any).customerRateBase ?? null);
      setDynamicVendorRateBase((editingRoute as any).vendorRateBase ?? null);

      return;
    }

    if (editingRoute && formData.MCC?.length > 0 && formData.MNC?.length > 0) {
      const fetchDynamicRates = async () => {
        try {
          const mcc = formData.MCC[0] === "ALL_MCC" ? "ALL" : formData.MCC[0];
          const cleanMnc = extractCleanMncString(formData.MNC);
          const routeName = (lockedName || formData.name) as string;

          // Customer Rate
          try {
            const custRes = await findCustomerRateApi({
              routeGroupName: routeName,
              MCC: mcc,
              MNC: cleanMnc,
            });
            const custResults = custRes.results || (Array.isArray(custRes) ? custRes : []);
            if (custResults.length > 1) {
              setDynamicAllCustomerRates(custResults.map((r: any) => ({ MNC: r.MNC || r.mnc || cleanMnc, rate: r.rate })));
              setDynamicCustomerRate("Multiple Rates");
              setDynamicCustomerRateBase(null);
              setDynamicCustomerCurrency(custResults[0].currencyCode ?? null);
              setDynamicBaseCurrency(custResults[0].baseCurrencyCode ?? null);
            } else if (custResults.length === 1) {
              setDynamicAllCustomerRates(null);
              setDynamicCustomerRate(String(custResults[0].rate));
              setDynamicCustomerRateBase(custResults[0].rateBase ?? null);
              setDynamicCustomerCurrency(custResults[0].currencyCode ?? null);
              setDynamicBaseCurrency(custResults[0].baseCurrencyCode ?? null);
            } else {
              if ((editingRoute as any)?.allCustomerRates && (editingRoute as any).allCustomerRates.length > 1) {
                setDynamicAllCustomerRates((editingRoute as any).allCustomerRates);
                setDynamicCustomerRate("Multiple Rates");
                setDynamicCustomerRateBase(null);
                setDynamicCustomerCurrency((editingRoute as any).clientCurrencyCode || (editingRoute as any).customerCurrencyCode || null);
              } else {
                setDynamicAllCustomerRates(null);
                setDynamicCustomerRate("N/A");
                setDynamicCustomerRateBase(null);
              }
            }
          } catch {
            if ((editingRoute as any)?.allCustomerRates && (editingRoute as any).allCustomerRates.length > 1) {
              setDynamicAllCustomerRates((editingRoute as any).allCustomerRates);
              setDynamicCustomerRate("Multiple Rates");
              setDynamicCustomerRateBase(null);
              setDynamicCustomerCurrency((editingRoute as any).clientCurrencyCode || (editingRoute as any).customerCurrencyCode || null);
            } else {
              setDynamicAllCustomerRates(null);
              setDynamicCustomerRate("Error");
              setDynamicCustomerRateBase(null);
            }
          }

          // Vendor Rate
          if (formData.terminatingVendor) {
            try {
              const vendRes = await findVendorRateApi({
                terminatingVendor: formData.terminatingVendor,
                MCC: mcc,
                MNC: cleanMnc,
              });
              const vendResults = vendRes.results || (Array.isArray(vendRes) ? vendRes : []);
              if (vendResults.length > 1) {
                setDynamicAllVendorRates(vendResults.map((r: any) => ({ MNC: r.MNC || r.mnc || cleanMnc, rate: r.rate })));
                setDynamicVendorRate("Multiple Rates");
                setDynamicVendorRateBase(null);
                setDynamicVendorCurrency(vendResults[0].currencyCode ?? null);
                setDynamicBaseCurrency((prev) => prev || (vendResults[0].baseCurrencyCode ?? null));
              } else if (vendResults.length === 1) {
                setDynamicAllVendorRates(null);
                setDynamicVendorRate(String(vendResults[0].rate));
                setDynamicVendorRateBase(vendResults[0].rateBase ?? null);
                setDynamicVendorCurrency(vendResults[0].currencyCode ?? null);
                setDynamicBaseCurrency((prev) => prev || (vendResults[0].baseCurrencyCode ?? null));
              } else {
                if ((editingRoute as any)?.allVendorRates && (editingRoute as any).allVendorRates.length > 1) {
                  setDynamicAllVendorRates((editingRoute as any).allVendorRates);
                  setDynamicVendorRate("Multiple Rates");
                  setDynamicVendorRateBase(null);
                  setDynamicVendorCurrency((editingRoute as any).vendorCurrencyCode || null);
                } else {
                  setDynamicAllVendorRates(null);
                  setDynamicVendorRate("N/A");
                  setDynamicVendorRateBase(null);
                }
              }
            } catch {
              if ((editingRoute as any)?.allVendorRates && (editingRoute as any).allVendorRates.length > 1) {
                setDynamicAllVendorRates((editingRoute as any).allVendorRates);
                setDynamicVendorRate("Multiple Rates");
                setDynamicVendorRateBase(null);
                setDynamicVendorCurrency((editingRoute as any).vendorCurrencyCode || null);
              } else {
                setDynamicAllVendorRates(null);
                setDynamicVendorRate("Error");
                setDynamicVendorRateBase(null);
              }
            }
          } else {
            setDynamicAllVendorRates(null);
            setDynamicVendorRate(null);
            setDynamicVendorRateBase(null);
          }
        } catch (err) {
          console.error("Error fetching dynamic rates", err);
        }
      };

      fetchDynamicRates();
    } else if (editingRoute) {
      setDynamicCustomerRate((editingRoute as any).customerRate ?? null);
      setDynamicCustomerRateBase((editingRoute as any).customerRateBase ?? null);
      setDynamicCustomerCurrency((editingRoute as any).clientCurrencyCode ?? (editingRoute as any).customerCurrencyCode ?? null);
      setDynamicAllCustomerRates((editingRoute as any).allCustomerRates && (editingRoute as any).allCustomerRates.length > 1 ? (editingRoute as any).allCustomerRates : null);

      setDynamicVendorRate((editingRoute as any).vendorRate ?? null);
      setDynamicVendorRateBase((editingRoute as any).vendorRateBase ?? null);
      setDynamicVendorCurrency((editingRoute as any).vendorCurrencyCode ?? null);
      setDynamicAllVendorRates((editingRoute as any).allVendorRates && (editingRoute as any).allVendorRates.length > 1 ? (editingRoute as any).allVendorRates : null);

      setDynamicBaseCurrency((editingRoute as any).baseCurrencyCode ?? null);
    }
  }, [formData.terminatingVendor, formData.MCC, formData.MNC, formData.name, lockedName, editingRoute]);

  useEffect(() => {
    setSelectedRateMnc(null);
    if (isOpen) {
      if (isCreatingGroup) {
        setFormData({
          name: "",
          status: "ACTIVE"
        });
      } else if (isEditingGroupStatus && groupData) {
        setFormData({
          name: groupData.name || groupData.routeGroup__name || "",
          priority: "",
          status: groupData.status || "ACTIVE",
          country: 0,
          MCC: [],
          MNC: [],
          network: "",
          terminatingVendor: 0,
        });
      } else if (editingRoute) {
        const parseArrayField = (val: any): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val.map((v) => String(v).trim());

          if (typeof val === "string") {
            let cleaned = val.trim();
            if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
              try {
                const parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed))
                  return parsed.map((v) => String(v).trim());
              } catch (e) {
                cleaned = cleaned.replace(/^\[|\]$/g, "").replace(/['"]/g, "");
              }
            }
            return cleaned
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
          }
          return [String(val).trim()];
        };

        const parsedMcc = parseArrayField((editingRoute as any).MCC);
        let parsedMnc = parseArrayField((editingRoute as any).MNC);

        parsedMnc = parsedMnc.map((m: string) => {
          if (m.includes("(")) return m;
          if (parsedMcc.length === 1) return `${parsedMcc[0]}(${m})`;
          return m;
        });

        setFormData({
          name: editingRoute.name || "",
          priority: editingRoute.priority != null ? String(editingRoute.priority) : "1",
          status: editingRoute.status || "ACTIVE",
          country: editingRoute.country || 0,
          MCC: parsedMcc,
          MNC: parsedMnc,
          network: editingRoute.network || "",
          terminatingVendor: editingRoute.terminatingVendor || 0,
        });

        const initAllCust = (editingRoute as any).allCustomerRates && (editingRoute as any).allCustomerRates.length > 1 ? (editingRoute as any).allCustomerRates : null;
        const initAllVend = (editingRoute as any).allVendorRates && (editingRoute as any).allVendorRates.length > 1 ? (editingRoute as any).allVendorRates : null;
        setDynamicAllCustomerRates(initAllCust);
        setDynamicAllVendorRates(initAllVend);
        setDynamicCustomerRate(initAllCust ? "Multiple Rates" : ((editingRoute as any).customerRate ? String((editingRoute as any).customerRate) : null));
        setDynamicVendorRate(initAllVend ? "Multiple Rates" : ((editingRoute as any).vendorRate ? String((editingRoute as any).vendorRate) : null));
        setDynamicCustomerCurrency((editingRoute as any).clientCurrencyCode || (editingRoute as any).customerCurrencyCode || null);
        setDynamicVendorCurrency((editingRoute as any).vendorCurrencyCode || null);
        setDynamicBaseCurrency((editingRoute as any).baseCurrencyCode || null);
        setDynamicCustomerRateBase((editingRoute as any).customerRateBase ?? null);
        setDynamicVendorRateBase((editingRoute as any).vendorRateBase ?? null);
      } else {
        setFormData({
          name: lockedName || "",
          priority: "1",
          status: "ACTIVE",
          country: 0,
          MCC: [],
          MNC: [],
          network: "",
          terminatingVendor: 0,
        });

        setDynamicAllCustomerRates(null);
        setDynamicAllVendorRates(null);
        setDynamicCustomerRate(null);
        setDynamicCustomerRateBase(null);
        setDynamicCustomerCurrency(null);
        setDynamicVendorRate(null);
        setDynamicVendorRateBase(null);
        setDynamicVendorCurrency(null);
        setDynamicBaseCurrency(null);
      }
    }
  }, [isOpen, editingRoute, lockedName, isEditingGroupStatus, groupData, isCreatingGroup]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    const isNumericField = !["priority", "status", "MCC", "MNC"].includes(name);

    setFormData((prev: any) => {
      const nextData = {
        ...prev,
        [name]: isNumericField ? Number(value) : value,
      };

      if (name === "country") {
        nextData.MCC = [];
        nextData.MNC = [];
        nextData.network = "";
      }

      return nextData;
    });
  };

  const handleMccChange = (selectedValues: string[], clickedOption?: any) => {
    if (clickedOption && clickedOption.value === "ALL_MCC") {
      const allMccValues = mccOptions
        .filter((o: MultiSelectOption) => !o.isUiOnly)
        .map((o: MultiSelectOption) => o.value);
      const isAllSelected =
        allMccValues.length > 0 &&
        allMccValues.every((v: string) => formData.MCC.includes(v));

      if (isAllSelected) {
        setFormData((prev: any) => ({ ...prev, MCC: [], MNC: [], network: "" }));
      } else {
        setFormData((prev: any) => ({ ...prev, MCC: allMccValues }));
      }
      return;
    }

    // const filteredMnc = formData.MNC.filter((mnc: string) => {
    //   const mccPrefix = mnc.split("(")[0].trim();
    //   return selectedValues.includes(mccPrefix);
    // });

    // const previousMccs: string[] = formData.MCC;
    // const newlyAddedMccs = selectedValues.filter((mcc: string) => !previousMccs.includes(mcc));

    setFormData((prev: any) => ({ ...prev, MCC: selectedValues, MNC: [], network: "" }));
  };

  const handleMncChange = (selectedValues: string[], clickedOption?: any) => {
    if (clickedOption) {
      if (formData.MNC.includes(clickedOption.value)) {
        setFormData((prev: any) => ({ ...prev, MNC: [] }));
      } else {
        setFormData((prev: any) => ({ ...prev, MNC: [clickedOption.value] }));
      }
      return;
    }
    setFormData((prev: any) => ({ ...prev, MNC: selectedValues.slice(-1) }));
  };

  const handleSelectAllMncExternal = () => {
    const allMccValues = mccOptions
      .filter((o: MultiSelectOption) => !o.isUiOnly)
      .map((o: MultiSelectOption) => o.value);

    const allIndividualMncs: string[] = [];

    allMccValues.forEach((mcc: string) => {
      const specificMncs = fullNetworkList.filter(
        (n) => String(n.MCC) === mcc,
      );
      const uniqueMncs = Array.from(
        new Set(specificMncs.map((n) => String(n.MNC))),
      ).filter(Boolean);

      uniqueMncs.forEach((mnc) => {
        const dbAllMnc = mnc.toLowerCase() === "all" || mnc.toLowerCase() === "in rest";
        if (!dbAllMnc) {
          allIndividualMncs.push(`${mcc}(${mnc})`);
        }
      });
    });

    setFormData((prev: any) => ({
      ...prev,
      MCC: [...allMccValues],
      MNC: [...allIndividualMncs]
    }));
  };

  const handleClearMncExternal = () => {
    setFormData((prev: any) => ({ ...prev, MCC: [], MNC: [], network: "" }));
  };

  const computeDisplayMnc = () => {
    const display = [...(formData.MNC || [])];

    (formData.MCC || []).forEach((mcc: string) => {
      if (mcc === "ALL_MCC") return;

      // const allTagOpt = mncOptions.find(
      //   (o: MultiSelectOption) => o.value.startsWith(`${mcc}(`) && o.isAll,
      // );
    });

    return Array.from(new Set(display));
  };

  useEffect(() => {
    if (formData.country && formData.MCC.length > 0 && formData.MNC.length > 0 && fullCountriesList.length > 0) {
      if (formData.MCC.length === 1 && formData.MNC.length === 1) {
        const selectedCountry = fullCountriesList.find(
          (c) => String(c.id) === String(formData.country)
        );
        const countryNameParam = selectedCountry ? selectedCountry.name : "";

        const cleanMnc = extractCleanMncString(formData.MNC);
        const cleanMcc = formData.MCC[0] === "ALL_MCC" ? "ALL" : formData.MCC[0];

        if (cleanMcc !== "ALL" && cleanMnc !== "ALL") {
          getOperatorNetworkCodesApi("operatorNetworkCode", 1, 10, {
            country__name: countryNameParam,
            MCC: cleanMcc,
            MNC: cleanMnc,
          })
            .then((res: any) => {
              const list = res.results || (Array.isArray(res) ? res : []);
              const match = list[0];
              if (match?.operator) {
                setFormData((prev: any) => ({ ...prev, network: match.operator }));
              }
            })
            .catch(console.error);
        }
      }
    }
  }, [formData.country, formData.MCC, formData.MNC, fullCountriesList]);

  const extractCleanMncString = (mncInput: any): string => {
    if (!mncInput) return "";
    let list: string[] = [];
    if (Array.isArray(mncInput)) {
      list = mncInput;
    } else if (typeof mncInput === "string") {
      list = [mncInput];
    } else {
      list = [String(mncInput)];
    }

    const cleaned = list.map((item) => {
      const str = String(item).trim();
      if (str.includes("(") && str.includes(")")) {
        const match = str.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return str;
    });

    return Array.from(new Set(cleaned.filter(Boolean))).join(",");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (isCreatingGroup) {
      if (!formData.name) {
        toast.error("Group Name is required.");
        return;
      }
      setIsSubmitting(true);
      try {
        const created = await createRouteGroupApi(
          { name: formData.name, status: formData.status },
          moduleName
        );
        toast.success("Route Group created successfully!");
        onSuccess(created);
        onClose();
      } catch (err: any) {
        console.error(err);
        const serverError = err.response?.data;
        if (serverError?.error) {
          toast.error(serverError.error);
        } else if (serverError && typeof serverError === "object") {
          Object.entries(serverError).forEach(([key, msgs]) => {
            const msg = Array.isArray(msgs) ? msgs[0] : msgs;
            toast.error(`${key}: ${msg}`);
          });
        } else {
          toast.error("Failed to create route group.");
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isEditingGroupStatus && groupData) {
      setIsSubmitting(true);
      try {
        await updateRouteGroupApi(
          groupData.id,
          { status: formData.status },
          moduleName,
        );
        toast.success("Route group updated successfully!");
        onSuccess();
        onClose();
      } catch (err) {
        toast.error("Failed to update route group status.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!formData.name) {
      toast.error("Name is required.");
      return;
    }
    if (!formData.country || formData.country === 0) {
      toast.error("Country is required.");
      return;
    }
    if (!formData.MCC || formData.MCC.length === 0) {
      toast.error("At least one MCC is required.");
      return;
    }
    if (!formData.MNC || formData.MNC.length === 0) {
      toast.error("At least one MNC is required.");
      return;
    }
    if (!formData.terminatingVendor || formData.terminatingVendor === 0) {
      toast.error("Terminating Vendor is required.");
      return;
    }
    if (!formData.priority) {
      toast.error("Priority is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: any = { ...formData };

    const allIndividualMncsAvailable = mncOptions.filter(o => !o.isAll && !o.isUiOnly).map(o => o.value);

    const isActuallyAllSelected = allIndividualMncsAvailable.length > 0 &&
      allIndividualMncsAvailable.every(mnc => formData.MNC.includes(mnc));

    const cleanMnc = extractCleanMncString(formData.MNC);

    if (isActuallyAllSelected) {
      delete payload.MCC;
      payload.MNC = "ALL";
    } else {
      payload.MCC = Array.isArray(formData.MCC)
        ? formData.MCC.filter((m: string) => m !== "ALL_MCC").join(",")
        : formData.MCC || "";

      payload.MNC = cleanMnc;
    }

    if (formData.network) {
      payload.network = formData.network;
    }

    if (lockedName) {
      if (!isNaN(Number(lockedName))) {
        payload.routeGroup = Number(lockedName);
      } else {
        delete payload.routeGroup;
      }
    }
    if (typeof payload.routeGroup === "string" && isNaN(Number(payload.routeGroup))) {
      delete payload.routeGroup;
    }

    try {
      if (editingRoute?.id) {
        await updateCustomRouteApi(editingRoute.id, payload, moduleName);
        toast.success("Route updated successfully!");
      } else {
        await createCustomRouteApi(payload, moduleName);
        toast.success("Route created successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;
      if (serverError && typeof serverError === "object") {
        Object.entries(serverError).forEach(([key, msgs]) => {
          const msg = Array.isArray(msgs) ? msgs[0] : msgs;
          toast.error(`${key}: ${msg}`);
        });
      } else {
        toast.error("Failed to save route. Please try again.");
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
        isCreatingGroup
          ? "Create Route Group"
          : isEditingGroupStatus
            ? "Edit Route Group Status"
            : isViewMode
              ? "View Custom Route"
              : editingRoute
                ? "Edit Custom Route"
                : lockedName
                  ? (isFirstRoute ? `Create Route in ${lockedName}` : `Add New Route to ${lockedName}`)
                  : "Create Custom Route"
      }
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-1">
        {isCreatingGroup ? (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              Route Group Info
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Group Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter Route Group Name"
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(v) => handleSelectChange("status", v)}
                options={statusOptions}
              />
            </div>
          </fieldset>
        ) : (
          <>
            <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-semibold text-primary px-2">
                Header Info
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {isEditingGroupStatus ? (
                  <Input
                    label="Route Group Name"
                    name="name"
                    value={formData.name}
                    onChange={() => { }}
                    disabled={true}
                  />
                ) : (
                  <Input
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Route Name"
                    required
                    disabled={isFieldDisabled || !!lockedName}
                  />
                )}

                {!isEditingGroupStatus && (
                  <Input
                    label="Priority"
                    name="priority"
                    type="number"
                    value={formData.priority}
                    onChange={handleChange}
                    placeholder="Priority (e.g. 1)"
                    disabled={isFieldDisabled}
                    min={1}
                  />
                )}

                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(v) => handleSelectChange("status", v)}
                  options={statusOptions}
                  disabled={isViewMode}
                />
              </div>
            </fieldset>

            {!isEditingGroupStatus && (
              <>
                <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-visible">
                  <legend className="text-sm font-semibold text-primary px-2">
                    {editingRoute || isFieldDisabled ? "Destination (Read Only)" : "Destination"}
                  </legend>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-3">
                      <Select
                        label="Country"
                        value={formData.country ? String(formData.country) : ""}
                        onChange={(v) => handleSelectChange("country", v)}
                        options={countryOptions}
                        placeholder="Select Country"
                        disabled={
                          isFieldDisabled || !!editingRoute || isFetchingOptions
                        }
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <MultiSelectDropdown
                        label="MCC"
                        options={mccOptions}
                        selected={formData.MCC}
                        onChange={handleMccChange}
                        disabled={
                          !formData.country ||
                          isFieldDisabled ||
                          !!editingRoute ||
                          isFetchingOptions
                        }
                        placeholder={
                          formData.country ? "Select MCC" : "Country First"
                        }
                      />
                    </div>

                    <div className="lg:col-span-6 flex items-end gap-3">
                      <div className="flex-1">
                        <MultiSelectDropdown
                          label="MNC"
                          options={mncOptions}
                          selected={computeDisplayMnc()}
                          onChange={handleMncChange}
                          disabled={
                            formData.MCC.length === 0 ||
                            isFieldDisabled ||
                            !!editingRoute ||
                            isFetchingOptions
                          }
                          placeholder={
                            formData.MCC.length > 0 ? "Select MNC" : "MCC First"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          label="Network"
                          name="network"
                          value={formData.network}
                          onChange={handleChange}
                          placeholder="NTC"
                          disabled={isViewMode}
                          isClearable={false}
                          readOnly
                        />
                      </div>
                      {!isFieldDisabled && !editingRoute && (
                        <div className="flex gap-2 mb-[2px]">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleSelectAllMncExternal}
                            className="px-3 py-[9px] text-xs shadow-sm"
                            disabled={!formData.country || isFetchingOptions}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClearMncExternal}
                            className="px-3 py-[9px] text-xs shadow-sm"
                            disabled={!formData.country || isFetchingOptions}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <legend className="text-sm font-semibold text-primary px-2">
                    Vendor Info
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Terminating Vendor"
                      value={
                        formData.terminatingVendor
                          ? String(formData.terminatingVendor)
                          : ""
                      }
                      onChange={(v) => handleSelectChange("terminatingVendor", v)}
                      options={vendorOptions}
                      placeholder="Select Vendor"
                      disabled={isFieldDisabled || isFetchingOptions}
                    />
                  </div>
                </fieldset>
              </>
            )}
          </>
        )}

        {!!editingRoute && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/30">
            <legend className="text-sm font-semibold text-primary px-2">
              Rates & Margins (Read Only)
            </legend>
            {(() => {
              const custRates = (dynamicAllCustomerRates && dynamicAllCustomerRates.length > 1)
                ? dynamicAllCustomerRates
                : ((editingRoute as any)?.allCustomerRates && (editingRoute as any).allCustomerRates.length > 1 ? (editingRoute as any).allCustomerRates : null);
              const vendRates = (dynamicAllVendorRates && dynamicAllVendorRates.length > 1)
                ? dynamicAllVendorRates
                : ((editingRoute as any)?.allVendorRates && (editingRoute as any).allVendorRates.length > 1 ? (editingRoute as any).allVendorRates : null);
              const custCurrency = dynamicCustomerCurrency || (editingRoute as any)?.clientCurrencyCode || (editingRoute as any)?.customerCurrencyCode || "";
              const vendCurrency = dynamicVendorCurrency || (editingRoute as any)?.vendorCurrencyCode || "";
              const hasMultipleRates = Boolean((custRates && custRates.length > 1) || (vendRates && vendRates.length > 1));
              const activeMncMargin = (hasMultipleRates && selectedRateMnc)
                ? getMncMarginInfo(editingRoute || {
                    allMargins: (editingRoute as any)?.allMargins,
                    allCustomerRates: custRates,
                    allVendorRates: vendRates,
                    customerRateBase: dynamicCustomerRateBase,
                    vendorRateBase: dynamicVendorRateBase,
                  }, selectedRateMnc)
                : null;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {custRates && custRates.length > 1 ? (
                    <div className="flex flex-col w-full">
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate">
                        Customer Rate
                      </label>
                      <div className="w-full h-[34px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1 flex items-center shadow-input">
                        <RatesHoverDropdown
                          title="All Customer Rates"
                          rates={custRates}
                          currencyCode={custCurrency}
                          baseCurrencyCode={dynamicBaseCurrency || (editingRoute as any)?.baseCurrencyCode}
                          allMargins={(editingRoute as any)?.allMargins}
                          selectedMnc={selectedRateMnc}
                          onSelectMnc={setSelectedRateMnc}
                        />
                      </div>
                    </div>
                  ) : (
                    <Input
                      label="Customer Rate"
                      name="customerRate"
                      onChange={() => { }}
                      value={dynamicCustomerRate ? `${dynamicCustomerRate} ${custCurrency}` : ((editingRoute as any)?.customerRate ? `${(editingRoute as any).customerRate} ${custCurrency}` : "—")}
                      disabled
                    />
                  )}

                  {vendRates && vendRates.length > 1 ? (
                    <div className="flex flex-col w-full">
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-gray-400 truncate">
                        Vendor Rate
                      </label>
                      <div className="w-full h-[34px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1 flex items-center shadow-input">
                        <RatesHoverDropdown
                          title="All Network Rates"
                          rates={vendRates}
                          currencyCode={vendCurrency}
                          baseCurrencyCode={dynamicBaseCurrency || (editingRoute as any)?.baseCurrencyCode}
                          allMargins={(editingRoute as any)?.allMargins}
                          selectedMnc={selectedRateMnc}
                          onSelectMnc={setSelectedRateMnc}
                        />
                      </div>
                    </div>
                  ) : (
                    <Input
                      label="Vendor Rate"
                      name="vendorRate"
                      onChange={() => { }}
                      value={dynamicVendorRate ? `${dynamicVendorRate} ${vendCurrency}` : ((editingRoute as any)?.vendorRate ? `${(editingRoute as any).vendorRate} ${vendCurrency}` : "—")}
                      disabled
                    />
                  )}

                  <Input
                    label={selectedRateMnc ? `Margin (MNC: ${selectedRateMnc})` : "Margin"}
                    name="margin"
                    onChange={() => { }}
                    value={(() => {
                      if (hasMultipleRates) {
                        if (activeMncMargin?.margin !== undefined && activeMncMargin.margin !== null) {
                          return `${activeMncMargin.margin > 0 ? "+" : ""}${Number(activeMncMargin.margin).toFixed(6)} ${dynamicBaseCurrency || (editingRoute as any)?.baseCurrencyCode || ''}`;
                        }
                        return "—";
                      }
                      if (dynamicCustomerRateBase != null && dynamicVendorRateBase != null && dynamicCustomerRate !== "N/A" && dynamicCustomerRate !== "Error" && dynamicVendorRate !== "N/A" && dynamicVendorRate !== "Error") {
                        const margin = dynamicCustomerRateBase - dynamicVendorRateBase;
                        return `${margin.toFixed(6)} ${dynamicBaseCurrency || ''}`;
                      }
                      return "—";
                    })()}
                    className={(() => {
                      if (hasMultipleRates) {
                        if (activeMncMargin?.margin !== undefined && activeMncMargin.margin !== null) {
                          return activeMncMargin.margin < 0 ? "!text-red-500 font-medium" : activeMncMargin.margin > 0 ? "!text-green-600 font-medium" : "";
                        }
                        return "";
                      }
                      if (dynamicCustomerRateBase != null && dynamicVendorRateBase != null && dynamicCustomerRate !== "N/A" && dynamicCustomerRate !== "Error" && dynamicVendorRate !== "N/A" && dynamicVendorRate !== "Error") {
                        const margin = dynamicCustomerRateBase - dynamicVendorRateBase;
                        return margin < 0 ? "!text-red-500 font-medium" : margin > 0 ? "!text-green-600 font-medium" : "";
                      }
                      return "";
                    })()}
                    disabled
                  />
                  <Input
                    label={selectedRateMnc ? `Margin % (MNC: ${selectedRateMnc})` : "Margin %"}
                    name="marginPercentage"
                    onChange={() => { }}
                    value={(() => {
                      if (hasMultipleRates) {
                        if (activeMncMargin?.marginPercentage !== undefined && activeMncMargin.marginPercentage !== null) {
                          return `${Number(activeMncMargin.marginPercentage).toFixed(2)}%`;
                        }
                        return "—";
                      }
                      if (dynamicCustomerRateBase != null && dynamicVendorRateBase != null && dynamicCustomerRate !== "N/A" && dynamicCustomerRate !== "Error" && dynamicVendorRate !== "N/A" && dynamicVendorRate !== "Error" && dynamicCustomerRateBase !== 0) {
                        const marginPct = ((dynamicCustomerRateBase - dynamicVendorRateBase) / dynamicCustomerRateBase) * 100;
                        return `${marginPct.toFixed(2)}%`;
                      }
                      return "—";
                    })()}
                    className={(() => {
                      if (hasMultipleRates) {
                        if (activeMncMargin?.marginPercentage !== undefined && activeMncMargin.marginPercentage !== null) {
                          return activeMncMargin.marginPercentage < 0 ? "!text-red-500 font-medium" : activeMncMargin.marginPercentage > 0 ? "!text-green-600 font-medium" : "";
                        }
                        return "";
                      }
                      if (dynamicCustomerRateBase != null && dynamicVendorRateBase != null && dynamicCustomerRate !== "N/A" && dynamicCustomerRate !== "Error" && dynamicVendorRate !== "N/A" && dynamicVendorRate !== "Error" && dynamicCustomerRateBase !== 0) {
                        const marginPct = ((dynamicCustomerRateBase - dynamicVendorRateBase) / dynamicCustomerRateBase) * 100;
                        return marginPct < 0 ? "!text-red-500 font-medium" : marginPct > 0 ? "!text-green-600 font-medium" : "";
                      }
                      return "";
                    })()}
                    disabled
                  />
                </div>
              );
            })()}
          </fieldset>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isCreatingGroup
                  ? "Create Route Group"
                  : isEditingGroupStatus
                    ? "Save Status"
                    : editingRoute
                      ? "Update Route"
                      : "Add Route"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};