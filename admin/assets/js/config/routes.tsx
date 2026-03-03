import About from "./../screens/About";
import Account from "./../screens/Account";
import AccountPassword from "./../screens/AccountPassword";
import Customers from "./../screens/Customers";
import CustomersDeleted from "./../screens/CustomersDeleted";
import DespachanteUsers from "./../screens/DespachanteUsers";
import Documents from "./../screens/Documents";
import Processes from "./../screens/Processes";
import Despachantes from "./../screens/Despachantes";
import DocumentTypes from "./../screens/DocumentTypes";
import Profissionais from "./../screens/Profissionais";
import ServiceCategories from "./../screens/ServiceCategories";
import ServiceTypes from "./../screens/ServiceTypes";
import Services from "./../screens/Services";
import Faq from "./../screens/Faq";
import Home from "./../screens/Home";
import Login from "./../screens/Login";
import Logs from "./../screens/Logs";
import Onboardings from "./../screens/Onboardings";
import PrivacyPolicy from "./../screens/PrivacyPolicy";
import PushCity from "./../screens/PushCity";
import PushGeneral from "./../screens/PushGeneral";
import PushState from "./../screens/PushState";
import PushUser from "./../screens/PushUser";
import RecoveryPassword from "./../screens/RecoveryPassword";
import RolesAndPermissions from "./../screens/RolesAndPermissions";
import SettingsGeneral from "./../screens/SettingsGeneral";
import SettingsNotifications from "./../screens/SettingsNotifications";
import SystemLog from "./../screens/SystemLog";
import TermOfUse from "./../screens/TermOfUse";
import Users from "./../screens/Users";
import VehicleBrands from "./../screens/VehicleBrands";
import VehicleModels from "./../screens/VehicleModels";
import ReasonsForRefusal from "./../screens/ReasonsForRefusal";
import CallsForHelp from "./../screens/CallsForHelp";
import Vehicles from "./../screens/Vehicles";
import ProfissionaisDeleted from "./../screens/ProfissionaisDeleted";

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
/**
 * Private routes for registered user access
 *
 * @type {Array}
 */
export const PRIVATE_ROUTES = [
	// Home
	{ path: "/", component: Home, exact: true },

	// Account
	{ path: "/account", component: Account, exact: true },
	{ path: "/account/password", component: AccountPassword, exact: true },

	// Administrator
	{ path: "/administrator/logs", component: Logs, exact: true },
	{ path: "/administrator/roles-and-permissions", component: RolesAndPermissions, exact: true },
	{ path: "/administrator/system-log", component: SystemLog, exact: true },
	{ path: "/administrator/users", component: Users, exact: true },

	// Settings
	{ path: "/settings/general", component: SettingsGeneral, exact: true },
	{ path: "/settings/notifications", component: SettingsNotifications, exact: true },
	{ path: "/settings/document-types", component: DocumentTypes, exact: true },
	{ path: "/settings/service-categories", component: ServiceCategories, exact: true },
	{ path: "/settings/service-types", component: ServiceTypes, exact: true },
	{ path: "/settings/services", component: Services, exact: true },

	// Institutional
	{ path: "/institutional/onboardings", component: Onboardings, exact: true },
	{ path: "/institutional/about", component: About, exact: true },
	{ path: "/institutional/faq", component: Faq, exact: true },
	{ path: "/institutional/privacy-policy", component: PrivacyPolicy, exact: true },
	{ path: "/institutional/terms-of-use", component: TermOfUse, exact: true },

	// register
	{ path: "/register/vehicle-brands", component: VehicleBrands, exact: true },
	{ path: "/register/vehicle-models", component: VehicleModels, exact: true },
	{ path: "/register/reasons-for-refusal", component: ReasonsForRefusal, exact: true },

	// queries
	{ path: "/list/customers", component: Customers, exact: true },
	{ path: "/list/processes", component: Processes, exact: true },
	{ path: "/list/documents", component: Documents, exact: true },
	{ path: "/list/despachante-users", component: DespachanteUsers, exact: true },
	{ path: "/list/despachantes", component: Despachantes, exact: true },
	{ path: "/list/profissionais", component: Profissionais, exact: true },
	{ path: "/list/calls-for-help", component: CallsForHelp, exact: true },
	{ path: "/list/vehicles", component: Vehicles, exact: true },

	// Deleted Items
	{ path: "/list-deleted/customers-deleted", component: CustomersDeleted, exact: true },
	{ path: "/list-deleted/profissionais-deleted", component: ProfissionaisDeleted, exact: true },

	// Push
	{ path: "/push/city", component: PushCity, exact: true },
	{ path: "/push/general", component: PushGeneral, exact: true },
	{ path: "/push/user", component: PushUser, exact: true },
	{ path: "/push/state", component: PushState, exact: true }
];

/**
 * Session routes that if logged in need to be redirected to the dashboard
 *
 * @type {Array}
 */
export const SESSION_ROUTES = [
  // Login
  {
    path: "/login",
    component: Login,
    exact: true,
  },
  // Recovery password
  {
    path: "/recovery-password",
    component: RecoveryPassword,
    exact: true,
  },
];
