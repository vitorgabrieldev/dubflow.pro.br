import { api } from "./../../config/api";

const basePath = "customers-deleted";

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

	if( options.hasOwnProperty("is_deleted_confirmed") )
	{
		params.push(`is_deleted_confirmed=${options.is_deleted_confirmed}`);
	}

	if( options.hasOwnProperty("despachante_id") )
	{
		options.despachante_id.forEach((item, index) => {
			params.push(`despachante_id[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("city") )
	{
		params.push(`city=${options.city}`);
	}

	if( options.hasOwnProperty("state") )
	{
		params.push(`state=${options.state}`);
	}

	if( options.hasOwnProperty("created_at") )
	{
		options.created_at.forEach((item, index) => {
			params.push(`created_at[${index}]=${item}`);
		});
	}

	if( options.hasOwnProperty("deleted_at") )
	{
		options.deleted_at.forEach((item, index) => {
			params.push(`deleted_at[${index}]=${item}`);
		});
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
 * Show
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const show = (options) => {
	return api.get(`${basePath}/${options.uuid}`);
};
