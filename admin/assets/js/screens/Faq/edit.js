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

	return value || "Todos";
};

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
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
		});

		faqService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
			}, () => {
				this.fillForm(item);
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

	fillForm = (data) => {
		this.form && this.form.setFieldsValue({
			question : data?.question ?? data?.name ?? "",
			order    : data?.order,
			is_active: !!data?.is_active,
			user_type: normalizeUserType(data?.user_type ?? data?.type),
		});

		this.answer && this.answer.setValue(data?.answer ?? data?.text ?? "");
	};

	onClose = () => {
		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const {uuid} = this.state;

		const data = {
			...values,
			uuid: uuid,
		};

		data.user_type = normalizeUserType(data.user_type);

		faqService.edit(data)
		.then(() => {
			this.setState({
				isSending: false,
			});

			message.success("Registro atualizado com sucesso.");

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
				title="Editar registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>
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

export default Edit;
