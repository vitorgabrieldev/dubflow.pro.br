import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select } from "antd";
import moment from "moment";

import { platformUsersService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			created_at : null,
			is_active  : null,
			is_public  : null,
			is_verified: null,
			owner_uuid : null,
			with_deleted: null,
		};

		this.state = {
			filters: {...this.filtersClean},
			owners: [],
			isLoadingOwners: false,
		};
	}

	onOpen = (filters) => {
		this.setState({filters}, () => this.fetchOwners());
	};

	cleanFilters = () => this.setState({filters: this.filtersClean}, () => this.props.onComplete({...this.state.filters}));
	onClose = () => this.props.onClose();
	filtersOnConfirm = () => this.props.onComplete({...this.state.filters});

	setFilter = (name, value) => {
		this.setState(state => ({
			filters: {
				...state.filters,
				[name]: value,
			}
		}));
	};

	fetchOwners = (search = "") => {
		this.setState({isLoadingOwners: true});

		platformUsersService.getAutocomplete({
			search,
			is_active: 1,
			orderBy  : "name:asc",
		})
		.then((response) => {
			this.setState({
				owners: response.data.data || [],
				isLoadingOwners: false,
			});
		})
		.catch(() => {
			this.setState({
				owners: [],
				isLoadingOwners: false,
			});
		});
	};

	render() {
		const {visible} = this.props;
		const {filters, owners, isLoadingOwners} = this.state;

		return (
			<Modal
				visible={visible}
				title="Filtros avançados"
				centered
				destroyOnClose
				maskClosable
				width={900}
				onCancel={this.onClose}
				onOk={this.filtersOnConfirm}
				className="modal-filters"
				footer={[
					<Button key="back" type="link" onClick={this.cleanFilters}>Excluir filtros</Button>,
					<Button key="submit" type="primary" onClick={this.filtersOnConfirm}>Aplicar</Button>,
				]}>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Status</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", null)} checked={filters.is_active === null}>Todas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", 1)} checked={filters.is_active === 1}>Ativas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", 0)} checked={filters.is_active === 0}>Inativas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Visibilidade</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_public", null)} checked={filters.is_public === null}>Todas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_public", 1)} checked={filters.is_public === 1}>Públicas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_public", 0)} checked={filters.is_public === 0}>Privadas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Verificação</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_verified", null)} checked={filters.is_verified === null}>Todas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_verified", 1)} checked={filters.is_verified === 1}>Verificadas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_verified", 0)} checked={filters.is_verified === 0}>Não verificadas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Dono da comunidade</h3></div>
					<div className="filter-group-filters">
						<Form.Item label="Dono">
							<Select
								showSearch
								allowClear
								filterOption={false}
								placeholder="Selecione o dono"
								value={filters.owner_uuid || undefined}
								onChange={(value) => this.setFilter("owner_uuid", value || null)}
								onSearch={this.fetchOwners}
								loading={isLoadingOwners}>
								{owners.filter((item) => !!item.uuid).map((item) => (
									<Select.Option key={item.uuid} value={item.uuid}>
										{`${item.name} (${item.email})`}
									</Select.Option>
								))}
							</Select>
						</Form.Item>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Opções adicionais</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", null)} checked={filters.with_deleted === null}>Ativas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", true)} checked={filters.with_deleted === true}>Incluir deletadas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Data de criação</h3></div>
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
