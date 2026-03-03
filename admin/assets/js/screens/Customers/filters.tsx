import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select, Spin } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { despachantesService, webserviceService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			despachante_id: null,
			city          : null,
			state         : null,
			created_at    : null,
			is_active     : null,
		};

		this.state = {
			filters              : {
				...this.filtersClean,
			},
			despachantesIsLoading: false,
			despachantes         : [],
			statesIsLoading      : false,
			states               : [],
			citiesIsLoading      : false,
			cities               : [],
		};

		this._despachantesCancelToken = null;
		this._citiesCancelToken = null;
	}

	componentWillUnmount() {
		this._despachantesCancelToken && this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		this._citiesCancelToken && this._citiesCancelToken.cancel("Only one request allowed at a time.");
	}

	getDespachanteValue = (item) => item?.uuid ?? null;

	getStateValue = (item) => item?.uuid ?? null;

	getStateLabel = (item) => {
		if( !item ) return "N/A";
		return item.abbr ? `${item.name} (${item.abbr})` : item.name;
	};

	getCityValue = (item) => item?.uuid ?? null;

	fetchDespachantes = (search = "") => {
		if( this._despachantesCancelToken )
		{
			this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._despachantesCancelToken = axios.CancelToken.source();

		this.setState({
			despachantesIsLoading: true,
		});

		despachantesService.autocomplete({
			orderBy   : "name:asc",
			search    : search || "",
			is_active : 1,
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

			this.setState({
				despachantesIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchStates = () => {
		if( this.state.states.length ) return null;

		this.setState({
			statesIsLoading: true,
		});

		webserviceService.getStates()
		.then((response) => {
			this.setState({
				statesIsLoading: false,
				states         : response?.data?.data || [],
			});
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

	fetchCities = (value = "") => {
		if( this._citiesCancelToken )
		{
			this._citiesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._citiesCancelToken = axios.CancelToken.source();

		if( !String(value || "").trim().length )
		{
			this.setState({
				citiesIsLoading: false,
				cities         : [],
			});

			return null;
		}

		this.setState({
			citiesIsLoading: true,
		});

		webserviceService.getCities({
			search     : value,
			cancelToken: this._citiesCancelToken.token,
		})
		.then((response) => {
			this.setState({
				citiesIsLoading: false,
				cities         : response?.data?.data || [],
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

	onOpen = (filters) => {
		const nextFilters = {
			...this.filtersClean,
			...filters,
		};

		this.setState({
			filters: nextFilters,
		});

		this.fetchStates();
		this.fetchDespachantes("");

		// Cidade usa UUID no filtro; carregamos a lista somente ao pesquisar.
	};

	cleanFilters = () => {
		this.setState({
			filters: this.filtersClean,
			cities : [],
		}, () => {
			this.props.onComplete({...this.state.filters});
		});
	};

	onClose = () => {
		this._despachantesCancelToken && this._despachantesCancelToken.cancel("Only one request allowed at a time.");
		this._citiesCancelToken && this._citiesCancelToken.cancel("Only one request allowed at a time.");

		this.props.onClose();
	};

	filtersOnConfirm = () => {
		this.props.onComplete({...this.state.filters});
	};

	setFilter = (name, value) => {
		this.setState(state => ({
			filters: {
				...state.filters,
				[name]: value,
			},
		}));
	};

	render() {
		const {visible} = this.props;
		const {
			filters,
			despachantesIsLoading,
			despachantes,
			statesIsLoading,
			states,
			citiesIsLoading,
			cities,
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
						<h3>Despachante</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								mode="multiple"
								filterOption={false}
								allowClear
								showSearch
								placeholder="Pesquise e selecione um ou mais despachantes"
								notFoundContent={despachantesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchDespachantes}
								onChange={(value) => this.setFilter("despachante_id", value && value.length ? value : null)}
								value={filters.despachante_id || []}>
								{despachantes.map((item, index) => {
									const optionValue = this.getDespachanteValue(item);

									if( optionValue === null ) return null;

									return (
										<Select.Option key={item.uuid || optionValue || index} value={optionValue}>
											{item.name || item.email || `#${optionValue}`}
										</Select.Option>
									);
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Cidade</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								filterOption={false}
								allowClear
								showSearch
								placeholder="Pesquise a cidade"
								notFoundContent={citiesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchCities}
								onChange={(value) => this.setFilter("city", value ?? null)}
								value={filters.city}>
								{cities.map((item, index) => {
									const optionValue = this.getCityValue(item);

									if( !optionValue ) return null;

									return (
										<Select.Option key={item.uuid || `${optionValue}-${index}`} value={optionValue}>
											{item.name}
										</Select.Option>
									);
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Estado</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								optionFilterProp="children"
								filterOption={(input, option) => {
									const text = typeof option.children === "string" ? option.children : "";
									return text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
								}}
								allowClear
								showSearch
								placeholder="Selecione o estado"
								notFoundContent={statesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onChange={(value) => this.setFilter("state", value ?? null)}
								value={filters.state}>
								{states.map((item, index) => {
									const optionValue = this.getStateValue(item);
									if( !optionValue ) return null;

									return (
										<Select.Option key={item.uuid || `${optionValue}-${index}`} value={optionValue}>
											{this.getStateLabel(item)}
										</Select.Option>
									);
								})}
							</Select>
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
					<div className="filter-group-title" style={{paddingTop: 0}}>
						<h3>Status</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("is_active", null)} checked={filters.is_active === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("is_active", 1)} checked={filters.is_active === 1}>Ativo</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("is_active", 0)} checked={filters.is_active === 0}>Inativo</Radio>
							</div>
						</div>
					</div>
				</div>
			</Modal>
		);
	}
}

export default Filters;
