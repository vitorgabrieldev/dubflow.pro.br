import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Empty, Form, Modal, Row, Switch, Tabs, Tag } from "antd";

import moment from "moment";

import { servicesService } from "./../../redux/services";

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

	getServiceCategoryFromItem = (item) => item?.service_category || item?.category || item?.serviceCategory || null;

	getServiceTypeFromItem = (item) => item?.service_type || item?.type || item?.serviceType || null;

	getRequiredDocumentTypesFromItem = (item) => {
		const list = item?.documentTypes
			|| item?.document_types
			|| item?.required_document_types
			|| item?.documents_required
			|| [];

		if( Array.isArray(list) && list.length )
		{
			return list;
		}

		if( Array.isArray(item?.document_type_ids) && item.document_type_ids.length )
		{
			return item.document_type_ids.map((uuid) => ({uuid, title: String(uuid)}));
		}

		if( item?.document_type )
		{
			return [item.document_type];
		}

		if( item?.document_type_id )
		{
			return [{uuid: item.document_type_id, title: String(item.document_type_id)}];
		}

		return [];
	};

	getOptionLabel = (item) => {
		if( item === null || typeof item === "undefined" ) return "N/A";
		if( typeof item === "string" ) return item;
		return item.title || item.name || item.uuid || item.id || "N/A";
	};

	formatCurrency = (value) => {
		if( value === null || typeof value === "undefined" || value === "" ) return "N/A";

		const numberValue = Number(value);
		if( Number.isNaN(numberValue) ) return String(value);

		return numberValue.toLocaleString("pt-BR", {
			style   : "currency",
			currency: "BRL",
		});
	};

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
			uuid,
		});

		servicesService.show({uuid})
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

	renderDocumentsTab = (item) => {
		const documents = this.getRequiredDocumentTypesFromItem(item);

		if( !documents.length )
		{
			return (
				<div style={{padding: "8px 0"}}>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description="A API ainda não retornou os documentos necessários deste serviço."
					/>
				</div>
			);
		}

		return (
			<div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
				{documents.map((documentType, index) => (
					<Tag key={documentType?.uuid || documentType?.id || index} color="blue" style={{padding: "4px 8px"}}>
						{this.getOptionLabel(documentType)}
					</Tag>
				))}
			</div>
		);
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;
		const serviceCategory = this.getServiceCategoryFromItem(item);
		const serviceType = this.getServiceTypeFromItem(item);

		return (
			<UIDrawerForm
				visible={visible}
				width={720}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar registro [${uuid}]`}>
				<Form layout="vertical">
					<Tabs defaultActiveKey="general">
						<Tabs.TabPane forceRender tab="Informações gerais" key="general">
							<Row gutter={16}>
								<Col xs={24} sm={12}>
									<Form.Item label="Categoria do serviço">
										{this.getOptionLabel(serviceCategory)}
									</Form.Item>
								</Col>
								<Col xs={24} sm={12}>
									<Form.Item label="Tipo do serviço">
										{this.getOptionLabel(serviceType)}
									</Form.Item>
								</Col>
							</Row>

							<Form.Item label="Nome do serviço">
								{item?.name || item?.title || "N/A"}
							</Form.Item>

							<Form.Item label="Valor">
								{this.formatCurrency(item?.price ?? item?.value)}
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
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Documentos necessários" key="documents">
							{this.renderDocumentsTab(item)}
						</Tabs.TabPane>
					</Tabs>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
