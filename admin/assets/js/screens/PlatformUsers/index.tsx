import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Button, Dropdown, Input, Menu, Modal, Spin, Tag } from "antd";
import QueueAnim from "rc-queue-anim";
import moment from "moment";

import { generalActions } from "./../../redux/actions";
import { downloadPrivateFile } from "./../../helpers/download";
import { platformUsersService } from "./../../redux/services";
import { UIPageListing } from "./../../components";

import ModalCreate from "./create";
import ModalEdit from "./edit";
import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Usuários da plataforma",
	permissionPrefix : "platform-users",
	list             : "platform-users",
	searchPlaceholder: "Buscar por id, nome, e-mail ou username",
	orders           : [
		{ label: "Mais recentes", field: "id", sort: "desc", default: true },
		{ label: "Mais antigos", field: "id", sort: "asc" },
		{ label: "Nome A|Z", field: "name", sort: "asc" },
		{ label: "Nome Z|A", field: "name", sort: "desc" },
	],
};

class Index extends Component {
	constructor(props) {
		super(props);

		const defaultOrder = config.orders.find(o => o.default);

		this.state = {
			isLoading  : false,
			listType   : "list",
			data       : [],
			pagination : {
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
				created_at: null,
				is_active : null,
				is_private: null,
				state     : null,
				city      : null,
			},
		};
	}

	static getDerivedStateFromProps(props, state) {
		if( props.listType && state.listType !== props.listType ) {
			return {listType: props.listType};
		}

		return null;
	}

	componentDidMount() {
		this.fetchGetAll(true);
	}

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".show") && (
				<Menu.Item key="show"><a onClick={() => this.showOpen(item)}><i className="fal fa-file" />Visualizar</a></Menu.Item>
			)}
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && !item.is_deleted && (
				<Menu.Item key="edit"><a onClick={() => this.editOpen(item)}><i className="fal fa-pen" />Editar</a></Menu.Item>
			)}
			{this.props.permissions.includes(config.permissionPrefix + ".delete") && !item.is_deleted && (
				<Menu.Item key="delete" className="divider btn-delete"><a onClick={() => this.toggleActiveConfirm(item)}><i className={`fal ${item.is_active ? "fa-toggle-off" : "fa-toggle-on"}`} />{item.is_active ? "Desativar" : "Ativar"}</a></Menu.Item>
			)}
			{this.props.permissions.includes(config.permissionPrefix + ".delete") && !item.is_deleted && (
				<Menu.Item key="delete-permanent" className="btn-delete"><a onClick={() => this.permanentDeleteConfirm(item)}><i className="fal fa-user-times" />Deletar</a></Menu.Item>
			)}
		</Menu>
	);

	columns = () => {
		const listTypeCard = this.state.listType === "card";

		return [
			{ title: "ID", className: "id", visible: !listTypeCard, render: (item) => <span title={item.id}>{item.id}</span> },
			{ title: "Nome", render: (item) => {
				if( listTypeCard ) {
					return <h3>{item.name}</h3>;
				}

				return <span style={{fontWeight: item.is_deleted ? 600 : 400}}>{item.name}</span>;
			} },
			{ title: "E-mail", render: (item) => <span>{item.email}</span> },
			{ title: "Username", render: (item) => item.username || "-" },
			{ title: "Localização", render: (item) => [item.city, item.state].filter(Boolean).join("/") || "-" },
			{
				title    : "Conta",
				className: "no-ellipsis",
				render   : (item) => {
					if( item.is_deleted ) {
						return <Tag color="#cf1322">Deletado</Tag>;
					}

					return <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativa" : "Inativa"}</Tag>;
				}
			},
			{
				title    : "Privacidade",
				className: "no-ellipsis",
				render   : (item) => <Tag color={item.is_private ? "#f7b84b" : "#39afd1"}>{item.is_private ? "Privado" : "Público"}</Tag>
			},
			{
				title    : "Admin",
				className: "no-ellipsis",
				render   : (item) => item.is_admin_panel_user ? <Tag color="#8f66ff">Admin</Tag> : "-"
			},
			{
				title    : "Criação",
				className: "datetime",
				render   : (item) => listTypeCard ? <Fragment><i className="fal fa-plus-circle" style={{marginRight: 5}} />{moment(item.created_at).format("DD/MM/YYYY HH:mm")}</Fragment> : moment(item.created_at).format("DD/MM/YYYY HH:mm"),
			},
			{
				title    : "Ações",
				className: "actions no-ellipsis",
				visible  : this.props.permissions.includes(config.permissionPrefix + ".show") || this.props.permissions.includes(config.permissionPrefix + ".edit") || this.props.permissions.includes(config.permissionPrefix + ".delete"),
				render   : (item) => (
					<Dropdown overlay={this.menuItem(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}>
						<Button icon={<i className="fal fa-ellipsis-v" />} />
					</Dropdown>
				),
			},
		];
	};

	getRowStyle = (item) => {
		if( item.is_deleted ) {
			return {
				background: "#fff1f0",
				borderLeft: "3px solid #ff4d4f",
			};
		}

		if( item.is_admin_panel_user ) {
			return {
				background: "#f3edff",
				borderLeft: "3px solid #8f66ff",
			};
		}

		return {};
	};

	fetchGetAll = (init = false, exportItems = false) => {
		const {pagination, orderByField, orderBySort, search, filters} = this.state;

		if( exportItems ) {
			this.setState({isExporting: true});
		} else {
			this.setState({isLoading: true});
		}

		const data = {
			orderBy: `${orderByField}:${orderBySort}`,
			search,
		};

		if( exportItems ) {
			data.exportItems = true;
		} else {
			data.page = init ? 1 : pagination.current;
			data.limit = pagination.pageSize;
		}

		if( filters.is_active !== null ) data.is_active = filters.is_active;
		if( filters.is_private !== null ) data.is_private = filters.is_private;
		if( filters.state ) data.state = filters.state;
		if( filters.city ) data.city = filters.city;
		if( filters.created_at ) {
			data.created_at = [
				filters.created_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.created_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
			];
		}

		platformUsersService.getAll(data)
		.then((response) => {
			if( exportItems ) {
				this.setState({isExporting: false});
				downloadPrivateFile(response.data.file_url, "usuarios-plataforma.csv")
				.catch((error) => Modal.error({title: "Ocorreu um erro!", content: String(error)}));
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

	onPaginationChange = (page) => {
		this.setState(state => ({pagination: {...state.pagination, current: page}}), () => this.fetchGetAll());
	};

	onOrderChange = (value) => {
		const defaultOrder = config.orders.find(o => `${o.field}:${o.sort}` === value);
		if( !defaultOrder ) return;

		this.setState({orderByField: defaultOrder.field, orderBySort: defaultOrder.sort}, () => this.fetchGetAll(true));
	};

	onSearch = (value) => this.setState({search: value}, () => this.fetchGetAll(true));

	onSearchChange = (e) => {
		if( !e.hasOwnProperty("type") ) {
			const {search} = this.state;
			this.setState({search: e.target.value}, () => {
				if( search ) this.fetchGetAll(true);
			});
		}
	};

	createOpen = () => {
		this.setState({createModalVisible: true});
		this.createScreen.onOpen();
	};

	createOnClose = () => this.setState({createModalVisible: false});
	createOnComplete = () => this.setState({createModalVisible: false}, () => this.fetchGetAll(true));

	editOpen = ({uuid}) => {
		Modal.confirm({
			title  : "Alteração sensível",
			content: "Você só deve alterar dados de outro usuário quando realmente necessário. Deseja continuar?",
			onOk   : () => {
				this.setState({editModalVisible: true});
				this.editScreen.onOpen(uuid);
			}
		});
	};

	editOnClose = () => this.setState({editModalVisible: false});
	editOnComplete = () => this.setState({editModalVisible: false}, () => this.fetchGetAll());

	showOpen = ({uuid}) => {
		this.setState({showModalVisible: true});
		this.showScreen.onOpen(uuid);
	};

	showOnClose = () => this.setState({showModalVisible: false});

	toggleActiveConfirm = ({uuid, name, is_active: isActive}) => {
		const nextAction = isActive ? "desativar" : "ativar";

		Modal.confirm({
			title  : `Confirmar ${nextAction}`,
			content: `Tem certeza de que deseja ${nextAction} ${name}?`,
			okText : isActive ? "Desativar" : "Ativar",
			onOk   : () => this.toggleActiveConfirmed(uuid, isActive),
		});
	};

	toggleActiveConfirmed = (uuid, isActive) => {
		if( isActive ) {
			return platformUsersService.destroy({uuid})
			.then(() => this.fetchGetAll())
			.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));
		}

		return platformUsersService.edit({uuid, is_active: true})
		.then(() => this.fetchGetAll())
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));
	};

	permanentDeleteConfirm = ({uuid, name}) => {
		let userPassword = "";

		Modal.confirm({
			title  : "Confirmar deleção (soft delete)",
			okText : "Deletar",
			okType : "danger",
			content: (
				<div>
					<p>O usuário será marcado como deletado e continuará visível na listagem. Para confirmar, digite a senha atual de <strong>{name}</strong>.</p>
					<Input.Password
						autoFocus
						placeholder="Senha atual do usuário"
						onChange={(event) => {
							userPassword = event.target.value || "";
						}}
					/>
				</div>
			),
			onOk: () => {
				if( !userPassword.trim() ) {
					Modal.error({
						title  : "Senha obrigatória",
						content: "Informe a senha atual do usuário para continuar.",
					});

					return Promise.reject();
				}

				return this.permanentDeleteConfirmed(uuid, userPassword.trim());
			},
		});
	};

	permanentDeleteConfirmed = (uuid, password) => {
		return platformUsersService.destroyPermanent({uuid, password})
		.then(() => this.fetchGetAll())
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});

			return Promise.reject(data);
		});
	};

	filtersOpen = () => {
		this.setState({filtersModalVisible: true});
		this.filtersScreen.onOpen({...this.state.filters});
	};

	filtersOnClose = () => this.setState({filtersModalVisible: false});

	filtersOnComplete = (filters) => {
		this.setState({
			filtersModalVisible: false,
			totalFilters: Object.keys(filters).filter(key => filters[key] !== null && filters[key] !== "").length,
			filters,
		}, () => this.fetchGetAll(true));
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
						rowStyle={this.getRowStyle}
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

const mapStateToProps = (state) => ({
	permissions: state.auth.userData.permissions,
	listType   : state.general.listType[config.list],
});

const mapDispatchToProps = (dispatch) => ({
	onChangeListType: (type) => dispatch(generalActions.changeListType(config.list, type)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
