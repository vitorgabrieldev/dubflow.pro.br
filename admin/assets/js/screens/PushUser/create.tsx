import React, { Component } from "react";
import axios from "axios";
import * as PropTypes from "prop-types";
import { Col, DatePicker, Form, Input, message, Modal, Row, Select, Switch, Typography, Spin } from "antd";

import { API_ERRO_TYPE_CANCEL } from "./../../config/general";

import { pushUserService, customerService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading     : false,
			isSending     : false,
			usersIsLoading: false,
			users         : [],
			type: [
				{name: "Usuário", value: 'customer'},
				{name: "Profissional", value: 'profissional'},
				{name: "Todos", value: 'todos'},
			],
		};

		this._axiosCancelToken = null;
	}

	fetchUsers = (value) => {
		if( this._axiosCancelToken )
		{
			this._axiosCancelToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelToken = axios.CancelToken.source();

		if( !value.trim().length )
		{
			this.setState({
				usersIsLoading: false,
				users         : [],
			});

			return false;
		}

		this.setState({
			usersIsLoading: true,
		});

		customerService.getAutocompleteCombination({
			search        : value,
			orderBy       : "name:asc",
			is_active     : 1,
			include_tenant: 1,
			cancelToken   : this._axiosCancelToken.token,
		})
		.then((response) => {
			this.setState({
				usersIsLoading: false,
				users         : response.data.data,
			});
		})
		.catch((data) => {
			if( data.error_type === API_ERRO_TYPE_CANCEL ) return null;

			this.setState({
				usersIsLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	onOpen = () => {
	};

	resetFields = () => {
		this.setState({
			users: [],
		});
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const data = {...values};

		pushUserService.create(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success("Registro cadastrado com sucesso.");

			// Callback
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({
				isSending: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	render() {
		const {visible} = this.props;

		const {isLoading, isSending, users, usersIsLoading, type} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Inserir novo registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>

					{/* <Form.Item name="type" label="Tipo" rules={[{required: true}]}>
						<Select
							filterOption={false}
							allowClear
							labelInValue={false}
							options={type.map((item) => ({
								value: item.value,
								label: item.name
							}))}
						/>
					</Form.Item> */}

					<Form.Item name="user_id" label="Usuário" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							filterOption={false}
							allowClear
							placeholder="Pesquise o usuário"
							notFoundContent={usersIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
							onSearch={this.fetchUsers}
							showSearch>
							{users.map((item, index) => (
								<Select.Option key={index} value={item.uuid}>{item.name}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Titulo" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={50} />
					</Form.Item>
					<Form.Item name="body" label="Mensagem" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input.TextArea maxLength={100} autosize={{minRows: 3, maxRows: 6}} />
					</Form.Item>
					<Form.Item name="scheduled_at" label="Data de agendamento">
						<DatePicker
							showTime
							format="DD/MM/YYYY HH:mm"
							style={{width: "100%"}}
						/>
					</Form.Item>
					<Form.Item name="url" label="URL" hasFeedback rules={[{type: "url", message: "Digite uma url válida."}]}>
						<Input maxLength={191} />
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
