import { api } from "./../../config/api";
import { toQueryString, toFormData } from "./../../helpers/form";

const basePath = "continue-without-login";

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
