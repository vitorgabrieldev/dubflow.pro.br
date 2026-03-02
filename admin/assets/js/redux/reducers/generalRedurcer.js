import { REHYDRATE } from "redux-persist";
import { generalConstants } from "./../constants";

const reducerKey = "general";

const defaultState = {
	siderCollapsed: false,
	listType      : {},
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
					siderCollapsed: persistCache.siderCollapsed,
					listType      : persistCache.listType || defaultState.listType,
				};
			}

			return Object.assign({}, state, persistUpdate);

		case generalConstants.SIDER_TOGGLE:
			return Object.assign({}, state, {
				siderCollapsed: action.data.collapsed,
			});

		case generalConstants.LIST_TYPE:
			return Object.assign({}, state, {
				listType: {
					...state.listType,
					[action.data.list]: action.data.type,
				},
			});

		default:
			return state;
	}
}
