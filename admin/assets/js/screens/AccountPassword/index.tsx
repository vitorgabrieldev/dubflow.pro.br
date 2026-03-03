import React, { Component } from "react";
import { Button, Col, Form, Input, message, Modal, Row } from "antd";
import QueueAnim from "rc-queue-anim";

import { authService } from "./../../redux/services";

class AccountPassword extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isSending: false,
		};
	}

	resetFields = () => {
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		// Do Change password
		authService.changePassword(values)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success("Senha atualizada com sucesso.");
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
		return (
			<QueueAnim className="site-content-inner page-account-password">
				<div className="page-content" key="1">
					<h1 className="page-title">Alterar senha</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}>
						<Row gutter={16}>
							<Col xs={24} sm={8} lg={8}>
								<Form.Item
									name="password"
									label="Senha atual"
									hasFeedback
									rules={[
										{required: true, message: "Campo obrigatório."},
										{min: 6, message: "Deve conter no mínimo 6 caracteres."},
									]}>
									<Input.Password type="password" />
								</Form.Item>
							</Col>
							<Col xs={24} sm={8} lg={8}>
								<Form.Item
									name="password_new"
									label="Nova senha"
									hasFeedback
									rules={[
										{required: true, message: "Campo obrigatório."},
										{min: 6, message: "Deve conter no mínimo 6 caracteres."},
									]}>
									<Input.Password type="password" />
								</Form.Item>
							</Col>
							<Col xs={24} sm={8} lg={8}>
								<Form.Item
									name="password_new_confirmation"
									label="Confirmar nova senha"
									hasFeedback
									dependencies={['password_new']}
									rules={[
										{required: true, message: "Campo obrigatório."},
										({getFieldValue}) => ({
											validator(rule, value) {
												if( !value || getFieldValue('password_new') === value )
												{
													return Promise.resolve();
												}

												return Promise.reject("Deve conter o mesmo valor de Nova senha.");
											},
										}),
									]}>
									<Input.Password type="password" />
								</Form.Item>
							</Col>
						</Row>
						<Form.Item>
							<Button type="primary" htmlType="submit" loading={this.props.isSending}>Atualizar senha</Button>
						</Form.Item>
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

export default AccountPassword;
