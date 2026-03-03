import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Select } from "antd";

import { communitiesService, playlistsAdminService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading: true,
			isSending: false,
			communities: [],
		};
	}

	onOpen = () => {
		this.setState({isLoading: true});
		communitiesService.getAutocomplete({orderBy: "name:asc"})
		.then((response) => this.setState({isLoading: false, communities: response.data.data || []}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {...values};
		if( payload.release_year ) payload.release_year = Number(payload.release_year);
		if( payload.season_number ) payload.season_number = Number(payload.season_number);

		this.setState({isSending: true});
		playlistsAdminService.create(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Playlist criada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, communities} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title="Inserir nova playlist">
				<Form id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish} initialValues={{visibility: "public"}}>
					<Form.Item name="organization_id" label="Comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione uma comunidade">
							{communities.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input /></Form.Item>
					<Form.Item name="slug" label="Slug"><Input /></Form.Item>
					<Form.Item name="description" label="Descrição"><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="work_title" label="Obra"><Input /></Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}><Form.Item name="season_number" label="Número da temporada"><Input /></Form.Item></Col>
						<Col xs={24} sm={12}><Form.Item name="release_year" label="Ano de lançamento"><Input /></Form.Item></Col>
					</Row>
					<Form.Item name="visibility" label="Visibilidade"><Select><Select.Option value="public">Pública</Select.Option><Select.Option value="private">Privada</Select.Option><Select.Option value="internal">Interna</Select.Option></Select></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
