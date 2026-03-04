import { browserName, osName } from "./../helpers/client";

// -----------------------------------------------------------------------------
// General
// -----------------------------------------------------------------------------
export const ENV = import.meta.env.MODE || "development";
export const IS_DEBUG = ENV === "development";

export const CLIENT_DATA = {
	os_name: osName(),
	browser_name: browserName(),
};

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------
const DEFAULT_APP_BASE_URL = ENV === "development" ? "http://127.0.0.1:8000" : "https://startup.dev.br";
const DEFAULT_API_BASE_URL = `${DEFAULT_APP_BASE_URL}/api/v1/admin`;
const DEFAULT_SOCKET_URL = ENV === "development" ? "127.0.0.1:8000" : "startup.dev.br";
const DEFAULT_SOCKET_AUTH = `${DEFAULT_APP_BASE_URL}/broadcasting/auth`;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export const API_URL = `${API_BASE_URL}/`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;
export const SOCKET_AUTH = import.meta.env.VITE_SOCKET_AUTH || DEFAULT_SOCKET_AUTH;

export const SOCKET_PORT = 6001;
export const SOCKET_KEY = "taWt5tcUfW2xjz9jl454AjregzIaPRnY";

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------
export const API_ERRO_TYPE_VALIDATION = "validation";
export const API_ERRO_TYPE_API = "api";
export const API_ERRO_TYPE_SERVER = "server";
export const API_ERRO_TYPE_CONNECTION = "connection";
export const API_ERRO_TYPE_OTHER = "other";
export const API_ERRO_TYPE_ACCESS_TOKEN = "access_token";
export const API_ERRO_TYPE_CANCEL = "cancel";
