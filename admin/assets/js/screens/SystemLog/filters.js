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
			created_at: null,
			level     : null,
			method    : null,
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

	render() {
		const {visible} = this.props;
		const {filters} = this.state;

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
						<h3>Level</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", null)} checked={filters.level === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "ALERT")} checked={filters.level === "ALERT"}>ALERT</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "CRITICAL")} checked={filters.level === "CRITICAL"}>CRITICAL</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "DEBUG")} checked={filters.level === "DEBUG"}>DEBUG</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "EMERGENCY")} checked={filters.level === "EMERGENCY"}>EMERGENCY</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "ERROR")} checked={filters.level === "ERROR"}>ERROR</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "INFO")} checked={filters.level === "INFO"}>INFO</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "NOTICE")} checked={filters.level === "NOTICE"}>NOTICE</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("level", "WARNING")} checked={filters.level === "WARNING"}>WARNING</Radio>
							</div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}>
						<h3>Método</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("method", null)} checked={filters.method === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("method", "DELETE")} checked={filters.method === "DELETE"}>DELETE</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("method", "GET")} checked={filters.method === "GET"}>GET</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={(e) => this.setFilter("method", "POST")} checked={filters.method === "POST"}>POST</Radio>
							</div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Data</h3>
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
			</Modal>
		)
	}
}

export default Filters;
