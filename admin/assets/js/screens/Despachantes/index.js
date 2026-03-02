import React, { Component, Fragment } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Spin, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { generalActions } from "./../../redux/actions";
import { despachantesService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalCreate from "./create";
import ModalEdit from "./edit";
import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Despachantes",
	permissionPrefix : "despachantes",
	list             : "despachantes",
	searchPlaceholder: "Buscar por nome ou e-mail",
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
			createModalVisible : false,
			editModalVisible   : false,
			showModalVisible   : false,
			filtersModalVisible: false,
			isExporting        : false,
			totalFilters       : 0,
			filters            : {
				is_active : null,
				state_id  : null,
				city_id   : null,
				created_at: null,
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

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".show") && <Menu.Item key="show">
				<a onClick={() => this.showOpen(item)}>
					<i className="fal fa-file" />Visualizar
				</a>
			</Menu.Item>}
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && <Menu.Item key="edit">
				<a onClick={() => this.editOpen(item)}>
					<i className="fal fa-pen" />Editar
				</a>
			</Menu.Item>}
		</Menu>
	);

	getLocationLabel = (item) => {
		const stateName = item?.state?.name || item?.city?.state?.name || item?.state_name || item?.uf || "N/A";
		const cityName  = item?.city?.name || item?.city_name || "N/A";

		return {stateName, cityName};
	};

	formatDateTime = (value) => {
		return value ? moment(value).format("DD/MM/YYYY HH:mm") : "N/A";
	};

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{
				title    : "ID",
				className: "id",
				visible  : !listTypeCard,
				render   : (item) => <span title={item.uuid || item.id}>{item.uuid || item.id || "N/A"}</span>,
			},
			{
				title : "Nome",
				render: (item) => listTypeCard ? <h3>{item.name || "N/A"}</h3> : (item.name || "N/A"),
			},
			{
				title : "E-mail",
				render: (item) => item.email || "N/A",
			},
			{
				title : "Estado",
				render: (item) => this.getLocationLabel(item).stateName,
			},
			{
				title : "Cidade",
				render: (item) => this.getLocationLabel(item).cityName,
			},
			{
				title : "Limite usuários",
				render: (item) => item.user_limit ?? "N/A",
			},
			{
				title    : "Criação",
				className: "datetime card-block-width-2",
				render   : (item) => {
					const formatted = this.formatDateTime(item.created_at);

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
				title    : "Ativo",
				className: "active no-ellipsis",
				render   : (item) => {
					if( item.is_active === null || typeof item.is_active === "undefined" )
					{
						return <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} />;
					}

					return <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativo" : "Inativo"}</Tag>;
				},
			},
			{
				title    : "Ações",
				className: "actions no-ellipsis",
				visible  : this.props.permissions.includes(config.permissionPrefix + ".show")
					|| this.props.permissions.includes(config.permissionPrefix + ".edit"),
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
		const queryParams = new URLSearchParams(this.props.location.search);
		const isActiveParam = queryParams.get("is_active");
		let urlIsActive = null;

		if( isActiveParam !== null && isActiveParam !== "" )
		{
			const normalized = String(isActiveParam).trim().toLowerCase();

			if( normalized === "true" || normalized === "1" )
			{
				urlIsActive = 1;
			}
			else if( normalized === "false" || normalized === "0" )
			{
				urlIsActive = 0;
			}
		}

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

		let data = {
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

		if( urlIsActive !== null )
		{
			data.is_active = urlIsActive;
		}
		else if( filters.is_active !== null )
		{
			data.is_active = filters.is_active;
		}

		if( filters.state_id !== null )
		{
			data.state_id = filters.state_id;
		}

		if( filters.city_id !== null )
		{
			data.city_id = filters.city_id;
		}

		if( filters.created_at )
		{
			data.created_at = [
				filters.created_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.created_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
			];
		}

		despachantesService.getAll(data, this._cancelToken.token)
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
					this.setState((state) => {
						const nextFilters = urlIsActive !== null ? {
							...state.filters,
							is_active: urlIsActive,
						} : state.filters;

						return {
							isLoading : false,
							data      : response.data.data || [],
							pagination: {
								...state.pagination,
								current: response?.data?.meta?.current_page || 1,
								total  : response?.data?.meta?.total || 0,
							},
							filters     : nextFilters,
							totalFilters: urlIsActive !== null ? Object.keys(nextFilters).filter(key => nextFilters.hasOwnProperty(key) && nextFilters[key] !== null).length : state.totalFilters,
						};
					});
				}

				if( isActiveParam !== null )
				{
					this.props.history.replace({
						pathname: this.props.location.pathname,
						search  : "",
					});
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
		this.setState(state => ({
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

	createOpen = () => {
		this.setState({createModalVisible: true});

		this.createScreen.onOpen();
	};

	createOnClose = () => {
		this.setState({createModalVisible: false});
	};

	createOnComplete = () => {
		this.setState({createModalVisible: false});

		this.fetchGetAll(true);
	};

	editOpen = ({uuid}) => {
		this.setState({editModalVisible: true});

		this.editScreen.onOpen(uuid);
	};

	editOnClose = () => {
		this.setState({editModalVisible: false});
	};

	editOnComplete = () => {
		this.setState({editModalVisible: false});

		this.fetchGetAll();
	};

	showOpen = ({uuid}) => {
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
			totalFilters: Object.keys(filters).filter(key => filters.hasOwnProperty(key) && filters[key] !== null).length,
			filters     : filters,
		}, () => {
			this.fetchGetAll(true);
		});
	};

	render() {
		return (
			<QueueAnim className="site-content-inner">
				<div className="page-content fixed-header" key="1">
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
								visible: this.props.permissions.includes(config.permissionPrefix + ".create"),
								onClick: this.createOpen,
								title  : "Incluir",
								icon   : <i className="far fa-plus" />,
							},
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
				<ModalCreate
					ref={el => this.createScreen = el}
					visible={this.state.createModalVisible}
					onComplete={this.createOnComplete}
					onClose={this.createOnClose}
				/>
				<ModalEdit
					ref={el => this.editScreen = el}
					visible={this.state.editModalVisible}
					onComplete={this.editOnComplete}
					onClose={this.editOnClose}
				/>
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
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		permissions: state.auth.userData.permissions,
		listType   : state.general.listType[config.list],
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		onChangeListType: (type) => {
			dispatch(generalActions.changeListType(config.list, type));
		}
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(Index);
