import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio } from "antd";
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
			created_at  : null,
			visibility  : null,
			with_deleted: null,
		};

		this.state = { filters: {...this.filtersClean} };
	}

	onOpen = (filters) => this.setState({filters});
	cleanFilters = () => this.setState({filters: this.filtersClean}, () => this.props.onComplete({...this.state.filters}));
	onClose = () => this.props.onClose();
	filtersOnConfirm = () => this.props.onComplete({...this.state.filters});
	setFilter = (name, value) => this.setState(state => ({filters: {...state.filters, [name]: value}}));

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
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Visibilidade</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("visibility", null)} checked={filters.visibility === null}>Todas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("visibility", "public")} checked={filters.visibility === "public"}>Públicas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("visibility", "private")} checked={filters.visibility === "private"}>Privadas</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("visibility", "internal")} checked={filters.visibility === "internal"}>Internas</Radio></div>
						</div>
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
