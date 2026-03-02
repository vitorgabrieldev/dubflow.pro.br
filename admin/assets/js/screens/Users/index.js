import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Avatar, Button, Dropdown, Menu, Modal, Spin, Tag } from "antd";
import QueueAnim from "rc-queue-anim";
import enquire from "enquire.js";

import moment from "moment";

import { DESKTOP_DOWN } from "./../../config/mediaQueries";

import { generalActions } from "./../../redux/actions";

import { userService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalCreate from "./create";
import ModalEdit from "./edit";
import ModalShow from "./show";

const config = {
	title            : "Usuários administradores",
	permissionPrefix : "users",
	list             : "users",
	searchPlaceholder: "Buscar por id, nome ou e-mail",
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
			isLoading   : false,
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
			createModalVisible: false,
			editModalVisible  : false,
			showModalVisible  : false,
			activeLoadings    : [],
			isExporting       : false,
			// Images
			imagePreviewVisible: false,
			imagePreviewImage  : "",
			// Media queries
			desktopDown: false,
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

		// Listen Media Querie sideBar
		enquire.register(DESKTOP_DOWN, {
			match  : () => {
				this.setState({
					desktopDown: true,
				})
			},
			unmatch: () => {
				this.setState({
					desktopDown: false,
				})
			}
		});
	};

	componentWillUnmount() {
		// Unlisten Media Querie sideBar
		enquire.unregister(DESKTOP_DOWN);
	};

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
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && <Menu.Item key="activate/deactivate" className="divider">
				<a onClick={() => this.activateDeactivate(item, !item.is_active)}>
					{item.is_active ? <i className="fal fa-eye-slash" /> : <i className="fal fa-eye" />}{item.is_active ? "Desativar" : "Ativar"}
				</a>
			</Menu.Item>}
			{this.props.permissions.includes(config.permissionPrefix + ".delete") && <Menu.Item key="delete" className="divider btn-delete">
				<a onClick={() => this.deleteConfirm(item)}>
					<i className="fal fa-trash" />Excluir
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
								<Avatar size={this.state.desktopDown || listTypeCard ? 100 : 60} src={this.state.desktopDown ? item.avatar_sizes.admin_listing_medium : item.avatar_sizes.admin_listing} />
							</a>
						</div>
					)
				}
			},
			{
				title : "Nome",
				render: (item) => listTypeCard ? <h3>{item.name}</h3> : item.name,
			},
			{
				title : "E-mail",
				render: (item) => item.email,
			},
			{
				title    : "Criação",
				className: "datetime card-block-width-2",
				render   : (item) => {
					if( listTypeCard )
					{
						return (
							<Fragment>
								<i className="fal fa-plus-circle" style={{marginRight: 5}} />{moment(item.created_at).format("DD/MM/YYYY HH:mm")}
							</Fragment>
						);
					}

					return moment(item.created_at).format("DD/MM/YYYY HH:mm");
				},
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
				render   : (item) => this.state.activeLoadings.indexOf(item.uuid) !== -1 ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativo" : "Inativo"}</Tag>
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

	fetchGetAll = (init = false, exportItems = false) => {
		const {pagination, orderByField, orderBySort, search} = this.state;

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

		userService.getAll(data)
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
	 * Create
	 */
	createOpen = () => {
		this.setState({createModalVisible: true});

		// On open screen
		this.createScreen.onOpen();
	};

	createOnClose = () => {
		this.setState({createModalVisible: false});
	};

	createOnComplete = () => {
		this.setState({createModalVisible: false});

		// Fecth all
		this.fetchGetAll(true);
	};

	/**
	 * Edit
	 *
	 * @param uuid
	 */
	editOpen = ({uuid}) => {
		this.setState({editModalVisible: true});

		// On open screen
		this.editScreen.onOpen(uuid);
	};

	editOnClose = () => {
		this.setState({editModalVisible: false});
	};

	editOnComplete = () => {
		this.setState({editModalVisible: false});

		// Fecth all
		this.fetchGetAll();
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
	 * Delete
	 *
	 * @param uuid
	 */
	deleteConfirm = ({uuid}) => {
		Modal.confirm({
			title          : "Confirmar exclusão!",
			content        : "Tem certeza de que deseja excluir este registro?",
			okText         : "Excluir",
			autoFocusButton: null,
			onOk           : () => {
				return this.deleteConfirmed(uuid);
			}
		});
	};

	deleteConfirmed = (uuid) => {
		return userService.destroy({uuid})
		.then((response) => {
			// Fecth all
			this.fetchGetAll();
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	/**
	 * Active/Desactive
	 *
	 * @param {number} uuid
	 * @param {boolean} activate
	 */
	activateDeactivate = ({uuid}, activate) => {
		const {activeLoadings} = this.state;

		if( activeLoadings.indexOf(uuid) === -1 )
		{
			activeLoadings.push(uuid);
		}

		this.setState({
			activeLoadings: activeLoadings,
		});

		userService.edit({uuid, is_active: activate})
		.then((response) => {
			const newData = [...this.state.data];
			const index   = newData.findIndex(item => uuid === item.uuid);

			if( index !== -1 )
			{
				const item = newData[index];

				newData.splice(index, 1, {
					...item,
					is_active: response.data.data.is_active,
				});

				this.setState({
					data: newData,
				});
			}
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		}).finally(() => {
			const {activeLoadings} = this.state;
			const index            = activeLoadings.indexOf(uuid);

			if( index !== -1 )
			{
				activeLoadings.splice(index, 1);

				this.setState({
					activeLoadings: activeLoadings,
				});
			}
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
						isLoading={this.state.isLoading}
						listType={this.state.listType}
						orderByField={this.state.orderByField}
						orderBySort={this.state.orderBySort}
						//orders={config.orders}
						orders={[]}
						search={this.state.search}
						searchPlaceholder={config.searchPlaceholder}
						data={this.state.data}
						pagination={this.state.pagination}
						columns={this.columns()}
						buttons={[
							{
								visible: this.props.permissions.includes(config.permissionPrefix + ".create"),
								onClick: this.createOpen,
								title  : "Cadastrar",
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
