import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Modal, Tag } from "antd";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued"

import moment from "moment";

import { logService } from "./../../redux/services";

import { UIDrawerForm } from "./../../components";

const config = {
	externalName: "log",
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
		};
	}

	fieldOptions = {
		message   : {
			label: "Mensagem",
		},
		user      : {
			label: "Usuário",
		},
		item      : {
			label: "Item",
		},
		action    : {
			label: "Ação",
		},
		ip        : {
			label: "IP",
		},
		user_agent: {
			label: "User agent",
		},
		url       : {
			label: "Url",
		},
		created_at: {
			label: "Data",
		},
	};

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
			item     : {},
		});

		logService.show({uuid})
		.then((response) => {
			this.setState({
				isLoading: false,
				item     : response.data.data,
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

	colorMethod = () => {
		const {item} = this.state;

		let color = "#808080";

		if( item.method === "GET" )
		{
			color = "#26b47f";
		}
		else if( item.method === "POST" )
		{
			color = "#ffb400";
		}
		else if( item.method === "PUT" )
		{
			color = "#097bed";
		}
		else if( item.method === "DELETE" )
		{
			color = "#ed4b48";
		}

		return color;
	};

	render() {
		const {visible}               = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={1500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar ${this.props.external ? config.externalName : "registro"} [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label={this.fieldOptions.message.label}>
						{item.message}
					</Form.Item>
					<Form.Item label={this.fieldOptions.user.label}>
						{item.user_id} - {item.user?.name}
					</Form.Item>
					{item.log_id && <Form.Item label={this.fieldOptions.item.label}>
						{item.log_id} - {item.log_name}
					</Form.Item>}
					<Form.Item label={this.fieldOptions.ip.label}>
						{item.ip}
					</Form.Item>
					<Form.Item label={this.fieldOptions.user_agent.label}>
						{item.user_agent}
					</Form.Item>
					<Form.Item label={this.fieldOptions.url.label}>
						<Tag color={this.colorMethod()}>{item.method}</Tag>{item.url}
					</Form.Item>
					<Form.Item label={this.fieldOptions.created_at.label}>
						{moment(item.created_at).calendar()}
					</Form.Item>
					{(item.old_data || item.new_data) && <ReactDiffViewer compareMethod={DiffMethod.LINES} oldValue={JSON.stringify(item.old_data ? item.old_data : "", null, 2)} newValue={JSON.stringify(item.new_data ? item.new_data : "", null, 2)} splitView={false} />}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
