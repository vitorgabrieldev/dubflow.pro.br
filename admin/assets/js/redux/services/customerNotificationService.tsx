import { api } from "./../../config/api";
import { toQueryString, toFormData } from "./../../helpers/form";

const basePath = "customers-notifications";

/**
 * Get all
 *
 * @param {Object} options
 * @param cancelToken
 *
 * @returns {Promise<T>}
 */
export const getAll = (options, cancelToken = null) => {
	if( options.exportItems )
	{
		return api.get(`${basePath}/export${toQueryString(options)}`, {cancelToken});
	}
	else
	{
		return api.get(`${basePath}${toQueryString(options)}`, {cancelToken});
	}
};

/**
 * Show
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const show = (options) => {
	return api.get(`${basePath}/${options.uuid}`);
};

/**
 * Create
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const create = (options) => {
	return api.post(basePath, toFormData(options));
};

/**
 * Edit
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const edit = (options) => {
	return api.post(`${basePath}/${options.uuid}`, toFormData(options));
};

/**
 * Delete
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const destroy = (options) => {
	return api.delete(`${basePath}/${options.uuid}`);
};
