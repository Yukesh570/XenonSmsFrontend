import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PhoneCall,
  FileText,
  List,
  Sliders,
  PlayCircle,
} from "lucide-react";
import { getClientsApi } from "../../api/clientApi/clientApi";
import { getCountriesApi } from "../../api/settingApi/countryApi/countryApi";
import { DestinationRulesTab } from "../SenderIdManagement/tabs/DestinationRulesTab";
import { MessageTextRulesTab } from "../SenderIdManagement/tabs/MessageTextRulesTab";
import { MessageTextListsTab } from "../SenderIdManagement/tabs/MessageTextListsTab";
import { MessageFilterPolicyTab } from "../SenderIdManagement/tabs/MessageFilterPolicyTab";
import { TestConsoleTab } from "../SenderIdManagement/tabs/TestConsoleTab";

export type MessageFilterTab =
  | "destinationRules"
  | "messageTextRules"
  | "messageTextLists"
  | "policy"
  | "testConsole";

const MessageFilterManagementModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab from pathname or query param
  const getInitialTab = (): MessageFilterTab => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as MessageFilterTab;
    const validTabs: MessageFilterTab[] = [
      "destinationRules",
      "messageTextRules",
      "messageTextLists",
      "policy",
      "testConsole",
    ];

    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }

    const path = location.pathname.toLowerCase();
    if (path.includes("text-rule") || path.includes("textrule")) return "messageTextRules";
    if (path.includes("text-list") || path.includes("textlist")) return "messageTextLists";
    if (path.includes("policy")) return "policy";
    if (path.includes("test") || path.includes("simulator")) return "testConsole";
    return "destinationRules";
  };

  const [activeTab, setActiveTab] = useState<MessageFilterTab>(getInitialTab);
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

  const handleTabChange = (tab: MessageFilterTab) => {
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
            Message Filter & Translation
          </h1>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Control center for destination phone number normalization, message content regex rewriting, random macros, and interactive simulations.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white font-medium">Message Filter & Translation</span>
        </div>
      </div>

      {/* Main Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 pt-2 gap-2 sm:gap-6 bg-white dark:bg-gray-800 overflow-x-auto">
          {/* Destination Rules */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "destinationRules"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("destinationRules")}
          >
            <PhoneCall size={16} />
            <span>Destination Rules</span>
          </button>

          {/* Message Text Rules */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "messageTextRules"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("messageTextRules")}
          >
            <FileText size={16} />
            <span>Message Text Rules</span>
          </button>

          {/* Message Text Lists */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "messageTextLists"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("messageTextLists")}
          >
            <List size={16} />
            <span>Text Replacement Lists</span>
          </button>

          {/* Policy & Cache */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "policy"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("policy")}
          >
            <Sliders size={16} />
            <span>Policy & Cache</span>
          </button>

          {/* Simulator Console */}
          <button
            type="button"
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === "testConsole"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => handleTabChange("testConsole")}
          >
            <PlayCircle size={16} />
            <span>Test Simulator</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "destinationRules" && (
        <DestinationRulesTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
          countries={countries}
        />
      )}

      {activeTab === "messageTextRules" && (
        <MessageTextRulesTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
          countries={countries}
        />
      )}

      {activeTab === "messageTextLists" && (
        <MessageTextListsTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
        />
      )}

      {activeTab === "policy" && (
        <MessageFilterPolicyTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
        />
      )}

      {activeTab === "testConsole" && (
        <TestConsoleTab
          selectedClientId={selectedClientId}
          setSelectedClientId={handleClientChange}
          clients={clients}
        />
      )}
    </div>
  );
};

export default MessageFilterManagementModule;
