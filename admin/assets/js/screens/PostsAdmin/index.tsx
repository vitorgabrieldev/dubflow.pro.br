import React, { Component } from "react";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Tag, Typography } from "antd";
import QueueAnim from "rc-queue-anim";
import moment from "moment";

import { generalActions } from "./../../redux/actions";
import { postsAdminService } from "./../../redux/services";
import { UIPageListing } from "./../../components";

import ModalShow from "./show";

const config = {
	title            : "Publicações",
	permissionPrefix : "posts",
	list             : "posts-admin",
	searchPlaceholder: "Buscar por título, descrição, comunidade, autor ou ID",
	orders           : [
		{ label: "Mais recentes", field: "id", sort: "desc", default: true },
		{ label: "Mais antigas", field: "id", sort: "asc" },
		{ label: "Mais curtidas", field: "likes_count", sort: "desc" },
		{ label: "Mais comentadas", field: "comments_count", sort: "desc" },
		{ label: "Mais visualizadas", field: "views_count", sort: "desc" },
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
			showModalVisible: false,
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
			{this.hasPermission(config.permissionPrefix + ".show") && <Menu.Item key="show"><a onClick={() => this.showOpen(item)}><i className="fal fa-file" />Visualizar</a></Menu.Item>}
		</Menu>
	);

	hasPermission = (permission) => {
		const hasSystemRole = Array.isArray(this.props.roles) && this.props.roles.some((role) => role?.is_system);
		return hasSystemRole || this.props.permissions.includes(permission);
	};

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{ title: "ID", className: "id", visible: !listTypeCard, render: (item) => item.id },
			{
				title    : "Publicação",
				className: "no-ellipsis",
				render   : (item) => (
					<div>
						<div style={{fontWeight: 600}}>{item.title || "-"}</div>
						<Typography.Paragraph ellipsis={{rows: 2}} style={{margin: 0}}>{item.description || "Sem descrição."}</Typography.Paragraph>
					</div>
				),
			},
			{ title: "Comunidade", render: (item) => item.organization?.name || "-" },
			{ title: "Autor", render: (item) => item.author?.stage_name || item.author?.name || "-" },
			{
				title    : "Status",
				className: "no-ellipsis",
				render   : (item) => (
					<div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
						<Tag color={item.is_published ? "#0acf97" : "#fa5c7c"}>{item.is_published ? "Publicado" : "Rascunho"}</Tag>
						<Tag color={item.visibility === "public" ? "#39afd1" : item.visibility === "private" ? "#6c757d" : "#f7b84b"}>
							{item.visibility === "public" ? "Público" : item.visibility === "private" ? "Privado" : "Não listado"}
						</Tag>
					</div>
				),
			},
			{
				title    : "Engajamento",
				className: "no-ellipsis",
				render   : (item) => (
					<span>
						<i className="fal fa-heart" style={{marginRight: 4}} />
						{item.likes_count || 0}
						{" • "}
						<i className="fal fa-comment" style={{marginRight: 4, marginLeft: 6}} />
						{item.comments_count || 0}
						{" • "}
						<i className="fal fa-play" style={{marginRight: 4, marginLeft: 6}} />
						{item.views_count || 0}
					</span>
				),
			},
			{
				title    : "Publicação",
				className: "datetime",
				render   : (item) => {
					const date = item.published_at || item.created_at;
					return listTypeCard
						? <span><i className="fal fa-clock" style={{marginRight: 5}} />{date ? moment(date).format("DD/MM/YYYY HH:mm") : "-"}</span>
						: (date ? moment(date).format("DD/MM/YYYY HH:mm") : "-");
				},
			},
			{
				title    : "Ações",
				className: "actions no-ellipsis",
				visible  : this.hasPermission(config.permissionPrefix + ".show"),
				render   : (item) => <Dropdown overlay={this.menuItem(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}><Button icon={<i className="fal fa-ellipsis-v" />} /></Dropdown>,
			},
		];
	};

	fetchGetAll = (init = false) => {
		const {pagination, orderByField, orderBySort, search} = this.state;

		this.setState({isLoading: true});

		const data = {
			orderBy: `${orderByField}:${orderBySort}`,
			search,
			page: init ? 1 : pagination.current,
			limit: pagination.pageSize,
		};

		postsAdminService.getAll(data)
			.then((response) => {
				this.setState(state => ({
					isLoading: false,
					data: response.data.data,
					pagination: {...state.pagination, current: response.data.meta.current_page, total: response.data.meta.total},
				}));
			})
			.catch((data) => {
				this.setState({isLoading: false});
				Modal.error({title: "Ocorreu um erro!", content: String(data)});
			});
	};

	onListTypeChange = (type) => this.props.onChangeListType(type);
	onPaginationChange = (page) => this.setState(state => ({pagination: {...state.pagination, current: page}}), () => this.fetchGetAll());
	onOrderChange = (value) => {
		const selected = config.orders.find(o => `${o.field}:${o.sort}` === value);
		if( !selected ) return;
		this.setState({orderByField: selected.field, orderBySort: selected.sort}, () => this.fetchGetAll(true));
	};
	onSearch = (value) => this.setState({search: value}, () => this.fetchGetAll(true));
	onSearchChange = (e) => {
		if( !e.hasOwnProperty("type") ) {
			const {search} = this.state;
			this.setState({search: e.target.value}, () => { if( search ) this.fetchGetAll(true); });
		}
	};

	showOpen = ({id}) => { this.setState({showModalVisible: true}); this.showScreen.onOpen(id); };
	showOnClose = () => this.setState({showModalVisible: false});

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
						buttons={[]}
					/>
				</div>
				<ModalShow ref={(el) => this.showScreen = el} visible={this.state.showModalVisible} onClose={this.showOnClose} />
			</QueueAnim>
		)
	}
}

const mapStateToProps = (state) => ({ permissions: state.auth.userData.permissions, roles: state.auth.userData.roles, listType: state.general.listType[config.list] });
const mapDispatchToProps = (dispatch) => ({ onChangeListType: (type) => dispatch(generalActions.changeListType(config.list, type)) });

export default connect(mapStateToProps, mapDispatchToProps)(Index);
