import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row } from "antd";
import moment from "moment";

import { playlistsAdminService } from "./../../redux/services";
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
		playlistsAdminService.show({uuid})
		.then((response) => this.setState({isLoading: false, item: response.data.data}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar playlist [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Título">{item.title}</Form.Item>
					<Form.Item label="Comunidade">{item.organization?.name || "-"}</Form.Item>
					<Form.Item label="Slug">{item.slug}</Form.Item>
					<Form.Item label="Descrição">{item.description || "-"}</Form.Item>
					<Form.Item label="Obra">{item.work_title || "-"}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Temporada">{item.season_number || "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Ano">{item.release_year || "-"}</Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Visibilidade">{item.visibility}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Posts">{item.posts_count ?? 0}</Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Criação">{item.created_at ? moment(item.created_at).calendar() : "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Atualização">{item.updated_at ? moment(item.updated_at).calendar() : "-"}</Form.Item></Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
