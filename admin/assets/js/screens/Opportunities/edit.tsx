import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { DatePicker, Form, Input, message, Modal, Select } from "antd";
import moment from "moment";

import { communitiesService, opportunitiesService, platformUsersService } from "./../../redux/services";
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
			users      : [],
		};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		let item;

		Promise.all([
			opportunitiesService.show({uuid}).then((response) => {
				item = response.data.data;
			}),
			communitiesService.getAutocomplete({orderBy: "name:asc", with_deleted: true}),
			platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"}),
		]).then(([, communitiesResponse, usersResponse]) => {
			this.setState({
				isLoading  : false,
				communities: communitiesResponse.data.data || [],
				users      : usersResponse.data.data || [],
			}, () => {
				this.form.setFieldsValue({
					organization_id     : item.organization_id,
					created_by_user_uuid: item.creator?.uuid,
					title               : item.title,
					description         : item.description,
					status              : item.status,
					visibility          : item.visibility,
					starts_at           : item.starts_at ? moment(item.starts_at) : null,
					ends_at             : item.ends_at ? moment(item.ends_at) : null,
					results_release_at  : item.results_release_at ? moment(item.results_release_at) : null,
				});
			});
		}).catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	normalizePayload = (values) => {
		return {
			uuid: this.state.uuid,
			...values,
			starts_at         : values.starts_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			ends_at           : values.ends_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			results_release_at: values.results_release_at.format("YYYY-MM-DDTHH:mm:ssZ"),
		};
	};

	onFinish = (values) => {
		this.setState({isSending: true});
		opportunitiesService.edit(this.normalizePayload(values))
		.then(() => {
			this.setState({isSending: false});
			message.success("Oportunidade atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, communities, users} = this.state;

		return (
			<UIDrawerForm visible={visible} width={600} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar oportunidade [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="organization_id" label="Comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione uma comunidade">
							{communities.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="created_by_user_uuid" label="Criador" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione o usuário criador">
							{users.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <Input /></Form.Item>
					<Form.Item name="description" label="Descrição"><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="status" label="Status" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <Select><Select.Option value="draft">draft</Select.Option><Select.Option value="published">published</Select.Option><Select.Option value="closed">closed</Select.Option><Select.Option value="results_released">results_released</Select.Option><Select.Option value="archived">archived</Select.Option></Select></Form.Item>
					<Form.Item name="visibility" label="Visibilidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <Select><Select.Option value="external">external</Select.Option><Select.Option value="internal">internal</Select.Option></Select></Form.Item>
					<Form.Item name="starts_at" label="Início" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" /></Form.Item>
					<Form.Item name="ends_at" label="Fim" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" /></Form.Item>
					<Form.Item name="results_release_at" label="Liberação de resultados" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
