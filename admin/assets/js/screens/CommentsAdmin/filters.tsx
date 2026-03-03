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
			created_at : null,
			post_id    : null,
			user_uuid  : null,
			is_reply   : null,
			with_deleted: null,
		};
		this.state = {filters: {...this.filtersClean}};
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
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Tipo</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", null)} checked={filters.is_reply === null}>Todos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", 0)} checked={filters.is_reply === 0}>Comentários raiz</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", 1)} checked={filters.is_reply === 1}>Respostas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Relacionamentos</h3></div>
					<div className="filter-group-filters">
						<Form.Item label="ID do post"><Input value={filters.post_id || ""} onChange={(e) => this.setFilter("post_id", e.target.value || null)} /></Form.Item>
						<Form.Item label="UUID do usuário"><Input value={filters.user_uuid || ""} onChange={(e) => this.setFilter("user_uuid", e.target.value || null)} /></Form.Item>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Opções adicionais</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", null)} checked={filters.with_deleted === null}>Ativos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", true)} checked={filters.with_deleted === true}>Incluir deletados</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Data de criação</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<DatePicker.RangePicker format="DD/MM/YYYY" value={filters.created_at} onChange={(date) => this.setFilter("created_at", date ?? null)} disabledDate={(currentDate) => currentDate.isAfter(moment(), "day")} />
						</Form.Item>
					</div>
				</div>
			</Modal>
		)
	}
}

export default Filters;
