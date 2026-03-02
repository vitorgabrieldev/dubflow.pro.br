import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/lib/integration/react";

import { persistor, store } from "./redux/store/configureStore";

import Main from "./screens/Main";

class App extends Component {
	render() {
		return (
			<Provider store={store}>
				<PersistGate loading={null} persistor={persistor}>
					<Main />
				</PersistGate>
			</Provider>
		);
	}
}

ReactDOM.render(<App />, document.getElementById("root"));
