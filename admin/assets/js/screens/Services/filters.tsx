import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select, Spin } from "antd";

import moment from "moment";

import { serviceCategoriesService, serviceTypesService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			service_category_id: null,
			service_type_id    : null,
			is_active          : null,
			created_at         : null,
		};

		this.state = {
			isLoadingLookups: false,
			serviceCategories: [],
			serviceTypes     : [],
			filters          : {
				...this.filtersClean,
			},
		};
	}

	getOptionValue = (item) => {
		if( !item ) return null;
		return item.id ?? item.uuid ?? null;
	};

	getOptionLabel = (item) => {
		if( !item ) return "N/A";
		return item.title || item.name || "N/A";
	};

	loadLookups = () => {
		this.setState({
			isLoadingLookups: true,
		});

		Promise.all([
			serviceCategoriesService.autocomplete(),
			serviceTypesService.autocomplete(),
		])
		.then(([categoriesResponse, typesResponse]) => {
			this.setState({
				isLoadingLookups: false,
				serviceCategories: categoriesResponse?.data?.data || [],
				serviceTypes     : typesResponse?.data?.data || [],
			});
		})
		.catch((data) => {
			this.setState({
				isLoadingLookups: false,
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

		this.loadLookups();
	};

	cleanFilters = () => {
		this.setState({
			filters: this.filtersClean,
		}, () => {
			this.props.onComplete({...this.state.filters});
		});
	};

	onClose = () => {
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
		const {filters, isLoadingLookups, serviceCategories, serviceTypes} = this.state;

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
						<h3>Categoria do serviço</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								allowClear
								showSearch
								placeholder="Selecione a categoria"
								optionFilterProp="children"
								filterOption={(input, option) => {
									const label = typeof option.children === "string" ? option.children : "";
									return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
								}}
								notFoundContent={isLoadingLookups ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								value={filters.service_category_id}
								onChange={(value) => this.setFilter("service_category_id", typeof value === "undefined" ? null : value)}>
								{serviceCategories.map((item, index) => {
									const value = this.getOptionValue(item);
									if( value === null ) return null;

									return <Select.Option key={item.uuid || value || index} value={value}>{this.getOptionLabel(item)}</Select.Option>;
								})}
							</Select>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Tipo do serviço</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								allowClear
								showSearch
								placeholder="Selecione o tipo"
								optionFilterProp="children"
								filterOption={(input, option) => {
									const label = typeof option.children === "string" ? option.children : "";
									return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
								}}
								notFoundContent={isLoadingLookups ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								value={filters.service_type_id}
								onChange={(value) => this.setFilter("service_type_id", typeof value === "undefined" ? null : value)}>
								{serviceTypes.map((item, index) => {
									const value = this.getOptionValue(item);
									if( value === null ) return null;

									return <Select.Option key={item.uuid || value || index} value={value}>{this.getOptionLabel(item)}</Select.Option>;
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
		)
	}
}

export default Filters;
