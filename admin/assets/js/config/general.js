require("dotenv").config();

import { browserName, osName } from "./../helpers/client";

// -----------------------------------------------------------------------------
// General
// -----------------------------------------------------------------------------
export const IS_DEBUG = process.env.NODE_ENV === "development";
export const ENV = process.env.NODE_ENV;

export const CLIENT_DATA = {
	os_name: osName(),
	browser_name: browserName(),
};

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------
const ENV_HOSTS = {
	development: "homologacao.clickweb.com.br:8478",
	homologation: "homologacao.clickweb.com.br:8478",
	production: "homologacao.clickweb.com.br:8478",
};

const HOST = ENV_HOSTS[ENV] || ENV_HOSTS.development;
const buildHttpsUrl = (path) => `https://${HOST}${path}`;

export const API_URL = buildHttpsUrl("/api/v1/admin/");
export const SOCKET_URL = HOST;
export const SOCKET_AUTH = buildHttpsUrl("/broadcasting/auth");

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
