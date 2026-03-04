import { api } from "./../../config/api";

const basePath = "posts";

const buildQuery = (options) => {
	const params = [];

	if( options.hasOwnProperty("page") ) params.push(`page=${options.page}`);
	if( options.hasOwnProperty("limit") ) params.push(`limit=${options.limit}`);
	if( options.hasOwnProperty("search") ) params.push(`search=${encodeURIComponent(options.search)}`);
	if( options.hasOwnProperty("orderBy") ) params.push(`orderBy=${encodeURIComponent(options.orderBy)}`);
	if( options.hasOwnProperty("organization_id") ) params.push(`organization_id=${options.organization_id}`);
	if( options.hasOwnProperty("author_uuid") ) params.push(`author_uuid=${options.author_uuid}`);
	if( options.hasOwnProperty("visibility") ) params.push(`visibility=${options.visibility}`);
	if( options.hasOwnProperty("is_published") ) params.push(`is_published=${options.is_published}`);

	if( options.hasOwnProperty("created_at") ) {
		options.created_at.forEach((item, index) => {
			params.push(`created_at[${index}]=${encodeURIComponent(item)}`);
		});
	}

	return params.length ? `?${params.join("&")}` : "";
};

export const getAll = (options = {}) => {
	const query = buildQuery(options);
	return api.get(`${basePath}${query}`);
};

export const show = (options) => api.get(`${basePath}/${options.id}`);

