import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { DatePicker, Form, Input, message, Modal, Select } from "antd";

import moment from "moment";

import { pushStateService, webserviceService } from "./../../redux/services";

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
			isLoading: true,
			isSending: false,
			uuid     : 0,
			states  : [],
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

		let item;

		pushStateService.show({uuid})
		.then((response) => {
			item = response.data.data;

			return webserviceService.getStates();
		}).then((response) => {
			this.setState({
				isLoading: false,
				states  : response.data.data,
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
			state_id    : data.state?.uuid ?? '',
			title       : data.title,
			scheduled_at: data.scheduled_at ? moment(data.scheduled_at) : null,
			body        : data.body,
			url         : data.url,
		});
	};

	resetFields = () => {
		this.setState({
			states: [],
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

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

		pushStateService.edit(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

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

		const {uuid, isLoading, isSending, states, type} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title={`Editar registro [${uuid}]`}>
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>

					{/* <Form.Item name="type" label="Tipo" rules={[{required: true}]}>
						<Select
							filterOption={false}
							allowClear
							labelInValue={false}
							options={type.map((item) => ({
								value: item.value,
								label: item.name
							}))}
						/>
					</Form.Item> */}

					<Form.Item name="state_id" label="Estado" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							optionFilterProp="children"
							filterOption={(input, option) => (typeof option.children === 'string' ? option.children : option.children.props.children).toLowerCase().indexOf(input.toLowerCase()) >= 0}
							allowClear
							placeholder="Selecione o estado"
							showSearch>
							{states.map((item, index) => (
								<Select.Option key={index} value={item.uuid}>{item.name}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Titulo" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={50} />
					</Form.Item>
					<Form.Item name="body" label="Mensagem" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input.TextArea maxLength={100} autosize={{minRows: 3, maxRows: 6}} />
					</Form.Item>
					<Form.Item name="scheduled_at" label="Data de agendamento">
						<DatePicker
							showTime
							format="DD/MM/YYYY HH:mm"
							style={{width: "100%"}}
						/>
					</Form.Item>
					<Form.Item name="url" label="URL" hasFeedback rules={[{type: "url", message: "Digite uma url válida."}]}>
						<Input maxLength={191} />
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
