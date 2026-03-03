import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, Col, Dropdown, Form, Menu, Modal, Row, Select, Switch, Tabs, Tag } from "antd";
import moment from "moment";

import { communitiesService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm, UIPageListing } from "./../../components";

const defaultPagination = {
	current : 1,
	pageSize: 10,
	total   : 0,
};

const followersOrders = [
	{label: "Mais recentes", field: "created_at", sort: "desc", default: true},
	{label: "Mais antigos", field: "created_at", sort: "asc"},
	{label: "Nome A|Z", field: "name", sort: "asc"},
	{label: "Nome Z|A", field: "name", sort: "desc"},
];

const episodesOrders = [
	{label: "Mais recentes", field: "id", sort: "desc", default: true},
	{label: "Mais antigos", field: "id", sort: "asc"},
	{label: "Título A|Z", field: "title", sort: "asc"},
	{label: "Título Z|A", field: "title", sort: "desc"},
];

const collaboratorsOrders = [
	{label: "Mais recentes", field: "created_at", sort: "desc", default: true},
	{label: "Mais antigos", field: "created_at", sort: "asc"},
	{label: "Nome A|Z", field: "name", sort: "asc"},
	{label: "Nome Z|A", field: "name", sort: "desc"},
];

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		const followersDefaultOrder = followersOrders.find(o => o.default);
		const episodesDefaultOrder = episodesOrders.find(o => o.default);
		const collaboratorsDefaultOrder = collaboratorsOrders.find(o => o.default);

		this.state = {
			isLoading: true,
			uuid     : 0,
			item     : {},
			activeTab: "about",
			followers: {
				isLoading: false,
				data     : [],
				pagination: {...defaultPagination},
				orderByField: followersDefaultOrder.field,
				orderBySort : followersDefaultOrder.sort,
				search      : "",
				filters     : {
					is_active: null,
				},
			},
			episodes: {
				isLoading: false,
				data     : [],
				pagination: {...defaultPagination},
				orderByField: episodesDefaultOrder.field,
				orderBySort : episodesDefaultOrder.sort,
				search      : "",
				filters     : {
					visibility: null,
				},
			},
			collaborators: {
				isLoading: false,
				data     : [],
				pagination: {...defaultPagination},
				orderByField: collaboratorsDefaultOrder.field,
				orderBySort : collaboratorsDefaultOrder.sort,
				search      : "",
				filters     : {
					role  : null,
					status: "active",
				},
			},
			addFollowerModalVisible: false,
			addFollowerSending     : false,
			followerCandidatesLoading: false,
			followerCandidates     : [],
			followerCandidateUuid  : undefined,
			roleModalVisible: false,
			roleModalSending: false,
			selectedCollaborator: null,
			selectedCollaboratorRole: "member",
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid,
			item: {},
			activeTab: "about",
			followers: {
				...this.state.followers,
				data: [],
				pagination: {...defaultPagination, pageSize: this.state.followers.pagination.pageSize},
			},
			episodes: {
				...this.state.episodes,
				data: [],
				pagination: {...defaultPagination, pageSize: this.state.episodes.pagination.pageSize},
			},
			collaborators: {
				...this.state.collaborators,
				data: [],
				pagination: {...defaultPagination, pageSize: this.state.collaborators.pagination.pageSize},
			},
		}, () => {
			this.refreshCommunity()
			.finally(() => {
				this.fetchFollowers(true);
				this.fetchEpisodes(true);
				this.fetchCollaborators(true);
			});
		});
	};

	onClose = () => this.props.onClose();

	refreshCommunity = () => communitiesService.show({uuid: this.state.uuid})
	.then((response) => this.setState({
		isLoading: false,
		item: response.data.data || {},
	}))
	.catch((data) => {
		this.setState({isLoading: false});
		Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()});
		return Promise.reject(data);
	});

	onTabChange = (activeTab) => this.setState({activeTab});

	fetchFollowers = (init = false) => {
		this.setState(state => ({followers: {...state.followers, isLoading: true}}));

		const {followers} = this.state;
		const payload = {
			uuid   : this.state.uuid,
			page   : init ? 1 : followers.pagination.current,
			limit  : followers.pagination.pageSize,
			search : followers.search,
			orderBy: `${followers.orderByField}:${followers.orderBySort}`,
		};

		if( followers.filters.is_active !== null ) {
			payload.is_active = followers.filters.is_active;
		}

		communitiesService.getFollowers(payload)
		.then((response) => {
			const data = response.data.data || [];
			const meta = response.data.meta || {};

			this.setState(state => ({
				followers: {
					...state.followers,
					isLoading: false,
					data,
					pagination: {
						...state.followers.pagination,
						current: meta.current_page || 1,
						total: meta.total || 0,
					},
				},
			}));
		})
		.catch((data) => {
			this.setState(state => ({followers: {...state.followers, isLoading: false}}));
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	fetchEpisodes = (init = false) => {
		this.setState(state => ({episodes: {...state.episodes, isLoading: true}}));

		const {episodes} = this.state;
		const payload = {
			uuid   : this.state.uuid,
			page   : init ? 1 : episodes.pagination.current,
			limit  : episodes.pagination.pageSize,
			search : episodes.search,
			orderBy: `${episodes.orderByField}:${episodes.orderBySort}`,
		};

		if( episodes.filters.visibility ) {
			payload.visibility = episodes.filters.visibility;
		}

		communitiesService.getEpisodes(payload)
		.then((response) => {
			const data = response.data.data || [];
			const meta = response.data.meta || {};

			this.setState(state => ({
				episodes: {
					...state.episodes,
					isLoading: false,
					data,
					pagination: {
						...state.episodes.pagination,
						current: meta.current_page || 1,
						total: meta.total || 0,
					},
				},
			}));
		})
		.catch((data) => {
			this.setState(state => ({episodes: {...state.episodes, isLoading: false}}));
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	fetchCollaborators = (init = false) => {
		this.setState(state => ({collaborators: {...state.collaborators, isLoading: true}}));

		const {collaborators} = this.state;
		const payload = {
			uuid   : this.state.uuid,
			page   : init ? 1 : collaborators.pagination.current,
			limit  : collaborators.pagination.pageSize,
			search : collaborators.search,
			orderBy: `${collaborators.orderByField}:${collaborators.orderBySort}`,
		};

		if( collaborators.filters.role ) payload.role = collaborators.filters.role;
		if( collaborators.filters.status ) payload.status = collaborators.filters.status;

		communitiesService.getCollaborators(payload)
		.then((response) => {
			const data = response.data.data || [];
			const meta = response.data.meta || {};

			this.setState(state => ({
				collaborators: {
					...state.collaborators,
					isLoading: false,
					data,
					pagination: {
						...state.collaborators.pagination,
						current: meta.current_page || 1,
						total: meta.total || 0,
					},
				},
			}));
		})
		.catch((data) => {
			this.setState(state => ({collaborators: {...state.collaborators, isLoading: false}}));
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	onFollowersSearch = (value) => this.setState(state => ({followers: {...state.followers, search: value}}), () => this.fetchFollowers(true));

	onFollowersSearchChange = (e) => {
		if( !e.hasOwnProperty("type") ) {
			const currentSearch = this.state.followers.search;
			this.setState(state => ({followers: {...state.followers, search: e.target.value}}), () => {
				if( currentSearch ) this.fetchFollowers(true);
			});
		}
	};

	onFollowersOrderChange = (value) => {
		const selected = followersOrders.find(o => `${o.field}:${o.sort}` === value);
		if( !selected ) return;
		this.setState(state => ({
			followers: {
				...state.followers,
				orderByField: selected.field,
				orderBySort : selected.sort,
			}
		}), () => this.fetchFollowers(true));
	};

	onFollowersPaginationChange = (page) => this.setState(state => ({
		followers: {
			...state.followers,
			pagination: {
				...state.followers.pagination,
				current: page,
			}
		}
	}), () => this.fetchFollowers());

	onFollowersFilterChange = (value) => this.setState(state => ({
		followers: {
			...state.followers,
			filters: {
				...state.followers.filters,
				is_active: value,
			}
		}
	}), () => this.fetchFollowers(true));

	onEpisodesSearch = (value) => this.setState(state => ({episodes: {...state.episodes, search: value}}), () => this.fetchEpisodes(true));

	onEpisodesSearchChange = (e) => {
		if( !e.hasOwnProperty("type") ) {
			const currentSearch = this.state.episodes.search;
			this.setState(state => ({episodes: {...state.episodes, search: e.target.value}}), () => {
				if( currentSearch ) this.fetchEpisodes(true);
			});
		}
	};

	onEpisodesOrderChange = (value) => {
		const selected = episodesOrders.find(o => `${o.field}:${o.sort}` === value);
		if( !selected ) return;
		this.setState(state => ({
			episodes: {
				...state.episodes,
				orderByField: selected.field,
				orderBySort : selected.sort,
			}
		}), () => this.fetchEpisodes(true));
	};

	onEpisodesPaginationChange = (page) => this.setState(state => ({
		episodes: {
			...state.episodes,
			pagination: {
				...state.episodes.pagination,
				current: page,
			}
		}
	}), () => this.fetchEpisodes());

	onEpisodesFilterChange = (value) => this.setState(state => ({
		episodes: {
			...state.episodes,
			filters: {
				...state.episodes.filters,
				visibility: value,
			}
		}
	}), () => this.fetchEpisodes(true));

	onCollaboratorsSearch = (value) => this.setState(state => ({collaborators: {...state.collaborators, search: value}}), () => this.fetchCollaborators(true));

	onCollaboratorsSearchChange = (e) => {
		if( !e.hasOwnProperty("type") ) {
			const currentSearch = this.state.collaborators.search;
			this.setState(state => ({collaborators: {...state.collaborators, search: e.target.value}}), () => {
				if( currentSearch ) this.fetchCollaborators(true);
			});
		}
	};

	onCollaboratorsOrderChange = (value) => {
		const selected = collaboratorsOrders.find(o => `${o.field}:${o.sort}` === value);
		if( !selected ) return;
		this.setState(state => ({
			collaborators: {
				...state.collaborators,
				orderByField: selected.field,
				orderBySort : selected.sort,
			}
		}), () => this.fetchCollaborators(true));
	};

	onCollaboratorsPaginationChange = (page) => this.setState(state => ({
		collaborators: {
			...state.collaborators,
			pagination: {
				...state.collaborators.pagination,
				current: page,
			}
		}
	}), () => this.fetchCollaborators());

	onCollaboratorRoleFilterChange = (value) => this.setState(state => ({
		collaborators: {
			...state.collaborators,
			filters: {
				...state.collaborators.filters,
				role: value,
			}
		}
	}), () => this.fetchCollaborators(true));

	onCollaboratorStatusFilterChange = (value) => this.setState(state => ({
		collaborators: {
			...state.collaborators,
			filters: {
				...state.collaborators.filters,
				status: value,
			}
		}
	}), () => this.fetchCollaborators(true));

	openAddFollowerModal = () => this.setState({
		addFollowerModalVisible: true,
		followerCandidateUuid: undefined,
		followerCandidates: [],
	}, () => this.fetchFollowerCandidates());

	closeAddFollowerModal = () => this.setState({
		addFollowerModalVisible: false,
		addFollowerSending: false,
		followerCandidateUuid: undefined,
		followerCandidates: [],
	});

	fetchFollowerCandidates = (search = "") => {
		this.setState({followerCandidatesLoading: true});

		platformUsersService.getAutocomplete({
			search,
			is_active: 1,
			orderBy  : "name:asc",
		})
		.then((response) => {
			this.setState({
				followerCandidatesLoading: false,
				followerCandidates: response.data.data || [],
			});
		})
		.catch(() => {
			this.setState({
				followerCandidatesLoading: false,
				followerCandidates: [],
			});
		});
	};

	confirmAddFollower = () => {
		const {followerCandidateUuid} = this.state;

		if( !followerCandidateUuid ) {
			Modal.error({
				title  : "Seguidor obrigatório",
				content: "Selecione um usuário para adicionar como seguidor.",
			});
			return;
		}

		this.setState({addFollowerSending: true});

		communitiesService.addFollower({
			uuid     : this.state.uuid,
			user_uuid: followerCandidateUuid,
		})
		.then(() => {
			this.setState({addFollowerSending: false});
			this.closeAddFollowerModal();
			this.fetchFollowers(true);
			this.refreshCommunity();
		})
		.catch((data) => {
			this.setState({addFollowerSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	removeFollowerConfirm = (item) => {
		Modal.confirm({
			title  : "Inativar inscrição de seguidor",
			content: `Tem certeza de que deseja inativar a inscrição de ${item.user?.name || "usuário"} nesta comunidade?`,
			okText : "Inativar inscrição",
			okType : "danger",
			onOk   : () => this.removeFollower(item.user?.uuid),
		});
	};

	removeFollower = (userUuid) => {
		if( !userUuid ) return Promise.resolve();

		return communitiesService.removeFollower({
			uuid     : this.state.uuid,
			user_uuid: userUuid,
		})
		.then(() => {
			this.fetchFollowers();
			this.refreshCommunity();
		})
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));
	};

	toggleEpisodeStatusConfirm = (item) => {
		const nextAction = item.is_active ? "inativar" : "ativar";

		Modal.confirm({
			title  : `${nextAction === "ativar" ? "Ativar" : "Inativar"} episódio`,
			content: `Tem certeza de que deseja ${nextAction} o episódio ${item.title}?`,
			okText : nextAction === "ativar" ? "Ativar" : "Inativar",
			okType : nextAction === "ativar" ? "primary" : "danger",
			onOk   : () => this.toggleEpisodeStatus(item),
		});
	};

	toggleEpisodeStatus = (item) => communitiesService.updateEpisodeStatus({
		uuid        : this.state.uuid,
		episode_uuid: item.uuid,
		is_active   : !item.is_active,
	})
	.then(() => this.fetchEpisodes())
	.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));

	openRoleModal = (item) => this.setState({
		roleModalVisible: true,
		roleModalSending: false,
		selectedCollaborator: item,
		selectedCollaboratorRole: item.role,
	});

	closeRoleModal = () => this.setState({
		roleModalVisible: false,
		roleModalSending: false,
		selectedCollaborator: null,
		selectedCollaboratorRole: "member",
	});

	confirmRoleUpdate = () => {
		const {selectedCollaborator, selectedCollaboratorRole} = this.state;

		if( !selectedCollaborator?.user?.uuid ) return;

		this.setState({roleModalSending: true});

		communitiesService.updateCollaborator({
			uuid     : this.state.uuid,
			user_uuid: selectedCollaborator.user.uuid,
			role     : selectedCollaboratorRole,
		})
		.then(() => {
			this.setState({roleModalSending: false});
			this.closeRoleModal();
			this.fetchCollaborators();
		})
		.catch((data) => {
			this.setState({roleModalSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	removeCollaboratorConfirm = (item) => {
		Modal.confirm({
			title  : "Remover colaborador",
			content: `Tem certeza de que deseja remover ${item.user?.name || "este colaborador"} da comunidade?`,
			okText : "Remover",
			okType : "danger",
			onOk   : () => this.removeCollaborator(item),
		});
	};

	removeCollaborator = (item) => {
		if( !item?.user?.uuid ) return Promise.resolve();

		return communitiesService.removeCollaborator({
			uuid     : this.state.uuid,
			user_uuid: item.user.uuid,
		})
		.then(() => this.fetchCollaborators())
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data)}));
	};

	followerMenu = (item) => (
		<Menu className="actions-dropdown-menu">
			<Menu.Item key="remove" className="btn-delete">
				<a onClick={() => this.removeFollowerConfirm(item)}><i className="fal fa-user-minus" />Inativar inscrição</a>
			</Menu.Item>
		</Menu>
	);

	episodeMenu = (item) => (
		<Menu className="actions-dropdown-menu">
			<Menu.Item key="toggle" className={`${item.is_active ? "btn-delete" : ""}`}>
				<a onClick={() => this.toggleEpisodeStatusConfirm(item)}>
					<i className={`fal ${item.is_active ? "fa-toggle-off" : "fa-toggle-on"}`} />
					{item.is_active ? "Inativar episódio" : "Ativar episódio"}
				</a>
			</Menu.Item>
		</Menu>
	);

	collaboratorMenu = (item) => (
		<Menu className="actions-dropdown-menu">
			{item.role !== "owner" && <Menu.Item key="edit-role">
				<a onClick={() => this.openRoleModal(item)}><i className="fal fa-user-edit" />Alterar cargo</a>
			</Menu.Item>}
			{item.role !== "owner" && <Menu.Item key="remove" className="btn-delete divider">
				<a onClick={() => this.removeCollaboratorConfirm(item)}><i className="fal fa-user-times" />Remover colaborador</a>
			</Menu.Item>}
		</Menu>
	);

	followerColumns = () => [
		{title: "UUID", className: "id", render: (item) => item.user?.uuid || "-"},
		{title: "Nome", render: (item) => <span style={item.user?.is_deleted ? {color: "#cf1322"} : {}}>{item.user?.name || "-"}</span>},
		{title: "E-mail", render: (item) => <span style={item.user?.is_deleted ? {color: "#cf1322"} : {}}>{item.user?.email || "-"}</span>},
		{
			title    : "Conta",
			className: "no-ellipsis",
			render   : (item) => {
				if( item.user?.is_deleted ) return <Tag color="#cf1322">Deletado</Tag>;
				return <Tag color={item.user?.is_active ? "#0acf97" : "#fa5c7c"}>{item.user?.is_active ? "Ativa" : "Inativa"}</Tag>;
			}
		},
		{title: "Seguindo desde", className: "datetime", render: (item) => item.followed_at ? moment(item.followed_at).format("DD/MM/YYYY HH:mm") : "-"},
		{
			title    : "Ações",
			className: "actions no-ellipsis",
			render   : (item) => (
				<Dropdown overlay={this.followerMenu(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}>
					<Button icon={<i className="fal fa-ellipsis-v" />} />
				</Dropdown>
			),
		},
	];

	episodeColumns = () => [
		{title: "ID", className: "id", render: (item) => item.uuid},
		{title: "Título", render: (item) => item.title || "-"},
		{title: "Autor", render: (item) => item.author?.name || "-"},
		{title: "Visibilidade", className: "no-ellipsis", render: (item) => <Tag color={item.visibility === "public" ? "#0acf97" : "#f7b84b"}>{item.visibility}</Tag>},
		{title: "Status", className: "no-ellipsis", render: (item) => <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativo" : "Inativo"}</Tag>},
		{title: "Publicado em", className: "datetime", render: (item) => item.published_at ? moment(item.published_at).format("DD/MM/YYYY HH:mm") : "-"},
		{
			title    : "Ações",
			className: "actions no-ellipsis",
			render   : (item) => (
				<Dropdown overlay={this.episodeMenu(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}>
					<Button icon={<i className="fal fa-ellipsis-v" />} />
				</Dropdown>
			),
		},
	];

	collaboratorColumns = () => [
		{title: "UUID", className: "id", render: (item) => item.user?.uuid || "-"},
		{title: "Nome", render: (item) => <span style={item.user?.is_deleted ? {color: "#cf1322"} : {}}>{item.user?.name || "-"}</span>},
		{title: "E-mail", render: (item) => <span style={item.user?.is_deleted ? {color: "#cf1322"} : {}}>{item.user?.email || "-"}</span>},
		{title: "Cargo", className: "no-ellipsis", render: (item) => <Tag color={item.role === "owner" ? "#0acf97" : "#39afd1"}>{item.role}</Tag>},
		{title: "Status", className: "no-ellipsis", render: (item) => <Tag color={item.status === "active" ? "#0acf97" : "#f7b84b"}>{item.status}</Tag>},
		{title: "Entrada", className: "datetime", render: (item) => item.joined_at ? moment(item.joined_at).format("DD/MM/YYYY HH:mm") : "-"},
		{
			title    : "Ações",
			className: "actions no-ellipsis",
			render   : (item) => item.role === "owner"
				? <Tag color="#0acf97">Dono</Tag>
				: (
					<Dropdown overlay={this.collaboratorMenu(item)} className="actions-dropdown" placement="bottomRight" trigger={["click"]}>
						<Button icon={<i className="fal fa-ellipsis-v" />} />
					</Dropdown>
				),
		},
	];

	renderAbout = () => {
		const {item} = this.state;

		return (
			<Form layout="vertical">
				{item.cover && <Form.Item label="Banner">
					<div style={{border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden"}}>
						<img src={item.cover} alt="Banner da comunidade" style={{display: "block", width: "100%", maxHeight: 210, objectFit: "cover"}} />
					</div>
				</Form.Item>}
				{item.avatar && <Form.Item label="Avatar">
					<img src={item.avatar} alt="Avatar da comunidade" style={{display: "block", width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "1px solid #f0f0f0"}} />
				</Form.Item>}
				<Form.Item label="Nome">{item.name}</Form.Item>
				<Form.Item label="Slug">{item.slug}</Form.Item>
				<Form.Item label="Dono">{item.owner ? `${item.owner.name} (${item.owner.email})` : "-"}</Form.Item>
				<Form.Item label="Website">{item.website_url || "-"}</Form.Item>
				<Form.Item label="Descrição">{item.description || "-"}</Form.Item>
				<Row gutter={16}>
					<Col xs={24} sm={12}><Form.Item label="Pública"><Switch disabled checked={!!item.is_public} /></Form.Item></Col>
					<Col xs={24} sm={12}><Form.Item label="Verificada"><Switch disabled checked={!!item.is_verified} /></Form.Item></Col>
				</Row>
				<Row gutter={16}>
					<Col xs={24} sm={8}><Form.Item label="Seguidores">{item.followers_count ?? 0}</Form.Item></Col>
					<Col xs={24} sm={8}><Form.Item label="Playlists">{item.playlists_count ?? 0}</Form.Item></Col>
					<Col xs={24} sm={8}><Form.Item label="Posts">{item.posts_count ?? 0}</Form.Item></Col>
				</Row>
				<Row gutter={16}>
					<Col xs={24} sm={12}><Form.Item label="Criação">{item.created_at ? moment(item.created_at).calendar() : "-"}</Form.Item></Col>
					<Col xs={24} sm={12}><Form.Item label="Última atualização">{item.updated_at ? moment(item.updated_at).calendar() : "-"}</Form.Item></Col>
				</Row>
			</Form>
		);
	};

	renderFollowers = () => {
		const {followers} = this.state;

		return (
			<UIPageListing
				showListTypeChange={false}
				listType="list"
				isLoading={followers.isLoading}
				search={followers.search}
				searchPlaceholder="Buscar seguidor por UUID, nome ou e-mail"
				onSearch={this.onFollowersSearch}
				onSearchChange={this.onFollowersSearchChange}
				orders={followersOrders}
				orderByField={followers.orderByField}
				orderBySort={followers.orderBySort}
				onOrderChange={this.onFollowersOrderChange}
				data={followers.data}
				columns={this.followerColumns()}
				pagination={followers.pagination}
				onPaginationChange={this.onFollowersPaginationChange}
				appendSearch={(
					<Select
						allowClear
						placeholder="Filtro: status da conta"
						value={followers.filters.is_active}
						style={{width: 220, marginRight: 8}}
						onChange={this.onFollowersFilterChange}>
						<Select.Option value={1}>Conta ativa</Select.Option>
						<Select.Option value={0}>Conta inativa</Select.Option>
					</Select>
				)}
				buttons={[
					{
						visible: true,
						onClick: this.openAddFollowerModal,
						title  : "Adicionar seguidor",
						icon   : <i className="far fa-user-plus" />,
					},
				]}
			/>
		);
	};

	renderEpisodes = () => {
		const {episodes} = this.state;

		return (
			<UIPageListing
				showListTypeChange={false}
				listType="list"
				isLoading={episodes.isLoading}
				search={episodes.search}
				searchPlaceholder="Buscar episódio por ID, título, descrição ou autor"
				onSearch={this.onEpisodesSearch}
				onSearchChange={this.onEpisodesSearchChange}
				orders={episodesOrders}
				orderByField={episodes.orderByField}
				orderBySort={episodes.orderBySort}
				onOrderChange={this.onEpisodesOrderChange}
				data={episodes.data}
				columns={this.episodeColumns()}
				pagination={episodes.pagination}
				onPaginationChange={this.onEpisodesPaginationChange}
				appendSearch={(
					<Select
						allowClear
						placeholder="Filtro: visibilidade"
						value={episodes.filters.visibility}
						style={{width: 210, marginRight: 8}}
						onChange={this.onEpisodesFilterChange}>
						<Select.Option value="public">Público</Select.Option>
						<Select.Option value="private">Privado</Select.Option>
						<Select.Option value="unlisted">Não listado</Select.Option>
					</Select>
				)}
			/>
		);
	};

	renderCollaborators = () => {
		const {collaborators} = this.state;

		return (
			<UIPageListing
				showListTypeChange={false}
				listType="list"
				isLoading={collaborators.isLoading}
				search={collaborators.search}
				searchPlaceholder="Buscar colaborador por UUID, nome, e-mail ou cargo"
				onSearch={this.onCollaboratorsSearch}
				onSearchChange={this.onCollaboratorsSearchChange}
				orders={collaboratorsOrders}
				orderByField={collaborators.orderByField}
				orderBySort={collaborators.orderBySort}
				onOrderChange={this.onCollaboratorsOrderChange}
				data={collaborators.data}
				columns={this.collaboratorColumns()}
				pagination={collaborators.pagination}
				onPaginationChange={this.onCollaboratorsPaginationChange}
				appendSearch={(
					<>
						<Select
							allowClear
							placeholder="Filtro: cargo"
							value={collaborators.filters.role}
							style={{width: 180, marginRight: 8}}
							onChange={this.onCollaboratorRoleFilterChange}>
							<Select.Option value="owner">owner</Select.Option>
							<Select.Option value="admin">admin</Select.Option>
							<Select.Option value="editor">editor</Select.Option>
							<Select.Option value="member">member</Select.Option>
						</Select>
						<Select
							allowClear
							placeholder="Filtro: status"
							value={collaborators.filters.status}
							style={{width: 180, marginRight: 8}}
							onChange={this.onCollaboratorStatusFilterChange}>
							<Select.Option value="active">active</Select.Option>
							<Select.Option value="pending">pending</Select.Option>
							<Select.Option value="rejected">rejected</Select.Option>
							<Select.Option value="banned">banned</Select.Option>
						</Select>
					</>
				)}
			/>
		);
	};

	render() {
		const {visible} = this.props;
		const {
			uuid,
			isLoading,
			activeTab,
			addFollowerModalVisible,
			addFollowerSending,
			followerCandidatesLoading,
			followerCandidates,
			followerCandidateUuid,
			roleModalVisible,
			roleModalSending,
			selectedCollaborator,
			selectedCollaboratorRole,
		} = this.state;

		return (
			<>
				<UIDrawerForm visible={visible} width={1120} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar comunidade [${uuid}]`}>
					<Tabs activeKey={activeTab} onChange={this.onTabChange}>
						<Tabs.TabPane forceRender tab="Sobre a comunidade" key="about">
							{this.renderAbout()}
						</Tabs.TabPane>
						<Tabs.TabPane forceRender tab="Seguidores" key="followers">
							{this.renderFollowers()}
						</Tabs.TabPane>
						<Tabs.TabPane forceRender tab="Episódios" key="episodes">
							{this.renderEpisodes()}
						</Tabs.TabPane>
						<Tabs.TabPane forceRender tab="Colaboradores" key="collaborators">
							{this.renderCollaborators()}
						</Tabs.TabPane>
					</Tabs>
				</UIDrawerForm>

				<Modal
					visible={addFollowerModalVisible}
					title="Adicionar seguidor"
					onCancel={this.closeAddFollowerModal}
					onOk={this.confirmAddFollower}
					okText="Adicionar"
					okButtonProps={{loading: addFollowerSending}}>
					<Form layout="vertical">
						<Form.Item label="Usuário seguidor">
							<Select
								showSearch
								allowClear
								filterOption={false}
								placeholder="Selecione o usuário"
								value={followerCandidateUuid}
								onChange={(value) => this.setState({followerCandidateUuid: value})}
								onSearch={this.fetchFollowerCandidates}
								loading={followerCandidatesLoading}>
								{followerCandidates.filter((item) => !!item.uuid).map((item) => (
									<Select.Option key={item.uuid} value={item.uuid}>
										{`${item.name} (${item.email})`}
									</Select.Option>
								))}
							</Select>
						</Form.Item>
					</Form>
				</Modal>

				<Modal
					visible={roleModalVisible}
					title={`Alterar cargo de ${selectedCollaborator?.user?.name || "colaborador"}`}
					onCancel={this.closeRoleModal}
					onOk={this.confirmRoleUpdate}
					okText="Salvar cargo"
					okButtonProps={{loading: roleModalSending}}>
					<Form layout="vertical">
						<Form.Item label="Cargo">
							<Select
								value={selectedCollaboratorRole}
								onChange={(value) => this.setState({selectedCollaboratorRole: value})}>
								<Select.Option value="admin">admin</Select.Option>
								<Select.Option value="editor">editor</Select.Option>
								<Select.Option value="member">member</Select.Option>
							</Select>
						</Form.Item>
					</Form>
				</Modal>
			</>
		)
	}
}

export default Show;
