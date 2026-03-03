import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Tag } from "antd";
import QueueAnim from "rc-queue-anim";
import moment from "moment";

import { generalActions } from "./../../redux/actions";
import { downloadPrivateFile } from "./../../helpers/download";
import { opportunitiesService } from "./../../redux/services";
import { UIPageListing } from "./../../components";

import ModalCreate from "./create";
import ModalEdit from "./edit";
import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Oportunidades",
	permissionPrefix : "opportunities",
	list             : "opportunities",
	searchPlaceholder: "Buscar por id, título, status ou descrição",
	orders           : [
		{ label: "Mais recentes", field: "id", sort: "desc", default: true },
		{ label: "Mais antigas", field: "id", sort: "asc" },
		{ label: "Título A|Z", field: "title", sort: "asc" },
		{ label: "Título Z|A", field: "title", sort: "desc" },
	],
};

class Index extends Component {
	constructor(props) {
		super(props);
		const defaultOrder = config.orders.find(o => o.default);

		this.state = {
			isLoading: false,
			listType : "list",
			data     : [],
			pagination: {
				current : 1,
				pageSize: 20,
				total   : 0,
			},
			orderByField: defaultOrder.field,
			orderBySort : defaultOrder.sort,
			search      : "",
			createModalVisible : false,
			editModalVisible   : false,
			showModalVisible   : false,
			filtersModalVisible: false,
			isExporting        : false,
			totalFilters       : 0,
			filters            : {
				created_at         : null,
				starts_at          : null,
				organization_id    : null,
				created_by_user_uuid: null,
				status             : null,
				visibility         : null,
				with_deleted       : null,
			},
		};
	}

	static getDerivedStateFromProps(props, state) {
		if( props.listType && state.listType !== props.listType ) return {listType: props.listType};
		return null;
	}

	componentDidMount() {
		this.fetchGetAll(true);
	}

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".show") && <Menu.Item key="show"><a onClick={() => this.showOpen(item)}><i className="fal fa-file" />Visualizar</a></Menu.Item>}
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && <Menu.Item key="edit"><a onClick={() => this.editOpen(item)}><i className="fal fa-pen" />Editar</a></Menu.Item>}
			{this.props.permissions.includes(config.permissionPrefix + ".delete") && <Menu.Item key="delete" className="divider btn-delete"><a onClick={() => this.deleteConfirm(item)}><i className="fal fa-trash" />Excluir (soft)</a></Menu.Item>}
		</Menu>
	);

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{ title: "ID", className: "id", visible: !listTypeCard, render: (item) => <span title={item.uuid}>{item.uuid}</span> },
			{ title: "Título", render: (item) => listTypeCard ? <h3>{item.title}</h3> : item.title },
			{ title: "Comunidade", render: (item) => item.organization?.name || "-" },
			{ title: "Criador", render: (item) => item.creator?.name || "-" },
			{ title: "Status", className: "no-ellipsis", render: (item) => <Tag color={item.status === "published" ? "#0acf97" : "#f7b84b"}>{item.status}</Tag> },
			{ title: "Visibilidade", className: "no-ellipsis", render: (item) => <Tag color={item.visibility === "external" ? "#39afd1" : "#f7b84b"}>{item.visibility}</Tag> },
			{ title: "Início", className: "datetime", render: (item) => item.starts_at ? moment(item.starts_at).format("DD/MM/YYYY HH:mm") : "-" },
			{
				title    : "Criação",
				className: "datetime",
				render   : (item) => listTypeCard ? <Fragment><i className="fal fa-plus-circle" style={{marginRight: 5}} />{moment(item.created_at).format("DD/MM/YYYY HH:mm")}</Fragment> : moment(item.created_at).format("DD/MM/YYYY HH:mm"),
			},
			{
				title    : "Ações",
				className: "actions no-ellipsis",
				visible  : this.props.permissions.includes(config.permissionPrefix + ".show") || this.props.permissions.includes(config.permissionPrefix + ".edit") || this.props.permissions.includes(config.permissionPrefix + ".delete"),
				render   : (item) => <Dropdown overlay={this.menuItem(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}><Button icon={<i className="fal fa-ellipsis-v" />} /></Dropdown>,
			},
		];
	};

	fetchGetAll = (init = false, exportItems = false) => {
		const {pagination, orderByField, orderBySort, search, filters} = this.state;

		if( exportItems ) this.setState({isExporting: true});
		else this.setState({isLoading: true});

		const data = {orderBy: `${orderByField}:${orderBySort}`, search};

		if( exportItems ) data.exportItems = true;
		else {
			data.page = init ? 1 : pagination.current;
			data.limit = pagination.pageSize;
		}

		if( filters.organization_id ) data.organization_id = filters.organization_id;
		if( filters.created_by_user_uuid ) data.created_by_user_uuid = filters.created_by_user_uuid;
		if( filters.status ) data.status = filters.status;
		if( filters.visibility ) data.visibility = filters.visibility;
		if( filters.with_deleted ) data.with_deleted = filters.with_deleted;
		if( filters.created_at ) {
			data.created_at = [
				filters.created_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.created_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
			];
		}
		if( filters.starts_at ) {
			data.starts_at = [
				filters.starts_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.starts_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
			];
		}

		opportunitiesService.getAll(data)
		.then((response) => {
			if( exportItems ) {
				this.setState({isExporting: false});
				downloadPrivateFile(response.data.file_url, "oportunidades.csv").catch((error) => Modal.error({title: "Ocorreu um erro!", content: String(error)}));
			} else {
				this.setState(state => ({
					isLoading: false,
					data: response.data.data,
					pagination: {
						...state.pagination,
						current: response.data.meta.current_page,
						total: response.data.meta.total,
					},
				}));
			}
		})
		.catch((data) => {
			this.setState({isLoading: false, isExporting: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	onListTypeChange = (type) => this.props.onChangeListType(type);
	onPaginationChange = (page) => this.setState(state => ({pagination: {...state.pagination, current: page}}), () => this.fetchGetAll());
	onOrderChange = (value) => { const selected = config.orders.find(o => `${o.field}:${o.sort}` === value); if( !selected ) return; this.setState({orderByField: selected.field, orderBySort: selected.sort}, () => this.fetchGetAll(true)); };
	onSearch = (value) => this.setState({search: value}, () => this.fetchGetAll(true));
	onSearchChange = (e) => { if( !e.hasOwnProperty("type") ) { const {search} = this.state; this.setState({search: e.target.value}, () => { if( search ) this.fetchGetAll(true); }); } };

	createOpen = () => { this.setState({createModalVisible: true}); this.createScreen.onOpen(); };
	createOnClose = () => this.setState({createModalVisible: false});
	createOnComplete = () => this.setState({createModalVisible: false}, () => this.fetchGetAll(true));

	editOpen = ({uuid}) => { this.setState({editModalVisible: true}); this.editScreen.onOpen(uuid); };
	editOnClose = () => this.setState({editModalVisible: false});
	editOnComplete = () => this.setState({editModalVisible: false}, () => this.fetchGetAll());

	showOpen = ({uuid}) => { this.setState({showModalVisible: true}); this.showScreen.onOpen(uuid); };
	showOnClose = () => this.setState({showModalVisible: false});

	deleteConfirm = ({uuid, title}) => Modal.confirm({title: "Confirmar exclusão", content: `Tem certeza de que deseja remover (soft delete) a oportunidade ${title}?`, okText: "Excluir", onOk: () => this.deleteConfirmed(uuid)});
	deleteConfirmed = (uuid) => opportunitiesService.destroy({uuid}).then(() => this.fetchGetAll()).catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));

	filtersOpen = () => { this.setState({filtersModalVisible: true}); this.filtersScreen.onOpen({...this.state.filters}); };
	filtersOnClose = () => this.setState({filtersModalVisible: false});
	filtersOnComplete = (filters) => this.setState({filtersModalVisible: false, totalFilters: Object.keys(filters).filter(key => filters[key] !== null && filters[key] !== "").length, filters}, () => this.fetchGetAll(true));

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
						showFilters
						totalFilters={this.state.totalFilters}
						buttons={[
							{ visible: this.props.permissions.includes(config.permissionPrefix + ".create"), onClick: this.createOpen, title: "Cadastrar", icon: <i className="far fa-plus" /> },
							{ visible: this.props.permissions.includes(config.permissionPrefix + ".export"), onClick: () => this.fetchGetAll(true, true), title: this.state.isExporting ? "Exportando" : "Exportar", icon: <i className="fal fa-file-export" />, loading: this.state.isExporting },
						]}
					/>
				</div>
				<ModalCreate ref={(el) => this.createScreen = el} visible={this.state.createModalVisible} onComplete={this.createOnComplete} onClose={this.createOnClose} />
				<ModalEdit ref={(el) => this.editScreen = el} visible={this.state.editModalVisible} onComplete={this.editOnComplete} onClose={this.editOnClose} />
				<ModalShow ref={(el) => this.showScreen = el} visible={this.state.showModalVisible} onClose={this.showOnClose} />
				<ModalFilters ref={(el) => this.filtersScreen = el} visible={this.state.filtersModalVisible} onComplete={this.filtersOnComplete} onClose={this.filtersOnClose} />
			</QueueAnim>
		)
	}
}

const mapStateToProps = (state) => ({ permissions: state.auth.userData.permissions, listType: state.general.listType[config.list] });
const mapDispatchToProps = (dispatch) => ({ onChangeListType: (type) => dispatch(generalActions.changeListType(config.list, type)) });

export default connect(mapStateToProps, mapDispatchToProps)(Index);
