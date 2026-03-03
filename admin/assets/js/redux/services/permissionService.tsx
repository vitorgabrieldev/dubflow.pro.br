import { api } from "./../../config/api";

const basePath = "permissions";

/**
 * Autocomplete
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
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

	if( params.length )
	{
		params_qs = `?${params.join("&")}`;
	}

	return api.get(`${basePath}/autocomplete${params_qs}`);
};
