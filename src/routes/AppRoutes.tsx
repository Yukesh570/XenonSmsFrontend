import React, { useContext, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Login from "../pages/Auth/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import CreateSidebar from "../pages/module/ModuleList";
import PermissionsTable from "../pages/role/role";
import { useAuth } from "../context/AuthContext";
import ChangePassword from "../pages/Auth/ChangePassword";
import TemplatePage from "../pages/template/templateInput";
import CampaignList from "../pages/Campaign/Campaign";
import SmtpServer from "../pages/settings/Smtp/SmtpServer";
import ImapServer from "../pages/settings/Imap/ImapServer";
import EmailTemplatePage from "../pages/Email Template/emailTemplate";
import SendMailPage from "../pages/Send Mail/SendMail";
import Country from "../pages/settings/Country/Country";
import State from "../pages/settings/State/state";
import Currency from "../pages/settings/Currency/Currency";
import Entity from "../pages/settings/Entity/Entity";
import CompanyCategory from "../pages/settings/companyCategory/companyCategory";
import CompanyStatus from "../pages/settings/countryStatus/countryStatus";
import Company from "../pages/Company/Company";
import Vendor from "../pages/Connectivity/Vendor/vendor";
import Smpp from "../pages/Connectivity/Smpp/Smpp";
import Client from "../pages/Client/Client";
import VendorRate from "../pages/Rate/VendorRate";
import CustomerRate from "../pages/Rate/CustomerRate";
import MappingSetup from "../pages/MappingSetup/MappingSetup";
// import Operators from "../pages/Operator/Operator";
import UserLog from "../pages/UserLog/UserLog";
import CustomRoute from "../pages/RouteManager/CustomRoute";
import { NavItemsContext } from "../context/navItemsContext";
import TimeZone from "../pages/settings/Timezone/Timezone";
import NotFound from "../pages/error/notFound";
import LiveTraffic from "../pages/Report/LiveTraffic";
import MessageReport from "../pages/Report/MessageReport";
import UserAction from "../pages/UserLog/UserAction";
import AddCredit from "../pages/Credit/AddCredit";
import DetailedReport from "../pages/Report/DetailedReport";
import ClientTransaction from "../pages/Transaction/ClientTransaction";
import VendorTransaction from "../pages/Transaction/VendorTransaction";
import InvoiceSetup from "../pages/Finance/InvoiceSetup/InvoiceSetup";
import ClientInvoice from "../pages/Finance/Invoice/ClientInvoice";
import GenerateClientInvoice from "../pages/Finance/Invoice/GenerateClientInvoice";
import VendorInvoice from "../pages/Finance/Invoice/VendorInvoice";
import GenerateVendorInvoice from "../pages/Finance/Invoice/GenerateVendorInvoice";
import AllNotifications from "../pages/Notifications/AllNotifications";
import DLREvent from "../pages/Report/DLREvent";
import RejectedSMSLog from "../pages/Report/RejectedSMSLog";
import MessageAttempt from "../pages/Report/MessageAttempt";
import SmsMessagePart from "../pages/Report/SmsMessagePart";
import OperatorNetworkCode from "../pages/OperatorNetworkCode/OperatorNetworkCode";
import ClientSession from "../pages/ClientSession/ClientSession";
import GeneralSettings from "../pages/settings/GeneralSettings/GeneralSettings";
import CurrencyExchangeRate from "../pages/settings/CurrencyExchangeRate/CurrencyExchangeRate";
import ServerInfo from "../pages/Report/ServerInfo";
import EmailSource from "../pages/Rate/ImportVendor/EmailSource";
import ImportAttachment from "../pages/Rate/ImportVendor/ImportAttachment";
import ImportAudit from "../pages/Rate/ImportVendor/ImportAudit";
import ImportBatch from "../pages/Rate/ImportVendor/ImportBatch";
import ImportMail from "../pages/Rate/ImportVendor/ImportMail";
import ImportRow from "../pages/Rate/ImportVendor/ImportRow";
import MccMncPrefixRange from "../pages/MccMncPrefix/MccMncPrefixRange";
import MccMncPrefixImportBatch from "../pages/MccMncPrefix/MccMncPrefixImportBatch";
import FindRoute from "../pages/RouteManager/FindRoute";
import AnalyticsReport from "../pages/Report/AnalyticsReport";
import UserCreation from "../pages/UserCreation/UserCreation";
import VendorCampaign from "../pages/Campaign/VendorCampaign";
import SenderIdTranslationModule from "../pages/SenderIdTranslation/SenderIdTranslationModule";

export const componentRegistry: Record<string, React.ComponentType<any>> = {
  dashboard: Dashboard,
  navItem: CreateSidebar,
  role: PermissionsTable,
  changePassword: ChangePassword,
  "change-password": ChangePassword,
  notifications: AllNotifications,
  template: TemplatePage,
  clientCampaign: CampaignList,
  smtp: SmtpServer,
  imap: ImapServer,
  emailTemplate: EmailTemplatePage,
  sendMail: SendMailPage,
  country: Country,
  state: State,
  currency: Currency,
  entity: Entity,
  companyCategory: CompanyCategory,
  companyStatus: CompanyStatus,
  timeZone: TimeZone,
  company: Company,
  vendor: Vendor,
  smpp: Smpp,
  client: Client,
  vendorRateGroup: VendorRate,
  customerRateGroup: CustomerRate,
  mappingSetup: MappingSetup,
  // operators: Operators,
  userLog: UserLog,
  userAction: UserAction,
  customRoute: CustomRoute,
  liveTraffic: LiveTraffic,
  liveReport: MessageReport,
  addCredit: AddCredit,
  detailedReport: DetailedReport,
  clientTransaction: ClientTransaction,
  vendorTransaction: VendorTransaction,
  invoiceSetup: InvoiceSetup,
  clientCompanyInvoice: ClientInvoice,
  generateClientInvoice: GenerateClientInvoice,
  vendorCompanyInvoice: VendorInvoice,
  generateVendorInvoice: GenerateVendorInvoice,
  messageAttempt: MessageAttempt,
  dlrEvent: DLREvent,
  rejectedSMSLog: RejectedSMSLog,
  smsMessagePart: SmsMessagePart,
  operatorNetworkCode: OperatorNetworkCode,
  clientSession: ClientSession,
  generalSettings: GeneralSettings,
  currencyExchangeRate: CurrencyExchangeRate,
  serverInfo: ServerInfo,
  emailSource: EmailSource,
  importAttachment: ImportAttachment,
  importAudit: ImportAudit,
  importBatch: ImportBatch,
  importMail: ImportMail,
  importRow: ImportRow,
  mccMncPrefixRange: MccMncPrefixRange,
  mccMncPrefixImportBatch: MccMncPrefixImportBatch,
  routeLookup: FindRoute,
  analyticsReport: AnalyticsReport,
  userCreation: UserCreation,
  vendorCampaign: VendorCampaign,
  senderIdTranslation: SenderIdTranslationModule,
};

export const getComponentByPath = (pathname: string): React.ComponentType<any> => {
  const cleanPath = pathname.replace(/^\//, "");

  if (!cleanPath || cleanPath === "dashboard") return Dashboard;
  if (cleanPath === "change-password") return ChangePassword;
  if (cleanPath === "notifications") return AllNotifications;

  if (componentRegistry[cleanPath]) return componentRegistry[cleanPath];

  const lastSegment = cleanPath.split("/").pop();
  if (lastSegment && componentRegistry[lastSegment]) {
    return componentRegistry[lastSegment];
  }

  return NotFound;
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { navItems, loading: isNavLoading, error: hasNavError } = useContext(NavItemsContext);
  const [navTimeout, setNavTimeout] = useState(false);

  useEffect(() => {
    let timer: number;
    if (isAuthenticated && (!navItems || !navItems.results || navItems.results.length === 0)) {
      timer = window.setTimeout(() => {
        setNavTimeout(true);
      }, 10000);
    }
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, navItems]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (hasNavError || navTimeout) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-red-100 dark:border-red-900/30 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connection Failed</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Unable to reach the server to load your navigation menu. The backend may be offline or unreachable.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
              Retry Connection
            </button>
            <button onClick={logout} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isNavLoading || !navItems || !navItems.results || navItems.results.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading layout...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*" element={<Layout />} />
    </Routes>
  );
};

export default AppRoutes;