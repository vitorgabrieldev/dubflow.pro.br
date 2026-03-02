import React, { Component, Fragment } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { Avatar, Button, Dropdown, Menu, Modal, Spin, Tag } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";
import { generalActions } from "./../../redux/actions";
import { customerService } from "./../../redux/services";

import {
	UIPageListing,
} from "./../../components";

import ModalShow from "./show";
import ModalFilters from "./filters";

const config = {
	title            : "Clientes",
	permissionPrefix : "customers",
	list             : "customers",
	searchPlaceholder: "Buscar por nome, CPF e e-mail",
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
			activeLoadings     : [],
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
			imagePreviewVisible: false,
			imagePreviewImage  : "",
			totalFilters       : 0,
			filters            : {
				despachante_id: null,
				city          : null,
				state         : null,
				created_at    : null,
				is_active     : null,
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

			if( key.includes(".") )
			{
				const value = key.split(".").reduce((acc, current) => acc?.[current], item);

				if( value !== null && typeof value !== "undefined" && value !== "" )
				{
					return value;
				}

				continue;
			}

			const value = item?.[key];

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

	getCpf = (item) => this.getValue(item, ["cpf", "document"], "N/A");

	getPhone = (item) => this.getValue(item, ["telefone", "phone"], "N/A");

	getDespachanteName = (item) => this.getValue(item, ["despachante.name", "despachante.nome", "profissional.name", "dispatcher.name", "despachante_name"], "N/A");

	getCityState = (item) => {
		const city = this.getValue(item, ["acervo_city", "city.name", "city"], null);
		const state = this.getValue(item, ["acervo_state", "state.abbr", "state.name", "state"], null);

		if( city && state ) return `${city}/${state}`;
		if( city ) return city;
		if( state ) return state;

		return "N/A";
	};

	getAvatarUrl = (item) => this.getValue(item, ["avatar_url", "avatar.file", "avatar"], null);

	countAppliedFilters = (filters) => {
		return Object.keys(filters).filter((key) => {
			if( !filters.hasOwnProperty(key) ) return false;

			const value = filters[key];

			if( Array.isArray(value) ) return value.length > 0;

			return value !== null;
		}).length;
	};

	showOpen = ({uuid}) => {
		this.setState({showModalVisible: true});
		this.showScreen.onOpen(uuid);
	};

	showOnClose = () => {
		this.setState({showModalVisible: false});
	};

	onImagePreviewClose = () => this.setState({imagePreviewVisible: false});

	onImagePreview = (url) => {
		this.setState({
			imagePreviewImage  : url,
			imagePreviewVisible: true,
		});
	};

	changeStatusConfirm = (item) => {
		const willActivate = !item?.is_active;
		const actionText = willActivate ? "ativar" : "inativar";

		Modal.confirm({
			title          : `Confirmação de ${actionText} cadastro`,
			content        : `Tem certeza de que deseja ${actionText} este cadastro?`,
			okText         : "Confirmar",
			autoFocusButton: null,
			onOk           : () => this.changeStatus(item?.uuid, willActivate),
		});
	};

	changeStatus = (uuid, isActive) => {
		if( !uuid ) return Promise.resolve();

		this.setState(state => ({
			activeLoadings: state.activeLoadings.includes(uuid) ? state.activeLoadings : [...state.activeLoadings, uuid],
		}));

		return customerService.chargeStatus({uuid, is_active: isActive})
		.then(() => {
			this.fetchGetAll();
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		})
		.finally(() => {
			this.setState(state => ({
				activeLoadings: state.activeLoadings.filter(item => item !== uuid),
			}));
		});
	};

	menuItem = (item) => (
		<Menu className="actions-dropdown-menu">
			{this.props.permissions.includes(config.permissionPrefix + ".edit") && (
				<Menu.Item key="status" className="divider">
					<a onClick={() => this.changeStatusConfirm(item)}>
						<i className="fal fa-toggle-on" /> {item?.is_active ? "Inativar cadastro" : "Ativar cadastro"}
					</a>
				</Menu.Item>
			)}
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
				className: "no-padding-horizontal no-ellipsis text-center",
				width    : 70,
				render   : (item) => {
					const avatar = this.getAvatarUrl(item);

					if( !avatar )
					{
						return (
							<div style={listTypeCard ? {paddingTop: 30, paddingBottom: 15} : {}}>
								<i className="fad fa-user-circle avatar-placeholder" style={{fontSize: listTypeCard ? 100 : 60, color: "#b3b3b3"}} />
							</div>
						);
					}

					return (
						<div style={listTypeCard ? {paddingTop: 30, paddingBottom: 15} : {}}>
							<a onClick={() => this.onImagePreview(avatar)}>
								<Avatar size={listTypeCard ? 100 : 60} src={avatar} />
							</a>
						</div>
					);
				},
			},
			{
				title : "Nome",
				render: (item) => listTypeCard ? <h3>{this.getValue(item, ["name"], "N/A")}</h3> : this.getValue(item, ["name"], "N/A"),
			},
			{
				title : "CPF",
				render: (item) => this.getCpf(item),
			},
			{
				title : "E-mail",
				render: (item) => this.getValue(item, ["email"], "N/A"),
			},
			{
				title : "Despachante",
				render: (item) => this.getDespachanteName(item),
			},
			{
				title : "Cidade/UF",
				render: (item) => this.getCityState(item),
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
				title    : "Ativo",
				className: "active no-ellipsis",
				render   : (item) => {
					if( this.state.activeLoadings.includes(item.uuid) )
					{
						return <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} />;
					}

					return <Tag color={item?.is_active ? "#0acf97" : "#fa5c7c"}>{item?.is_active ? "Ativo" : "Inativo"}</Tag>;
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

		if( Array.isArray(filters.despachante_id) && filters.despachante_id.length )
		{
			data.despachante_id = filters.despachante_id;
		}

		if( filters.city !== null )
		{
			data.city = filters.city;
		}

		if( filters.state !== null )
		{
			data.state = filters.state;
		}

		if( filters.created_at )
		{
			data.created_at = [
				filters.created_at[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
				filters.created_at[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
			];
		}

		if( urlIsActive !== null )
		{
			data.is_active = urlIsActive;
		}
		else if( filters.is_active !== null )
		{
			data.is_active = filters.is_active;
		}

		customerService.getAll(data, this._cancelToken.token)
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
						data      : response?.data?.data || [],
						pagination: {
							...state.pagination,
							current: response?.data?.meta?.current_page || 1,
							total  : response?.data?.meta?.total || 0,
						},
						filters     : nextFilters,
						totalFilters: urlIsActive !== null ? this.countAppliedFilters(nextFilters) : state.totalFilters,
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

				<Modal
					wrapClassName="modal-image"
					visible={this.state.imagePreviewVisible}
					centered
					footer={null}
					destroyOnClose={true}
					onCancel={this.onImagePreviewClose}>
					<img src={this.state.imagePreviewImage} />
				</Modal>
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
