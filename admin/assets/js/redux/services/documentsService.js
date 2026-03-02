import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "documents";

/**
 * Get all
 *
 * @param {Object} options
 * @param cancelToken
 *
 * @returns {Promise<T>}
 */
export const getAll = (options, cancelToken) => {
	const options_default = {};

	options = Object.assign({}, options_default, options);

	let params    = [];
	let params_qs = "";

	if( options.hasOwnProperty("page") )
	{
		params.push(`page=${options.page}`);
	}

	if( options.hasOwnProperty("limit") )
	{
		params.push(`limit=${options.limit}`);
	}

	if( options.hasOwnProperty("search") )
	{
		params.push(`search=${options.search}`);
	}

	if( options.hasOwnProperty("orderBy") )
	{
		params.push(`orderBy=${options.orderBy}`);
	}

	if( options.hasOwnProperty("customer_ids") )
	{
		options.customer_ids.forEach((item, index) => {
			params.push(`customer_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("document_type_ids") )
	{
		options.document_type_ids.forEach((item, index) => {
			params.push(`document_type_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("expiration_start") )
	{
		params.push(`expiration_start=${options.expiration_start}`);
	}

	if( options.hasOwnProperty("expiration_end") )
	{
		params.push(`expiration_end=${options.expiration_end}`);
	}

	if( options.hasOwnProperty("status") )
	{
		params.push(`status=${encodeURIComponent(options.status)}`);
	}

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	if( options.exportItems )
	{
		return api.get(`${basePath}/export${params_qs}`, {cancelToken});
	}

	return api.get(`${basePath}${params_qs}`, {cancelToken});
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

	return api.post(`${basePath}/${options.uuid}`, formData);
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
