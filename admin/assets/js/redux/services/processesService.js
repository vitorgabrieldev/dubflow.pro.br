import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "processes";

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

	if( options.hasOwnProperty("page") ) params.push(`page=${options.page}`);
	if( options.hasOwnProperty("limit") ) params.push(`limit=${options.limit}`);
	if( options.hasOwnProperty("search") ) params.push(`search=${options.search}`);
	if( options.hasOwnProperty("orderBy") ) params.push(`orderBy=${options.orderBy}`);

	if( options.hasOwnProperty("customer_ids") )
	{
		options.customer_ids.forEach((item, index) => {
			params.push(`customer_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("despachante_ids") )
	{
		options.despachante_ids.forEach((item, index) => {
			params.push(`despachante_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("despachante_user_ids") )
	{
		options.despachante_user_ids.forEach((item, index) => {
			params.push(`despachante_user_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("service_type_ids") )
	{
		options.service_type_ids.forEach((item, index) => {
			params.push(`service_type_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("service_ids") )
	{
		options.service_ids.forEach((item, index) => {
			params.push(`service_ids[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("start_date") ) params.push(`start_date=${options.start_date}`);
	if( options.hasOwnProperty("end_date") ) params.push(`end_date=${options.end_date}`);
	if( options.hasOwnProperty("status") ) params.push(`status=${options.status}`);

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
 * Autocomplete
 *
 * @param {Object} options
 * @returns {Promise<T>}
 */
export const autocomplete = (options = {}) => {
	const options_default = {};

	options = Object.assign({}, options_default, options);

	let params    = [];
	let params_qs = "";

	if( options.hasOwnProperty("search") ) params.push(`search=${options.search}`);
	if( options.hasOwnProperty("orderBy") ) params.push(`orderBy=${options.orderBy}`);
	if( options.hasOwnProperty("status") ) params.push(`status=${options.status}`);

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	const data = {};

	if( options.hasOwnProperty("cancelToken") )
	{
		data.cancelToken = options.cancelToken;
	}

	return api.get(`${basePath}/autocomplete${params_qs}`, data);
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
