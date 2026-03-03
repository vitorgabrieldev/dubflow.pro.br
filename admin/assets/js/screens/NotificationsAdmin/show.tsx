import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Modal, Switch } from "antd";
import moment from "moment";

import { notificationsAdminService } from "./../../redux/services";
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
		notificationsAdminService.show({uuid})
		.then((response) => this.setState({isLoading: false, item: response.data.data}))
		.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} showBtnSave={false} title={`Visualizar notificação [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Usuário">{item.user ? `${item.user.name} (${item.user.email})` : "-"}</Form.Item>
					<Form.Item label="Tipo">{item.type || "-"}</Form.Item>
					<Form.Item label="Título">{item.data?.title || "-"}</Form.Item>
					<Form.Item label="Mensagem">{item.data?.message || "-"}</Form.Item>
					<Form.Item label="Lida"><Switch disabled checked={!!item.is_read} /></Form.Item>
					<Form.Item label="Lida em">{item.read_at ? moment(item.read_at).calendar() : "-"}</Form.Item>
					<Form.Item label="Criação">{item.created_at ? moment(item.created_at).calendar() : "-"}</Form.Item>
					<Form.Item label="Atualização">{item.updated_at ? moment(item.updated_at).calendar() : "-"}</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
