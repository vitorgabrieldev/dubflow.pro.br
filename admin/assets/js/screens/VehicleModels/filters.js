import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, Modal, Radio, Select, Form, Spin } from "antd";
import { vehicleBrandsService } from "./../../redux/services";
import axios from "axios";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			is_active : null,
			marca_id  : null
		};

		this.state = {
			marcas: [],
			vehiclesIsLoading : false,
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

	fetchvehiclesBrands = (value) => {
		if (this._axiosCancelMotorcycleBrandToken) {
			this._axiosCancelMotorcycleBrandToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelMotorcycleBrandToken = axios.CancelToken.source();

		this.setState({
			vehiclesIsLoading: true,
		});

		vehicleBrandsService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelMotorcycleBrandToken.token,
		})
			.then((response) => {
				this.setState({
					vehiclesIsLoading: false,
					marcas: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					vehiclesIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	render() {
		const {visible} = this.props;
		const {filters, vehiclesIsLoading, marcas} = this.state;

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
						<h3>Marca</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item name="store_id">
							<Select
								filterOption={false}
								allowClear
								onChange={(e) => this.setFilter("marca_id", e.value)}
								showSearch
								labelInValue={true}
								notFoundContent={vehiclesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchvehiclesBrands}
								options={marcas.map((item) => ({
									value: item.uuid,
									label: item.name
								}))}
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
								<Radio onChange={(e) => this.setFilter("is_active", null)} checked={filters.is_active === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("is_active", 1)} checked={filters.is_active === 1}>Ativo</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("is_active", 0)} checked={filters.is_active === 0}>Inativo</Radio>
							</div>
						</div>
					</div>
				</div>
			</Modal>
		)
	}
}

export default Filters;
