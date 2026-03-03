import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "comments";

const buildQuery = (options) => {
	const params = [];

	if( options.hasOwnProperty("page") ) params.push(`page=${options.page}`);
	if( options.hasOwnProperty("limit") ) params.push(`limit=${options.limit}`);
	if( options.hasOwnProperty("search") ) params.push(`search=${options.search}`);
	if( options.hasOwnProperty("orderBy") ) params.push(`orderBy=${options.orderBy}`);
	if( options.hasOwnProperty("post_id") ) params.push(`post_id=${options.post_id}`);
	if( options.hasOwnProperty("user_uuid") ) params.push(`user_uuid=${options.user_uuid}`);
	if( options.hasOwnProperty("is_reply") ) params.push(`is_reply=${options.is_reply}`);
	if( options.hasOwnProperty("with_deleted") ) params.push(`with_deleted=${options.with_deleted ? 1 : 0}`);

	if( options.hasOwnProperty("created_at") ) {
		options.created_at.forEach((item, index) => {
			params.push(`created_at[${index}]=${item}`);
		});
	}

	return params.length ? `?${params.join("&")}` : "";
};

export const getAll = (options = {}) => {
	const query = buildQuery(options);

	if( options.exportItems ) {
		return api.get(`${basePath}/export${query}`);
	}

	return api.get(`${basePath}${query}`);
};

export const show = (options) => api.get(`${basePath}/${options.uuid}`);

export const create = (options) => {
	const formData = new FormData();

	for( let key in options ) {
		if( options.hasOwnProperty(key) ) {
			appendToFormData(formData, key, options[key]);
		}
	}

	return api.post(basePath, formData);
};

export const edit = (options) => {
	const formData = new FormData();

	for( let key in options ) {
		if( options.hasOwnProperty(key) ) {
			appendToFormData(formData, key, options[key]);
		}
	}

	return api.post(`${basePath}/${options.uuid}`, formData);
};

export const destroy = (options) => api.delete(`${basePath}/${options.uuid}`);

export const getAutocomplete = (options = {}) => {
	const query = buildQuery(options);

	return api.get(`${basePath}/autocomplete${query}`);
};
