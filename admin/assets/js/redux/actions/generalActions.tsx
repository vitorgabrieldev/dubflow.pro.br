import { generalConstants } from "./../constants";

/**
 * Side open/close
 *
 * @returns {{type: string}}
 */
export const siderToggle = (collapsed) => {
	return {
		type: generalConstants.SIDER_TOGGLE,
		data: {
			collapsed,
		}
	}
};

/**
 * Change list type
 *
 * @param list
 * @param type
 *
 * @returns {{data: {list: *, type: *}, type: string}}
 */
export const changeListType = (list, type) => {
	return {
		type: generalConstants.LIST_TYPE,
		data: {
			list,
			type,
		}
	}
};
