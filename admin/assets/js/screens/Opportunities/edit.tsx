import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { DatePicker, Form, Input, message, Modal, Select } from "antd";
import moment from "moment";

import { communitiesService, opportunitiesService, platformUsersService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";
import { OPPORTUNITY_STATUS_OPTIONS, OPPORTUNITY_VISIBILITY_OPTIONS } from "./../../config/opportunities";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading   : true,
			isSending   : false,
			uuid        : 0,
			communities : [],
			users       : [],
			selectedItem: null,
		};

		this.form = null;
		this.pendingFormValues = null;
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

	mergeOptionsByKey = (options = [], selected = null, key = "id") => {
		const map = new Map();

		(options || []).forEach((item) => {
			if( item && item[key] !== undefined && item[key] !== null ) {
				map.set(item[key], item);
			}
		});

		if( selected && selected[key] !== undefined && selected[key] !== null ) {
			map.set(selected[key], selected);
		}

		return Array.from(map.values());
	};

	onOpen = (uuid) => {
		this.setState({isLoading: true, uuid});
		let item;

		Promise.all([
			opportunitiesService.show({uuid}).then((response) => {
				item = response.data.data;
			}),
			communitiesService.getAutocomplete({orderBy: "name:asc", with_deleted: true}),
			platformUsersService.getAutocomplete({orderBy: "name:asc"}),
		]).then(([, communitiesResponse, usersResponse]) => {
			const selectedCommunity = item.organization ? {
				id  : item.organization.id,
				name: item.organization.name,
			} : null;

			const selectedCreator = item.creator ? {
				uuid : item.creator.uuid,
				name : item.creator.name,
				email: item.creator.email,
			} : null;

			const communities = this.mergeOptionsByKey(communitiesResponse.data.data || [], selectedCommunity, "id");
			const users = this.mergeOptionsByKey(usersResponse.data.data || [], selectedCreator, "uuid");

			this.setState({
				isLoading   : false,
				communities,
				users,
				selectedItem: item,
			}, () => {
				this.applyFormValues({
					organization_id      : item.organization_id || item.organization?.id,
					created_by_user_uuid : item.creator?.uuid || undefined,
					title                : item.title || "",
					description          : item.description || "",
					status               : item.status || "draft",
					visibility           : item.visibility || "external",
					starts_at            : item.starts_at ? moment(item.starts_at) : null,
					ends_at              : item.ends_at ? moment(item.ends_at) : null,
					results_release_at   : item.results_release_at ? moment(item.results_release_at) : null,
				});
			});
		}).catch((error) => {
			Modal.error({title: "Ocorreu um erro!", content: String(error), onOk: () => this.onClose()});
		});
	};

	onClose = () => this.props.onClose();

	normalizePayload = (values) => {
		return {
			uuid: this.state.uuid,
			...values,
			starts_at         : values.starts_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			ends_at           : values.ends_at.format("YYYY-MM-DDTHH:mm:ssZ"),
			results_release_at: values.results_release_at.format("YYYY-MM-DDTHH:mm:ssZ"),
		};
	};

	onFinish = (values) => {
		this.setState({isSending: true});
		opportunitiesService.edit(this.normalizePayload(values))
		.then(() => {
			this.setState({isSending: false});
			message.success("Oportunidade atualizada com sucesso.");
			this.props.onComplete();
		})
		.catch((error) => {
			this.setState({isSending: false});
			Modal.error({title: "Ocorreu um erro!", content: String(error)});
		});
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, isSending, communities, users} = this.state;

		return (
			<UIDrawerForm visible={visible} width={600} onClose={this.onClose} isLoading={isLoading} isSending={isSending} formId={formId} title={`Editar oportunidade [${uuid}]`}>
				<Form ref={this.setFormRef} id={formId} layout="vertical" scrollToFirstError onFinish={this.onFinish}>
					<Form.Item name="organization_id" label="Comunidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select showSearch optionFilterProp="children" placeholder="Selecione uma comunidade">
							{communities.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="created_by_user_uuid" label="Criador" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select showSearch optionFilterProp="children" placeholder="Selecione o usuário criador">
							{users.map((item) => <Select.Option key={item.uuid} value={item.uuid}>{item.name} ({item.email})</Select.Option>)}
						</Select>
					</Form.Item>
					<Form.Item name="title" label="Título" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input />
					</Form.Item>
					<Form.Item name="description" label="Descrição"><Input.TextArea rows={4} /></Form.Item>
					<Form.Item name="status" label="Status" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select>
							{OPPORTUNITY_STATUS_OPTIONS.map((status) => (
								<Select.Option key={status.value} value={status.value}>{status.label}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="visibility" label="Visibilidade" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select>
							{OPPORTUNITY_VISIBILITY_OPTIONS.map((visibility) => (
								<Select.Option key={visibility.value} value={visibility.value}>{visibility.label}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="starts_at" label="Início" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" />
					</Form.Item>
					<Form.Item name="ends_at" label="Fim" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" />
					</Form.Item>
					<Form.Item name="results_release_at" label="Liberação de resultados" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<DatePicker showTime style={{width: "100%"}} format="DD/MM/YYYY HH:mm" />
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
