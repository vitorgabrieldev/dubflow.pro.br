import React, { Component, Fragment } from "react";
import axios from "axios";
import { Button, Checkbox, Form, Input, message, Modal, Spin } from "antd";
import QueueAnim from "rc-queue-anim";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { policyCookiesService } from "./../../redux/services";

import {
	UIRichTextEditor,
} from "./../../components";

class PolicyCookies extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
		};

		this._cancelToken = null;
	}

	componentDidMount() {
		this._cancelToken = axios.CancelToken.source();

		policyCookiesService.show(this._cancelToken.token)
		.then((response) => {
			this.setState({
				isLoading: false,
			});

			// Fill form
			this.fillForm(response.data.data);
		})
		.catch((data) => {
			if( data.error_type === API_ERRO_TYPE_CANCEL ) return null;

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Only one request allowed at a time.");
	}

	fillForm = (data) => {
		this.form.setFieldsValue({
			name: data.name,
		});

		// Editor
		this.editor && this.editor.setValue(data.text);
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const data = {...values};

		policyCookiesService.edit(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Success message
			message.success("Registro atualizado com sucesso.");
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
		const {isLoading, isSending} = this.state;

		return (
			<QueueAnim className="site-content-inner" style={{maxWidth: 700}}>
				<div className="page-content" key="1">
					<h1 className="page-title">Política de Cookies</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}
						initialValues={{
							reset_accept: 0,
						}}>
						{isLoading ? (
							<div className="text-center" style={{padding: 20}}>
								<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
							</div>
						) : (
							<Fragment>
								<Form.Item name="name" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
									<Input maxLength={191} />
								</Form.Item>
								<UIRichTextEditor
									ref={el => this.editor = el}
									name="text"
									label="Texto"
								/>
								<Button type="primary" htmlType="submit" icon={<i className="far fa-check" />} loading={isSending} disabled={isLoading}>{isSending ? "Salvando" : "Salvar"}</Button>
							</Fragment>
						)}
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

export default PolicyCookies;
