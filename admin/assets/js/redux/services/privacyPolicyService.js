import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "privacy-policy";

/**
 * Show
 *
 * @param cancelToken
 *
 * @returns {Promise<T>}
 */
export const show = (cancelToken) => {
	return api.get(basePath, {cancelToken});
};

/**
 * Edit
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const edit = (options) => {
	const formData = new FormData();

	for( let key in options )
	{
		if( options.hasOwnProperty(key) )
		{
			appendToFormData(formData, key, options[key]);
		}
	}

	return api.post(basePath, formData);
};
