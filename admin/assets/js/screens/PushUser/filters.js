import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Modal, Radio, Select, Spin, Tag } from "antd";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { customerService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.filtersClean = {
			user_id   : null,
			created_at: null,
		};

		this.state = {
			filters       : {
				...this.filtersClean,
			},
			usersIsLoading: false,
			users         : [],
		};

		this._axiosCancelToken = null;
	}

	fetchUsers = (value) => {
		if( this._axiosCancelToken )
		{
			this._axiosCancelToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelToken = axios.CancelToken.source();

		if( !value.trim().length )
		{
			this.setState({
				usersIsLoading: false,
				users         : [],
			});

			return false;
		}

		this.setState({
			usersIsLoading: true,
		});

		customerService.getAutocomplete({
			search        : value,
			orderBy       : "name:asc",
			include_tenant: 1,
			cancelToken   : this._axiosCancelToken.token,
		})
		.then((response) => {
			this.setState({
				usersIsLoading: false,
				users         : response.data.data,
			});
		})
		.catch((data) => {
			if( data.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				usersIsLoading: false,
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

		this._axiosCancelToken && this._axiosCancelToken.cancel("Only one request allowed at a time.");
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
		const {visible}                        = this.props;
		const {filters, usersIsLoading, users} = this.state;

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
						<h3>Usuário</h3>
					</div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<Select
								filterOption={false}
								allowClear
								placeholder="Pesquise o usuário"
								notFoundContent={usersIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
								onSearch={this.fetchUsers}
								onChange={(value) => this.setFilter("user_id", value ?? null)}
								showSearch
								value={this.state.filters.user_id}>
								{users.map((item, index) => (
									<Select.Option key={index} value={item.uuid}>
										{item.is_active ? item.name : (
											<Tag style={{margin: 0}} color="#777" title="Inativo">{item.name}</Tag>
										)}
									</Select.Option>
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
