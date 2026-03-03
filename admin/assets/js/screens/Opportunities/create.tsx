import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { DatePicker, Form, Input, message, Modal, Select } from "antd";

import { communitiesService, opportunitiesService, platformUsersService } from "./../../redux/services";
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
			users      : [],
		};
	}

	onOpen = () => {
		this.setState({isLoading: true});
		Promise.all([
			communitiesService.getAutocomplete({orderBy: "name:asc"}),
			platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"}),
		]).then(([communitiesResponse, usersResponse]) => {
			this.setState({
				isLoading   : false,
				communities : communitiesResponse.data.data || [],
				users       : usersResponse.data.data || [],
			});
		}).catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	normalizePayload = (values) => {
		return {
			...values,
			starts_at         : values.starts_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			ends_at           : values.ends_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			results_release_at: values.results_release_at.format("YYYY-MM-DDTHH:mm:ssZ"),
		};
	};

	onFinish = (values) => {
		this.setState({isSending: true});
		opportunitiesService.create(this.normalizePayload(values))
		.then(() => {
			this.setState({isSending: false});
			message.success("Oportunidade criada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, communities, users} = this.state;

		return (
			<UIDrawerForm visible={visible} width={600} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title="Inserir nova oportunidade">
				<Form id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish} initialValues={{status: "draft", visibility: "external"}}>
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

export default Create;
