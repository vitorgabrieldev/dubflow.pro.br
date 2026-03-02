import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "modelosveiculos";

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

	// Merge config
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

	if( options.hasOwnProperty("is_active") )
	{
		params.push(`is_active=${options.is_active}`);
	}

	if( options.hasOwnProperty("marca_id") )
	{
		params.push(`marca_id=${options.marca_id}`);
	}

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	if( options.exportItems )
	{
		return api.get(`${basePath}/export${params_qs}`, {cancelToken});
	}
	else
	{
		return api.get(`${basePath}${params_qs}`, {cancelToken});
	}
};

/**
 * Additional Information
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const getAdditionalInformation = (options) => {
	const options_default = {};

	// Merge config
	options = Object.assign({}, options_default, options);

	let params    = [];
	let params_qs = "";

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	return api.get(`${basePath}/additional-information${params_qs}`);
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

export const getAutocomplete = (options) => {
	const options_default = {};

	// Merge config
	options = Object.assign({}, options_default, options);

	let params    = [];
	let params_qs = "";

	if( options.hasOwnProperty("search") )
	{
		params.push(`search=${options.search}`);
	}

	if( options.hasOwnProperty("orderBy") )
	{
		params.push(`orderBy=${options.orderBy}`);
	}

	if( options.hasOwnProperty("is_active") )
	{
		params.push(`is_active=${options.is_active}`);
	}

	if( options.hasOwnProperty("enterprise_id") )
	{
		params.push(`enterprise_id=${options.enterprise_id}`);
	}

	if( options.hasOwnProperty("include_tenant") )
	{
		params.push(`include_tenant=${options.include_tenant}`);
	}

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	let data = {};

	if( options.hasOwnProperty("cancelToken") )
	{
		data.cancelToken = options.cancelToken;
	}

	return api.get(`${basePath}/autocomplete${params_qs}`, data);
};