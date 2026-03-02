import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Select, Spin, Tag } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { webserviceService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			state_id  : null,
			created_at: null,
		};

		this.state = {
			filters         : {
				...this.filtersClean,
			},
			statesIsLoading: false,
			states         : [],
		};
	}

	fetchStates = () => {
		this.setState({
			statesIsLoading: true,
		});

		webserviceService.getStates()
		.then((response) => {
			this.setState({
				statesIsLoading: false,
				states         : response.data.data,
			});
		})
		.catch((data) => {
			if( data.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				statesIsLoading: false,
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

		if( !this.state.states.length )
		{
			this.fetchStates();
		}
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
		const {visible}                            = this.props;
		const {filters, statesIsLoading, states} = this.state;

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
						<h3>Estado</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								optionFilterProp="children"
								filterOption={(input, option) => (typeof option.children === 'string' ? option.children : option.children.props.children).toLowerCase().indexOf(input.toLowerCase()) >= 0}
								allowClear
								placeholder="Selecione o estado"
								notFoundContent={statesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onChange={(value) => this.setFilter("state_id", value ?? null)}
								showSearch
								value={this.state.filters.state_id}>
								{states.map((item, index) => (
									<Select.Option key={index} value={item.uuid}>{item.name}</Select.Option>
								))}
							</Select>
						</Form.Item>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title">
						<h3>Criação</h3>
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
