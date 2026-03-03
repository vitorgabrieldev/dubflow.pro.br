import { authConstants } from "./../constants";
import { authService } from "./../services";

/**
 * Authenticate user
 *
 * @param {Object} data
 *
 * @returns {function(*)}
 */
export const login = (data) => {
	return {
		type: authConstants.LOGIN,
		data: data
	};
};

/**
 * Logout
 *
 * @returns {Function}
 */
export const logout = () => {
	return (dispatch) => {
		authService.logout().then((response) => {
		}).catch((data) => {
		});

		dispatch({
			type: authConstants.LOGOUT,
		});
	};
};

/**
 * Logout without request, only locally
 *
 * @returns {{type: string}}
 */
export const silentLogout = () => {
	return {
		type: authConstants.LOGOUT,
	}
};

/**
 * Re-load user data from server
 *
 * @returns {function(*)}
 */
export const refreshUserData = () => {
	return (dispatch) => {
		dispatch({
			type: authConstants.USERDATA_REQUEST,
		});

		// Get user data
		authService.getUserData().then((response) => {
			dispatch({
				type: authConstants.USERDATA_SUCCESS,
				data: response.data.data,
			});
		})
		.catch((data) => {
			dispatch({
				type: authConstants.USERDATA_ERROR,
				data: {
					error_type   : data.error_type,
					error_message: data.error_message,
					error_errors : data.error_errors,
				}
			});
		});
	};
};

/**
 * Update avatar
 *
 * @param avatar
 *
 * @returns {{type: string, data: {avatar: *}}}
 */
export const updateAvatar = (avatar) => {
	return {
		type: authConstants.UPDATE_AVATAR,
		data: {
			avatar: avatar,
		}
	};
};
