import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, InputNumber, message, Modal, Switch } from "antd";

import { onboardingService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
} from "./../../components";

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
			isLoading: false,
			isSending: false,
		};
	}

	onOpen = () => {
		this.setState({
			isLoading: false,
		});
	};

	resetFields = () => {
		this.form && this.form.resetFields();
		this.upload && this.upload.reset();
	};

	onClose = () => {
		this.resetFields();

		this.props.onClose();
	};

	buildPayload = (values) => {
		return {
			...values,
			title : values.title,
			phrase: values.phrase,
			frase : values.title,
			frase2: values.phrase,
		};
	};

	onFinish = (values) => {
		const image = this.upload.getFiles();

		if( image.hasError )
		{
			Modal.error({
				title  : "Ocorreu um erro!",
				content: image.error,
			});

			return false;
		}

		this.setState({
			isSending: true,
		});

		const normalizedValues = {
			...values,
		};

		if( normalizedValues.order === null || typeof normalizedValues.order === "undefined" || normalizedValues.order === "" )
		{
			normalizedValues.order = 1;
		}

		const data = this.buildPayload(normalizedValues);

		if( image.files.length )
		{
			data.image = image.files[0];
			data.file  = image.files[0];
		}
		else
		{
			data.image = null;
			data.file  = null;
		}

		onboardingService.create(data)
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
				width={500}
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
					}}>
					<UIUpload
						ref={el => this.upload = el}
						label="Imagem"
						labelError="Imagem"
						acceptedFiles={["png", "jpg", "jpeg", "webp"]}
						maxFiles={1}
						minFiles={1}
					/>

					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item name="phrase" label="Frase" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item name="order" label="Ordem" hasFeedback>
						<InputNumber min={0} style={{width: "100%"}} />
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
