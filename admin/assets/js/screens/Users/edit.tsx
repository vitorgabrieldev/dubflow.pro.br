import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Checkbox, Form, Input, message, Modal, Switch } from "antd";

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

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading    : true,
			isSending    : false,
			roles        : [],
			rolesSelected: [],
			uuid         : 0,
		};

		this.form = null;
		this.pendingFormValues = null;
	}

	setFormRef = (formRef) => {
		this.form = formRef;

		if( this.form?.setFieldsValue && this.pendingFormValues ) {
			this.form.setFieldsValue(this.pendingFormValues);
			this.pendingFormValues = null;
		}
	};

	applyFormValues = (values) => {
		if( this.form?.setFieldsValue ) {
			this.form.setFieldsValue(values);
			return;
		}

		this.pendingFormValues = values;

		window.requestAnimationFrame(() => {
			if( this.form?.setFieldsValue && this.pendingFormValues ) {
				this.form.setFieldsValue(this.pendingFormValues);
				this.pendingFormValues = null;
			}
		});
	};

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid,
		});

		let item;

		userService.show({uuid})
		.then((response) => {
			item = response.data.data;

			return roleAndPermissionService.getAutocomplete({
				orderBy: "is_system:desc|name:asc",
			});
		})
		.then((response) => {
			this.setState({
				isLoading: false,
				roles    : response.data.data,
				rolesSelected: item.roles.map(role => role.uuid),
			}, () => {
				this.applyFormValues({
					name     : item.name,
					email    : item.email,
					is_active: item.is_active,
				});

				if( this.avatarUpload ) {
					this.avatarUpload.reset();
					if( item.avatar ) {
						this.avatarUpload.setFiles([{
							uuid: `avatar-${uuid}`,
							url : item.avatar,
							type: "image/jpeg",
						}]);
					}
				}
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

	resetFields = () => {
		this.setState({
			roles        : [],
			rolesSelected: [],
		});
	};

	onClose = () => {
		this.resetFields();
		this.props.onClose();
	};

	onFinish = async (values) => {
		const {rolesSelected} = this.state;

		if( !rolesSelected.length ) {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: "Selecione pelo menos um papél.",
			});

			return false;
		}

		this.setState({
			isSending: true,
		});

		const {uuid} = this.state;
		const data = {...values};

		data.uuid = uuid;
		data.roles = rolesSelected;

		const avatar = this.avatarUpload?.getFiles();

		if( avatar?.filesDeleted?.length ) {
			data.remove_avatar = true;
		}

		if( avatar?.files?.length ) {
			const avatarFile = avatar.files[0];
			const avatarToUpload = await extractUploadFile(avatarFile, "admin-avatar");
			if( avatarToUpload ) {
				data.avatar = avatarToUpload;
			}
		}

		userService.edit(data)
		.then(() => {
			this.setState({
				isSending: false,
			});

			this.resetFields();
			message.success("Registro atualizado com sucesso.");
			this.props.onComplete();
		})
		.catch((error) => {
			this.setState({
				isSending: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(error),
			});
		});
	};

	onChangeRole = (uuid, checked) => {
		const {rolesSelected} = this.state;

		let newRolesSelected = [...rolesSelected];
		const indexSelected  = newRolesSelected.indexOf(uuid);

		if( checked ) {
			if( indexSelected === -1 ) {
				newRolesSelected.push(uuid);
			}
		} else if( indexSelected !== -1 ) {
			newRolesSelected.splice(indexSelected, 1);
		}

		this.setState({
			rolesSelected: newRolesSelected,
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, roles, rolesSelected} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title={`Editar registro [${uuid}]`}>
				<Form
					ref={this.setFormRef}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>
					<Form.Item name="name" label="Nome" hasFeedback>
						<Input disabled />
					</Form.Item>
					<Form.Item name="email" label="E-mail" hasFeedback>
						<Input disabled />
					</Form.Item>
					<UIUpload
						ref={(el) => this.avatarUpload = el}
						label="Avatar"
						labelError="avatar"
						maxFiles={1}
						maxFileSize={4}
						acceptedFiles={["jpg", "jpeg", "png"]}
						help="Opcional. Atualiza a foto do usuário administrador."
					/>
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

export default Edit;
