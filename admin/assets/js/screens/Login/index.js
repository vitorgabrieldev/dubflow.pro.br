import React, { Component } from "react";
import { connect } from "react-redux";
import { Link, Redirect } from "react-router-dom";
import { Button, Col, Form, Input, Modal, Row } from "antd";
import QueueAnim from "rc-queue-anim";

import { apiUpdateAccessToken } from "./../../config/api";

import { CLIENT_DATA } from "./../../config/general";

import { authActions } from "./../../redux/actions";

import { authService } from "../../redux/services";

class Login extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isSending         : false,
			error             : "",
			redirectToReferrer: false,
		};
	}

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		let access_token;

		const data = {
			...values,
			token_name: `${CLIENT_DATA.browser_name} - ${CLIENT_DATA.os_name}`,
		}

		authService.login(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			access_token = response.data.access_token;

			// Update access_token from api instance
			apiUpdateAccessToken(`Bearer ${access_token}`);

			// Get user data
			return authService.getUserData();
		})
		.then((response) => {
			// Do Login
			this.props.doLogin({
				access_token: access_token,
				...response.data.data,
			});
		})
		.catch((data) => {
			this.setState({
				isSending: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	render() {
		const {referrer} = this.props.location.state || {referrer: {pathname: "/"}};

		const {isSending, redirectToReferrer} = this.state;

		if( redirectToReferrer )
		{
			return <Redirect to={referrer} />
		}

		return (
			<QueueAnim className="site-content-inner page-login">
				<div className="page-content" key="1">
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}>
						<Form.Item name="email" rules={[{required: true, message: "Campo obrigatório."}, {type: "email", message: "Informe um e-mail válido."}]}>
							<Input prefix={<i className="fal fa-envelope" />} placeholder="E-mail" />
						</Form.Item>
						<Form.Item name="password" rules={[{required: true, message: "Campo obrigatório."}]}>
							<Input.Password prefix={<i className="fal fa-lock" />} type="password" placeholder="Senha" />
						</Form.Item>
						<Row gutter={16} align="middle">
							<Col xs={14} sm={12}>
								<Link to="/recovery-password">Esqueci minha senha</Link>
							</Col>
							<Col xs={10} sm={12}>
								<Button type="primary" htmlType="submit" size="large" block loading={isSending}>Entrar</Button>
							</Col>
						</Row>
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		doLogin: (data) => {
			dispatch(authActions.login(data));
		}
	}
};

export default connect(null, mapDispatchToProps)(Login);
