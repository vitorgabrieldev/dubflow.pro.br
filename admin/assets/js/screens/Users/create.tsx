import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Checkbox, Col, Form, Input, message, Modal, Row, Select, Switch, Tag } from "antd";

import { roleAndPermissionService, userService } from "./../../redux/services";

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
			isLoading     : true,
			isSending     : false,
			roles         : [],
			rolesSelected : [],
			passwordRandom: true,
		};
	}

	onOpen = () => {
		this.setState({
			isLoading: true,
		});

		roleAndPermissionService.getAutocomplete({
			orderBy: "is_system:desc|name:asc",
		})
		.then((response) => {
			this.setState({
				isLoading: false,
				roles    : response.data.data,
			});

			if( this.avatarUpload ) {
				this.avatarUpload.reset();
			}
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => {
					// Force close
					return this.onClose();
				}
			});
		});
	};

	resetFields = () => {
		this.setState({
			roles        : [],
			rolesSelected: [],
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	onFinish = async (values) => {
		const {rolesSelected} = this.state;

		if( !rolesSelected.length )
		{
			Modal.error({
				title  : "Ocorreu um erro!",
				content: "Selecione pelo menos um papél.",
			});

			return false;
		}

		this.setState({
			isSending: true,
		});

		const data = {...values};

		// Roles
		data.roles = rolesSelected;

		const avatar = this.avatarUpload?.getFiles();
		if( avatar?.files?.length ) {
			const avatarFile = avatar.files[0];
			const avatarToUpload = await extractUploadFile(avatarFile, "admin-avatar");
			if( avatarToUpload ) {
				data.avatar = avatarToUpload;
			}
		}

		userService.create(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success("Registro cadastrado com sucesso.");

			// Callback
			this.props.onComplete();
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

	onChangeRole = (uuid, checked) => {
		const {rolesSelected} = this.state;

		let newRolesSelected = [...rolesSelected];
		const indexSelected  = newRolesSelected.indexOf(uuid);

		if( checked )
		{
			if( indexSelected === -1 )
			{
				newRolesSelected.push(uuid);
			}
		}
		else
		{
			if( indexSelected !== -1 )
			{
				newRolesSelected.splice(indexSelected, 1);
			}
		}

		this.setState({
			rolesSelected: newRolesSelected,
		});
	};

	render() {
		const {visible} = this.props;

		const {isLoading, isSending, roles, rolesSelected, passwordRandom} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Inserir novo registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					initialValues={{
						password_random: true,
						is_active      : true,
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
						acceptedFiles={["jpg", "jpeg", "png"]}
						help="Opcional. Foto do usuário administrador."
					/>
					<Form.Item name="password_random" label="Gerar senha aleatória" valuePropName="checked">
						<Switch onChange={(checked) => this.setState({passwordRandom: checked})} />
					</Form.Item>
					{!passwordRandom && (
						<Row gutter={16}>
							<Col xs={24} sm={12}>
								<Form.Item name="password" label="Senha" hasFeedback rules={[
									{required: true, message: "Campo obrigatório."},
									{min: 6, message: "Deve conter no mínimo 6 caracteres."},
								]}>
									<Input type="password" />
								</Form.Item>
							</Col>
							<Col xs={24} sm={12}>
								<Form.Item
									name="password_confirmation"
									label="Confirmar senha"
									hasFeedback
									dependencies={['password']}
									rules={[
										{required: true, message: "Campo obrigatório."},
										({getFieldValue}) => ({
											validator(rule, value) {
												if( !value || getFieldValue('password') === value )
												{
													return Promise.resolve();
												}

												return Promise.reject("Deve conter o mesmo valor de Nova senha.");
											},
										}),
									]}>
									<Input type="password" />
								</Form.Item>
							</Col>
						</Row>
					)}
					<Form.Item name="is_active" label="Ativo" valuePropName="checked">
						<Switch />
					</Form.Item>
					<label className="form-label">Papéis</label>
					<div className="roles">
						{roles.map((role, index) => (
							<Card key={index} style={{marginTop: index > 0 ? 15 : 0}} title={<Checkbox onChange={(e) => this.onChangeRole(role.uuid, e.target.checked)} checked={rolesSelected.indexOf(role.uuid) !== -1}>{role.name}</Checkbox>}>
								{role.description}
							</Card>
						))}
					</div>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
