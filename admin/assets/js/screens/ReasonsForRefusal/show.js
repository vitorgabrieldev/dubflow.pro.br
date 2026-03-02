import React, { Component } from "react";
import { connect } from "react-redux";
import * as PropTypes from "prop-types";
import { Form, Modal, Switch, Row, Col } from "antd";

import moment from "moment";

import { ReasonsForRefusalService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

class Show extends Component {
	static propTypes = {
		visible : PropTypes.bool.isRequired,
		onClose : PropTypes.func.isRequired,
		external: PropTypes.bool,
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
			type: [
				{name: "Usuário", value: 'customer'},
				{name: "Profissional", value: 'profissional'},
				{name: "Ambos", value: 'todos'},
			],
		};
	}

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
		});

		ReasonsForRefusalService.show({uuid})
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

	onClose = () => {
		// Callback
		this.props.onClose();
	};

	capitalize = (text) => text ? text.charAt(0).toUpperCase() + text.slice(1) : 'N/A';

	render() {
		const {visible} = this.props;

		const {isLoading, item, type} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar registro`}>
				<Form layout="vertical">

					<Form.Item label="Tipo">
						{(() => {
							let type;
							if (item.type === "customer") {
								type = "Usuário";
							} else if (item.type === "profissional") {
								type = "Profissional";
							} else if (item.type === "todos") {
								type = "Ambos";
							} else {
								type = item.type;
							}
							return type;
						})()}
					</Form.Item>

					<Form.Item label="Título">
						{item.title}
					</Form.Item>
					
					<Form.Item label="Ordem">
						{item.order}
					</Form.Item>


					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Exibir no app">
								<Switch disabled checked={item.show} />
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Ativo">
								<Switch disabled checked={item.is_active} />
							</Form.Item>
						</Col>
					</Row>

					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item label="Data e hora do cadastro">
								{moment(item.created_at).calendar()}
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item label="Última modificação">
								{moment(item.updated_at).calendar()}
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</UIDrawerForm>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		permissions: state.auth.userData.permissions,
	};
};

export default connect(mapStateToProps, null, null, {forwardRef: true})(Show);
