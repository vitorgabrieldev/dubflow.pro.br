import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Select, Switch } from "antd";

import { communitiesService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeSlugInput = (value = "") => value
	.toString()
	.toLowerCase()
	.normalize("NFD")
	.replace(/[\u0300-\u036f]/g, "")
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/-{2,}/g, "-");

const normalizeSlugSubmit = (value = "") => normalizeSlugInput(value).replace(/^-+|-+$/g, "");

const extractUploadFile = async (file, fallbackBaseName = "upload") => {
	if( !file ) return null;
	if( file instanceof File || file instanceof Blob ) return file;
	if( file.originFileObj && (file.originFileObj instanceof File || file.originFileObj instanceof Blob) ) {
		return file.originFileObj;
	}

	if( typeof file.url === "string" && /^blob:/i.test(file.url) ) {
		try {
			const response = await fetch(file.url);
			const blob = await response.blob();
			const extension = String(file.extension || "bin").toLowerCase();
			const normalizedExtension = extension === "jpg" ? "jpeg" : extension;
			const mimeFromFileType = file.fileType === "image" ? `image/${normalizedExtension}` : "application/octet-stream";
			const type = blob.type || mimeFromFileType;
			const fileName = `${fallbackBaseName}.${extension}`;

			return new File([blob], fileName, {type});
		} catch (error) {
			return null;
		}
	}

	return null;
};

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading: true,
			isSending: false,
			owners   : [],
			slugTouched: false,
		};

		this.isAutoSlugUpdate = false;
	}

	onOpen = () => {
		this.setState({isLoading: true, slugTouched: false});

		platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"})
		.then((response) => {
			this.setState({
				isLoading: false,
				owners   : response.data.data || [],
			}, () => {
				if( this.form ) {
					this.form.resetFields();
					this.form.setFieldsValue({
						is_public  : true,
						is_verified: false,
					});
				}

				if( this.avatarUpload ) this.avatarUpload.reset();
				if( this.coverUpload ) this.coverUpload.reset();
			});
		})
		.catch((data) => {
			Modal.error({ title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose() });
		});
	};

	onClose = () => this.props.onClose();

	onValuesChange = (changedValues, allValues) => {
		if( changedValues.hasOwnProperty("slug") ) {
			if( this.isAutoSlugUpdate ) {
				this.isAutoSlugUpdate = false;
				return;
			}

				this.setState({slugTouched: true});

				const normalized = normalizeSlugInput(changedValues.slug || "");
				if( normalized !== (changedValues.slug || "") && this.form ) {
					this.isAutoSlugUpdate = true;
					this.form.setFieldsValue({slug: normalized});
			}

			return;
		}

			if( changedValues.hasOwnProperty("name") && !this.state.slugTouched && this.form ) {
				const normalizedFromName = normalizeSlugInput(changedValues.name || "");
				if( (allValues.slug || "") !== normalizedFromName ) {
					this.isAutoSlugUpdate = true;
					this.form.setFieldsValue({slug: normalizedFromName});
			}
		}
	};

	onFinish = async (values) => {
		const payload = {
			...values,
			name      : (values.name || "").trim(),
			owner_uuid: values.owner_uuid || null,
		};

		if( payload.slug ) {
			payload.slug = normalizeSlugSubmit(payload.slug);
		}

		if( !payload.name || !payload.owner_uuid ) {
			Modal.error({
				title  : "Campos obrigatórios",
				content: "Preencha o nome e selecione o dono da comunidade para continuar.",
			});
			return;
		}

		const avatar = this.avatarUpload?.getFiles();
		const cover = this.coverUpload?.getFiles();

		if( avatar?.files?.length ) {
			const avatarFile = avatar.files[0];
			const avatarToUpload = await extractUploadFile(avatarFile, "community-avatar");
			if( avatarToUpload ) payload.avatar = avatarToUpload;
		}

		if( cover?.files?.length ) {
			const coverFile = cover.files[0];
			const coverToUpload = await extractUploadFile(coverFile, "community-cover");
			if( coverToUpload ) payload.cover = coverToUpload;
		}

		this.setState({isSending: true});

		communitiesService.create(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comunidade criada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(data) });
		});
	};

	render() {
		const {visible} = this.props;
		const {isLoading, isSending, owners} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title="Inserir nova comunidade">
				<Form
					ref={(el) => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					onValuesChange={this.onValuesChange}
					initialValues={{is_public: true, is_verified: false}}>
					<Form.Item name="owner_uuid" label="Dono da comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select
							showSearch
							optionFilterProp="children"
							placeholder="Selecione um usuário">
							{owners.filter((item) => !!item.uuid).map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> <Input /></Form.Item>
					<Form.Item
						name="slug"
						label="Slug"
						hasFeedback
						rules={[{pattern: slugPattern, message: "Use apenas letras minúsculas, números e hífen."}]}>
						<Input placeholder="slug-da-comunidade" />
					</Form.Item>
					<Form.Item name="website_url" label="Website"><Input placeholder="https://..." /></Form.Item>
					<Form.Item name="description" label="Descrição"><Input.TextArea rows={4} /></Form.Item>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<UIUpload
								ref={(el) => this.avatarUpload = el}
								label="Avatar da comunidade"
								labelError="avatar"
								maxFiles={1}
								maxFileSize={5}
								acceptedFiles={["jpg", "jpeg", "png", "webp"]}
								help="Imagem de perfil da comunidade."
							/>
						</Col>
						<Col xs={24} sm={12}>
							<UIUpload
								ref={(el) => this.coverUpload = el}
								label="Banner da comunidade"
								labelError="banner"
								maxFiles={1}
								maxFileSize={10}
								acceptedFiles={["jpg", "jpeg", "png", "webp"]}
								help="Imagem de capa exibida na comunidade."
							/>
						</Col>
					</Row>
					<Form.Item name="is_public" label="Pública" valuePropName="checked"><Switch /></Form.Item>
					<Form.Item name="is_verified" label="Verificada" valuePropName="checked"><Switch /></Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Create;
