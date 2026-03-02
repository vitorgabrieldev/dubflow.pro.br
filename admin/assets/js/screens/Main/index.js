import React, { Component } from "react";
import { connect } from "react-redux";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { ConfigProvider } from "antd";

import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

import pt_BR from 'antd/es/locale/pt_BR';

import { PRIVATE_ROUTES, SESSION_ROUTES } from "./../../config/routes";

import { authActions } from "./../../redux/actions";

import DefaultTemplate from "./../../templates/defaultTemplate";
import LoginTemplate from "./../../templates/loginTemplate";

import Error404 from "./../../screens/Error404";

class Main extends Component {
	componentDidMount() {
		if( this.props.isAuthenticated )
		{
			// Get usar data
			this.props.refreshUserData();
		}
	}

	render() {
		return (
			<ConfigProvider locale={pt_BR}>
				<BrowserRouter>
					<Switch>
						{PRIVATE_ROUTES.map((route, key) => (
							<Route exact={route.exact} path={route.path} key={key} render={(props) => (
								this.props.isAuthenticated ? null : <Redirect to={{pathname: "/login", state: {referrer: props.location}}} />
							)} />
						))}
						{SESSION_ROUTES.map((route, key) => (
							<Route exact={route.exact} path={route.path} key={key} render={(props) => (
								this.props.isAuthenticated ? <Redirect to="/" /> : null
							)} />
						))}
					</Switch>
					{this.props.isAuthenticated ? (
						<DefaultTemplate>
							<Switch>
								{PRIVATE_ROUTES.map((route, key) => (
									<Route exact={route.exact} path={route.path} key={key} component={route.component} />
								))}
								<Route component={Error404} />
							</Switch>
						</DefaultTemplate>
					) : (
						<LoginTemplate>
							<Switch>
								{SESSION_ROUTES.map((route, key) => (
									<Route exact={route.exact} path={route.path} key={key} component={route.component} />
								))}
								<Route component={Error404} />
							</Switch>
						</LoginTemplate>
					)}
				</BrowserRouter>
			</ConfigProvider>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		isAuthenticated: state.auth.isAuthenticated,
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		refreshUserData: () => {
			dispatch(authActions.refreshUserData());
		},
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(Main);
