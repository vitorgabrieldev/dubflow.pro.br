import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";

import moment from "moment";

import { despachanteUsersService } from "./../../redux/services";

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

		despachanteUsersService.show({uuid})
		.then((response) => {
			this.setState({
				isLoading: false,
				item     : response?.data?.data || {},
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
		this.setState({
			...this.stateClean,
		});

		this.props.onClose();
	};

	formatDateTime = (value) => {
		if( !value ) return "N/A";

		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "N/A";
	};

	isActiveValue = (value) => {
		if( value === true || value === 1 ) return true;
		if( typeof value === "string" )
		{
			return ["1", "true"].includes(value.toLowerCase().trim());
		}

		return false;
	};

	renderTextField = (label, value, col = 12) => (
		<Col xs={24} sm={col} key={label}>
			<Form.Item label={label}>
				<div className="show-break-lines">{value ?? "N/A"}</div>
			</Form.Item>
		</Col>
	);

	render() {
		const {visible} = this.props;
		const {isLoading, item} = this.state;

		const despachanteLabel = item?.despachante?.name || "N/A";

		return (
			<UIDrawerForm
				visible={visible}
				width={700}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title="Visualizar registro">
				<Form layout="vertical">
					<Row gutter={16}>
						{this.renderTextField("Despachante", despachanteLabel)}
						{this.renderTextField("Nome completo", item?.name || "N/A")}
					</Row>

					<Row gutter={16}>
						{this.renderTextField("E-mail", item?.email || "N/A")}
						<Col xs={24} sm={12}>
							<Form.Item label="Ativo">
								<Switch disabled checked={this.isActiveValue(item?.is_active)} />
							</Form.Item>
						</Col>
					</Row>

					<Row gutter={16}>
						{this.renderTextField("Data e horário do cadastro", this.formatDateTime(item?.created_at))}
						{this.renderTextField("Data e horário da última modificação", this.formatDateTime(item?.updated_at))}
					</Row>
				</Form>
			</UIDrawerForm>
		);
	}
}

export default Show;
