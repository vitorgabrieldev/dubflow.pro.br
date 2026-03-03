import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Switch } from "antd";

import { notificationsAdminService } from "./../../redux/services";
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
		this.state = {isLoading: true, isSending: false, uuid: 0};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		notificationsAdminService.show({uuid})
		.then((response) => {
			const item = response.data.data;
			this.setState({isLoading: false}, () => {
				this.form.setFieldsValue({
					type   : item.type,
					title  : item.data?.title,
					message: item.data?.message,
					is_read: !!item.is_read,
				});
			});
		})
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {uuid: this.state.uuid, ...values, is_read: values.is_read ? 1 : 0};

		this.setState({isSending: true});
		notificationsAdminService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Notificação atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar notificação [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="type" label="Tipo" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input /></Form.Item>
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input /></Form.Item>
					<Form.Item name="message" label="Mensagem" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="is_read" label="Marcar como lida" valuePropName="checked"><Switch /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
