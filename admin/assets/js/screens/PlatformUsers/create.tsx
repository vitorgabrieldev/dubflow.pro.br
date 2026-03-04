import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Alert, Col, Form, Input, message, Modal, Row, Switch } from "antd";

import { platformUsersService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

const extractUploadFile = async (file, fallbackBaseName = "upload") => {
	if( !file ) return null;
	if( file instanceof File || file instanceof Blob ) return file;
	if( file.originFileObj && (file.originFileObj instanceof File || file.originFileObj instanceof Blob) ) {
		return file.originFileObj;
	}

	if( typeof file.url === "string" && /^blob:/i.test(file.url) ) {
		try {
			const response = await fetch(file.url);
			const blob = await response.blob();
			const extension = String(file.extension || "bin").toLowerCase();
			const normalizedExtension = extension === "jpg" ? "jpeg" : extension;
			const mimeFromFileType = `image/${normalizedExtension}`;
			const type = blob.type || mimeFromFileType;
			const fileName = `${fallbackBaseName}.${extension}`;

			return new File([blob], fileName, {type});
		} catch (error) {
			return null;
		}
	}

	return null;
};

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
			passwordRandom: false,
		};
	}

	onOpen = () => {
		this.setState({
			isLoading     : false,
			passwordRandom: false,
		});

		if( this.avatarUpload ) {
			this.avatarUpload.reset();
		}
	};

	onClose = () => this.props.onClose();

	onFinish = async (values) => {
		this.setState({isSending: true});

		const payload = {...values};
		const avatar = this.avatarUpload?.getFiles();
		if( avatar?.files?.length ) {
			const avatarFile = avatar.files[0];
			const avatarToUpload = await extractUploadFile(avatarFile, "platform-user-avatar");
			if( avatarToUpload ) {
				payload.avatar = avatarToUpload;
			}
		}

		platformUsersService.create(payload)
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
						password_random: false,
						is_active      : true,
						is_private     : false,
					}}>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Input />
					</Form.Item>
					<Form.Item name="email" label="E-mail" hasFeedback rules={[{required: true, message: "Campo obrigatório."}, {type: "email", message: "Informe um e-mail válido."}]}> 
						<Input />
					</Form.Item>
					<UIUpload
						ref={(el) => this.avatarUpload = el}
						label="Avatar"
						labelError="avatar"
						maxFiles={1}
						maxFileSize={4}
						acceptedFiles={["jpg", "jpeg", "png", "webp"]}
						help="Opcional. Foto de perfil do usuário."
					/>
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
							<Form.Item name="password_random" label="Gerar senha automática" valuePropName="checked">
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
						<>
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
							<Alert
								type="info"
								showIcon
								message="Orientações para senha segura"
								description={
									<ul style={{margin: 0, paddingLeft: 18}}>
										<li>Use no mínimo 8 caracteres.</li>
										<li>Combine letras maiúsculas, minúsculas, números e símbolos.</li>
										<li>Evite nomes, datas de nascimento e sequências óbvias.</li>
										<li>Não reutilize senhas de outros serviços.</li>
									</ul>
								}
							/>
						</>
					)}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
