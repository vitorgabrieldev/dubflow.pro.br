import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Input, message, Modal, Row, Select, Switch } from "antd";

import { communitiesService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeSlug = (value = "") => value
	.toString()
	.toLowerCase()
	.normalize("NFD")
	.replace(/[\u0300-\u036f]/g, "")
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/^-+|-+$/g, "")
	.replace(/-{2,}/g, "-");

class Edit extends Component {
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
			uuid     : 0,
			owners   : [],
			slugTouched: false,
		};

		this.isAutoSlugUpdate = false;
	}

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid, slugTouched: false});

		let item;

		communitiesService.show({uuid})
		.then((response) => {
			item = response.data.data;
			return platformUsersService.getAutocomplete({is_active: 1, orderBy: "name:asc"});
		})
		.then((response) => {
			this.setState({isLoading: false, owners: response.data.data || []}, () => {
				if( this.form ) {
					this.form.resetFields();
					this.form.setFieldsValue({
						owner_uuid : item.owner?.uuid || undefined,
						name       : item.name,
						slug       : item.slug,
						website_url: item.website_url,
						description: item.description,
						is_public  : item.is_public,
						is_verified: item.is_verified,
					});
				}

				if( this.avatarUpload ) {
					this.avatarUpload.reset();
					if( item.avatar ) {
						this.avatarUpload.setFiles([{uuid: `avatar-${uuid}`, url: item.avatar, type: "image/jpeg"}]);
					}
				}

				if( this.coverUpload ) {
					this.coverUpload.reset();
					if( item.cover ) {
						this.coverUpload.setFiles([{uuid: `cover-${uuid}`, url: item.cover, type: "image/jpeg"}]);
					}
				}
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

			const normalized = normalizeSlug(changedValues.slug || "");
			if( normalized !== (changedValues.slug || "") && this.form ) {
				this.isAutoSlugUpdate = true;
				this.form.setFieldsValue({slug: normalized});
			}

			return;
		}

		if( changedValues.hasOwnProperty("name") && !this.state.slugTouched && this.form ) {
			const normalizedFromName = normalizeSlug(changedValues.name || "");
			if( (allValues.slug || "") !== normalizedFromName ) {
				this.isAutoSlugUpdate = true;
				this.form.setFieldsValue({slug: normalizedFromName});
			}
		}
	};

	onFinish = (values) => {
		const payload = {
			uuid: this.state.uuid,
			...values,
			name      : (values.name || "").trim(),
			owner_uuid: values.owner_uuid || null,
		};

		if( payload.slug ) {
			payload.slug = normalizeSlug(payload.slug);
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

		if( avatar?.filesDeleted?.length ) payload.remove_avatar = true;
		if( cover?.filesDeleted?.length ) payload.remove_cover = true;

		if( avatar?.files?.length ) {
			const avatarFile = avatar.files[0];
			if( !avatarFile.uuid ) payload.avatar = avatarFile;
		}

		if( cover?.files?.length ) {
			const coverFile = cover.files[0];
			if( !coverFile.uuid ) payload.cover = coverFile;
		}

		this.setState({isSending: true});

		communitiesService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comunidade atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(data) });
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, owners} = this.state;

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar comunidade [${uuid}]`}>
				<Form
					ref={(el) => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					onValuesChange={this.onValuesChange}>
					<Form.Item name="owner_uuid" label="Dono da comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}> 
						<Select showSearch optionFilterProp="children" placeholder="Selecione um usuário">
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

export default Edit;
