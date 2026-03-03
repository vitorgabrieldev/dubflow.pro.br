import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Checkbox, Empty, Form, Input, InputNumber, message, Modal, Select, Spin, Switch, Tabs } from "antd";

import {
	documentTypesService,
	serviceCategoriesService,
	servicesService,
	serviceTypesService,
} from "./../../redux/services";

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
			isLoading           : true,
			isSending           : false,
			serviceCategories   : [],
			serviceTypes        : [],
			documentTypes       : [],
			selectedDocumentTypes: [],
			documentTypesSearch : "",
		};
	}

	getOptionValue = (item) => {
		if( !item ) return null;
		return item.uuid ?? item.id ?? null;
	};

	getDocumentTypeValue = (item) => {
		if( !item ) return null;
		return item.uuid ?? item.id ?? null;
	};

	getOptionLabel = (item) => {
		if( !item ) return "N/A";
		return item.title || item.name || "N/A";
	};

	formatPriceMask = (value) => {
		if( value === null || typeof value === "undefined" || value === "" ) return "";

		const digits = String(value).replace(/\D/g, "");
		if( !digits.length ) return "";

		const numberValue = Number(digits) / 100;

		return `R$ ${numberValue.toLocaleString("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	};

	parsePriceMask = (value) => {
		if( value === null || typeof value === "undefined" ) return "";

		const digits = String(value).replace(/\D/g, "");
		if( !digits.length ) return "";

		return (Number(digits) / 100).toFixed(2);
	};

	loadLookups = () => {
		this.setState({
			isLoading: true,
		});

		Promise.all([
			serviceCategoriesService.autocomplete(),
			serviceTypesService.autocomplete(),
			documentTypesService.autocomplete(),
		])
		.then(([categoriesResponse, typesResponse, documentTypesResponse]) => {
			this.setState({
				isLoading        : false,
				serviceCategories: categoriesResponse?.data?.data || [],
				serviceTypes     : typesResponse?.data?.data || [],
				documentTypes    : documentTypesResponse?.data?.data || [],
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

	onOpen = () => {
		this.resetFields();
		this.loadLookups();
	};

	resetFields = () => {
		this.form && this.form.resetFields();

		this.setState({
			selectedDocumentTypes: [],
			documentTypesSearch : "",
		});
	};

	onClose = () => {
		this.resetFields();

		this.props.onClose();
	};

	onFinish = (values) => {
		const {selectedDocumentTypes} = this.state;

		this.setState({
			isSending: true,
		});

		const data = {
			...values,
		};

		if( data.price !== null && typeof data.price !== "undefined" && data.price !== "" )
		{
			data.price = Number(data.price);
		}

		if( selectedDocumentTypes.length )
		{
			data.document_type_ids = selectedDocumentTypes.map((item) => String(item));
		}

		servicesService.create(data)
		.then(() => {
			this.setState({
				isSending: false,
			});

			this.resetFields();

			message.success("Registro cadastrado com sucesso.");

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

	getFilteredDocumentTypes = () => {
		const {documentTypes, documentTypesSearch} = this.state;
		const search = String(documentTypesSearch || "").trim().toLowerCase();

		if( !search.length ) return documentTypes;

		return documentTypes.filter((item) => this.getOptionLabel(item).toLowerCase().indexOf(search) >= 0);
	};

	getDocumentTypeValues = (items) => {
		return (items || [])
			.map((item) => this.getDocumentTypeValue(item))
			.filter((value) => value !== null && typeof value !== "undefined");
	};

	isDocumentTypeSelected = (value) => {
		return this.state.selectedDocumentTypes.some((selected) => String(selected) === String(value));
	};

	toggleDocumentType = (value, checked) => {
		this.setState((state) => {
			const exists = state.selectedDocumentTypes.some((selected) => String(selected) === String(value));

			if( checked && !exists )
			{
				return {
					selectedDocumentTypes: [...state.selectedDocumentTypes, value],
				};
			}

			if( !checked && exists )
			{
				return {
					selectedDocumentTypes: state.selectedDocumentTypes.filter((selected) => String(selected) !== String(value)),
				};
			}

			return null;
		});
	};

	toggleSelectAllDocumentTypes = (checked) => {
		const filteredValues = this.getDocumentTypeValues(this.getFilteredDocumentTypes());

		this.setState({
			selectedDocumentTypes: checked
				? Array.from(new Set([...this.state.selectedDocumentTypes, ...filteredValues]))
				: this.state.selectedDocumentTypes.filter((selected) => !filteredValues.some((value) => String(value) === String(selected))),
		});
	};

	renderDocumentTypesSelector = () => {
		const {selectedDocumentTypes, documentTypesSearch, documentTypes} = this.state;
		const filteredDocumentTypes = this.getFilteredDocumentTypes();
		const filteredValues = this.getDocumentTypeValues(filteredDocumentTypes);
		const filteredSelectedCount = filteredValues.filter((value) => this.isDocumentTypeSelected(value)).length;
		const allFilteredSelected = filteredValues.length > 0 && filteredSelectedCount === filteredValues.length;
		const someFilteredSelected = filteredSelectedCount > 0 && !allFilteredSelected;

		return (
			<div>
				<div style={{display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap"}}>
					<Input
						value={documentTypesSearch}
						onChange={(e) => this.setState({documentTypesSearch: e.target.value})}
						placeholder="Filtrar tipos de documento"
						style={{flex: 1, minWidth: 220}}
					/>
					<div style={{color: "#667085"}}>
						Selecionados: <strong>{selectedDocumentTypes.length}</strong> / {documentTypes.length}
					</div>
				</div>

				<div style={{border: "1px solid #e8e8e8", borderRadius: 8, padding: 12, background: "#fafafa", minHeight: 160}}>
					{filteredDocumentTypes.length ? (
						<div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8}}>
							<div style={{border: "1px solid #d6e4ff", borderRadius: 8, background: "#f5f9ff", padding: "10px 12px"}}>
								<Checkbox
									checked={allFilteredSelected}
									indeterminate={someFilteredSelected}
									onChange={(e) => this.toggleSelectAllDocumentTypes(e.target.checked)}>
									Selecionar todos
								</Checkbox>
							</div>
							{filteredDocumentTypes.map((item, index) => {
								const value = this.getDocumentTypeValue(item);
								if( value === null ) return null;

								return (
									<div key={item.uuid || value || index} style={{border: "1px solid #ededed", borderRadius: 8, background: "#fff", padding: "10px 12px"}}>
										<Checkbox
											checked={this.isDocumentTypeSelected(value)}
											onChange={(e) => this.toggleDocumentType(value, e.target.checked)}>
											{this.getOptionLabel(item)}
										</Checkbox>
									</div>
								);
							})}
						</div>
					) : (
						<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum tipo de documento encontrado" />
					)}
				</div>
			</div>
		);
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, serviceCategories, serviceTypes} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={720}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Incluir registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					initialValues={{
						is_active: true,
					}}>
					<Tabs defaultActiveKey="general">
						<Tabs.TabPane forceRender tab="Informações gerais" key="general">
							<Form.Item
								name="service_category_id"
								label="Categoria do serviço"
								hasFeedback
								rules={[{required: true, message: "Campo obrigatório."}]}>
								<Select
									allowClear
									showSearch
									placeholder="Selecione a categoria"
									optionFilterProp="children"
									filterOption={(input, option) => {
										const label = typeof option.children === "string" ? option.children : "";
										return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
									}}
									notFoundContent={isLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}>
									{serviceCategories.map((item, index) => {
										const value = this.getOptionValue(item);
										if( value === null ) return null;

										return <Select.Option key={item.uuid || value || index} value={value}>{this.getOptionLabel(item)}</Select.Option>;
									})}
								</Select>
							</Form.Item>

							<Form.Item
								name="service_type_id"
								label="Tipo do serviço"
								hasFeedback
								rules={[{required: true, message: "Campo obrigatório."}]}>
								<Select
									allowClear
									showSearch
									placeholder="Selecione o tipo"
									optionFilterProp="children"
									filterOption={(input, option) => {
										const label = typeof option.children === "string" ? option.children : "";
										return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
									}}
									notFoundContent={isLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}>
									{serviceTypes.map((item, index) => {
										const value = this.getOptionValue(item);
										if( value === null ) return null;

										return <Select.Option key={item.uuid || value || index} value={value}>{this.getOptionLabel(item)}</Select.Option>;
									})}
								</Select>
							</Form.Item>

							<Form.Item name="name" label="Nome do serviço" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
								<Input maxLength={191} />
							</Form.Item>

							<Form.Item name="price" label="Valor" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
								<InputNumber
									min={0}
									step={0.01}
									precision={2}
									style={{width: "100%"}}
									formatter={this.formatPriceMask}
									parser={this.parsePriceMask}
								/>
							</Form.Item>

							<Form.Item name="is_active" label="Ativo" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Tabs.TabPane>

						<Tabs.TabPane forceRender tab="Documentos necessários" key="documents">
							{this.renderDocumentTypesSelector()}
						</Tabs.TabPane>
					</Tabs>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
