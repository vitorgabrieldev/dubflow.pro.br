import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Switch } from "antd";

import { serviceCategoriesService } from "./../../redux/services";

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
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
		});

		serviceCategoriesService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};
			this.setState({
				isLoading: false,
			}, () => {
				this.fillForm(item);
			});
		})
		.catch((data) => {
			this.setState({
				isLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => this.onClose(),
			});
		});
	};

	fillForm = (data) => {
		this.form.setFieldsValue({
			title    : data?.title,
			is_active: typeof data?.is_active === "undefined" ? true : !!data?.is_active,
		});
	};

	resetFields = () => {
		this.form && this.form.resetFields();
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
			uuid: this.state.uuid,
		};

		serviceCategoriesService.edit(data)
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
		const {uuid, isLoading, isSending} = this.state;

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
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
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
