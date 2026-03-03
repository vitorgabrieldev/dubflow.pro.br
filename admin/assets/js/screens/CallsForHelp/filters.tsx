import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Spin, Select } from "antd";
import { customerService, profissionaisService } from "./../../redux/services";
import axios from "axios";

import moment from "moment";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			status  : null,
			created_at : null,
			customer_id: null,
			profissional_id: null,
		};

		this.state = {
			customerIsLoading: false,
			customers: [],
			profissionalIsLoading: false,
			profissionais: [],
			filters: {
				...this.filtersClean,
			},
		};
	}

	onOpen = (filters) => {
		this.setState({
			filters: filters,
		});
	};

	cleanFilters = () => {
		this.setState({
			filters: this.filtersClean,
		}, () => {
			// Callback
			this.props.onComplete({...this.state.filters});
		});
	};

	onClose = () => {
		// Callback
		this.props.onClose();
	};

	filtersOnConfirm = () => {
		// Callback
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

	fetchcustomer = (value) => {
		if (this._axiosCancelCustomersToken) {
			this._axiosCancelCustomersToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelCustomersToken = axios.CancelToken.source();

		this.setState({
			customerIsLoading: true,
		});

		customerService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelCustomersToken.token,
		})
			.then((response) => {
				this.setState({
					customerIsLoading: false,
					customers: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					customerIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	fetchprofissionais = (value) => {
		if (this._axiosCancelprofissionaisToken) {
			this._axiosCancelprofissionaisToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelprofissionaisToken = axios.CancelToken.source();

		this.setState({
			customerIsLoading: true,
		});

		profissionaisService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelprofissionaisToken.token,
		})
			.then((response) => {
				this.setState({
					profissionalIsLoading: false,
					profissionais: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					profissionalIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	render() {
		const {visible} = this.props;

		const {filters, customerIsLoading, customers, profissionalIsLoading, profissionais} = this.state;

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
					<div className="filter-group-title">
						<h3>Usuário</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item name="customer_id">
							<Select
								filterOption={false}
								allowClear
								onChange={(e) => this.setFilter("customer_id", e.value)}
								showSearch
								labelInValue={true}
								notFoundContent={customerIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchcustomer}
								onDropdownVisibleChange={visible => {
									if (visible && !customers.length) {
										this.fetchcustomer('');
									}
								}}
								options={customers.map((item) => ({
									value: item.uuid,
									label: item.name
								}))}
							/>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Profissional</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item name="profissional_id">
							<Select
								filterOption={false}
								allowClear
								onChange={(e) => this.setFilter("profissional_id", e.value)}
								showSearch
								labelInValue={true}
								notFoundContent={profissionalIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchprofissionais}
								onDropdownVisibleChange={visible => {
									if (visible && !profissionais.length) {
										this.fetchprofissionais('');
									}
								}}
								options={profissionais.map((item) => ({
									value: item.uuid,
									label: item.name
								}))}
							/>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Período do pedido</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<DatePicker.RangePicker
								format="DD/MM/YYYY"
								value={filters.created_at}
								onChange={(date, dateString) => this.setFilter("created_at", date ?? null)}
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
								<Radio onChange={(e) => this.setFilter("status", null)} checked={filters.status === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("status", "cancelado")} checked={filters.status === "cancelado"}>Cancelado</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("status", "andamento")} checked={filters.status === "andamento"}>Em andamento</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("status", "entregue")} checked={filters.status === "entregue"}>Entregue</Radio>
							</div>
						</div>
					</div>
				</div>
			</Modal>
		)
	}
}

export default Filters;
