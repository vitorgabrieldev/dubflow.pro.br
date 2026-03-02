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

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			uuid          : 0,
			isLoading     : true,
			isSending     : false,
			statesIsLoading: false,
			citiesIsLoading: false,
			states        : [],
			cities        : [],
			stateTouched  : false,
			cityTouched   : false,
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

	onOpen = (uuid) => {
		this.setState({
			uuid          : uuid,
			isLoading     : true,
			statesIsLoading: false,
			cities        : [],
			stateTouched  : false,
			cityTouched   : false,
		});

		despachantesService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};
			const stateOption = item?.state ? {
				...item.state,
				id: this.getStateOptionValue(item.state),
			} : null;
			const cityOption = item?.city ? {
				...item.city,
				id: this.getCityOptionValue(item.city),
			} : null;

			this.setState({
				isLoading: false,
				states   : stateOption ? [stateOption] : [],
				cities   : cityOption ? [cityOption] : [],
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

	fetchCities = (value = "") => {
		if( this._axiosCancelToken )
		{
			this._axiosCancelToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelToken = axios.CancelToken.source();

		if( !String(value).trim().length )
		{
			this.setState({
				citiesIsLoading: false,
				cities         : [],
			});

			return false;
		}

		this.setState({
			citiesIsLoading: true,
		});

		webserviceService.getCities({
			search     : value,
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

	fetchStates = () => {
		if( this.state.statesIsLoading ) return null;

		// Se já carregou lista real (com id inteiro), não busca de novo.
		if( this.state.states.some((item) => typeof item?.id === "number") )
		{
			return null;
		}

		this.setState({
			statesIsLoading: true,
		});

		return webserviceService.getStates()
		.then((response) => {
			const remoteStates = response?.data?.data || [];
			const currentValue = this.form?.getFieldValue("state_id");
			const hasCurrent   = remoteStates.some((item) => String(this.getStateOptionValue(item)) === String(currentValue));

			this.setState((state) => ({
				statesIsLoading: false,
				states         : hasCurrent ? remoteStates : [...state.states, ...remoteStates],
			}));
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				statesIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fillForm = (data) => {
		this.form.setFieldsValue({
			name     : data?.name,
			email    : data?.email,
			phone    : data?.phone,
			state_id : this.getStateOptionValue(data?.state) ?? data?.state_id,
			city_id  : this.getCityOptionValue(data?.city) ?? data?.city_id,
			user_limit: data?.user_limit,
			is_active: typeof data?.is_active === "undefined" ? true : !!data?.is_active,
		});
	};

	resetFields = () => {
		this.form && this.form.resetFields();

		this.setState({
			states      : [],
			cities      : [],
			stateTouched: false,
			cityTouched : false,
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
			uuid: this.state.uuid,
		};

		// O retorno do show traz cidade/estado por uuid. Como o backend valida int,
		// só enviamos state_id/city_id se o usuário alterou esses campos no edit.
		if( !this.state.stateTouched )
		{
			delete data.state_id;
		}

		if( !this.state.cityTouched )
		{
			delete data.city_id;
		}

		despachantesService.edit(data)
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
		const {uuid, isLoading, isSending, states, cities, statesIsLoading, citiesIsLoading} = this.state;

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
							onSearch={this.fetchStates}
							onChange={() => {
								this.setState({
									stateTouched: true,
									cityTouched : true,
									cities      : [],
								}, () => {
									this.form.setFieldsValue({city_id: null});
								});
							}}
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
							onChange={() => this.setState({cityTouched: true})}
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

export default Edit;
