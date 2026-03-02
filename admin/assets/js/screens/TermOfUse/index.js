import React, { Component, Fragment } from "react";
import axios from "axios";
import { Button, Form, Input, message, Modal, Spin } from "antd";
import QueueAnim from "rc-queue-anim";

import { termOfUseService } from "./../../redux/services";
import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { UIRichTextEditor } from "./../../components";

class TermOfUse extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
			termName : "Termos de uso",
		};

		this._cancelToken = null;
	}

	componentDidMount() {
		this._cancelToken = axios.CancelToken.source();

		termOfUseService
			.show(this._cancelToken.token)
			.then((response) => {
				this.setState({ isLoading: false });
				this.fillForm(response.data.data);
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return;

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Landing Component got unmounted");
	}

	fillForm = (data) => {
		// Novo formato: objeto único com name, text_customer e text_despachante.
		if( data && !Array.isArray(data) )
		{
			const name = data?.name || "Termos de uso";

			this.form && this.form.setFieldsValue({
				name: name,
			});
			this.customer && this.customer.setValue(data?.text_customer ?? "");
			this.despachante && this.despachante.setValue(data?.text_despachante ?? "");

			this.setState({
				termName: name,
			});

			return;
		}

		// Compatibilidade com retorno antigo (array por tipo).
		if( Array.isArray(data) )
		{
			data.forEach((item) => {
				if( item.type === "customer" )
				{
					this.customer && this.customer.setValue(item.text ?? "");
				}

				if( item.type === "profissional" || item.type === "despachante" )
				{
					this.despachante && this.despachante.setValue(item.text ?? "");
				}
			});
		}
	};

	onFinish = (values) => {
		this.setState({ isSending: true });

		const data = {
			name            : values?.name || this.state.termName || "Termos de uso",
			text_customer   : values?.text_customer,
			text_despachante: values?.text_despachante,
		};

		termOfUseService.edit(data)
		.then(() => {
			this.setState({ isSending: false });
			message.success("Registro atualizado com sucesso.");
		})
		.catch((err) => {
			this.setState({ isSending: false });
			Modal.error({
				title: "Ocorreu um erro!",
				content: String(err),
			});
		});
	};

	render() {
		const { isLoading, isSending } = this.state;

		return (
			<QueueAnim className="site-content-inner" style={{ maxWidth: 700 }}>
				<div className="page-content" key="1">
					<h1 className="page-title">Termos de Uso</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}
						initialValues={{ reset_accept: 0 }}
					>
						{isLoading ? (
							<div className="text-center" style={{ padding: 20 }}>
								<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
							</div>
						) : (
							<Fragment>
								<Form.Item name="name" hidden>
									<Input />
								</Form.Item>
								<UIRichTextEditor
									ref={el => this.customer = el}
									name="text_customer"
									label="Texto cliente"
									required={true}
								/>
								<UIRichTextEditor
									ref={el => this.despachante = el}
									name="text_despachante"
									label="Texto despachante"
									required={true}
								/>
								<Button
									type="primary"
									htmlType="submit"
									icon={<i className="far fa-check" />}
									loading={isSending}
									disabled={isLoading}
								>
									{isSending ? "Salvando" : "Salvar"}
								</Button>
							</Fragment>
						)}
					</Form>
				</div>
			</QueueAnim>
		);
	}
}

export default TermOfUse;
