import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Checkbox, Form, Input, message, Modal, Select, Switch, Tag } from "antd";

import { roleAndPermissionService, userService } from "./../../redux/services";

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
			isLoading    : true,
			isSending    : false,
			roles        : [],
			rolesSelected: [],
			uuid         : 0,
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
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
			});

			// Fill form
			this.fillForm(item);
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

	fillForm = (data) => {
		this.form.setFieldsValue({
			name     : data.name,
			email    : data.email,
			is_active: data.is_active,
		});

		this.setState({
			rolesSelected: data.roles.map(role => role.uuid),
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

	onFinish = (values) => {
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

		const {uuid} = this.state;

		const data = {...values};

		// uuid
		data.uuid = uuid;

		// Roles
		data.roles = rolesSelected;

		userService.edit(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success("Registro atualizado com sucesso.");

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
		const {visible}                                          = this.props;
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
					ref={el => this.form = el}
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
