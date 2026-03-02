import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Select, Spin } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import {
	customerService,
	despachantesService,
	despachanteUsersService,
	serviceTypesService,
	servicesService,
} from "./../../redux/services";

const PROCESS_STATUS_OPTIONS = [
	{label: "Novo cliente", value: "novo-cliente"},
	{label: "Em preparação", value: "em-preparacao"},
	{label: "Enviado", value: "enviado"},
	{label: "Pronto para análise", value: "pronto-para-analise"},
	{label: "Em análise", value: "em-analise"},
	{label: "Deferido", value: "deferido"},
	{label: "Restituído", value: "restituido"},
	{label: "Indeferido", value: "indeferido"},
];

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			customer_ids         : null,
			despachante_ids      : null,
			despachante_user_ids : null,
			service_type_ids     : null,
			service_ids          : null,
			created_at           : null,
			status               : null,
		};

		this.state = {
			filters                  : {...this.filtersClean},
			customersIsLoading       : false,
			customers                : [],
			despachantesIsLoading    : false,
			despachantes             : [],
			despachanteUsersIsLoading: false,
			despachanteUsers         : [],
			serviceTypesIsLoading    : false,
			serviceTypes             : [],
			servicesIsLoading        : false,
			services                 : [],
		};

		this._customersCancelToken = null;
		this._despachantesCancelToken = null;
		this._despachanteUsersCancelToken = null;
		this._serviceTypesCancelToken = null;
		this._servicesCancelToken = null;
	}

	componentWillUnmount() {
		this._customersCancelToken && this._customersCancelToken.cancel("Only one request allowed at a time.");
		this._despachantesCancelToken && this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		this._despachanteUsersCancelToken && this._despachanteUsersCancelToken.cancel("Only one request allowed at a time.");
		this._serviceTypesCancelToken && this._serviceTypesCancelToken.cancel("Only one request allowed at a time.");
		this._servicesCancelToken && this._servicesCancelToken.cancel("Only one request allowed at a time.");
	}

	getCustomerValue = (item) => item?.uuid ?? null;
	getCustomerLabel = (item) => item?.name || item?.email || item?.uuid || "N/A";

	getDespachanteValue = (item) => item?.uuid ?? null;
	getDespachanteLabel = (item) => item?.name || item?.email || item?.uuid || "N/A";

	getDespachanteUserValue = (item) => item?.uuid ?? null;
	getDespachanteUserLabel = (item) => {
		if( !item ) return "N/A";
		const name = item.name || item.nome || item.uuid || "N/A";
		return item.email ? `${name} (${item.email})` : name;
	};

	getServiceTypeValue = (item) => item?.uuid ?? item?.id ?? null;
	getServiceTypeLabel = (item) => item?.name || item?.title || item?.uuid || "N/A";

	getServiceValue = (item) => item?.uuid ?? item?.id ?? null;
	getServiceLabel = (item) => item?.name || item?.title || item?.uuid || "N/A";

	fetchCustomers = (search = "") => {
		if( this._customersCancelToken )
		{
			this._customersCancelToken.cancel("Only one request allowed at a time.");
		}

		this._customersCancelToken = axios.CancelToken.source();

		this.setState({customersIsLoading: true});

		customerService.getAutocomplete({
			search     : search || "",
			orderBy    : "name:asc",
			cancelToken: this._customersCancelToken.token,
		})
		.then((response) => {
			this.setState({
				customersIsLoading: false,
				customers         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({customersIsLoading: false});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchDespachantes = (search = "") => {
		if( this._despachantesCancelToken )
		{
			this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._despachantesCancelToken = axios.CancelToken.source();

		this.setState({despachantesIsLoading: true});

		despachantesService.autocomplete({
			search     : search || "",
			orderBy    : "name:asc",
			cancelToken: this._despachantesCancelToken.token,
		})
		.then((response) => {
			this.setState({
				despachantesIsLoading: false,
				despachantes         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({despachantesIsLoading: false});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchDespachanteUsers = (search = "") => {
		if( this._despachanteUsersCancelToken )
		{
			this._despachanteUsersCancelToken.cancel("Only one request allowed at a time.");
		}

		this._despachanteUsersCancelToken = axios.CancelToken.source();

		this.setState({despachanteUsersIsLoading: true});

		despachanteUsersService.autocomplete({
			search     : search || "",
			orderBy    : "name:asc",
			cancelToken: this._despachanteUsersCancelToken.token,
		})
		.then((response) => {
			this.setState({
				despachanteUsersIsLoading: false,
				despachanteUsers         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({despachanteUsersIsLoading: false});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchServiceTypes = (search = "") => {
		if( this._serviceTypesCancelToken )
		{
			this._serviceTypesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._serviceTypesCancelToken = axios.CancelToken.source();

		this.setState({serviceTypesIsLoading: true});

		serviceTypesService.autocomplete({
			search     : search || "",
			orderBy    : "title:asc",
			cancelToken: this._serviceTypesCancelToken.token,
		})
		.then((response) => {
			this.setState({
				serviceTypesIsLoading: false,
				serviceTypes         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({serviceTypesIsLoading: false});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchServices = (search = "") => {
		if( this._servicesCancelToken )
		{
			this._servicesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._servicesCancelToken = axios.CancelToken.source();

		this.setState({servicesIsLoading: true});

		servicesService.autocomplete({
			search     : search || "",
			orderBy    : "name:asc",
			cancelToken: this._servicesCancelToken.token,
		})
		.then((response) => {
			this.setState({
				servicesIsLoading: false,
				services         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({servicesIsLoading: false});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	onOpen = (filters) => {
		this.setState({
			filters: {
				...this.filtersClean,
				...filters,
			},
		});

		this.fetchCustomers("");
		this.fetchDespachantes("");
		this.fetchDespachanteUsers("");
		this.fetchServiceTypes("");
		this.fetchServices("");
	};

	cleanFilters = () => {
		this.setState({filters: this.filtersClean}, () => {
			this.props.onComplete({...this.state.filters});
		});
	};

	onClose = () => {
		this._customersCancelToken && this._customersCancelToken.cancel("Only one request allowed at a time.");
		this._despachantesCancelToken && this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		this._despachanteUsersCancelToken && this._despachanteUsersCancelToken.cancel("Only one request allowed at a time.");
		this._serviceTypesCancelToken && this._serviceTypesCancelToken.cancel("Only one request allowed at a time.");
		this._servicesCancelToken && this._servicesCancelToken.cancel("Only one request allowed at a time.");

		this.props.onClose();
	};

	filtersOnConfirm = () => {
		this.props.onComplete({...this.state.filters});
	};

	setFilter = (name, value) => {
		this.setState((state) => ({
			filters: {
				...state.filters,
				[name]: value,
			},
		}));
	};

	renderMultiSelect = ({
		value,
		onChange,
		onSearch,
		loading,
		options,
		placeholder,
		getValue,
		getLabel,
		remote = false,
	}) => (
		<Select
			mode="multiple"
			allowClear
			showSearch
			filterOption={remote ? false : (input, option) => {
				const text = typeof option.children === "string" ? option.children : "";
				return text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
			}}
			optionFilterProp="children"
			placeholder={placeholder}
			notFoundContent={loading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
			onSearch={remote ? onSearch : undefined}
			onChange={onChange}
			value={value || []}>
			{options.map((item, index) => {
				const optionValue = getValue(item);
				if( optionValue === null ) return null;

				return (
					<Select.Option key={item.uuid || optionValue || index} value={optionValue}>
						{getLabel(item)}
					</Select.Option>
				);
			})}
		</Select>
	);

	render() {
		const {visible} = this.props;
		const {
			filters,
			customersIsLoading,
			customers,
			despachantesIsLoading,
			despachantes,
			despachanteUsersIsLoading,
			despachanteUsers,
			serviceTypesIsLoading,
			serviceTypes,
			servicesIsLoading,
			services,
		} = this.state;

		return (
			<Modal
				visible={visible}
				title="Filtrar"
				centered={true}
				destroyOnClose={true}
				maskClosable={true}
				width={900}
				okText="Aplicar"
				onCancel={this.onClose}
				onOk={this.filtersOnConfirm}
				className="modal-filters"
				footer={[
					<Button key="back" type="link" onClick={this.cleanFilters}>Excluir filtros</Button>,
					<Button key="submit" type="primary" onClick={this.filtersOnConfirm}>Aplicar</Button>,
				]}>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}>
						<h3>Cliente</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							{this.renderMultiSelect({
								value    : filters.customer_ids,
								onChange : (value) => this.setFilter("customer_ids", value && value.length ? value : null),
								onSearch : this.fetchCustomers,
								loading  : customersIsLoading,
								options  : customers,
								placeholder: "Pesquise e selecione um ou mais clientes",
								getValue : this.getCustomerValue,
								getLabel : this.getCustomerLabel,
								remote   : true,
							})}
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Despachante</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							{this.renderMultiSelect({
								value    : filters.despachante_ids,
								onChange : (value) => this.setFilter("despachante_ids", value && value.length ? value : null),
								onSearch : this.fetchDespachantes,
								loading  : despachantesIsLoading,
								options  : despachantes,
								placeholder: "Pesquise e selecione um ou mais despachantes",
								getValue : this.getDespachanteValue,
								getLabel : this.getDespachanteLabel,
								remote   : true,
							})}
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Usuário do despachante</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							{this.renderMultiSelect({
								value    : filters.despachante_user_ids,
								onChange : (value) => this.setFilter("despachante_user_ids", value && value.length ? value : null),
								onSearch : this.fetchDespachanteUsers,
								loading  : despachanteUsersIsLoading,
								options  : despachanteUsers,
								placeholder: "Pesquise e selecione um ou mais usuários",
								getValue : this.getDespachanteUserValue,
								getLabel : this.getDespachanteUserLabel,
								remote   : true,
							})}
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Tipo do serviço</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							{this.renderMultiSelect({
								value    : filters.service_type_ids,
								onChange : (value) => this.setFilter("service_type_ids", value && value.length ? value : null),
								onSearch : this.fetchServiceTypes,
								loading  : serviceTypesIsLoading,
								options  : serviceTypes,
								placeholder: "Pesquise e selecione um ou mais tipos de serviço",
								getValue : this.getServiceTypeValue,
								getLabel : this.getServiceTypeLabel,
								remote   : true,
							})}
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Serviço</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							{this.renderMultiSelect({
								value    : filters.service_ids,
								onChange : (value) => this.setFilter("service_ids", value && value.length ? value : null),
								onSearch : this.fetchServices,
								loading  : servicesIsLoading,
								options  : services,
								placeholder: "Pesquise e selecione um ou mais serviços",
								getValue : this.getServiceValue,
								getLabel : this.getServiceLabel,
								remote   : true,
							})}
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Período de cadastro</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<DatePicker.RangePicker
								format="DD/MM/YYYY"
								value={filters.created_at}
								onChange={(date) => this.setFilter("created_at", date ?? null)}
								disabledDate={(currentDate) => currentDate.isAfter(moment(), "day")}
							/>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Status do processo</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								allowClear
								showSearch
								optionFilterProp="children"
								placeholder="Selecione o status"
								onChange={(value) => this.setFilter("status", value ?? null)}
								value={filters.status}>
								{PROCESS_STATUS_OPTIONS.map((item) => (
									<Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
								))}
							</Select>
						</Form.Item>
					</div>
				</div>
			</Modal>
		);
	}
}

export default Filters;
