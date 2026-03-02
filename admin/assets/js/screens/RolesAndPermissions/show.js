import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Checkbox, Col, Form, Modal, Row } from "antd";

import moment from "moment";

import { permissionService, roleAndPermissionService } from "./../../redux/services";

import { UIDrawerForm } from "./../../components";

const config = {
	externalName: "papel e permissões",
};

class Show extends Component {
	static propTypes = {
		visible : PropTypes.bool.isRequired,
		onClose : PropTypes.func.isRequired,
		external: PropTypes.bool,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading               : true,
			permissions             : [],
			permissionsSelected     : [],
			permissionsCheckAll     : [],
			permissionsIndeterminate: [],
			uuid                    : 0,
			item                    : {},
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
			item     : {},
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

			let newPermissionsSelected      = item.permissions.map(permission => permission.uuid);
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
				isLoading               : false,
				permissionsSelected     : newPermissionsSelected,
				permissionsCheckAll     : newPermissionsCheckAll,
				permissionsIndeterminate: newPermissionsIndeterminate,
				permissions             : permissions,
				item                    : item,
			});
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
			permissions             : [],
			permissionsSelected     : [],
			permissionsCheckAll     : [],
			permissionsIndeterminate: [],
			item                    : {},
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	render() {
		const {visible}                                                                                                = this.props;
		const {uuid, isLoading, item, permissions, permissionsSelected, permissionsCheckAll, permissionsIndeterminate} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar ${this.props.external ? config.externalName : "registro"} [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Nome">
						{item.name}
					</Form.Item>
					<Form.Item label="Descrição">
						{item.description}
					</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Permissões">
								{item.permissions_count}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Usuários">
								{item.users_count}
							</Form.Item>
						</Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Criação">
								{moment(item.created_at).calendar()}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Última atualização">
								{moment(item.updated_at).calendar()}
							</Form.Item>
						</Col>
					</Row>
					<label className="form-label">Permissões</label>
					{permissions.map((permissionGroup, key) => (
						<Card key={key} title={permissionGroup.name} style={{marginBottom: 16}}>
							<Checkbox disabled indeterminate={permissionsIndeterminate.indexOf(permissionGroup.key) !== -1} checked={permissionsCheckAll.indexOf(permissionGroup.key) !== -1} style={{marginBottom: 20}}>Controle total</Checkbox>
							{permissionGroup.permissions.map((permission, key_p) => (
								<div key={key_p} style={{marginBottom: 5}}>
									<Checkbox disabled checked={permissionsSelected.indexOf(permission.uuid) !== -1}>{permission.name}</Checkbox>
								</div>
							))}
						</Card>
					))}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
