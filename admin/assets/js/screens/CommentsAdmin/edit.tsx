import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Select } from "antd";

import { commentsAdminService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading   : true,
			isSending   : false,
			uuid        : 0,
			users       : [],
			posts       : [],
			postsLoading: false,
		};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		let item;

		commentsAdminService.show({uuid})
		.then((response) => {
			item = response.data.data;
			return Promise.all([
				platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"}),
				this.fetchPostsAutocomplete("", item.post_id),
			]);
		})
		.then(([usersResponse]) => {
			this.setState({isLoading: false, users: usersResponse.data.data || []}, () => {
				this.form.setFieldsValue({
					post_id   : item.post_id,
					user_uuid : item.user?.uuid,
					parent_id : item.parent_id,
					body      : item.body,
				});
			});
		})
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

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

	onClose = () => this.props.onClose();

	onFinish = (values) => {
		const payload = {uuid: this.state.uuid, ...values};
		payload.post_id = Number(payload.post_id);
		if( payload.parent_id ) payload.parent_id = Number(payload.parent_id);

		this.setState({isSending: true});
		commentsAdminService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comentário atualizado com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(data)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, users, posts, postsLoading} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar comentário [${uuid}]`}>
				<Form ref={(el) => this.form = el} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="post_id" label="Post" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							showSearch
							allowClear
							filterOption={false}
							placeholder="Selecione o post"
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
					<Form.Item name="user_uuid" label="Usuário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione um usuário">
							{users.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="parent_id" label="ID do comentário pai (resposta)"><Input /></Form.Item>
					<Form.Item name="body" label="Comentário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}><Input.TextArea rows={5} /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
