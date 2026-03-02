import React, { Component } from "react";
import { connect } from "react-redux";
import * as PropTypes from "prop-types";
import { Form, Modal, Select, Switch } from "antd";

import { faqService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

const USER_TYPES = [
	{label: "Todos", value: "Todos"},
	{label: "Cliente", value: "Cliente"},
	{label: "Despachante", value: "Despachante"},
];

const normalizeUserType = (value) => {
	const normalizedValue = String(value || "").trim().toLowerCase();

	if( !normalizedValue ) return "Todos";
	if( normalizedValue === "todos" ) return "Todos";
	if( normalizedValue === "cliente" || normalizedValue === "customer" ) return "Cliente";
	if( normalizedValue === "despachante" || normalizedValue === "profissional" ) return "Despachante";

	return value || "Todos";
};

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
		};
	}

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
		});

		faqService.show({uuid})
		.then((response) => {
			this.setState({
				isLoading: false,
				item     : response?.data?.data || {},
			});
		})
		.catch((data) => {
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
		const {isLoading, item} = this.state;

		const question = item?.question ?? item?.name ?? "";
		const answer = item?.answer ?? item?.text ?? "";
		const userType = normalizeUserType(item?.user_type ?? item?.type);

		return (
			<UIDrawerForm
				visible={visible}
				width={560}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title="Visualizar registro">
				<Form layout="vertical">
					<Form.Item label="Tipo do usuário">
						<Select
							disabled
							value={userType}
							options={USER_TYPES}
						/>
					</Form.Item>
					<Form.Item label="Texto da pergunta">
						<div className="show-break-lines">{question}</div>
					</Form.Item>
					<Form.Item label="Texto da resposta">
						<div
							className="show-break-lines"
							dangerouslySetInnerHTML={{__html: answer || ""}}
						/>
					</Form.Item>
					<Form.Item label="Ordem">
						{typeof item?.order === "undefined" || item?.order === null ? "N/A" : item.order}
					</Form.Item>
					<Form.Item label="Ativo">
						<Switch disabled checked={!!item?.is_active} />
					</Form.Item>
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
