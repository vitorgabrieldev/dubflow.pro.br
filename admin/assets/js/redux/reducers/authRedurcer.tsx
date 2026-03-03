import { REHYDRATE } from "redux-persist";
import { authConstants } from "./../constants";

const reducerKey = "auth";

const defaultState = {
	isAuthenticated  : false,
	isLoadingUserData: false,
	access_token     : "",
	userData         : {
		id         : "",
		name       : "",
		email      : "",
		avatar     : "",
		roles      : [],
		permissions: [],
	},
};

export default function reducer(state = defaultState, action) {
	switch( action.type )
	{
		case REHYDRATE:
			let persistUpdate = {};

			if( action.payload && action.payload[reducerKey] )
			{
				const persistCache = action.payload[reducerKey];

				persistUpdate = {
					isAuthenticated: persistCache.isAuthenticated,
					access_token   : persistCache.access_token,
				};

				if( persistCache.userData )
				{
					persistUpdate.userData = {
						id         : persistCache.userData.id || defaultState.userData.id,
						name       : persistCache.userData.name || defaultState.userData.name,
						email      : persistCache.userData.email || defaultState.userData.email,
						avatar     : persistCache.userData.avatar || defaultState.userData.avatar,
						roles      : persistCache.userData.roles || defaultState.userData.roles,
						permissions: persistCache.userData.permissions || defaultState.userData.permissions,
					}
				}
			}

			return Object.assign({}, state, persistUpdate);

		case authConstants.LOGIN:
			return Object.assign({}, state, {
				isAuthenticated: true,
				access_token   : `Bearer ${action.data.access_token}`,
				userData       : {
					...state.userData,
					id         : action.data.id,
					name       : action.data.name,
					email      : action.data.email,
					avatar     : action.data.avatar,
					roles      : action.data.roles.map((role) => {
						return {
							id  : role.id,
							name: role.name,
						}
					}),
					permissions: action.data.permissions,
				}
			});

		case authConstants.LOGOUT:
			return Object.assign({}, state, defaultState);

		case authConstants.USERDATA_REQUEST:
			return Object.assign({}, state, {
				isLoadingUserData: true,
			});

		case authConstants.USERDATA_SUCCESS:
			return Object.assign({}, state, {
				isLoadingUserData: false,
				userData         : {
					...state.userData,
					name       : action.data.name,
					email      : action.data.email,
					avatar     : action.data.avatar,
					roles      : action.data.roles.map((role) => {
						return {
							id  : role.id,
							name: role.name,
						}
					}),
					permissions: action.data.permissions,
				}
			});

		case authConstants.USERDATA_ERROR:
			return Object.assign({}, state, {
				isLoadingUserData: false,
			});

		case authConstants.UPDATE_AVATAR:
			return Object.assign({}, state, {
				userData: {
					...state.userData,
					avatar: action.data.avatar,
				},
			});

		default:
			return state;
	}
}
