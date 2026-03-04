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

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading    : true,
			isSending    : false,
			uuid         : 0,
			owners       : [],
			ownersLoading: false,
			selectedOwner: null,
			slugTouched  : false,
		};

		this.form = null;
		this.pendingFormValues = null;
		this.isAutoSlugUpdate = false;
		this.ownerSearchTimeout = null;
	}

	componentWillUnmount() {
		if( this.ownerSearchTimeout ) {
			clearTimeout(this.ownerSearchTimeout);
		}
	}

	setFormRef = (formRef) => {
		this.form = formRef;

		if( this.form?.setFieldsValue && this.pendingFormValues ) {
			this.form.setFieldsValue(this.pendingFormValues);
			this.pendingFormValues = null;
		}
	};

	applyFormValues = (values) => {
		if( this.form?.setFieldsValue ) {
			this.form.setFieldsValue(values);
			return;
		}

		this.pendingFormValues = values;

		window.requestAnimationFrame(() => {
			if( this.form?.setFieldsValue && this.pendingFormValues ) {
				this.form.setFieldsValue(this.pendingFormValues);
				this.pendingFormValues = null;
			}
		});
	};

	normalizeOwner = (owner) => {
		const ownerUuid = owner?.uuid || (owner?.id ? String(owner.id) : null);
		if( !ownerUuid ) return null;

		return {
			uuid : ownerUuid,
			name : owner.name || "Sem nome",
			email: owner.email || "sem-email",
		};
	};

	mergeOwners = (owners = [], selectedOwner = null) => {
		const map = new Map();
		const normalizedSelectedOwner = this.normalizeOwner(selectedOwner);

		if( normalizedSelectedOwner?.uuid ) {
			map.set(normalizedSelectedOwner.uuid, normalizedSelectedOwner);
		}

		owners.forEach((owner) => {
			const normalizedOwner = this.normalizeOwner(owner);
			if( normalizedOwner?.uuid ) {
				map.set(normalizedOwner.uuid, normalizedOwner);
			}
		});

		return Array.from(map.values());
	};

	fetchOwners = (search = "", selectedOwner = null) => {
		this.setState({ownersLoading: true});

		return platformUsersService.getAutocomplete({
			is_active: 1,
			orderBy  : "name:asc",
			search,
		})
		.then((response) => {
			const owners = response.data.data || [];

			this.setState((state) => ({
				ownersLoading: false,
				owners: this.mergeOwners(owners, selectedOwner || state.selectedOwner),
			}));
		})
		.catch(() => {
			this.setState((state) => ({
				ownersLoading: false,
				owners: this.mergeOwners([], selectedOwner || state.selectedOwner),
			}));
		});
	};

	onOpen = (uuid) => {
		this.setState({
			isLoading    : true,
			uuid,
			owners       : [],
			selectedOwner: null,
			slugTouched  : false,
		});

		communitiesService.show({uuid})
		.then((response) => {
			const item = response.data.data;
			return this.fetchOwners("", item.owner || null).then(() => item);
		})
		.then((item) => {
			const normalizedOwner = this.normalizeOwner(item.owner);
			const values = {
				owner_uuid : normalizedOwner?.uuid || undefined,
				name       : item.name || "",
				slug       : item.slug || "",
				website_url: item.website_url || "",
				description: item.description || "",
				is_public  : !!item.is_public,
				is_verified: !!item.is_verified,
			};

			this.setState({
				isLoading    : false,
				selectedOwner: normalizedOwner,
			}, () => {
				this.form?.resetFields();
				this.applyFormValues(values);

				if( this.avatarUpload ) {
					this.avatarUpload.reset();
					if( item.avatar ) {
						this.avatarUpload.setFiles([{uuid: `avatar-${item.uuid || uuid}`, url: item.avatar, type: "image/jpeg"}]);
					}
				}

				if( this.coverUpload ) {
					this.coverUpload.reset();
					if( item.cover ) {
						this.coverUpload.setFiles([{uuid: `cover-${item.uuid || uuid}`, url: item.cover, type: "image/jpeg"}]);
					}
				}
			});
		})
		.catch((error) => {
			Modal.error({ title: "Ocorreu um erro!", content: String(error), onOk: () => this.onClose() });
		});
	};

	onClose = () => this.props.onClose();

	onOwnerSearch = (value) => {
		if( this.ownerSearchTimeout ) {
			clearTimeout(this.ownerSearchTimeout);
		}

		this.ownerSearchTimeout = setTimeout(() => {
			this.fetchOwners(value || "");
		}, 250);
	};

	onOwnerChange = (value) => {
		const selected = this.state.owners.find((item) => item.uuid === value) || null;
		this.setState({selectedOwner: selected});
	};

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
			uuid: this.state.uuid,
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

		if( avatar?.filesDeleted?.length ) payload.remove_avatar = true;
		if( cover?.filesDeleted?.length ) payload.remove_cover = true;

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

		communitiesService.edit(payload)
		.then(() => {
			this.setState({isSending: false});
			message.success("Comunidade atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((error) => {
			this.setState({isSending: false});
			Modal.error({ title: "Ocorreu um erro!", content: String(error) });
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, owners, ownersLoading, selectedOwner} = this.state;
		const ownerOptions = this.mergeOwners(owners, selectedOwner);

		return (
			<UIDrawerForm visible={visible} width={560} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar comunidade [${uuid}]`}>
				<Form
					ref={this.setFormRef}
					id={formId}
					key={`community-edit-form-${uuid}`}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					onValuesChange={this.onValuesChange}>
					<Form.Item name="owner_uuid" label="Dono da comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							showSearch
							filterOption={false}
							placeholder="Selecione um usuário"
							onSearch={this.onOwnerSearch}
							onChange={this.onOwnerChange}
							onDropdownVisibleChange={(open) => {
								if( open && !ownerOptions.length ) {
									this.fetchOwners("");
								}
							}}
							loading={ownersLoading}
							notFoundContent={ownersLoading ? "Buscando..." : "Nenhum usuário encontrado"}>
							{ownerOptions.filter((item) => !!item.uuid).map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input />
					</Form.Item>
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
