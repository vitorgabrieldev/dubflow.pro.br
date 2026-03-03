import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";

import moment from "moment";

import { despachantesService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.stateClean = {
			isLoading: true,
			uuid     : 0,
			item     : {},
		};

		this.state = {
			...this.stateClean,
		};
	}

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
			uuid,
		});

		despachantesService.show({uuid})
		.then((response) => {
			this.setState({
				isLoading: false,
				item     : response.data.data || {},
			});
		})
		.catch((data) => {
			this.setState({
				isLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => this.onClose(),
			});
		});
	};

	onClose = () => {
		this.props.onClose();
	};

	formatDate = (value) => value ? moment(value).calendar() : "N/A";

	getLocationLabel = (item) => {
		return {
			stateName: item?.state?.name || item?.city?.state?.name || item?.state_name || item?.uf || "N/A",
			cityName : item?.city?.name || item?.city_name || "N/A",
		};
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;
		const {stateName, cityName} = this.getLocationLabel(item);

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar registro [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Nome">
						{item?.name || "N/A"}
					</Form.Item>

					<Form.Item label="E-mail">
						{item?.email || "N/A"}
					</Form.Item>

					<Form.Item label="Telefone">
						{item?.phone || "N/A"}
					</Form.Item>

					<Form.Item label="Limite de usuários">
						{typeof item?.user_limit === "undefined" || item?.user_limit === null ? "N/A" : item.user_limit}
					</Form.Item>

					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Estado">
								{stateName}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Cidade">
								{cityName}
							</Form.Item>
						</Col>
					</Row>

					<Form.Item label="Ativo">
						<Switch disabled checked={!!item?.is_active} />
					</Form.Item>

					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Data e hora do cadastro">
								{this.formatDate(item?.created_at)}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Última modificação">
								{this.formatDate(item?.updated_at)}
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
