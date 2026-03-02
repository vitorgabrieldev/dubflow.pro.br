import React, { Component, Fragment } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { generalActions } from "./../../redux/actions";
import { processesService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalShow from "./show";
import ModalFilters from "./filters";

const PROCESS_STATUS_OPTIONS = [
	{label: "Novo cliente", value: "novo-cliente", color: "#4c8bf5"},
	{label: "Em preparação", value: "em-preparacao", color: "#ffbc00"},
	{label: "Enviado", value: "enviado", color: "#39afd1"},
	{label: "Pronto para análise", value: "pronto-para-analise", color: "#f06595"},
	{label: "Em análise", value: "em-analise", color: "#727cf5"},
	{label: "Deferido", value: "deferido", color: "#0acf97"},
	{label: "Restituído", value: "restituido", color: "#6f42c1"},
	{label: "Indeferido", value: "indeferido", color: "#fa5c7c"},
];

const config = {
	title            : "Processos",
	permissionPrefix : "processes",
	list             : "processes",
	searchPlaceholder: "Buscar por número do processo",
	orders           : [
		{
			label  : "Mais recentes",
			field  : "created_at",
			sort   : "desc",
			default: true,
		},
		{
			label: "Mais antigos",
			field: "created_at",
			sort : "asc",
		},
	],
};

class Index extends Component {
	constructor(props) {
		super(props);

		const defaultOrder = config.orders.find(o => o.default);

		this.state = {
			isLoading          : false,
			listType           : "list",
			data               : [],
			pagination         : {
				current : 1,
				pageSize: 20,
				total   : 0,
			},
			orderByLabel       : defaultOrder.label,
			orderByField       : defaultOrder.field,
			orderBySort        : defaultOrder.sort,
			search             : "",
			showModalVisible   : false,
			filtersModalVisible: false,
			isExporting        : false,
			totalFilters       : 0,
			filters            : {
				customer_ids        : null,
				despachante_ids     : null,
				despachante_user_ids: null,
				service_type_ids    : null,
				service_ids         : null,
				created_at          : null,
				status              : null,
			},
		};

		this._cancelToken = null;
	}

	static getDerivedStateFromProps(props, state) {
		if( props.listType && state.listType !== props.listType )
		{
			return {listType: props.listType};
		}

		return null;
	}

	componentDidMount() {
		this.fetchGetAll(true);
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Landing Component got unmounted");
	}

	normalize = (value) => String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

	getValue = (item, keys = [], fallback = "N/A") => {
		for( const key of keys )
		{
			if( !key ) continue;

			const value = String(key).includes(".")
				? String(key).split(".").reduce((acc, current) => acc?.[current], item)
				: item?.[key];

			if( value !== null && typeof value !== "undefined" && value !== "" )
			{
				return value;
			}
		}

		return fallback;
	};

	formatDateTime = (value, fallback = "N/A") => {
		if( !value ) return fallback;
		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : fallback;
	};

	getProcessStatusLabel = (status) => {
		if( status === null || typeof status === "undefined" || status === "" ) return "N/A";

		const normalized = this.normalize(status);
		const option = PROCESS_STATUS_OPTIONS.find(item => item.value === normalized);
		if( option ) return option.label;

		return String(status).replace(/-/g, " ");
	};

	getProcessStatusColor = (status) => {
		const normalized = this.normalize(status);
		const option = PROCESS_STATUS_OPTIONS.find(item => item.value === normalized);
		return option?.color || "#6c757d";
	};

	getCustomerLabel = (item) => this.getValue(item, ["customer.name", "customer.nome", "customer_id"], "N/A");
	getDespachanteLabel = (item) => this.getValue(item, ["despachante.name", "despachante.nome", "dispatcher.name", "despachante_id"], "N/A");
	getDespachanteUserLabel = (item) => this.getValue(item, ["despachante_user.name", "despachanteUser.name", "responsavel.name", "despachante_user_id"], "N/A");
	getServiceTypeLabel = (item) => this.getValue(item, ["service_type.name", "serviceType.name", "service_type_id"], "N/A");
	getServiceLabel = (item) => this.getValue(item, ["service.name", "service_id"], "N/A");

	countAppliedFilters = (filters) => {
		return Object.keys(filters).filter((key) => {
			if( !filters.hasOwnProperty(key) ) return false;

			const value = filters[key];
			if( Array.isArray(value) ) return value.length > 0;
			return value !== null;
		}).length;
	};

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".show") && (
				<Menu.Item key="show">
					<a onClick={() => this.showOpen(item)}>
						<i className="fal fa-file" />Visualizar
					</a>
				</Menu.Item>
			)}
		</Menu>
	);

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{
				title    : "ID",
				className: "id",
				visible  : !listTypeCard,
				render   : (item) => <span title={item?.uuid}>{item?.uuid || item?.id || "N/A"}</span>,
			},
			{
				title : "Número do processo",
				render: (item) => listTypeCard ? <h3>{item?.numero_processo || "N/A"}</h3> : (item?.numero_processo || "N/A"),
			},
			{
				title : "Cliente",
				render: (item) => this.getCustomerLabel(item),
			},
			{
				title : "Despachante",
				render: (item) => this.getDespachanteLabel(item),
			},
			{
				title : "Responsável",
				render: (item) => this.getDespachanteUserLabel(item),
			},
			{
				title : "Serviço",
				render: (item) => this.getServiceLabel(item),
			},
			{
				title    : "Status",
				className: "active no-ellipsis processes-status-col",
				render   : (item) => (
					<Tag color={this.getProcessStatusColor(item?.status)}>{this.getProcessStatusLabel(item?.status)}</Tag>
				),
			},
			{
				title    : "Cadastro",
				className: "datetime card-block-width-2",
				render   : (item) => {
					const formatted = this.formatDateTime(item?.created_at);

					if( listTypeCard )
					{
						return (
							<Fragment>
								<i className="fal fa-plus-circle" style={{marginRight: 5}} />{formatted}
							</Fragment>
						);
					}

					return formatted;
				},
			},
			{
				title    : "Ações",
				className: "actions no-ellipsis",
				visible  : this.props.permissions.includes(config.permissionPrefix + ".show"),
				render   : (item) => (
					<Dropdown overlay={this.menuItem(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}>
						<Button icon={<i className="fal fa-ellipsis-v" />} />
					</Dropdown>
				),
			},
		];
	};

	fetchGetAll = (init = false, exportItems = false) => {
		if( this._cancelToken )
		{
			this._cancelToken.cancel("Only one request allowed at a time.");
		}

		this._cancelToken = axios.CancelToken.source();

		const {pagination, orderByField, orderBySort, search, filters} = this.state;

		if( exportItems )
		{
			this.setState({isExporting: true});
		}
		else
		{
			this.setState({isLoading: true});
		}

		const data = {
			orderBy: `${orderByField}:${orderBySort}`,
			search : search,
		};

		if( exportItems )
		{
			data.exportItems = true;
		}
		else
		{
			data.page  = init ? 1 : pagination.current;
			data.limit = pagination.pageSize;
		}

		if( Array.isArray(filters.customer_ids) && filters.customer_ids.length ) data.customer_ids = filters.customer_ids;
		if( Array.isArray(filters.despachante_ids) && filters.despachante_ids.length ) data.despachante_ids = filters.despachante_ids;
		if( Array.isArray(filters.despachante_user_ids) && filters.despachante_user_ids.length ) data.despachante_user_ids = filters.despachante_user_ids;
		if( Array.isArray(filters.service_type_ids) && filters.service_type_ids.length ) data.service_type_ids = filters.service_type_ids;
		if( Array.isArray(filters.service_ids) && filters.service_ids.length ) data.service_ids = filters.service_ids;

		if( filters.created_at )
		{
			data.start_date = filters.created_at[0].clone().format("YYYY-MM-DD");
			data.end_date   = filters.created_at[1].clone().format("YYYY-MM-DD");
		}

		if( filters.status !== null )
		{
			data.status = filters.status;
		}

		processesService.getAll(data, this._cancelToken.token)
		.then((response) => {
			if( exportItems )
			{
				this.setState({isExporting: false});

				if( response?.data?.file_url )
				{
					window.open(response.data.file_url, "_blank");
				}
			}
			else
			{
				this.setState((state) => ({
					isLoading : false,
					data      : response?.data?.data || [],
					pagination: {
						...state.pagination,
						current: response?.data?.meta?.current_page || 1,
						total  : response?.data?.meta?.total || 0,
					},
				}));
			}
		})
		.catch((data) => {
			if( data?.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				isLoading  : false,
				isExporting: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	onListTypeChange = (type) => {
		this.props.onChangeListType(type);
	};

	onPaginationChange = (page) => {
		this.setState((state) => ({
			pagination: {
				...state.pagination,
				current: page,
			},
		}), () => {
			this.fetchGetAll();
		});
	};

	onOrderChange = (value) => {
		const order = config.orders.find(o => `${o.field}:${o.sort}` === value);
		if( !order ) return null;

		this.setState({
			orderByLabel: order.label,
			orderByField: order.field,
			orderBySort : order.sort,
		}, () => {
			this.fetchGetAll(true);
		});
	};

	onSearch = (value) => {
		this.setState({search: value}, () => {
			this.fetchGetAll(true);
		});
	};

	onSearchChange = (e) => {
		if( !e.hasOwnProperty("type") )
		{
			const {search} = this.state;

			this.setState({search: e.target.value}, () => {
				if( search )
				{
					this.fetchGetAll(true);
				}
			});
		}
	};

	showOpen = (item) => {
		const uuid = item?.uuid || item?.id;
		if( !uuid ) return null;

		this.setState({showModalVisible: true});
		this.showScreen.onOpen(uuid);
	};

	showOnClose = () => {
		this.setState({showModalVisible: false});
	};

	filtersOpen = () => {
		this.setState({filtersModalVisible: true});
		this.filtersScreen.onOpen({...this.state.filters});
	};

	filtersOnClose = () => {
		this.setState({filtersModalVisible: false});
	};

	filtersOnComplete = (filters) => {
		this.setState({filtersModalVisible: false});

		this.setState({
			totalFilters: this.countAppliedFilters(filters),
			filters     : filters,
		}, () => {
			this.fetchGetAll(true);
		});
	};

	render() {
		return (
			<QueueAnim className="site-content-inner">
				<div className="page-content" key="1">
					<h1 className="page-title">{config.title}</h1>
					<UIPageListing
						onSearch={this.onSearch}
						onSearchChange={this.onSearchChange}
						onPaginationChange={this.onPaginationChange}
						onOrderChange={this.onOrderChange}
						onListTypeChange={this.onListTypeChange}
						onFiltersClick={this.filtersOpen}
						isLoading={this.state.isLoading}
						listType={this.state.listType}
						orderByField={this.state.orderByField}
						orderBySort={this.state.orderBySort}
						orders={config.orders}
						search={this.state.search}
						searchPlaceholder={config.searchPlaceholder}
						data={this.state.data}
						pagination={this.state.pagination}
						columns={this.columns()}
						showFilters={true}
						totalFilters={this.state.totalFilters}
						buttons={[
							{
								visible: this.props.permissions.includes(config.permissionPrefix + ".export"),
								onClick: () => this.fetchGetAll(true, true),
								title  : this.state.isExporting ? "Exportando" : "Exportar",
								icon   : <i className="fal fa-file-export" />,
								loading: this.state.isExporting,
							},
						]}
					/>
				</div>

				<ModalShow
					ref={el => this.showScreen = el}
					visible={this.state.showModalVisible}
					onClose={this.showOnClose}
				/>

				<ModalFilters
					ref={el => this.filtersScreen = el}
					visible={this.state.filtersModalVisible}
					onComplete={this.filtersOnComplete}
					onClose={this.filtersOnClose}
				/>
			</QueueAnim>
		);
	}
}

const mapStateToProps = (state) => ({
	permissions: state.auth.userData.permissions,
	listType   : state.general.listType[config.list],
});

const mapDispatchToProps = (dispatch) => ({
	onChangeListType: (type) => dispatch(generalActions.changeListType(config.list, type)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
