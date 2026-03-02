import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, Modal, Radio } from "antd";

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
