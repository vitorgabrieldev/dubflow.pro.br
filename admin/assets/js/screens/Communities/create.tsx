import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Select, Switch } from "antd";

import { communitiesService, platformUsersService } from "./../../redux/services";
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
			owners   : [],
		};
	}

	onOpen = () => {
		this.setState({isLoading: true});

		platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"})
		.then((response) => {
			this.setState({
				isLoading: false,
				owners   : response.data.data || [],
			});
		})
		.catch((data) => {
			Modal.error({ title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose() });
		});
	};

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		this.setState({isSending: true});

		communitiesService.create(values)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comunidade criada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(data) });
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, owners} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title="Inserir nova comunidade">
				<Form id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish} initialValues={{is_public: true, is_verified: false}}>
					<Form.Item name="owner_uuid" label="Dono da comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione um usuário">
							{owners.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <Input /></Form.Item>
					<Form.Item name="slug" label="Slug"><Input /></Form.Item>
					<Form.Item name="website_url" label="Website"><Input placeholder="https://..." /></Form.Item>
					<Form.Item name="description" label="Descrição"><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="is_public" label="Pública" valuePropName="checked"><Switch /></Form.Item>
					<Form.Item name="is_verified" label="Verificada" valuePropName="checked"><Switch /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
