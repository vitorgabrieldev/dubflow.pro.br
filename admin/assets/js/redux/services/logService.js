import { api } from "./../../config/api";

const basePath = "logs";

/**
 * Get all
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const getAll = (options) => {
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

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	if( options.exportItems )
	{
		return api.get(`${basePath}/export${params_qs}`);
	}
	else
	{
		return api.get(`${basePath}${params_qs}`);
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
