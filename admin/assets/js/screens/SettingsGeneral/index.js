import React, { Component } from "react";
import axios from "axios";
import { Button, Col, Form, Input, message, Modal, Row, Spin } from "antd";
import QueueAnim from "rc-queue-anim";
import { NumericFormat } from 'react-number-format'
import _maxBy from "lodash/maxBy";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { settingService } from "./../../redux/services";

class Index extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading      : true,
			isSending      : false,
		};

		this._cancelToken      = null;
		this._axiosCancelToken = null;
	}

	componentDidMount() {
		this._cancelToken = axios.CancelToken.source();

		settingService.getGeneral(this._cancelToken.token)
		.then((response) => {

			this.setState({
				isLoading: false,
			}, () => {
				// Fill form
				this.fillForm(response.data.data);
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Landing Component got unmounted");
	}

	fillForm = (data) => {

		const dataForm = {
			// app_url_android           		: data.app_url_android,
			// app_url_ios               		: data.app_url_ios,
			// email_support    		  		: data.email_support,
			porc_comission  		  		: data.porc_comission,
			value_service_alta_cilindrada   : data.value_service_alta_cilindrada,
			value_service_baixa_cilindrada  : data.value_service_baixa_cilindrada,
			value_travel_km        			: data.value_travel_km,
			time_cancel        				: data.time_cancel,
			time_accept_service      		: data.time_accept_service,
			time_search_professional        : data.time_search_professional,
		};

		this.form && this.form.setFieldsValue(dataForm);
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const normalizeValue = (value) => {
			if (typeof value === 'string') {
			  const normalized = value.includes(',') ? value.replace(',', '.') : value
			  const parsed = parseFloat(normalized)
			  return isNaN(parsed) ? 0 : parsed
			}
			return value
		}
		
		values.value_service_alta_cilindrada 		= normalizeValue(values.value_service_alta_cilindrada)
		values.value_service_baixa_cilindrada 		= normalizeValue(values.value_service_baixa_cilindrada)
		values.value_travel_km 						= normalizeValue(values.value_travel_km)
		values.time_search_professional 			= normalizeValue(values.time_search_professional)

		settingService.updateGeneral(values)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Success message
			message.success("Configuração atualizada.");
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
			<QueueAnim className="site-content-inner page-settings">
				<div className="page-content" key="1">
					<h1 className="page-title">Gerais</h1>
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
							<Row gutter={24}>
								<Col xs={24} sm={14}>
									{/* <Form.Item name="app_url_android" label="Link do app na Google Play" hasFeedback rules={[{type: "url", message: "Informe uma URL válida."}]}>
										<Input />
									</Form.Item>
									<Form.Item name="app_url_ios" label="Link do app na App Store" hasFeedback rules={[{type: "url", message: "Informe uma URL válida."}]}>
										<Input />
									</Form.Item>
									<Form.Item name="email_support" label="E-mail de suporte" hasFeedback rules={[{type: "email", message: "Informe um e-mail válido."}]}>
										<Input />
									</Form.Item> */}
									<Form.Item name="porc_comission" label="Porcentagem de comissão da ferramenta" rules={[{required: true, message: "Campo obrigatório."}]}>
										<Input type="number" min={0} max={100} addonBefore="%" />
									</Form.Item>
									<Form.Item name="value_service_baixa_cilindrada" label="Valor do serviço para motos de baixa cilindrada" rules={[{required: true, message: "Campo obrigatório."}]}>
									<NumericFormat
										className="ant-input"
										decimalScale={2}
										fixedDecimalScale
										allowNegative={false}
										thousandSeparator="."
										decimalSeparator=","
										onValueChange={({ floatValue }) => this.form.setFieldValue('value_service_baixa_cilindrada', floatValue)}
									/>
									</Form.Item>
									<Form.Item name="value_service_alta_cilindrada" label="Valor do serviço para motos de alta cilindrada" rules={[{required: true, message: "Campo obrigatório."}]}>
										<NumericFormat
											className="ant-input"
											decimalScale={2}
											fixedDecimalScale
											allowNegative={false}
											thousandSeparator="."
											decimalSeparator=","
											onValueChange={({ floatValue }) => this.form.setFieldValue('value_service_alta_cilindrada', floatValue)}
										/>
									</Form.Item>
									<Form.Item name="value_travel_km" label="Valor do km entre a origem e o destino" rules={[{required: true, message: "Campo obrigatório."}]}>
										<NumericFormat
											className="ant-input"
											decimalScale={2}
											fixedDecimalScale
											allowNegative={false}
											thousandSeparator="."
											decimalSeparator=","
											onValueChange={({ floatValue }) => this.form.setFieldValue('value_travel_km', floatValue)}
										/>
									</Form.Item>
									<Form.Item name="time_cancel" label="Tempo para cancelamento de serviço/pedido (em segundos)" rules={[{required: true, message: "Campo obrigatório."}]}>
										<Input type="number" min={0} />
									</Form.Item>
									<Form.Item name="time_accept_service" label="Tempo para aceitar serviço/pedido (em segundos)" rules={[{required: true, message: "Campo obrigatório."}]}>
										<Input type="number" min={0} />
									</Form.Item>
									<Form.Item name="time_search_professional" label="Tempo para busca de profissionais (em segundos)" rules={[{required: true, message: "Campo obrigatório."}]}>
										<Input type="number" min={0} />
									</Form.Item>
									<Button style={{marginTop: 40}} type="primary" htmlType="submit" icon={<i className="far fa-check" />} loading={isSending} disabled={isLoading}>
										{isSending ? "Salvando" : "Salvar"}
									</Button>
								</Col>
							</Row>
						)}
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

export default Index;
