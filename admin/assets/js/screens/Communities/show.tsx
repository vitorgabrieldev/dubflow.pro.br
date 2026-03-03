import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";
import moment from "moment";

import { communitiesService } from "./../../redux/services";
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

		communitiesService.show({uuid})
		.then((response) => this.setState({isLoading: false, item: response.data.data}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar comunidade [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Nome">{item.name}</Form.Item>
					<Form.Item label="Slug">{item.slug}</Form.Item>
					<Form.Item label="Dono">{item.owner ? `${item.owner.name} (${item.owner.email})` : "-"}</Form.Item>
					<Form.Item label="Website">{item.website_url || "-"}</Form.Item>
					<Form.Item label="Descrição">{item.description || "-"}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Pública"><Switch disabled checked={!!item.is_public} /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Verificada"><Switch disabled checked={!!item.is_verified} /></Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Seguidores">{item.followers_count ?? 0}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Playlists">{item.playlists_count ?? 0}</Form.Item></Col>
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
