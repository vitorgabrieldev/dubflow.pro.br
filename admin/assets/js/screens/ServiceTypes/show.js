import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";

import moment from "moment";

import { serviceTypesService } from "./../../redux/services";

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

		serviceTypesService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
				item     : item,
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

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar registro [${uuid}]`}>
				<Form layout="vertical">
					<Form.Item label="Título">
						{item?.title || "N/A"}
					</Form.Item>

					<Form.Item label="Ativo">
						<Switch disabled checked={!!item?.is_active} />
					</Form.Item>

					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Data e hora do cadastro">
								{item?.created_at ? moment(item.created_at).calendar() : "N/A"}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Última modificação">
								{item?.updated_at ? moment(item.updated_at).calendar() : "N/A"}
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
