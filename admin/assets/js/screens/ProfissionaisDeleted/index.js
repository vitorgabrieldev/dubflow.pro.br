import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Avatar, Button, Dropdown, Menu, Modal, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { generalActions } from "./../../redux/actions";

import { profissionaisDeletedService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Profissionais",
	permissionPrefix : "profissionais",
	list             : "customers",
	searchPlaceholder: "Buscar por nome completo ou e-mail",
	orders           : [
		{
			label  : "Mais recentes",
			field  : "id",
			sort   : "desc",
			default: true,
		},
		{
			label: "Mais antigos",
			field: "id",
			sort : "asc",
		},
		{
			label: "A|Z",
			field: "name",
			sort : "asc",
		},
		{
			label: "Z|A",
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
			isLoading   : false,
			activeLoadings: [],
			listType    : "list",
			data        : [],
			pagination  : {
				current : 1,
				pageSize: 20,
				total   : 0,
			},
			orderByLabel: defaultOrder.label,
			orderByField: defaultOrder.field,
			orderBySort : defaultOrder.sort,
			search      : "",
			// Actions
			createModalVisible : false,
			showModalVisible   : false,
			exportModalVisible : false,
			filtersModalVisible: false,
			isExporting        : false,
			// Images
			imagePreviewVisible: false,
			imagePreviewImage  : "",
			// Media queries
			desktopDown: false,
			// Filters
			totalFilters: 0,
			filters     : {
				is_active  : null,
				deleted_at : null,
				cpf_cnpj: null,
			},
		};
	}

	static getDerivedStateFromProps(props, state) {
		if( props.listType && state.listType !== props.listType )
		{
			return {
				listType: props.listType
			};
		}

		return null;
	}

	componentDidMount() {
		// Fecth all
		this.fetchGetAll(true);
	}

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".show") && <Menu.Item key="show">
				<a onClick={() => this.showOpen(item)}>
					<i className="fal fa-file" />Visualizar
				</a>
			</Menu.Item>}
		</Menu>
	);

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{
				title    : "ID",
				className: "id",
				visible  : !listTypeCard,
				render   : (item) => <span title={item.uuid}>{item.uuid}</span>,
			},
			{
				className: "no-padding-horizontal no-ellipsis text-center",
				width    : 70,
				render   : (item) => {
					if( !item.avatar )
					{
						return <div style={listTypeCard ? {paddingTop: 30, paddingBottom: 15} : {}}>
							<i className="fad fa-user-circle avatar-placeholder" style={{fontSize: this.state.desktopDown || listTypeCard ? 100 : 60, color: "#b3b3b3"}} />
						</div>
					}

					return (
						<div style={listTypeCard ? {paddingTop: 30, paddingBottom: 15} : {}}>
							<a onClick={() => this.onImagePreview(item.avatar)}>
								<Avatar size={this.state.desktopDown || listTypeCard ? 100 : 60} src={this.state.desktopDown ? item.avatar : item.avatar} />
							</a>
						</div>
					)
				}
			},
			{
				title : "Nome completo",
				render: (item) => listTypeCard ? <h3>{item.name}</h3> : item.name,
			},
			{
				title : "E-mail",
				render: (item) => item.email,
			},
			{
				title : "Telefone",
				render: (item) => item.phone || 'N/A'
			},
			{
				title    : "Remoção",
				className: "datetime card-block-width-2",
				render   : (item) => {
					if( listTypeCard )
					{
						return (
							<Fragment>
								<i className="fal fa-plus-circle" style={{marginRight: 5}} />{moment(item.deleted_at).format("DD/MM/YYYY HH:mm")}
							</Fragment>
						);
					}

					return moment(item.created_at).format("DD/MM/YYYY HH:mm");
				}
			},
			{
				title    : "Últ. modificação",
				className: "datetime card-block-width-2",
				render   : (item) => {
					if( listTypeCard )
					{
						return (
							<Fragment>
								<i className="fal fa-pen" style={{marginRight: 5}} />{moment(item.updated_at).format("DD/MM/YYYY HH:mm")}
							</Fragment>
						);
					}

					return moment(item.updated_at).format("DD/MM/YYYY HH:mm");
				},
			},
			{
				title    : "Ativo",
				className: "active no-ellipsis",
				render   : (item) => <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativo" : "Inativo"}</Tag>
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
		const {pagination, orderByField, orderBySort, search, filters} = this.state;

		// Verifica se há algum filtro is_active na URL
		const queryParams = new URLSearchParams(this.props.location.search);
		const isActive = queryParams.get('is_active') ?? null;

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
			search : [search, filters.cpf_cnpj].filter(Boolean).join(" "),
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

		if( filters.is_active !== null )
		{
			data.is_active = filters.is_active;
		}

		// parametro
		if( isActive !== null )
		{
			this.state.filters.is_active = parseInt(isActive);
			data.is_active = isActive;
		}

		if( filters.deleted_at )
		{
			data.deleted_at = [
				filters.deleted_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.deleted_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ")
			];
		}

		profissionaisDeletedService.getAll(data)
		.then((response) => {
			if( exportItems )
			{
				this.setState({
					isExporting: false,
				});

				window.open(response.data.file_url, "_blank");
			}
			else
			{
				this.setState(state => ({
					isLoading : false,
					data      : response.data.data,
					pagination: {
						...state.pagination,
						current: response.data.meta.current_page,
						total  : response.data.meta.total,
					},
				}));
			}

			// Limpar os parâmetros da URL
			this.props.history.push({
				pathname: this.props.location.pathname,
				search: ''
			});
		})
		.catch((data) => {
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
		const defaultOrder = config.orders.find(o => `${o.field}:${o.sort}` === value);

		if( !defaultOrder ) return null;

		this.setState(state => ({
			orderByLabel: defaultOrder.label,
			orderByField: defaultOrder.field,
			orderBySort : defaultOrder.sort,
		}), () => {
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
		// If it does not have type then it's cleaning
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

	/**
	 * Show
	 *
	 * @param uuid
	 */
	showOpen = ({uuid}) => {
		this.setState({showModalVisible: true});

		// On open screen
		this.showScreen.onOpen(uuid);
	};

	showOnClose = () => {
		this.setState({showModalVisible: false});
	};

	/**
	 * Filter
	 */
	filtersOpen = () => {
		this.setState({filtersModalVisible: true});
		// On open screen
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
			// Fecth all
			this.fetchGetAll(true);
		});
	};

	/**
	 * Image preview
	 */
	onImagePreviewClose = () => this.setState({imagePreviewVisible: false});

	onImagePreview = (url) => {
		this.setState({
			imagePreviewImage  : url,
			imagePreviewVisible: true,
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
				<Modal wrapClassName="modal-image" visible={this.state.imagePreviewVisible} centered footer={null} destroyOnClose={true} onCancel={this.onImagePreviewClose}>
					<img src={this.state.imagePreviewImage} />
				</Modal>
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
