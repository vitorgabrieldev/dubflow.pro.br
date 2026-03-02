import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Modal, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { generalActions } from "./../../redux/actions";

import { callsForHelpService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Pedidos de socorro",
	permissionPrefix : "pedido-socorro",
	list             : "pedido-socorro",
	searchPlaceholder: "Buscar",
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
				type_person: null,
				newsletter : null,
				is_active  : null,
				created_at : null,
				status     : null,
				customer_id: null,
				profissional_id: null,
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
		return callsForHelpService.destroy({uuid})
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
	 * Disabled
	 *
	 * @param uuid
	 */
	disabledConfirm = (uuid) => {
		Modal.confirm({
			title          : "Confirmação de desativação de usuário",
			content        : "Tem certeza de que deseja desativar este usuário?",
			okText         : "Confirmar",
			autoFocusButton: null,
			onOk           : () => {
				return this.disabled(uuid);
			}
		});
	};

	/**
	 * Disabled
	 *
	 * @param uuid
	 */
	disabled = (uuid) => {
		const {activeLoadings} = this.state;

		if( activeLoadings.indexOf(uuid) === -1 )
		{
			activeLoadings.push(uuid);
		}

		this.setState({
			activeLoadings: activeLoadings,
		});

		callsForHelpService.chargeStatus({uuid: uuid, is_active: false})
		.then((response) => {
			// Fecth all
			this.fetchGetAll();
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
	 * Enabled
	 *
	 * @param uuid
	 */
	enabledConfirm = (uuid) => {
		Modal.confirm({
			title          : "Confirmação de ativação de usuário",
			content        : "Tem certeza de que deseja ativar este usuário?",
			okText         : "Confirmar",
			autoFocusButton: null,
			onOk           : () => {
				return this.enabled(uuid);
			}
		});
	};

	/**
	 * enabled
	 *
	 * @param uuid
	 */
	enabled = (uuid) => {
		const {activeLoadings} = this.state;

		if( activeLoadings.indexOf(uuid) === -1 )
		{
			activeLoadings.push(uuid);
		}

		this.setState({
			activeLoadings: activeLoadings,
		});

		callsForHelpService.chargeStatus({uuid: uuid, is_active: true})
		.then((response) => {
			// Fecth all
			this.fetchGetAll();
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

	capitalize = (text) => text ? text.charAt(0).toUpperCase() + text.slice(1) : 'N/A';

	formatValue = (value) => {
		if (value === null || value === undefined) return 'N/A';
		const num = Number(value);
		return num.toLocaleString('pt-BR', {
		  style: 'currency',
		  currency: 'BRL',
		  minimumFractionDigits: 2,
		  maximumFractionDigits: 2,
		});
	};

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && <Menu.Item key="disabled" className="divider">
				<a onClick={() => {{!item.is_active ? this.enabledConfirm(item.uuid) : this.disabledConfirm(item.uuid);}}}>
					<i className="fal fa-toggle-on" /> {!item.is_active ? "Ativar usuário" : "Desativar usuário"}
				</a>
			</Menu.Item>}
			{this.props.permissions.includes(config.permissionPrefix + ".show") && <Menu.Item key="show">
				<a onClick={() => this.showOpen(item)}>
					<i className="fal fa-file" />Visualizar
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
				title : "Usuário",
				render: (item) => item.customer?.name || 'N/A'
			},
			{
				title : "Condição da motocicleta",
				render: (item) => item.condicao_moto || 'N/A',
			},
			{
				title: "Forma de pagamento",
				render: (item) => {
				  if (item.forma_pagamento === 'pix') {
					return 'Pix';
				  } else if (item.forma_pagamento === 'cartao-credito') {
					return 'Cartão de Crédito';
				  } else if (item.forma_pagamento) {
					return item.forma_pagamento.replace('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
				  }
				  return 'N/A';
				}
			},			  
			{
				title : "Valor total",
				render: (item) => `${this.formatValue(item.valor_total)}`,
			},
			{
				title : "Status",
				render: (item) => <Tag color={item.status_color}>{this.capitalize(item.status)}</Tag>
			},
			{
				title    : "Criação",
				className: "datetime card-block-width-2",
				render   : (item) => {
					const date = moment(item.created_at).format("DD/MM/YYYY HH:mm");
					return listTypeCard ? (
						<Fragment>
							<i className="fal fa-plus-circle" style={{ marginRight: 5 }} />
							{date}
						</Fragment>
					) : date;
				}
			},
			{
				title    : "Últ. modificação",
				className: "datetime card-block-width-2",
				render   : (item) => {
					const date = moment(item.updated_at).format("DD/MM/YYYY HH:mm");
					return listTypeCard ? (
						<Fragment>
							<i className="fal fa-pen" style={{ marginRight: 5 }} />
							{date}
						</Fragment>
					) : date;
				}
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

		const queryParams = new URLSearchParams(this.props.location.search);
		const isActive = queryParams.get('is_active') ?? null;
		const status = queryParams.get('status') ?? null;

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

		if( filters.type_person !== null )
		{
			data.type_person = filters.type_person;
		}

		if( filters.newsletter !== null )
		{
			data.newsletter = filters.newsletter;
		}

		if( filters.is_active !== null )
		{
			data.is_active = filters.is_active;
		}

		if( filters.customer_id !== null )
		{
			data.customer_id = filters.customer_id;
		}

		if( filters.profissional_id !== null )
		{
			data.profissional_id = filters.profissional_id;
		}

		if( filters.status !== null )
		{
			data.status = filters.status;
		}

		// parametro
		if( isActive !== null )
		{
			this.state.filters.is_active = parseInt(isActive);
			data.is_active = isActive;
		}

		if( status !== null )
		{
			this.state.filters.status = status;
			data.status = status;
		}

		if( filters.created_at )
		{
			data.created_at = [
				filters.created_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.created_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ")
			];
		}

		callsForHelpService.getAll(data)
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
				content: "Não foi possível exportar no momento, aguarde e tente novamente.",
			});

			this.setState({
				isExporting: false,
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
						enableSearch={false}
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
