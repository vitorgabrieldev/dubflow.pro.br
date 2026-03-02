import React, { Component } from "react";
import axios from "axios";
import { Button, Col, Form, Input, message, Modal, Row, Select, Spin } from "antd";
import QueueAnim from "rc-queue-anim";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { settingService } from "./../../redux/services";

class Index extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
		};

		this._cancelToken = null;
	}

	componentDidMount() {
		this._cancelToken = axios.CancelToken.source();

		settingService.getNotifications(this._cancelToken.token)
		.then((response) => {
			this.setState({
				isLoading: false,
			});

			// Fill form
			this.fillForm(response.data.data);
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Landing Component got unmounted");
	}

	fillForm = (data) => {
		this.form && this.form.setFieldsValue({
			delete_account			: data.delete_account,
			create_account			: data.create_account,
			create_moto	            : data.create_moto,
		});
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		settingService.updateNotifications(values)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Success message
			message.success("Configuração atualizada.");
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
		const {isLoading, isSending} = this.state;

		return (
			<QueueAnim className="site-content-inner page-settings">
				<div className="page-content" key="1">
					<h1 className="page-title">Notificações</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}>
						{isLoading ? (
							<div className="text-center" style={{padding: 20}}>
								<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
							</div>
						) : (
							<Row gutter={16}>
								<Col xs={24} lg={18}>
									<Form.Item name="create_account" label="E-mail para receber alertas de cadastros" 	hasFeedback rules={[
											{required: true, message: "Campo obrigatório."},
											({getFieldValue}) => ({
												validator(rule, value) {
													if( !value )
													{
														return Promise.resolve();
													}

													const invalidInputs = value.filter((email) => !email.match(/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/));

													if( invalidInputs.length === 0 )
													{
														return Promise.resolve();
													}
													else if( invalidInputs.length === 1 )
													{
														return Promise.reject("\"" + invalidInputs.join("") + "\" não é um e-mail válido");
													}
													else
													{
														return Promise.reject("\"" + invalidInputs.slice(0, -1).join("\", \"") + "\" e não são e-mails válidos");
													}
												},
											}),
										]}>
										<Select
											mode="tags"
											tokenSeparators={[',', ' ']}
											dropdownStyle={{display: "none"}}
										/>
									</Form.Item>
									<Form.Item name="delete_account" label="E-mail para receber alertas de contas removidas" hasFeedback rules={[
										{required: true, message: "Campo obrigatório."},
										({getFieldValue}) => ({
											validator(rule, value) {
												if( !value )
												{
													return Promise.resolve();
												}

												const invalidInputs = value.filter((email) => !email.match(/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/));

												if( invalidInputs.length === 0 )
												{
													return Promise.resolve();
												}
												else if( invalidInputs.length === 1 )
												{
													return Promise.reject("\"" + invalidInputs.join("") + "\" não é um e-mail válido");
												}
												else
												{
													return Promise.reject("\"" + invalidInputs.slice(0, -1).join("\", \"") + "\" e não são e-mails válidos");
												}
											},
										}),
									]}>
										<Select
											mode="tags"
											tokenSeparators={[',', ' ']}
											dropdownStyle={{display: "none"}}
										/>
									</Form.Item>
									<Form.Item name="create_moto" label="E-mail para receber alertas de cadastro de motocicletas" hasFeedback rules={[
										{required: true, message: "Campo obrigatório."},
										({getFieldValue}) => ({
											validator(rule, value) {
												if( !value )
												{
													return Promise.resolve();
												}

												const invalidInputs = value.filter((email) => !email.match(/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/));

												if( invalidInputs.length === 0 )
												{
													return Promise.resolve();
												}
												else if( invalidInputs.length === 1 )
												{
													return Promise.reject("\"" + invalidInputs.join("") + "\" não é um e-mail válido");
												}
												else
												{
													return Promise.reject("\"" + invalidInputs.slice(0, -1).join("\", \"") + "\" e não são e-mails válidos");
												}
											},
										}),
									]}>
										<Select
											mode="tags"
											tokenSeparators={[',', ' ']}
											dropdownStyle={{display: "none"}}
										/>
									</Form.Item>
									<Button type="primary" htmlType="submit" icon={<i className="far fa-check" />} loading={isSending} disabled={isLoading}>{isSending ? "Salvando" : "Salvar"}</Button>
								</Col>
							</Row>
						)}
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

export default Index;
