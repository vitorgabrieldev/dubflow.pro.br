import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";
import moment from "moment";

import { platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
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
		this.setState({isLoading: true, uuid, item: {}});

		platformUsersService.show({uuid})
		.then((response) => {
			this.setState({
				isLoading: false,
				item     : response.data.data,
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

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={560}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar usuário [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Nome">{item.name}</Form.Item>
					<Form.Item label="E-mail">{item.email}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Username">{item.username || "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Nome artístico">{item.stage_name || "-"}</Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Estado">{item.state || "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Cidade">{item.city || "-"}</Form.Item></Col>
					</Row>
					<Form.Item label="Bio">{item.bio || "-"}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Conta ativa"><Switch disabled checked={!!item.is_active} /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Perfil privado"><Switch disabled checked={!!item.is_private} /></Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Criação">{item.created_at ? moment(item.created_at).calendar() : "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Última atualização">{item.updated_at ? moment(item.updated_at).calendar() : "-"}</Form.Item></Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
