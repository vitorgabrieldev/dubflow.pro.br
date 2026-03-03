import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row } from "antd";
import moment from "moment";

import { opportunitiesService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = { isLoading: true, uuid: 0, item: {} };
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid, item: {}});
		opportunitiesService.show({uuid})
		.then((response) => this.setState({isLoading: false, item: response.data.data}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar oportunidade [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Título">{item.title}</Form.Item>
					<Form.Item label="Comunidade">{item.organization?.name || "-"}</Form.Item>
					<Form.Item label="Criador">{item.creator ? `${item.creator.name} (${item.creator.email})` : "-"}</Form.Item>
					<Form.Item label="Descrição">{item.description || "-"}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Status">{item.status}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Visibilidade">{item.visibility}</Form.Item></Col>
					</Row>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Início">{item.starts_at ? moment(item.starts_at).format("DD/MM/YYYY HH:mm") : "-"}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Fim">{item.ends_at ? moment(item.ends_at).format("DD/MM/YYYY HH:mm") : "-"}</Form.Item></Col>
					</Row>
					<Form.Item label="Liberação de resultados">{item.results_release_at ? moment(item.results_release_at).format("DD/MM/YYYY HH:mm") : "-"}</Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item label="Personagens">{item.characters_count ?? 0}</Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item label="Inscrições">{item.submissions_count ?? 0}</Form.Item></Col>
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
