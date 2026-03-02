import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "settings";

/**
 * Get general
 *
 * @param cancelToken
 *
 * @returns {Promise<T>}
 */
export const getGeneral = (cancelToken) => {
	return api.get(`${basePath}/general`, {cancelToken});
};

/**
 * Edit general
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const updateGeneral = (options) => {
	const formData = new FormData();

	for( let key in options )
	{
		if( options.hasOwnProperty(key) )
		{
			appendToFormData(formData, key, options[key]);
		}
	}

	return api.post(`${basePath}/general`, formData);
};

/**
 * Get notifications
 *
 * @param cancelToken
 *
 * @returns {Promise<T>}
 */
export const getNotifications = (cancelToken) => {
	return api.get(`${basePath}/notifications`, {cancelToken});
};

/**
 * Edit notifications
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const updateNotifications = (options) => {
	const formData = new FormData();

	for( let key in options )
	{
		if( options.hasOwnProperty(key) )
		{
			appendToFormData(formData, key, options[key]);
		}
	}

	return api.post(`${basePath}/notifications`, formData);
};
