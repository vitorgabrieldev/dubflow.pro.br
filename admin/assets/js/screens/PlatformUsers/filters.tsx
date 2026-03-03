import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Input, Modal, Radio } from "antd";
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
			created_at: null,
			is_active : null,
			is_private: null,
			state     : null,
			city      : null,
		};

		this.state = {
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
		}, () => this.props.onComplete({...this.state.filters}));
	};

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

	render() {
		const {visible} = this.props;
		const {filters} = this.state;

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
					<div className="filter-group-title" style={{paddingTop: 0}}>
						<h3>Status da conta</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", null)} checked={filters.is_active === null}>Todos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", 1)} checked={filters.is_active === 1}>Ativos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_active", 0)} checked={filters.is_active === 0}>Inativos</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}>
						<h3>Privacidade do perfil</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_private", null)} checked={filters.is_private === null}>Todos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_private", 1)} checked={filters.is_private === 1}>Privados</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_private", 0)} checked={filters.is_private === 0}>Públicos</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Localização</h3></div>
					<div className="filter-group-filters">
						<Form.Item label="Estado">
							<Input value={filters.state || ""} onChange={(e) => this.setFilter("state", e.target.value || null)} />
						</Form.Item>
						<Form.Item label="Cidade">
							<Input value={filters.city || ""} onChange={(e) => this.setFilter("city", e.target.value || null)} />
						</Form.Item>
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
