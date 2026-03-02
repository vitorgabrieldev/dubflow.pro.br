import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Checkbox, Form, Input, message, Modal } from "antd";

import { permissionService, roleAndPermissionService } from "./../../redux/services";

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
			isLoading               : true,
			isSending               : false,
			permissions             : [],
			permissionsSelected     : [],
			permissionsCheckAll     : [],
			permissionsIndeterminate: [],
			uuid                    : 0,
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
		});

		let item = {};

		roleAndPermissionService.show({uuid})
		.then((response) => {
			item = response.data.data;

			return permissionService.getAutocomplete({
				orderBy: "group:asc|order:asc"
			});
		})
		.then((response) => {
			let permissions = response.data.data;

			this.setState({
				isLoading  : false,
				permissions: permissions,
			});

			// Fill form
			this.fillForm(item, permissions);
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

	fillForm = (data, permissions) => {
		this.form.setFieldsValue({
			name       : data.name,
			description: data.description,
		});

		let newPermissionsSelected      = data.permissions.map(permission => permission.uuid);
		let newPermissionsCheckAll      = [];
		let newPermissionsIndeterminate = [];

		permissions.forEach(permissionGroup => {
			let groupTotal         = permissionGroup.permissions.length;
			let groupTotalSelected = 0;

			permissionGroup.permissions.forEach(permission => {
				let permissionIndex = newPermissionsSelected.indexOf(permission.uuid);

				if( permissionIndex !== -1 )
				{
					groupTotalSelected++;
				}
			});

			if( groupTotal === groupTotalSelected )
			{
				newPermissionsCheckAll.push(permissionGroup.key);
			}
			else if( groupTotalSelected > 0 )
			{
				newPermissionsIndeterminate.push(permissionGroup.key);
			}
		});

		this.setState({
			permissionsSelected     : newPermissionsSelected,
			permissionsCheckAll     : newPermissionsCheckAll,
			permissionsIndeterminate: newPermissionsIndeterminate,
		});
	};

	resetFields = () => {
		this.setState({
			permissions             : [],
			permissionsSelected     : [],
			permissionsCheckAll     : [],
			permissionsIndeterminate: [],
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	onFinish = (values) => {
		const {permissionsSelected} = this.state;

		if( !permissionsSelected.length )
		{
			Modal.error({
				title  : "Ocorreu um erro!",
				content: "Selecione pelo menos uma permissão.",
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

		// Permissions
		data.permissions = permissionsSelected;

		roleAndPermissionService.edit(data)
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

	onChangePermission = (uuid, groupKey, checked) => {
		const {permissions, permissionsSelected, permissionsCheckAll, permissionsIndeterminate} = this.state;

		let newPermissionsCheckAll      = [...permissionsCheckAll];
		let newPermissionsIndeterminate = [...permissionsIndeterminate];
		let newPermissionsSelected      = [...permissionsSelected];
		const indexSelected             = newPermissionsSelected.indexOf(uuid);
		const groupIndex                = permissions.findIndex(item => item.key === groupKey);
		const groupIndexCheckAll        = newPermissionsCheckAll.indexOf(groupKey);
		const groupIndexIndeterminate   = newPermissionsIndeterminate.indexOf(groupKey);

		if( checked )
		{
			if( indexSelected === -1 )
			{
				newPermissionsSelected.push(uuid);
			}
		}
		else
		{
			if( indexSelected !== -1 )
			{
				newPermissionsSelected.splice(indexSelected, 1);
			}
		}

		let groupTotal         = permissions[groupIndex].permissions.length;
		let groupTotalSelected = 0;

		permissions[groupIndex].permissions.forEach(permission => {
			let permissionIndex = newPermissionsSelected.indexOf(permission.uuid);

			if( permissionIndex !== -1 )
			{
				groupTotalSelected++;
			}
		});

		if( groupTotal === groupTotalSelected )
		{
			if( groupIndexCheckAll === -1 )
			{
				newPermissionsCheckAll.push(groupKey);
			}

			if( groupIndexIndeterminate !== -1 )
			{
				newPermissionsIndeterminate.splice(groupIndexIndeterminate, 1);
			}
		}
		else
		{
			if( groupIndexCheckAll !== -1 )
			{
				newPermissionsCheckAll.splice(groupIndexCheckAll, 1);
			}

			if( groupTotalSelected > 0 )
			{
				if( groupIndexIndeterminate === -1 )
				{
					newPermissionsIndeterminate.push(groupKey);
				}
			}
			else
			{
				if( groupIndexIndeterminate !== -1 )
				{
					newPermissionsIndeterminate.splice(groupIndexIndeterminate, 1);
				}
			}
		}

		this.setState({
			permissionsSelected     : newPermissionsSelected,
			permissionsCheckAll     : newPermissionsCheckAll,
			permissionsIndeterminate: newPermissionsIndeterminate,
		});
	};

	onChangeAllPermissions = (key, checked) => {
		const {permissions, permissionsSelected, permissionsCheckAll, permissionsIndeterminate} = this.state;

		let newPermissionsCheckAll      = [...permissionsCheckAll];
		let newPermissionsSelected      = [...permissionsSelected];
		let newPermissionsIndeterminate = [...permissionsIndeterminate];
		const indexCheckAll             = newPermissionsCheckAll.indexOf(key);
		const indexIndeterminate        = newPermissionsIndeterminate.indexOf(key);
		const groupIndex                = permissions.findIndex(item => item.key === key);

		if( checked )
		{
			if( indexCheckAll === -1 )
			{
				newPermissionsCheckAll.push(key);
			}

			if( indexIndeterminate !== -1 )
			{
				newPermissionsIndeterminate.splice(indexIndeterminate, 1);
			}

			permissions[groupIndex].permissions.forEach(permission => {
				let permissionIndex = newPermissionsSelected.indexOf(permission.uuid);

				if( permissionIndex === -1 )
				{
					newPermissionsSelected.push(permission.uuid);
				}
			});
		}
		else
		{
			if( indexCheckAll !== -1 )
			{
				newPermissionsCheckAll.splice(indexCheckAll, 1);
			}

			permissions[groupIndex].permissions.forEach(permission => {
				let permissionIndex = newPermissionsSelected.indexOf(permission.uuid);

				if( permissionIndex !== -1 )
				{
					newPermissionsSelected.splice(permissionIndex, 1);
				}
			});
		}

		this.setState({
			permissionsSelected     : newPermissionsSelected,
			permissionsCheckAll     : newPermissionsCheckAll,
			permissionsIndeterminate: newPermissionsIndeterminate,
		});
	};

	render() {
		const {visible}                                                                                                     = this.props;
		const {uuid, isLoading, isSending, permissions, permissionsSelected, permissionsCheckAll, permissionsIndeterminate} = this.state;

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
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input />
					</Form.Item>
					<Form.Item name="description" label="Descrição" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input />
					</Form.Item>
					<label className="form-label">Permissões</label>
					{permissions.map((permissionGroup, key) => (
						<Card key={key} title={permissionGroup.name} style={{marginBottom: 16}}>
							<Checkbox onChange={(e) => this.onChangeAllPermissions(permissionGroup.key, e.target.checked)} indeterminate={permissionsIndeterminate.indexOf(permissionGroup.key) !== -1} checked={permissionsCheckAll.indexOf(permissionGroup.key) !== -1} style={{marginBottom: 20}}>Controle total</Checkbox>
							{permissionGroup.permissions.map((permission, key_p) => (
								<div key={key_p} style={{marginBottom: 5}}>
									<Checkbox onChange={(e) => this.onChangePermission(permission.uuid, permissionGroup.key, e.target.checked)} checked={permissionsSelected.indexOf(permission.uuid) !== -1}>{permission.name}</Checkbox>
								</div>
							))}
						</Card>
					))}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
