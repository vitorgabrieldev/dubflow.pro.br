import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Select, Switch } from "antd";
import moment from "moment";

import { notificationsAdminService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";
import { NOTIFICATION_TYPE_OPTIONS } from "./../../config/notificationTypes";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {isLoading: true, isSending: false, users: []};
	}

	onOpen = () => {
		this.setState({isLoading: true});
		platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"})
		.then((response) => this.setState({isLoading: false, users: response.data.data || []}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {
			...values,
		};

		if( values.is_read ) {
			payload.read_at = moment().format("YYYY-MM-DDTHH:mm:ssZ");
		}

		delete payload.is_read;

		this.setState({isSending: true});
		notificationsAdminService.create(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Notificação criada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, users} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title="Inserir nova notificação">
				<Form id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish} initialValues={{type: "admin.manual", is_read: false}}>
					<Form.Item name="user_uuid" label="Usuário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione um usuário">
							{users.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="type" label="Tipo" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select showSearch optionFilterProp="children" placeholder="Selecione o tipo">
							{NOTIFICATION_TYPE_OPTIONS.map((type) => (
								<Select.Option key={type.value} value={type.value}>
									{type.label}
								</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input /></Form.Item>
					<Form.Item name="message" label="Mensagem" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="is_read" label="Marcar como lida" valuePropName="checked"><Switch /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
