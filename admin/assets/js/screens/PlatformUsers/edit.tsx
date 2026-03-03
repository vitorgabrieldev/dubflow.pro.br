import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Switch } from "antd";

import { platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
			uuid     : 0,
		};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});

		platformUsersService.show({uuid})
		.then((response) => {
			const item = response.data.data;

			this.setState({isLoading: false}, () => {
				this.form.setFieldsValue({
					name      : item.name,
					email     : item.email,
					username  : item.username,
					stage_name: item.stage_name,
					state     : item.state,
					city      : item.city,
					bio       : item.bio,
					is_active : item.is_active,
					is_private: item.is_private,
				});
			});
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => this.onClose(),
			});
		});
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		this.setState({isSending: true});

		platformUsersService.edit({
			uuid: this.state.uuid,
			...values,
		})
		.then(() => {
			this.setState({isSending: false});
			message.success("Usuário atualizado com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(data) });
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={560}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title={`Editar usuário [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input />
					</Form.Item>
					<Form.Item name="email" label="E-mail" hasFeedback rules={[{required: true, message: "Campo obrigatório."}, {type: "email", message: "Informe um e-mail válido."}]}> 
						<Input />
					</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item name="username" label="Username"><Input /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item name="stage_name" label="Nome artístico"><Input /></Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item name="state" label="Estado"><Input /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item name="city" label="Cidade"><Input /></Form.Item></Col>
					</Row>
					<Form.Item name="bio" label="Bio"><Input.TextArea rows={4} /></Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={8}><Form.Item name="is_active" label="Conta ativa" valuePropName="checked"><Switch /></Form.Item></Col>
						<Col xs={24} sm={8}><Form.Item name="is_private" label="Perfil privado" valuePropName="checked"><Switch /></Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item name="password" label="Nova senha" hasFeedback rules={[{min: 8, message: "Mínimo de 8 caracteres."}]}><Input.Password /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item name="password_confirmation" label="Confirmar senha" hasFeedback dependencies={["password"]} rules={[({getFieldValue}) => ({ validator(rule, value) { if( !getFieldValue("password") || !value || getFieldValue("password") === value ) return Promise.resolve(); return Promise.reject("As senhas devem ser iguais."); } })]}><Input.Password /></Form.Item></Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
