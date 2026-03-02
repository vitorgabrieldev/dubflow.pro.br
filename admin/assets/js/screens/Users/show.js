import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Col, Form, Modal, Row, Switch } from "antd";

import moment from "moment";

import { userService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
} from "./../../components";

const config = {
	externalName: "usuário administrador",
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
			isLoading: true,
			uuid     : 0,
			item     : {},
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
			item     : {},
		});

		userService.show({uuid})
		.then((response) => {
			let item = response.data.data;

			this.setState({
				isLoading: false,
				item     : item,
			}, () => {
				// Upload
				if( item.avatar )
				{
					this.upload.setFiles([
						{
							uuid: item.uuid,
							url : item.avatar,
							type: 'image/jpeg',
						}
					]);
				}
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
			item: {},
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	render() {
		const {visible}               = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar ${this.props.external ? config.externalName : "registro"} [${uuid}]`}>
				<Form layout="vertical">
					<UIUpload
						ref={el => this.upload = el}
						label="Avatar"
						disabled
					/>
					<Form.Item label="Nome">
						{item.name}
					</Form.Item>
					<Form.Item label="E-mail">
						{item.email}
					</Form.Item>
					<Form.Item label="Ativo">
						<Switch disabled checked={item.is_active} />
					</Form.Item>
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
					<label className="form-label">Papéis</label>
					<div className="roles">
						{item.roles && item.roles.map((role, index) => (
							<Card key={index} style={{marginTop: index > 0 ? 15 : 0}} title={role.name}>
								{role.description}
							</Card>
						))}
					</div>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
