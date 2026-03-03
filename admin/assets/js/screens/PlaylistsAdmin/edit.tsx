import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Select } from "antd";

import { communitiesService, playlistsAdminService } from "./../../redux/services";
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
			isLoading: true,
			isSending: false,
			uuid     : 0,
			communities: [],
		};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		let item;

		playlistsAdminService.show({uuid})
		.then((response) => {
			item = response.data.data;
			return communitiesService.getAutocomplete({orderBy: "name:asc", with_deleted: true});
		})
		.then((response) => {
			this.setState({isLoading: false, communities: response.data.data || []}, () => {
				this.form.setFieldsValue({
					organization_id: item.organization_id,
					title         : item.title,
					slug          : item.slug,
					description   : item.description,
					work_title    : item.work_title,
					season_number : item.season_number,
					release_year  : item.release_year,
					visibility    : item.visibility,
				});
			});
		})
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {uuid: this.state.uuid, ...values};
		if( payload.release_year ) payload.release_year = Number(payload.release_year);
		if( payload.season_number ) payload.season_number = Number(payload.season_number);

		this.setState({isSending: true});
		playlistsAdminService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Playlist atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, communities} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar playlist [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
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

export default Edit;
