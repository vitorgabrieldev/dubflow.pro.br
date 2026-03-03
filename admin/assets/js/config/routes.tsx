import Account from "./../screens/Account";
import AccountPassword from "./../screens/AccountPassword";
import Home from "./../screens/Home";
import Login from "./../screens/Login";
import Logs from "./../screens/Logs";
import RecoveryPassword from "./../screens/RecoveryPassword";
import RolesAndPermissions from "./../screens/RolesAndPermissions";
import SystemLog from "./../screens/SystemLog";
import Users from "./../screens/Users";

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
