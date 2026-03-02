import { applyMiddleware, combineReducers, compose, legacy_createStore as createStore } from "redux";
import thunk from "redux-thunk";
import { persistStore, persistReducer, PERSIST, REHYDRATE } from "redux-persist";
import { createStateSyncMiddleware, initMessageListener } from "redux-state-sync";
import storage from "redux-persist/lib/storage";

import {
	authRedurcer,
	generalRedurcer,
} from "./../reducers";

const IS_DEBUG = process.env.NODE_ENV === 'development';

const persistConfig = {
	key      : "root",
	storage  : storage,
	whitelist: [
		"auth",
		"general",
	],
};

const syncConfig = {
	blacklist: [
		PERSIST,
		REHYDRATE,
	],
};

const rootReducer = combineReducers({
	auth   : authRedurcer,
	general: generalRedurcer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const middleware = [thunk, createStateSyncMiddleware(syncConfig)];

const composeEnhancers = (IS_DEBUG && typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

export const store = createStore(persistedReducer, composeEnhancers(applyMiddleware(...middleware)));
initMessageListener(store);
export const persistor = persistStore(store);
