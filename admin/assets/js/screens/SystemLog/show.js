import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Modal, Tag } from "antd";
import ReactJson from "react-json-view";

import moment from "moment";

import { systemLogService } from "./../../redux/services";

import { UIDrawerForm } from "./../../components";

const config = {
	externalName: "registro de erro",
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
		level     : {
			label: "Level",
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

		systemLogService.show({uuid})
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
				width={1150}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar ${this.props.external ? config.externalName : "registro"} [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label={this.fieldOptions.message.label}>
						<Tag color={item.color}>{item.level}</Tag> {item.message}
					</Form.Item>
					{item.user_id && <Form.Item label={this.fieldOptions.user.label}>
						{item.user_id} - {item.user?.name}
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
					<ReactJson name="context" src={item.context} iconStyle="square" indentWidth={6} />
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
