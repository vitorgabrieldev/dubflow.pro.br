import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select, Spin } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { webserviceService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			is_active  : null,
			state_id   : null,
			city_id    : null,
			created_at : null,
		};

		this.state = {
			filters         : {
				...this.filtersClean,
			},
			statesIsLoading : false,
			states          : [],
			citiesIsLoading : false,
			cities          : [],
		};

		this._axiosCancelToken = null;
	}

	getStateOptionValue = (item) => {
		if( !item ) return null;

		return item.id ?? item.state_id ?? null;
	};

	getCityOptionValue = (item) => {
		if( !item ) return null;

		return item.id ?? item.city_id ?? null;
	};

	fetchStates = () => {
		this.setState({
			statesIsLoading: true,
		});

		webserviceService.getStates()
		.then((response) => {
			this.setState({
				statesIsLoading: false,
				states         : response.data.data,
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
				cities         : response.data.data,
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
		this.setState({
			filters: filters,
		});

		if( !this.state.states.length )
		{
			this.fetchStates();
		}
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
		this._axiosCancelToken && this._axiosCancelToken.cancel("Only one request allowed at a time.");

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
			}
		}));
	};

	render() {
		const {visible} = this.props;
		const {filters, statesIsLoading, states, citiesIsLoading, cities} = this.state;

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

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Estado</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								optionFilterProp="children"
								filterOption={(input, option) => (typeof option.children === "string" ? option.children : option.children.props.children).toLowerCase().indexOf(input.toLowerCase()) >= 0}
								allowClear
								placeholder="Selecione o estado"
								notFoundContent={statesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onChange={(value) => this.setFilter("state_id", value ?? null)}
								showSearch
								value={filters.state_id}>
								{states.map((item, index) => {
									const optionValue = this.getStateOptionValue(item);
									if( optionValue === null || typeof optionValue === "undefined" ) return null;

									return <Select.Option key={item.uuid || optionValue || index} value={optionValue}>{item.name}</Select.Option>;
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
								placeholder="Pesquise a cidade"
								notFoundContent={citiesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchCities}
								onChange={(value) => this.setFilter("city_id", value ?? null)}
								showSearch
								value={filters.city_id}>
								{cities.map((item, index) => {
									const optionValue = this.getCityOptionValue(item);
									if( optionValue === null || typeof optionValue === "undefined" ) return null;

									return <Select.Option key={item.uuid || optionValue || index} value={optionValue}>{item.name}</Select.Option>;
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Criação</h3>
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
			</Modal>
		)
	}
}

export default Filters;
