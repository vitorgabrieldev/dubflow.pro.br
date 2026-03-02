import { api } from "./../../config/api";

const basePath = "dashboard";

/**
 * Get all
 *
 * @returns {Promise<T>}
 */
export const getAll = () => {
	return api.get(basePath);
};
