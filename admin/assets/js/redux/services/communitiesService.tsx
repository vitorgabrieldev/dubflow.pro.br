import { api } from "./../../config/api";
import { appendToFormData } from "./../../helpers/form";

const basePath = "communities";

const buildQuery = (options) => {
	const params = [];

	if( options.hasOwnProperty("page") ) params.push(`page=${options.page}`);
	if( options.hasOwnProperty("limit") ) params.push(`limit=${options.limit}`);
	if( options.hasOwnProperty("search") ) params.push(`search=${options.search}`);
	if( options.hasOwnProperty("orderBy") ) params.push(`orderBy=${options.orderBy}`);
	if( options.hasOwnProperty("is_active") ) params.push(`is_active=${options.is_active}`);
	if( options.hasOwnProperty("is_public") ) params.push(`is_public=${options.is_public}`);
	if( options.hasOwnProperty("is_verified") ) params.push(`is_verified=${options.is_verified}`);
	if( options.hasOwnProperty("owner_uuid") ) params.push(`owner_uuid=${options.owner_uuid}`);
	if( options.hasOwnProperty("with_deleted") ) params.push(`with_deleted=${options.with_deleted ? 1 : 0}`);

	if( options.hasOwnProperty("created_at") ) {
		options.created_at.forEach((item, index) => {
			params.push(`created_at[${index}]=${item}`);
		});
	}

	return params.length ? `?${params.join("&")}` : "";
};

const buildSubQuery = (options = {}, keys = []) => {
	const params = [];

	keys.forEach((key) => {
		if( !options.hasOwnProperty(key) ) return;

		const value = options[key];

		if( value === null || value === undefined || value === "" ) return;

		if( Array.isArray(value) ) {
			value.forEach((item, index) => {
				params.push(`${key}[${index}]=${item}`);
			});
			return;
		}

		if( typeof value === "boolean" ) {
			params.push(`${key}=${value ? 1 : 0}`);
			return;
		}

		params.push(`${key}=${value}`);
	});

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
export const restore = (options) => api.post(`${basePath}/${options.uuid}/restore`);

export const getAutocomplete = (options = {}) => {
	const query = buildQuery(options);

	return api.get(`${basePath}/autocomplete${query}`);
};

export const getFollowers = (options = {}) => {
	const query = buildSubQuery(options, ["page", "limit", "search", "orderBy", "is_active", "membership_is_active", "created_at"]);

	return api.get(`${basePath}/${options.uuid}/followers${query}`);
};

export const addFollower = (options = {}) => api.post(`${basePath}/${options.uuid}/followers`, {
	user_uuid: options.user_uuid,
});

export const updateFollowerStatus = (options = {}) => api.post(`${basePath}/${options.uuid}/followers/${options.user_uuid}/status`, {
	is_active: options.is_active,
});

export const removeFollower = (options = {}) => api.delete(`${basePath}/${options.uuid}/followers/${options.user_uuid}`);

export const getEpisodes = (options = {}) => {
	const query = buildSubQuery(options, ["page", "limit", "search", "orderBy", "visibility", "playlist_id", "season_id", "created_at"]);

	return api.get(`${basePath}/${options.uuid}/episodes${query}`);
};

export const getEpisodeFilters = (options = {}) => {
	const query = buildSubQuery(options, ["playlist_id"]);

	return api.get(`${basePath}/${options.uuid}/episode-filters${query}`);
};

export const updateEpisodeStatus = (options = {}) => api.post(`${basePath}/${options.uuid}/episodes/${options.episode_uuid}/status`, {
	is_active: options.is_active,
});

export const getCollaborators = (options = {}) => {
	const query = buildSubQuery(options, ["page", "limit", "search", "orderBy", "role", "status", "created_at"]);

	return api.get(`${basePath}/${options.uuid}/collaborators${query}`);
};

export const updateCollaborator = (options = {}) => api.post(`${basePath}/${options.uuid}/collaborators/${options.user_uuid}`, {
	role: options.role,
	status: options.status,
});

export const removeCollaborator = (options = {}) => api.delete(`${basePath}/${options.uuid}/collaborators/${options.user_uuid}`);
