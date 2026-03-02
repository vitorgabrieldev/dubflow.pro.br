import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Switch, InputNumber, Select, Row, Col } from "antd";

import { ReasonsForRefusalService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

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
			uuid     : 0,
			isLoading: true,
			isSending: false,
			type: [
				{name: "Usuário", value: 'customer'},
				{name: "Profissional", value: 'profissional'},
				{name: "Todos", value: 'todos'},
			],
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
		});

		ReasonsForRefusalService.show({uuid})
		.then((response) => {
			const item = response.data.data;
			this.setState({
				isLoading: false,
			}, () => {
				// Fill form
				this.fillForm(item);
			});
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => {
					// Force close
					return this.onClose();
				}
			});
		});
	};

	fillForm = (data) => {
		this.form.setFieldsValue({
			title     : data.title,
			order     : data.order,
			is_active: data.is_active,
			show: data.show,
			type     : data.type,
		});
	};

	onClose = () => {
		// Callback
		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const {uuid} = this.state;

		const data = {...values};

		// uuid
		data.uuid = uuid;

		ReasonsForRefusalService.edit(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Success message
			message.success("Registro atualizado com sucesso.");

			// Callback
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({
				isSending: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	render() {
		const {visible} = this.props;

		const {isLoading, isSending, type} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title={`Editar registro`}>
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>
					
					<Form.Item name="type" label="Tipo" rules={[{required: true}]}>
						<Select
							filterOption={false}
							allowClear
							labelInValue={false}
							options={type.map((item) => ({
								value: item.value,
								label: item.name
							}))}
						/>
					</Form.Item>

					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item name="order" label="Ordem">
						<InputNumber maxLength={191} />
					</Form.Item>

					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item name="show" label="Exibir no app" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item name="is_active" label="Ativo" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
