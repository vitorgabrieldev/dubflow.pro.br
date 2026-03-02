import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, Modal, Row, Switch, Tabs, Tag, Typography } from "antd";

import moment from "moment";

import { customerDeletedService } from "./../../redux/services";

import {
	UIDrawerForm,
	UIUpload,
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
			showGovPassword: false,
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
			uuid: uuid,
		});

		this.upload && this.upload.reset && this.upload.reset();

		customerDeletedService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
				item     : item,
			}, () => {
				const avatarUrl = item?.avatar || null;

				if( avatarUrl && this.upload )
				{
					this.upload.setFiles([
						{
							uuid: item.uuid || item.id || "avatar",
							url : avatarUrl,
							type: "image/jpeg",
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

	formatMultiValue = (value) => {
		if( value === null || typeof value === "undefined" || value === "" ) return [];

		if( Array.isArray(value) )
		{
			return value.map((item) => {
				if( typeof item === "string" ) return item.trim();
				if( typeof item === "number" ) return String(item);
				if( item && typeof item === "object" )
				{
					return item.name || item.title || item.label || item.value || JSON.stringify(item);
				}

				return "";
			}).filter(Boolean);
		}

		if( typeof value === "string" )
		{
			return value.split(/[,;\n]/g).map(item => item.trim()).filter(Boolean);
		}

		return [String(value)];
	};

	renderTextField = (label, value, col = 12) => (
		<Col xs={24} sm={col} key={label}>
			<Form.Item label={label}>
				<div className="show-break-lines">{value ?? "N/A"}</div>
			</Form.Item>
		</Col>
	);

	renderBooleanField = (label, checked, col = 12) => (
		<Col xs={24} sm={col} key={label}>
			<Form.Item label={label}>
				<Switch disabled checked={!!checked} />
			</Form.Item>
		</Col>
	);

	renderTagsField = (label, values, emptyText = "N/A") => (
		<Form.Item label={label}>
			{values.length ? (
				<div>
					{values.map((value, index) => (
						<Tag key={`${label}-${index}`} style={{marginBottom: 8}}>{value}</Tag>
					))}
				</div>
			) : (
				<Typography.Text type="secondary">{emptyText}</Typography.Text>
			)}
		</Form.Item>
	);

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

	render() {
		const {visible} = this.props;
		const {isLoading, item} = this.state;

		const despachanteLabel = item?.despachante?.name ?? (item?.despachante_id ?? "N/A");

		const notificationsAllowed = !!item?.notify_general;
		const accountVerified = !!item?.account_verified_at;

		const activities = this.formatMultiValue(item?.activities);
		const customerProfile = this.formatMultiValue(item?.customer_profile);

		return (
			<UIDrawerForm
				visible={visible}
				width={900}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title="Visualizar registro">
				<Form layout="vertical">
					<Tabs defaultActiveKey="general">
						<Tabs.TabPane forceRender tab="Informações gerais" key="general">
							<UIUpload
								ref={el => (this.upload = el)}
								label="Imagem de perfil"
								disabled
								acceptedFiles={["jpg", "jpeg", "png", "webp"]}
							/>

							<Row gutter={16}>
								{this.renderTextField("IdDespachante", despachanteLabel)}
								{this.renderTextField("Nome completo", this.getField(item, "name"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("E-mail", this.getField(item, "email"))}
								{this.renderTextField("Sexo", this.getField(item, "sex"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("CPF", this.getField(item, "cpf"))}
								{this.renderTextField("RG", this.getField(item, "rg"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("RG expedido em", this.formatDate(item?.rg_expedido_em))}
								{this.renderTextField("Orgão emissor RG", this.getField(item, "rg_orgao_emissor"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Nascimento", this.formatDate(item?.nascimento))}
								{this.renderTextField("Nacionalidade", this.getField(item, "nacionalidade"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Cidade de nascimento", this.getField(item, "cidade_nascimento"))}
								{this.renderTextField("UF de nascimento", this.getField(item, "uf_nascimento"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Título de eleitor", this.getField(item, "titulo_eleitor"))}
								{this.renderTextField("Profissão", this.getField(item, "profissao"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Profissão 2", this.getField(item, "profissao_2"))}
								{this.renderTextField("Telefone", this.getField(item, "telefone"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Telefone 2", this.getField(item, "telefone_2"))}
								{this.renderTextField("WhatsApp", this.getField(item, "whatsapp"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Nome da mãe", this.getField(item, "nome_mae"))}
								{this.renderTextField("Nome do pai", this.getField(item, "nome_pai"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Data e horário do cadastro", this.formatDateTime(item?.created_at))}
								{this.renderTextField("Data e horário da última modificação", this.formatDateTime(item?.updated_at))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Data e horário da remoção", this.formatDateTime(item?.deleted_at))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Data e horário do aceite dos termos de uso", this.formatDateTime(item?.accepted_term_of_users_at))}
								{this.renderTextField("Data e horário do aceite da política de privacidade", this.formatDateTime(item?.accepted_policy_privacy_at))}
							</Row>

							<Row gutter={16}>
								{this.renderBooleanField("Permitir notificações?", notificationsAllowed)}
								{this.renderBooleanField("Conta verificada?", accountVerified)}
							</Row>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Endereço do acervo" key="acervo">
							<Row gutter={16}>
								{this.renderTextField("CEP", this.getField(item, "acervo_cep"))}
								{this.renderTextField("Endereço", this.getField(item, "acervo_address"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Número", this.getField(item, "acervo_number"))}
								{this.renderTextField("Bairro", this.getField(item, "acervo_neighborhood"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Complemento", this.getField(item, "acervo_complement"))}
								{this.renderTextField("Cidade", this.getField(item, "acervo_city"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("UF", this.getField(item, "acervo_state"))}
							</Row>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Segundo endereço do acervo" key="acervo2">
							<Row gutter={16}>
								{this.renderTextField("CEP", this.getField(item, "acervo_2_cep"))}
								{this.renderTextField("Endereço", this.getField(item, "acervo_2_address"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Número", this.getField(item, "acervo_2_number"))}
								{this.renderTextField("Bairro", this.getField(item, "acervo_2_neighborhood"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("Complemento", this.getField(item, "acervo_2_complement"))}
								{this.renderTextField("Cidade", this.getField(item, "acervo_2_city"))}
							</Row>

							<Row gutter={16}>
								{this.renderTextField("UF", this.getField(item, "acervo_2_state"))}
							</Row>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Informações do Siscobe" key="siscobe">
							<Form.Item label="Observações">
								<div className="show-break-lines">{this.getField(item, "notes")}</div>
							</Form.Item>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Informações extras" key="extras">
							<Row gutter={16}>
								{this.renderSecretField("Senha do GOV", item?.gov_password)}
								{this.renderTextField("Estado civil", this.getField(item, "marital_status"))}
							</Row>

							{this.renderTagsField("Atividades", activities)}
							{this.renderTagsField("Perfil do cliente", customerProfile)}
						</Tabs.TabPane>
					</Tabs>
				</Form>
			</UIDrawerForm>
		);
	}
}

export default Show;
