import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, Col, Form, Input, message, Modal, Row } from "antd";
import QueueAnim from "rc-queue-anim";

import { authService } from "./../../redux/services";

class RecoveryPassword extends Component {
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

		authService.passwordRecovery(values)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success(response.data.message);
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
			<QueueAnim className="site-content-inner">
				<div className="page-content" key="1">
					<h1 className="page-title">Recuperar senha</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}>
						<Form.Item name="email" rules={[{required: true, message: "Campo obrigatório."}, {type: "email", message: "Informe um e-mail válido."}]}>
							<Input prefix={<i className="fal fa-envelope" />} placeholder="Informe o e-mail cadastrado" />
						</Form.Item>
						<Row gutter={16} align="middle">
							<Col xs={12}>
								<Link to="/"><i className="fal fa-chevron-left" style={{marginRight: 8}} />Voltar</Link>
							</Col>
							<Col xs={12}>
								<Button type="primary" htmlType="submit" size="large" block loading={this.state.isSending}>Enviar</Button>
							</Col>
						</Row>
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

export default RecoveryPassword;
