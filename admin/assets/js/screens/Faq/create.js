import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, InputNumber, message, Modal, Select, Switch } from "antd";

import { faqService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIRichTextEditor,
} from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

const USER_TYPES = [
	{label: "Todos", value: "Todos"},
	{label: "Cliente", value: "Cliente"},
	{label: "Despachante", value: "Despachante"},
];

const normalizeUserType = (value) => {
	const normalizedValue = String(value || "").trim().toLowerCase();

	if( !normalizedValue ) return "Todos";
	if( normalizedValue === "todos" ) return "Todos";
	if( normalizedValue === "cliente" || normalizedValue === "customer" ) return "Cliente";
	if( normalizedValue === "despachante" || normalizedValue === "profissional" ) return "Despachante";

	return value;
};

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
			nextOrder: 1,
		};
	}

	onOpen = () => {
		this.resetFields();

		this.setState({
			isLoading: true,
		});

		faqService.getAdditionalInformation()
		.then((response) => {
			const nextOrder = response?.data?.data?.next_order ?? response?.data?.next_order ?? 1;

			this.setState({
				isLoading: false,
				nextOrder: nextOrder,
			}, () => {
				this.form && this.form.setFieldsValue({
					order    : nextOrder,
					is_active: true,
					user_type: "Todos",
				});
			});
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => this.onClose(),
			});
		});
	};

	resetFields = () => {
		this.form && this.form.resetFields();
		this.answer && this.answer.setValue("");
	};

	onClose = () => {
		this.resetFields();

		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const data = {
			...values,
		};

		data.user_type = normalizeUserType(data.user_type);

		if( data.order === null || typeof data.order === "undefined" || data.order === "" )
		{
			data.order = this.state.nextOrder || 1;
		}

		faqService.create(data)
		.then(() => {
			this.setState({
				isSending: false,
			});

			this.resetFields();

			message.success("Registro cadastrado com sucesso.");

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
		const {isLoading, isSending} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={560}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Incluir registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					initialValues={{
						is_active: true,
						user_type: "Todos",
					}}>
					<Form.Item name="user_type" label="Tipo do usuário" rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							showSearch
							optionFilterProp="label"
							filterOption={true}
							allowClear={false}
							labelInValue={false}
							options={USER_TYPES}
						/>
					</Form.Item>

					<Form.Item name="question" label="Texto da pergunta" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<UIRichTextEditor
						ref={el => this.answer = el}
						name="answer"
						label="Texto da resposta"
						required={true}
					/>

					<Form.Item name="order" label="Ordem">
						<InputNumber min={0} style={{width: "100%", maxWidth: 150}} />
					</Form.Item>

					<Form.Item name="is_active" label="Ativo" valuePropName="checked">
						<Switch />
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
