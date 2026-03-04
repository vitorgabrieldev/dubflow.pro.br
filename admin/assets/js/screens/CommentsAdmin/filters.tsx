import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, DatePicker, Form, Input, Modal, Radio, Select } from "antd";
import moment from "moment";
import { commentsAdminService } from "./../../redux/services";

class Filters extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.filtersClean = {
			created_at : null,
			post_id    : null,
			user_uuid  : null,
			is_reply   : null,
			with_deleted: null,
		};
		this.state = {
			filters      : {...this.filtersClean},
			posts        : [],
			postsLoading : false,
		};
	}

	onOpen = (filters) => this.setState({filters}, () => this.fetchPostsAutocomplete("", filters.post_id || null));
	cleanFilters = () => this.setState({filters: this.filtersClean}, () => this.props.onComplete({...this.state.filters}));
	onClose = () => this.props.onClose();
	filtersOnConfirm = () => this.props.onComplete({...this.state.filters});
	setFilter = (name, value) => this.setState(state => ({filters: {...state.filters, [name]: value}}));

	fetchPostsAutocomplete = (search = "", postId = null) => {
		this.setState({postsLoading: true});

		return commentsAdminService.getPostsAutocomplete({
			search,
			orderBy: "id:desc",
			post_id: postId || undefined,
		})
		.then((response) => {
			const posts = response.data.data || [];
			this.setState((state) => {
				const map = new Map();
				state.posts.forEach((post) => map.set(post.id, post));
				posts.forEach((post) => map.set(post.id, post));

				return {
					postsLoading: false,
					posts: Array.from(map.values()),
				};
			});
		})
		.catch(() => {
			this.setState({postsLoading: false});
		});
	};

	renderPostOption = (post) => {
		const title = post.title || "Sem título";
		const organization = post.organization?.name ? ` - ${post.organization.name}` : "";
		return `[${post.id}] ${title}${organization}`;
	};

	render() {
		const {visible} = this.props;
		const {filters, posts, postsLoading} = this.state;

		return (
			<Modal
				visible={visible}
				title="Filtros avançados"
				centered
				destroyOnClose
				maskClosable
				width={900}
				onCancel={this.onClose}
				onOk={this.filtersOnConfirm}
				className="modal-filters"
				footer={[
					<Button key="back" type="link" onClick={this.cleanFilters}>Excluir filtros</Button>,
					<Button key="submit" type="primary" onClick={this.filtersOnConfirm}>Aplicar</Button>,
				]}>
				<div className="filter-group">
					<div className="filter-group-title" style={{paddingTop: 0}}><h3>Tipo</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", null)} checked={filters.is_reply === null}>Todos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", 0)} checked={filters.is_reply === 0}>Comentários raiz</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("is_reply", 1)} checked={filters.is_reply === 1}>Respostas</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Relacionamentos</h3></div>
					<div className="filter-group-filters">
						<Form.Item label="Post">
							<Select
								showSearch
								allowClear
								filterOption={false}
								placeholder="Selecione o post"
								value={filters.post_id || undefined}
								onChange={(value) => this.setFilter("post_id", value || null)}
								onSearch={this.fetchPostsAutocomplete}
								loading={postsLoading}
								notFoundContent={postsLoading ? "Buscando..." : "Nenhum post encontrado"}>
								{posts.map((post) => (
									<Select.Option key={post.id} value={post.id}>
										{this.renderPostOption(post)}
									</Select.Option>
								))}
							</Select>
						</Form.Item>
						<Form.Item label="UUID do usuário"><Input value={filters.user_uuid || ""} onChange={(e) => this.setFilter("user_uuid", e.target.value || null)} /></Form.Item>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Opções adicionais</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 5}}>
						<div className="filter-group-radios">
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", null)} checked={filters.with_deleted === null}>Ativos</Radio></div>
							<div className="filter-group-radio"><Radio onChange={() => this.setFilter("with_deleted", true)} checked={filters.with_deleted === true}>Incluir deletados</Radio></div>
						</div>
					</div>
				</div>
				<div className="filter-group">
					<div className="filter-group-title"><h3>Data de criação</h3></div>
					<div className="filter-group-filters" style={{paddingBottom: 0}}>
						<Form.Item>
							<DatePicker.RangePicker format="DD/MM/YYYY" value={filters.created_at} onChange={(date) => this.setFilter("created_at", date ?? null)} disabledDate={(currentDate) => currentDate.isAfter(moment(), "day")} />
						</Form.Item>
					</div>
				</div>
			</Modal>
		)
	}
}

export default Filters;
