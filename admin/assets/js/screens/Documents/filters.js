import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select, Spin } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { customerService, documentTypesService } from "./../../redux/services";

const STATUS_OPTIONS = [
	{label: "Válido", value: "Válido"},
	{label: "A vencer", value: "Avencer"},
	{label: "Vencido", value: "Vencido"},
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
			customer_ids     : null,
			document_type_ids: null,
			expiration_date  : null,
			status           : null,
		};

		this.state = {
			filters               : {
				...this.filtersClean,
			},
			customersIsLoading    : false,
			customers             : [],
			documentTypesIsLoading: false,
			documentTypes         : [],
		};

		this._customersCancelToken = null;
		this._documentTypesCancelToken = null;
	}

	componentWillUnmount() {
		this._customersCancelToken && this._customersCancelToken.cancel("Only one request allowed at a time.");
		this._documentTypesCancelToken && this._documentTypesCancelToken.cancel("Only one request allowed at a time.");
	}

	getCustomerValue = (item) => item?.uuid ?? item?.id ?? null;

	getCustomerLabel = (item) => item?.name || item?.email || item?.uuid || "N/A";

	getDocumentTypeValue = (item) => item?.uuid ?? item?.id ?? null;

	getDocumentTypeLabel = (item) => item?.title || item?.name || item?.uuid || "N/A";

	fetchCustomers = (search = "") => {
		if( this._customersCancelToken )
		{
			this._customersCancelToken.cancel("Only one request allowed at a time.");
		}

		this._customersCancelToken = axios.CancelToken.source();

		this.setState({
			customersIsLoading: true,
		});

		customerService.getAutocomplete({
			search    : search || "",
			orderBy   : "name:asc",
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

			this.setState({
				customersIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchDocumentTypes = (search = "") => {
		if( this._documentTypesCancelToken )
		{
			this._documentTypesCancelToken.cancel("Only one request allowed at a time.");
		}

		this._documentTypesCancelToken = axios.CancelToken.source();

		this.setState({
			documentTypesIsLoading: true,
		});

		documentTypesService.autocomplete({
			search     : search || "",
			cancelToken: this._documentTypesCancelToken.token,
		})
		.then((response) => {
			this.setState({
				documentTypesIsLoading: false,
				documentTypes         : response?.data?.data || [],
			});
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				documentTypesIsLoading: false,
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

		this.fetchCustomers("");
		this.fetchDocumentTypes();
	};

	cleanFilters = () => {
		this.setState({
			filters: this.filtersClean,
		}, () => {
			this.props.onComplete({...this.state.filters});
		});
	};

	onClose = () => {
		this._customersCancelToken && this._customersCancelToken.cancel("Only one request allowed at a time.");
		this._documentTypesCancelToken && this._documentTypesCancelToken.cancel("Only one request allowed at a time.");

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

	render() {
		const {visible} = this.props;
		const {
			filters,
			customersIsLoading,
			customers,
			documentTypesIsLoading,
			documentTypes,
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
							<Select
								mode="multiple"
								filterOption={false}
								allowClear
								showSearch
								placeholder="Pesquise e selecione um ou mais clientes"
								notFoundContent={customersIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchCustomers}
								onChange={(value) => this.setFilter("customer_ids", value && value.length ? value : null)}
								value={filters.customer_ids || []}>
								{customers.map((item, index) => {
									const optionValue = this.getCustomerValue(item);

									if( optionValue === null ) return null;

									return (
										<Select.Option key={item.uuid || optionValue || index} value={optionValue}>
											{this.getCustomerLabel(item)}
										</Select.Option>
									);
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Tipo do documento</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								mode="multiple"
								filterOption={false}
								allowClear
								showSearch
								placeholder="Selecione um ou mais tipos de documento"
								notFoundContent={documentTypesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchDocumentTypes}
								onChange={(value) => this.setFilter("document_type_ids", value && value.length ? value : null)}
								value={filters.document_type_ids || []}>
								{documentTypes.map((item, index) => {
									const optionValue = this.getDocumentTypeValue(item);

									if( optionValue === null ) return null;

									return (
										<Select.Option key={item.uuid || optionValue || index} value={optionValue}>
											{this.getDocumentTypeLabel(item)}
										</Select.Option>
									);
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Período de vencimento</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<DatePicker.RangePicker
								format="DD/MM/YYYY"
								value={filters.expiration_date}
								onChange={(date) => this.setFilter("expiration_date", date ?? null)}
								disabledDate={(currentDate) => currentDate.isAfter(moment().add(50, "years"), "day")}
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
								<Radio onChange={() => this.setFilter("status", null)} checked={filters.status === null}>Todos</Radio>
							</div>
							{STATUS_OPTIONS.map((item) => (
								<div className="filter-group-radio" key={item.value}>
									<Radio onChange={() => this.setFilter("status", item.value)} checked={filters.status === item.value}>{item.label}</Radio>
								</div>
							))}
						</div>
					</div>
				</div>
			</Modal>
		);
	}
}

export default Filters;
