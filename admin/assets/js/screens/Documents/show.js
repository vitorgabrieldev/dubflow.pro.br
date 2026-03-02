import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Tag } from "antd";

import moment from "moment";

import { documentsService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
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

	componentWillUnmount() {
		this.upload && this.upload.reset && this.upload.reset();
	}

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
			uuid,
		});

		this.upload && this.upload.reset && this.upload.reset();

		documentsService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
				item,
			}, () => {
				const fileUrl = this.getFileUrl(item);

				if( fileUrl && this.upload )
				{
					this.upload.setFiles([
						{
							uuid: item.uuid || item.id || "file",
							url : fileUrl,
							type: this.getFileMime(item),
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

		this.upload && this.upload.reset && this.upload.reset();

		this.props.onClose();
	};

	getField = (item, field, fallback = "N/A") => {
		const fields = Array.isArray(field) ? field : [field];

		for( const currentField of fields )
		{
			if( !currentField ) continue;

			const value = String(currentField).includes(".")
				? String(currentField).split(".").reduce((acc, key) => acc?.[key], item)
				: item?.[currentField];

			if( value !== null && typeof value !== "undefined" && value !== "" )
			{
				return value;
			}
		}

		return fallback;
	};

	getFileUrl = (item) => {
		return this.getField(item, [
			"file_url",
			"file.url",
			"file",
			"url",
			"document_file",
			"arquivo",
		], null);
	};

	getFileMime = (item) => {
		return this.getField(item, [
			"file_mime",
			"file.mime",
			"mime_type",
			"mime",
		], "application/octet-stream");
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

	getStatusLabel = (status) => {
		if( status === null || typeof status === "undefined" || status === "" ) return "N/A";

		const raw = String(status).trim();
		const normalized = raw
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\s+/g, "");

		if( normalized === "avencer" ) return "A vencer";
		if( normalized === "valido" ) return "Válido";
		if( normalized === "vencido" ) return "Vencido";

		return raw;
	};

	getStatusColor = (status) => {
		const normalized = String(status || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\s+/g, "")
			.trim();

		if( normalized === "valido" ) return "#0acf97";
		if( normalized === "avencer" ) return "#ffbc00";
		if( normalized === "vencido" ) return "#fa5c7c";

		return "#6c757d";
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

		const customerLabel = this.getField(item, [
			"customer.name",
			"customer.nome",
			"customer.email",
			"customer_id",
			"customer.uuid",
			"customer.id",
		], "N/A");
		const documentTypeLabel = this.getField(item, [
			"document_type.title",
			"document_type.name",
			"documentType.title",
			"documentType.name",
			"document_type_id",
			"document_type.uuid",
			"document_type.id",
		], "N/A");
		const status = this.getField(item, ["status"], "N/A");

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
							{this.renderTextField("Cliente", customerLabel)}
							{this.renderTextField("Tipo de documento", documentTypeLabel)}
						</Row>

						<Row gutter={16}>
							{this.renderTextField("Nome do documento", this.getField(item, ["name"]))}
							<Col xs={24} sm={12}>
								<Form.Item label="Vencimento">
									{this.formatDate(this.getField(item, ["expiration_date", "expiration"], null))}
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col xs={24} sm={12}>
								<Form.Item label="Status">
									<Tag color={this.getStatusColor(status)}>{this.getStatusLabel(status)}</Tag>
								</Form.Item>
							</Col>
						</Row>

						<UIUpload
							ref={el => (this.upload = el)}
							label="Arquivo do documento"
							disabled
							acceptedFiles={["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"]}
						/>

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
