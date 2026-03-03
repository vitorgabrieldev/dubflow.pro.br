import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Select } from "antd";

import { commentsAdminService, platformUsersService } from "./../../redux/services";
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
		this.state = {isLoading: true, isSending: false, uuid: 0, users: []};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		let item;

		commentsAdminService.show({uuid})
		.then((response) => {
			item = response.data.data;
			return platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"});
		})
		.then((response) => {
			this.setState({isLoading: false, users: response.data.data || []}, () => {
				this.form.setFieldsValue({
					post_id   : item.post_id,
					user_uuid : item.user?.uuid,
					parent_id : item.parent_id,
					body      : item.body,
				});
			});
		})
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {uuid: this.state.uuid, ...values};
		if( payload.parent_id ) payload.parent_id = Number(payload.parent_id);

		this.setState({isSending: true});
		commentsAdminService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comentário atualizado com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, users} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar comentário [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="post_id" label="ID do post" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input disabled /></Form.Item>
					<Form.Item name="user_uuid" label="Usuário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione um usuário">
							{users.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="parent_id" label="ID do comentário pai (resposta)"><Input /></Form.Item>
					<Form.Item name="body" label="Comentário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input.TextArea rows={5} /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
