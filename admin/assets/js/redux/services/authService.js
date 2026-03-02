import { api } from "./../../config/api";

const basePath = "auth";

/**
 * Login user
 *
 * @param {Object} data
 *
 * @returns {Promise<T>}
 */
export const login = (data) => {
	return api.post(`${basePath}/login`, data);
};

/**
 * Logout logged user
 *
 * @returns {Promise<T>}
 */
export const logout = () => {
	return api.delete(`${basePath}/logout`);
};

/**
 * Password recovery
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const passwordRecovery = (options) => {
	return api.post(`${basePath}/password/recovery`, options);
};

/**
 * Get logged user data
 *
 * @returns {Promise<T>}
 */
export const getUserData = () => {
	return api.get(`${basePath}/user`);
};

/**
 * Change user password
 *
 * @param {Object} data
 *
 * @returns {Promise<T>}
 */
export const changePassword = (data) => {
	return api.post(`${basePath}/change-password`, data);
};

/**
 * Change user avatar
 *
 * @param {Object} data
 *
 * @returns {Promise<T>}
 */
export const changeAvatar = (data) => {
	const form = new FormData();
	form.append("avatar", data.avatar, data.avatar.name);

	return api.post(`${basePath}/change-avatar`, form);
};
