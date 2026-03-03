import React, { Component, Fragment } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { generalActions } from "./../../redux/actions";
import { documentsService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Documentos",
	permissionPrefix : "documents",
	list             : "documents",
	searchPlaceholder: "Buscar por nome do documento",
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
		{
			label: "Nome A|Z",
			field: "name",
			sort : "asc",
		},
		{
			label: "Nome Z|A",
			field: "name",
			sort : "desc",
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
				customer_ids      : null,
				document_type_ids : null,
				expiration_date   : null,
				status            : null,
			},
		};

		this._cancelToken = null;
	}

	static getDerivedStateFromProps(props, state) {
		if( props.listType && state.listType !== props.listType )
		{
			return {
				listType: props.listType,
			};
		}

		return null;
	}

	componentDidMount() {
		this.fetchGetAll(true);
	}

	componentWillUnmount() {
		this._cancelToken && this._cancelToken.cancel("Landing Component got unmounted");
	}

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

	formatDate = (value, fallback = "N/A") => {
		if( !value ) return fallback;

		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY") : fallback;
	};

	formatDateTime = (value, fallback = "N/A") => {
		if( !value ) return fallback;

		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : fallback;
	};

	getStatusLabel = (status) => {
		if( status === null || typeof status === "undefined" || status === "" ) return "N/A";

		const raw = String(status).trim();
		const normalized = raw
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\s+/g, "");

		if( normalized === "avencer" ) return "A vencer";
		if( normalized === "valido" ) return "Válido";
		if( normalized === "vencido" ) return "Vencido";

		return raw;
	};

	getStatusColor = (status) => {
		const normalized = String(status || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\s+/g, "")
			.trim();

		if( normalized === "valido" ) return "#0acf97";
		if( normalized === "avencer" ) return "#ffbc00";
		if( normalized === "vencido" ) return "#fa5c7c";

		return "#6c757d";
	};

	getCustomerLabel = (item) => this.getValue(item, [
		"customer.name",
		"customer.nome",
		"customer_name",
	], "N/A");

	getDocumentTypeLabel = (item) => this.getValue(item, [
		"document_type.title",
		"document_type.name",
		"documentType.title",
		"documentType.name",
		"document_type_name",
	], "N/A");

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
				render   : (item) => <span title={item.uuid}>{item.uuid || item.id || "N/A"}</span>,
			},
			{
				title : "Nome do documento",
				render: (item) => listTypeCard ? <h3>{this.getValue(item, ["name"])}</h3> : this.getValue(item, ["name"]),
			},
			{
				title : "Cliente",
				render: (item) => this.getCustomerLabel(item),
			},
			{
				title : "Tipo do documento",
				render: (item) => this.getDocumentTypeLabel(item),
			},
			{
				title    : "Vencimento",
				className: "datetime",
				render   : (item) => this.formatDate(this.getValue(item, ["expiration_date", "expiration"], null)),
			},
			{
				title    : "Status",
				className: "active no-ellipsis documents-status-col",
				render   : (item) => {
					const status = this.getValue(item, ["status"], "N/A");

					return <Tag color={this.getStatusColor(status)}>{this.getStatusLabel(status)}</Tag>;
				},
			},
			{
				title    : "Criação",
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
			this.setState({
				isExporting: true,
			});
		}
		else
		{
			this.setState({
				isLoading: true,
			});
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

		if( Array.isArray(filters.customer_ids) && filters.customer_ids.length )
		{
			data.customer_ids = filters.customer_ids;
		}

		if( Array.isArray(filters.document_type_ids) && filters.document_type_ids.length )
		{
			data.document_type_ids = filters.document_type_ids;
		}

		if( filters.expiration_date )
		{
			data.expiration_start = filters.expiration_date[0].clone().format("YYYY-MM-DD");
			data.expiration_end   = filters.expiration_date[1].clone().format("YYYY-MM-DD");
		}

		if( filters.status !== null )
		{
			data.status = filters.status;
		}

		documentsService.getAll(data, this._cancelToken.token)
		.then((response) => {
			if( exportItems )
			{
				this.setState({
					isExporting: false,
				});

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
		this.setState({
			search: value,
		}, () => {
			this.fetchGetAll(true);
		});
	};

	onSearchChange = (e) => {
		if( !e.hasOwnProperty("type") )
		{
			const {search} = this.state;

			this.setState({
				search: e.target.value,
			}, () => {
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

const mapStateToProps = (state) => {
	return {
		permissions: state.auth.userData.permissions,
		listType   : state.general.listType[config.list],
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		onChangeListType: (type) => {
			dispatch(generalActions.changeListType(config.list, type));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(Index);
