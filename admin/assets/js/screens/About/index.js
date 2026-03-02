import React, { Component, Fragment } from "react";
import axios from "axios";
import { Button, Col, Form, message, Modal, Row, Spin } from "antd";
import QueueAnim from "rc-queue-anim";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { aboutService } from "./../../redux/services";

import {
	UIRichTextEditor,
	UIUpload,
} from "./../../components";

class About extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
			uploadDesktop: null,
			uploadMobile: null,
		};

		this._cancelToken = null;
	}

	componentDidMount() {
		this._cancelToken = axios.CancelToken.source();

		aboutService.show(this._cancelToken.token)
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
		// thumbnail
		if( data.file || data.image )
		{
			this.uploadDesktop.setFiles([
				{
					uuid: data.uuid,
					url : data.image || data.file,
					type: 'image/jpeg',
				}
			]);
		}

		// if( data.file_mobile )
		// {
		// 	this.uploadMobile.setFiles([
		// 		{
		// 			uuid: data.uuid,
		// 			url : data.file_mobile,
		// 			type: 'image/jpeg',
		// 		}
		// 	]);
		// }

		// Editor
		this.editor && this.editor.setValue(data.text);
	};

	onFinish = (values) => {
		const file = this.uploadDesktop.getFiles();
	
		if (file.hasError) {
			Modal.error({
				title: "Ocorreu um erro!",
				content: file.error,
			});
			return false;
		}
	
		this.setState({ isSending: true });
	
		const data = { ...values };
	
		// File - Desktop
		if (file.files.length) {
			if (!file.files[0].uuid) {
				data.image = file.files[0];
			}
		} else {
			data.delete_image = true;
		}
	
		aboutService.edit(data)
		.then((response) => {
			this.setState({ isSending: false });
			message.success("Registro atualizado com sucesso.");
		})
		.catch((data) => {
			this.setState({ isSending: false });
			Modal.error({
				title: "Ocorreu um erro!",
				content: String(data),
			});
		});
	};
	

	render() {
		const {isLoading, isSending} = this.state;

		return (
			<QueueAnim className="site-content-inner" style={{maxWidth: 700}}>
				<div className="page-content" key="1">
					<h1 className="page-title">Sobre nós</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						onFinish={this.onFinish}>
						{isLoading ? (
							<div className="text-center" style={{padding: 20}}>
								<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
							</div>
						) : (
							<Fragment>
								<Row gutter={16}>
									<Col xs={24} sm={6}>
										<UIUpload
											ref={el => (this.uploadDesktop = el)}
											label="Imagem"
											labelError="imagem"
											acceptedFiles={['jpg', 'jpeg', 'png']}
											style={{ width: '100%' }}
										/>
									</Col>
									{/* <Col xs={24} sm={6}>
										<UIUpload
											ref={el => (this.uploadMobile = el)}
											label="Imagem - Mobile"
											labelError="imagem"
											acceptedFiles={['jpg', 'jpeg', 'png']}
											style={{ width: '100%' }}
										/>
									</Col> */}
								</Row>
								<UIRichTextEditor
									ref={el => this.editor = el}
									name="text"
									label="Texto"
									required={true}
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

export default About;
