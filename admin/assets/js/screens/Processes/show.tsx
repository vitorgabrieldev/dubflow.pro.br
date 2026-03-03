import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Card, Col, Empty, Form, Input, Modal, Row, Tabs, Tag } from "antd";

import moment from "moment";

import { processesService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
} from "./../../components";

const PROCESS_STATUS_OPTIONS = [
	{label: "Novo cliente", value: "novo-cliente", color: "#4c8bf5"},
	{label: "Em preparação", value: "em-preparacao", color: "#ffbc00"},
	{label: "Enviado", value: "enviado", color: "#39afd1"},
	{label: "Pronto para análise", value: "pronto-para-analise", color: "#f06595"},
	{label: "Em análise", value: "em-analise", color: "#727cf5"},
	{label: "Deferido", value: "deferido", color: "#0acf97"},
	{label: "Restituído", value: "restituido", color: "#6f42c1"},
	{label: "Indeferido", value: "indeferido", color: "#fa5c7c"},
];

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.stateClean = {
			isLoading      : true,
			showGovPassword: false,
			uuid           : 0,
			item           : {},
		};

		this.state = {
			...this.stateClean,
		};
	}

	componentWillUnmount() {
		this.uploadFinal && this.uploadFinal.reset && this.uploadFinal.reset();
	}

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
			uuid,
		});

		this.uploadFinal && this.uploadFinal.reset && this.uploadFinal.reset();

		processesService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
				item,
			}, () => {
				const finalFileUrl = this.getFinalFileUrl(item);
				if( finalFileUrl && this.uploadFinal )
				{
					this.uploadFinal.setFiles([
						{
							uuid: item.uuid || "process-final-document",
							url : finalFileUrl,
							type: this.getFinalFileMime(item),
						},
					]);
				}
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
		this.setState({
			...this.stateClean,
		});

		this.uploadFinal && this.uploadFinal.reset && this.uploadFinal.reset();

		this.props.onClose();
	};

	normalize = (value) => String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

	getField = (item, fields, fallback = "N/A") => {
		const fieldList = Array.isArray(fields) ? fields : [fields];

		for( const field of fieldList )
		{
			if( !field ) continue;

			const value = String(field).includes(".")
				? String(field).split(".").reduce((acc, key) => acc?.[key], item)
				: item?.[field];

			if( value !== null && typeof value !== "undefined" && value !== "" )
			{
				return value;
			}
		}

		return fallback;
	};

	formatDate = (value) => {
		if( !value ) return "N/A";
		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "N/A";
	};

	formatDateTime = (value) => {
		if( !value ) return "N/A";
		const parsed = moment(value);
		return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "N/A";
	};

	formatMoney = (value) => {
		if( value === null || typeof value === "undefined" || value === "" ) return "N/A";

		const number = Number(value);
		if( Number.isNaN(number) ) return String(value);

		return new Intl.NumberFormat("pt-BR", {style: "currency", currency: "BRL"}).format(number);
	};

	humanizeSlug = (value) => {
		if( value === null || typeof value === "undefined" || value === "" ) return "N/A";

		return String(value)
			.replace(/[_-]+/g, " ")
			.split(" ")
			.filter(Boolean)
			.map((item) => item.charAt(0).toUpperCase() + item.slice(1))
			.join(" ");
	};

	humanizeIdLabel = (label) => {
		if( typeof label !== "string" ) return label;

		const trimmed = label.trim();
		if( !/^id[A-ZÀ-Ý]/i.test(trimmed) || /\s/.test(trimmed) )
		{
			return label;
		}

		const withoutPrefix = trimmed.replace(/^id/i, "");
		const spaced = withoutPrefix
			.replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý])/g, "$1 $2")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();

		if( !spaced ) return label;

		return spaced.charAt(0).toUpperCase() + spaced.slice(1);
	};

	getProcessStatusLabel = (status) => {
		if( status === null || typeof status === "undefined" || status === "" ) return "N/A";
		const normalized = this.normalize(status);
		const option = PROCESS_STATUS_OPTIONS.find(item => item.value === normalized);
		return option ? option.label : this.humanizeSlug(status);
	};

	getProcessStatusColor = (status) => {
		const normalized = this.normalize(status);
		const option = PROCESS_STATUS_OPTIONS.find(item => item.value === normalized);
		return option?.color || "#6c757d";
	};

	getDocumentStatusLabel = (status) => this.humanizeSlug(status);

	getDocumentStatusColor = (status) => {
		const normalized = this.normalize(status);
		if( normalized === "aprovado" ) return "#0acf97";
		if( normalized === "pendente" ) return "#ffbc00";
		if( normalized === "recusado" ) return "#fa5c7c";
		return "#6c757d";
	};

	getCustomerDocuments = (item) => {
		const list = item?.documentos_cliente || item?.customer_documents || item?.customer?.documents || item?.documents || [];
		return Array.isArray(list) ? list : [];
	};

	getCustomerDocumentFileUrl = (doc) => {
		return this.getField(doc, [
			"arquivo_documento_url",
			"arquivo_documento.url",
			"arquivo_documento",
			"file_url",
			"file.url",
			"file",
			"url",
		], null);
	};

	getFinalFileUrl = (item) => {
		return this.getField(item, [
			"arquivo_documento_url",
			"arquivo_documento.url",
			"arquivo_documento",
			"documento_final_url",
			"final_document_url",
		], null);
	};

	getFinalFileMime = (item) => {
		return this.getField(item, [
			"arquivo_documento_mime",
			"arquivo_documento.mime",
			"mime_type",
		], "application/octet-stream");
	};

	renderTextField = (label, value, col = 12) => {
		const formattedLabel = this.humanizeIdLabel(label);

		return (
			<Col xs={24} sm={col} key={label}>
				<Form.Item label={formattedLabel}>
				<div className="show-break-lines">{value ?? "N/A"}</div>
				</Form.Item>
			</Col>
		);
	};

	renderSecretField = (label, value, col = 12) => {
		const hasValue = value !== null && typeof value !== "undefined" && value !== "";
		const displayValue = !hasValue ? "N/A" : (this.state.showGovPassword ? value : "**********");

		return (
			<Col xs={24} sm={col} key={label}>
				<Form.Item label={label}>
					<Input
						disabled
						value={displayValue}
						suffix={hasValue ? (
							<span
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();

									const willShow = !this.state.showGovPassword;

									if( willShow )
									{
										Modal.warning({
											title  : "Atenção",
											content: "Você está visualizando uma senha sensível do cliente.",
											onOk   : () => {
												this.setState({
													showGovPassword: true,
												});
											},
										});

										return;
									}

									this.setState({
										showGovPassword: false,
									});
								}}
								style={{cursor: "pointer", color: "#6c757d"}}>
								<i className={`fal ${this.state.showGovPassword ? "fa-eye-slash" : "fa-eye"}`} />
							</span>
						) : null}
					/>
				</Form.Item>
			</Col>
		);
	};

	renderCustomerDocumentsTab = (item) => {
		const documents = this.getCustomerDocuments(item);

		if( !documents.length )
		{
			return <Empty description="Nenhum documento encontrado" />;
		}

		return (
			<div>
				{documents.map((doc, index) => {
					const typeLabel = this.getField(doc, ["documentType.name", "documentType.title", "document_type.name", "document_type.title", "document_type_id"], "N/A");
					const fileUrl = this.getCustomerDocumentFileUrl(doc);
					const status = this.getField(doc, ["status"], "N/A");
					const normalizedStatus = this.normalize(status);
					const refusalReason = this.getField(doc, ["motivo_recusa_documento", "motivo_recusa", "rejection_reason"], null);
					const sentDate = this.getField(doc, ["data_envio", "created_at", "sent_at"], null);

					return (
						<Card key={doc?.uuid || doc?.id || index} size="small" style={{marginBottom: 12}}>
							<Row gutter={16}>
								{this.renderTextField("IdTipoDocumento", typeLabel)}
								<Col xs={24} sm={12}>
									<Form.Item label="Arquivo do documento">
										{fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer">Visualizar arquivo</a> : "N/A"}
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={16}>
								{this.renderTextField("Data do envio", this.formatDate(sentDate))}
								<Col xs={24} sm={12}>
									<Form.Item label="Status">
										<Tag color={this.getDocumentStatusColor(status)}>{this.getDocumentStatusLabel(status)}</Tag>
									</Form.Item>
								</Col>
							</Row>
							{normalizedStatus === "recusado" && (
								<Row gutter={16}>
									{this.renderTextField("Motivo de recusa do documento", refusalReason || "N/A", 24)}
								</Row>
							)}
						</Card>
					);
				})}
			</div>
		);
	};

	render() {
		const {visible} = this.props;
		const {isLoading, item} = this.state;

		const despachanteLabel = this.getField(item, ["despachante.name", "despachante_id"], "N/A");
		const responsavelLabel = this.getField(item, ["despachanteUser.name", "despachante_user.name", "despachante_user_id"], "N/A");
		const customerLabel = this.getField(item, ["customer.name", "customer_id"], "N/A");
		const serviceTypeLabel = this.getField(item, ["serviceType.title", "serviceType.name", "service_type.title", "service_type.name", "service_type_id"], "N/A");
		const serviceLabel = this.getField(item, ["service.name", "service_id"], "N/A");
		const processStatus = this.getField(item, ["status"], "N/A");
		const paymentStatus = this.getField(item, ["status_pagamento"], "N/A");

		return (
			<UIDrawerForm
				visible={visible}
				width={980}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title="Visualizar registro">
				<Form layout="vertical">
					<Tabs defaultActiveKey="service">
						<Tabs.TabPane forceRender tab="Informações do serviço" key="service">
							<Row gutter={16}>
								{this.renderTextField("IdDespachante", despachanteLabel)}
								{this.renderTextField("Responsável", responsavelLabel)}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("IdCliente", customerLabel)}
								{this.renderTextField("Número do processo", this.getField(item, ["numero_processo"], "N/A"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("IdTipoDoServiço", serviceTypeLabel)}
								{this.renderTextField("IdServiço", serviceLabel)}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Valor do serviço", this.formatMoney(this.getField(item, ["valor_servico"], null)))}
								{this.renderTextField("Status do pagamento", this.humanizeSlug(paymentStatus))}
							</Row>

							<Row gutter={16}>
								<Col xs={24} sm={12}>
									<Form.Item label="Status do processo">
										<Tag color={this.getProcessStatusColor(processStatus)}>{this.getProcessStatusLabel(processStatus)}</Tag>
									</Form.Item>
								</Col>
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Observações", this.getField(item, ["observacoes"], "N/A"), 24)}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Data da solicitação", this.formatDate(this.getField(item, ["data_solicitacao"], null)))}
								{this.renderTextField("Última atualização", this.formatDate(this.getField(item, ["ultima_atualizacao"], null)))}
							</Row>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Informações do cliente" key="customer">
							<Row gutter={16}>
								{this.renderTextField("Nome completo", this.getField(item, ["nome_completo"], "N/A"))}
								{this.renderTextField("E-mail", this.getField(item, ["email"], "N/A"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("CPF", this.getField(item, ["cpf"], "N/A"))}
								{this.renderTextField("Telefone", this.getField(item, ["telefone"], "N/A"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Cidade/UF", this.getField(item, ["cidade_uf"], "N/A"))}
								{this.renderSecretField("Senha do GOV", this.getField(item, ["senha_gov", "customer.gov_password"], null))}
							</Row>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Documentos do cliente" key="customer-documents">
							{this.renderCustomerDocumentsTab(item)}
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Documento final" key="final-document">
							<UIUpload
								ref={el => (this.uploadFinal = el)}
								label="Arquivo do documento"
								disabled
								acceptedFiles={["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"]}
							/>

							<Row gutter={16}>
								{this.renderTextField("Data de vencimento", this.formatDate(this.getField(item, ["data_vencimento"], null)))}
							</Row>
						</Tabs.TabPane>
					</Tabs>
				</Form>
			</UIDrawerForm>
		);
	}
}

export default Show;
