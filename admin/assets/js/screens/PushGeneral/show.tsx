import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch, Tag } from "antd";

import moment from "moment";

import { pushGeneralService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
} from "./../../components";

const config = {
	externalName: "push",
};

class Show extends Component {
	static propTypes = {
		visible : PropTypes.bool.isRequired,
		onClose : PropTypes.func.isRequired,
		external: PropTypes.bool,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			uuid     : 0,
			item     : {},
			file     : [],
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
			item     : {},
		});

		pushGeneralService.show({uuid})
		.then((response) => {
			let item = response.data.data;

			this.setState({
				isLoading: false,
				item     : item,
			});
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => {
					// Force close
					return this.onClose();
				}
			});
		});
	};

	resetFields = () => {
		this.setState({
			item: {},
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	render() {
		const {visible}               = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar ${this.props.external ? config.externalName : "registro"} [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Titulo">
						{item.title}
					</Form.Item>
					<Form.Item label="Mensagem">
						{item.body}
					</Form.Item>
					<Form.Item label="Data de agendamento">
						{item.scheduled_at ? moment(item.scheduled_at).format("DD/MM/YYYY HH:mm") : '-'}
					</Form.Item>
					<Form.Item label="URL">
						{item.url}
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
