import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Modal } from "antd";
import moment from "moment";

import { commentsAdminService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {isLoading: true, uuid: 0, item: {}};
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid, item: {}});
		commentsAdminService.show({uuid})
		.then((response) => this.setState({isLoading: false, item: response.data.data}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar comentário [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Post">{item.post ? `${item.post.id} - ${item.post.title}` : "-"}</Form.Item>
					<Form.Item label="Usuário">{item.user ? `${item.user.name} (${item.user.email})` : "-"}</Form.Item>
					<Form.Item label="Comentário pai">{item.parent_id || "-"}</Form.Item>
					<Form.Item label="Texto">{item.body || "-"}</Form.Item>
					<Form.Item label="Editado em">{item.edited_at ? moment(item.edited_at).calendar() : "-"}</Form.Item>
					<Form.Item label="Deletado em">{item.deleted_at ? moment(item.deleted_at).calendar() : "-"}</Form.Item>
					<Form.Item label="Criação">{item.created_at ? moment(item.created_at).calendar() : "-"}</Form.Item>
					<Form.Item label="Atualização">{item.updated_at ? moment(item.updated_at).calendar() : "-"}</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
