import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Switch } from "antd";

import { platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading     : false,
			isSending     : false,
			passwordRandom: true,
		};
	}

	onOpen = () => {
		this.setState({
			isLoading     : false,
			passwordRandom: true,
		});
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		this.setState({isSending: true});

		platformUsersService.create(values)
		.then(() => {
			this.setState({isSending: false});
			message.success("Usuário cadastrado com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(data) });
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, passwordRandom} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={560}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Inserir novo usuário da plataforma">
				<Form
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					initialValues={{
						password_random: true,
						is_active      : true,
						is_private     : false,
					}}>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Input />
					</Form.Item>
					<Form.Item name="email" label="E-mail" hasFeedback rules={[{required: true, message: "Campo obrigatório."}, {type: "email", message: "Informe um e-mail válido."}]}> 
						<Input />
					</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item name="username" label="Username">
								<Input />
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item name="stage_name" label="Nome artístico">
								<Input />
							</Form.Item>
						</Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item name="state" label="Estado">
								<Input />
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item name="city" label="Cidade">
								<Input />
							</Form.Item>
						</Col>
					</Row>
					<Form.Item name="bio" label="Bio">
						<Input.TextArea rows={4} />
					</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={8}>
							<Form.Item name="password_random" label="Gerar senha" valuePropName="checked">
								<Switch onChange={(checked) => this.setState({passwordRandom: checked})} />
							</Form.Item>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item name="is_active" label="Conta ativa" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item name="is_private" label="Perfil privado" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Col>
					</Row>
					{!passwordRandom && (
						<Row gutter={16}>
							<Col xs={24} sm={12}>
								<Form.Item name="password" label="Senha" hasFeedback rules={[{required: true, message: "Campo obrigatório."}, {min: 8, message: "Mínimo de 8 caracteres."}]}> 
									<Input.Password />
								</Form.Item>
							</Col>
							<Col xs={24} sm={12}>
								<Form.Item name="password_confirmation" label="Confirmar senha" hasFeedback dependencies={["password"]} rules={[{required: true, message: "Campo obrigatório."}, ({getFieldValue}) => ({ validator(rule, value) { if( !value || getFieldValue("password") === value ) return Promise.resolve(); return Promise.reject("As senhas devem ser iguais."); } })]}> 
									<Input.Password />
								</Form.Item>
							</Col>
						</Row>
					)}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
