import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Shield,
  RotateCcw,
  Layers,
  Database,
} from "lucide-react";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { AuthorizationTab } from "./tabs/AuthorizationTab";
import { TranslationTab } from "./tabs/TranslationTab";
import { SenderPoolsTab } from "./tabs/SenderPoolsTab";
import { ReplacementListsTab } from "./tabs/ReplacementListsTab";

export type SenderIdMainTab =
  | "authorization"
  | "translation"
  | "pools"
  | "replacementLists";

const SenderIdManagementModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab from pathname or query param
  const getInitialTab = (): SenderIdMainTab => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as SenderIdMainTab;
    const validTabs: SenderIdMainTab[] = [
      "authorization",
      "translation",
      "pools",
      "replacementLists",
    ];

    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }

    const path = location.pathname.toLowerCase();
    if (path.includes("translation")) return "translation";
    if (path.includes("pool")) return "pools";
    if (path.includes("replace")) return "replacementLists";
    return "authorization";
  };

  const [activeTab, setActiveTab] = useState<SenderIdMainTab>(getInitialTab);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  // Sync tab if URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname, location.search]);

  // Handle URL Param ?clientId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cId = params.get("clientId");
    if (cId) {
      const parsed = Number(cId);
      if (!isNaN(parsed) && parsed > 0) {
        setSelectedClientId(parsed);
      }
    }
  }, [location.search]);

  const handleTabChange = (tab: SenderIdMainTab) => {
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

  // Load clients & countries once for all tabs
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
        console.error("Failed to load shared clients or countries", e);
      }
    };
    loadSharedData();
  }, []);

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
            Sender ID Management
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Unified control center for client Sender ID authorization compliance, translation rules, number pools, and replacement lists.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Sender ID Management</span>
        </div>
      </div>

      {/* Main Hub Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 pt-2 gap-2 sm:gap-6 bg-white dark:bg-gray-800 overflow-x-auto">
          {/* Sender Authorization */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "authorization"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("authorization")}
          >
            <Shield size={16} />
            <span>Authorization & Compliance</span>
          </button>

          {/* Sender ID Translation */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "translation"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("translation")}
          >
            <RotateCcw size={16} />
            <span>Translation & Rewriting</span>
          </button>

          {/* Sender Pools */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "pools"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("pools")}
          >
            <Layers size={16} />
            <span>Sender Pools</span>
          </button>

          {/* Sender Replacement Lists */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "replacementLists"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("replacementLists")}
          >
            <Database size={16} />
            <span>Replacement Lists</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "authorization" && (
        <AuthorizationTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
          countries={countries}
        />
      )}

      {activeTab === "translation" && (
        <TranslationTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
          countries={countries}
        />
      )}

      {activeTab === "pools" && <SenderPoolsTab />}

      {activeTab === "replacementLists" && <ReplacementListsTab />}
    </div>
  );
};

export default SenderIdManagementModule;
