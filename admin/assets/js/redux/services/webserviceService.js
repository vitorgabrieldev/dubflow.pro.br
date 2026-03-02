import { api } from "./../../config/api";

const basePath = "webservice";

/**
 * Find cep
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const findZipcode = (options) => {
	return api.get(`${basePath}/zipcode/${options.zipcode}`);
};

/**
 * Cities
 *
 * @param {Object} options
 *
 * @returns {Promise<T>}
 */
export const getCities = (options) => {
	const options_default = {};

	// Merge config
	options = Object.assign({}, options_default, options);

	let params    = [];
	let params_qs = "";

	if( options.hasOwnProperty("search") )
	{
		params.push(`search=${options.search}`);
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

	return api.get(`${basePath}/cities${params_qs}`, data);
};

/**
 * States
 *
 * @returns {Promise<T>}
 */
export const getStates = () => {
	return api.get(`${basePath}/states`);
};
