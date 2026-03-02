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
			status    : null,
		};

		this.state = {
			filters: {
				...this.filtersClean,
			},
		};
	}

	onOpen = (filters) => {
		this.setState({
			filters: {
				...this.filtersClean,
				...filters,
			},
		});
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
		this.setState((state) => ({
			filters: {
				...state.filters,
				[name]: value,
			},
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
						<h3>Status</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("status", null)} checked={filters.status === null}>Todos</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("status", 1)} checked={filters.status === 1}>Ativo</Radio>
							</div>
							<div className="filter-group-radio">
								<Radio onChange={() => this.setFilter("status", 0)} checked={filters.status === 0}>Inativo</Radio>
							</div>
						</div>
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
			</Modal>
		);
	}
}

export default Filters;
