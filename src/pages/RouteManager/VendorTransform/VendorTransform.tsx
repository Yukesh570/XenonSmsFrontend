import React, { useState, useEffect } from "react";
import { Home, Shuffle, Cpu, ShieldCheck } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getClientsApi } from "../../../api/clientApi/clientApi";
import { getCountriesApi } from "../../../api/settingApi/countryApi/countryApi";
import { VendorTransformRulesTab } from "../../SenderIdManagement/tabs/VendorTransformRulesTab";
import { VendorRouteTestConsoleTab } from "../../SenderIdManagement/tabs/VendorRouteTestConsoleTab";
import { VendorCompatibilityTab } from "../../SenderIdManagement/tabs/VendorCompatibilityTab";

export type VendorTransformTab = "compatibility" | "rules" | "simulator";

const VendorTransformPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = (): VendorTransformTab => {
    const params = new URLSearchParams(window.location.search || location.search);
    const tab = params.get("tab");
    if (tab === "compatibility" || location.pathname.includes("compatibility")) return "compatibility";
    if (tab === "simulator" || location.pathname.includes("simulator")) return "simulator";
    if (tab === "rules") return "rules";
    return "rules";
  };

  const [activeTab, setActiveTab] = useState<VendorTransformTab>(getInitialTab);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search || location.search);
    const cId = params.get("clientId") || params.get("client");
    if (cId) {
      const parsed = Number(cId);
      return !isNaN(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
  });
  const [clients, setClients] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || location.search);
    const cId = params.get("clientId") || params.get("client");
    if (cId) {
      const parsed = Number(cId);
      if (!isNaN(parsed) && parsed > 0) {
        setSelectedClientId(parsed);
      }
    }
  }, [location.search]);

  const handleTabChange = (tab: VendorTransformTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  const handleClientChange = (id: number | null) => {
    setSelectedClientId(id);
    const params = new URLSearchParams(location.search);
    if (id) {
      params.set("clientId", String(id));
    } else {
      params.delete("clientId");
    }
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  useEffect(() => {
    const loadSharedData = async () => {
      try {
        const [cRes, countryRes]: [any, any] = await Promise.all([
          getClientsApi(undefined, 1, 1000).catch(() => null),
          getCountriesApi(undefined, 1, 1000).catch(() => null),
        ]);
        setClients(cRes?.results || (Array.isArray(cRes) ? cRes : []));

        const countryList = Array.isArray(countryRes)
          ? countryRes
          : countryRes?.results || [];
        setCountries(
          countryList.map((c: any) => ({
            value: String(c.id),
            label: c.name,
            iso2: c.iso2,
            id: c.id,
            name: c.name,
          }))
        );
      } catch (e) {
        console.error("Failed to load shared data", e);
      }
    };
    loadSharedData();
  }, []);

  return (
    <div className="w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white flex items-center gap-2">
            Vendor Route Transformation & Compatibility
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Phase 5 downstream vendor format adaptations, carrier compatibility constraints, sequential cursor protection, and real-time candidate route preflight simulations.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-gray-400">Route Manager</span>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Vendor Transformation</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 pt-2 gap-2 sm:gap-6 bg-white dark:bg-gray-800 overflow-x-auto">
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === "rules"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            onClick={() => handleTabChange("rules")}
          >
            <Shuffle size={16} />
            <span>Vendor / Route Rules</span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === "compatibility"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            onClick={() => handleTabChange("compatibility")}
          >
            <ShieldCheck size={16} />
            <span>Vendor Compatibility Profiles</span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === "simulator"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            onClick={() => handleTabChange("simulator")}
          >
            <Cpu size={16} />
            <span>Candidate Preflight Simulator</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "rules" && (
        <VendorTransformRulesTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
          countries={countries}
        />
      )}

      {activeTab === "compatibility" && (
        <VendorCompatibilityTab countries={countries} />
      )}

      {activeTab === "simulator" && (
        <VendorRouteTestConsoleTab
          clients={clients}
          countries={countries}
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
        />
      )}
    </div>
  );
};

export default VendorTransformPage;

