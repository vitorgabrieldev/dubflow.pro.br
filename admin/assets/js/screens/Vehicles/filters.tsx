import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Spin, Select } from "antd";
import { vehicleBrandsService, profissionaisService, vehicleModelsService } from "./../../redux/services";
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
			marca_id : null,
			modelo_id : null,
			profissional_id : null,
			is_active  : null,
			created_at : null,
		};

		this.state = {
			marcas: [],
			modelos: [],
			usuarios: [],
			marcaIsLoading : false,
			modeloIsLoading : false,
			usuarioIsLoading : false,
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

	fetchmarca = (value) => {
		if (this._axiosCancelMarcaToken) {
			this._axiosCancelMarcaToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelMarcaToken = axios.CancelToken.source();

		this.setState({
			marcaIsLoading: true,
		});

		vehicleBrandsService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelMarcaToken.token,
		})
			.then((response) => {
				this.setState({
					marcaIsLoading: false,
					marcas: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					marcaIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	fetchmodelo = (value) => {
		if (this._axiosCancelmodeloToken) {
			this._axiosCancelmodeloToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelmodeloToken = axios.CancelToken.source();

		this.setState({
			modeloIsLoading: true,
		});

		vehicleModelsService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelmodeloToken.token,
		})
			.then((response) => {
				this.setState({
					modeloIsLoading: false,
					modelos: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					modeloIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	fetchusuario = (value) => {
		if (this._axiosCancelusuarioToken) {
			this._axiosCancelusuarioToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelusuarioToken = axios.CancelToken.source();

		this.setState({
			usuarioIsLoading: true,
		});

		profissionaisService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelusuarioToken.token,
		})
			.then((response) => {
				this.setState({
					usuarioIsLoading: false,
					usuarios: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					usuarioIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	render() {
		const {visible} = this.props;

		const {filters, usuarioIsLoading, marcaIsLoading, modeloIsLoading, marcas, modelos, usuarios} = this.state;

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
								notFoundContent={marcaIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchmarca}
								options={marcas.map((item) => ({
									value: item.uuid,
									label: item.name
								}))}
							/>
						</Form.Item>
					</div>
				</div>

				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Modelo</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item name="store_id">
							<Select
								filterOption={false}
								allowClear
								onChange={(e) => this.setFilter("modelo_id", e.value)}
								showSearch
								labelInValue={true}
								notFoundContent={modeloIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchmodelo}
								options={modelos.map((item) => ({
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
						<Form.Item name="store_id">
							<Select
								filterOption={false}
								allowClear
								onChange={(e) => this.setFilter("profissional_id", e.value)}
								showSearch
								labelInValue={true}
								notFoundContent={usuarioIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchusuario}
								options={usuarios.map((item) => ({
									value: item.uuid,
									label: item.name
								}))}
							/>
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
