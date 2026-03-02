import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Form, Input, InputNumber, message, Modal, Select, Spin, Switch } from "antd";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { despachantesService, webserviceService } from "./../../redux/services";

import {
	UIDrawerForm,
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
			isLoading      : true,
			isSending      : false,
			statesIsLoading: false,
			citiesIsLoading: false,
			states         : [],
			cities         : [],
		};

		this._axiosCancelToken = null;
	}

	getStateOptionValue = (item) => {
		if( !item ) return null;

		return item.uuid ?? item.id ?? item.state_id ?? null;
	};

	getCityOptionValue = (item) => {
		if( !item ) return null;

		return item.uuid ?? item.id ?? item.city_id ?? null;
	};

	onOpen = () => {
		this.setState({
			isLoading      : true,
			statesIsLoading: true,
			citiesIsLoading: true,
			cities         : [],
		});

		Promise.all([
			webserviceService.getStates(),
			webserviceService.getCities({search: "A"}),
		])
		.then(([statesResponse, citiesResponse]) => {
			this.setState({
				isLoading      : false,
				statesIsLoading: false,
				citiesIsLoading: false,
				states         : statesResponse?.data?.data || [],
				cities         : citiesResponse?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				isLoading      : false,
				statesIsLoading: false,
				citiesIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => this.onClose(),
			});
		});
	};

	fetchCities = (value = "") => {
		const searchValue = String(value ?? "").trim().length ? value : "A";

		if( this._axiosCancelToken )
		{
			this._axiosCancelToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelToken = axios.CancelToken.source();

		this.setState({
			citiesIsLoading: true,
		});

		webserviceService.getCities({
			search     : searchValue,
			cancelToken: this._axiosCancelToken.token,
		})
		.then((response) => {
			this.setState({
				citiesIsLoading: false,
				cities         : response.data.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				citiesIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	resetFields = () => {
		this.form && this.form.resetFields();

		this.setState({
			cities: [],
			states: [],
		});
	};

	onClose = () => {
		this._axiosCancelToken && this._axiosCancelToken.cancel("Only one request allowed at a time.");

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

		despachantesService.create(data)
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
		const {isLoading, isSending, states, cities, statesIsLoading, citiesIsLoading} = this.state;

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
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item
						name="email"
						label="E-mail"
						hasFeedback
						rules={[
							{required: true, message: "Campo obrigatório."},
							{type: "email", message: "Informe um e-mail válido."},
						]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item name="phone" label="Telefone" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={20} />
					</Form.Item>

					<Form.Item name="state_id" label="Estado" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							optionFilterProp="children"
							filterOption={(input, option) => (typeof option.children === "string" ? option.children : option.children.props.children).toLowerCase().indexOf(input.toLowerCase()) >= 0}
							allowClear
							placeholder="Selecione o estado"
							notFoundContent={statesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
							showSearch>
							{states.map((item, index) => {
								const optionValue = this.getStateOptionValue(item);
								if( optionValue === null || typeof optionValue === "undefined" ) return null;

								return <Select.Option key={item.uuid || optionValue || index} value={optionValue}>{item.name}</Select.Option>;
							})}
						</Select>
					</Form.Item>

					<Form.Item name="city_id" label="Cidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							filterOption={false}
							allowClear
							placeholder="Pesquise a cidade"
							notFoundContent={citiesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
							onSearch={this.fetchCities}
							showSearch>
							{cities.map((item, index) => {
								const optionValue = this.getCityOptionValue(item);
								if( optionValue === null || typeof optionValue === "undefined" ) return null;

								return <Select.Option key={item.uuid || optionValue || index} value={optionValue}>{item.name}</Select.Option>;
							})}
						</Select>
					</Form.Item>

					<Form.Item name="user_limit" label="Limite de usuários" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<InputNumber min={1} style={{width: "100%"}} />
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
