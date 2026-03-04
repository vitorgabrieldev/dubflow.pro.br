import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Alert, Button, Descriptions, Form, Modal, Tag } from "antd";
import moment from "moment";

import { postsAdminService } from "./../../redux/services";
import { UIDrawerForm } from "./../../components";

class Show extends Component {
	static propTypes = {
		visible: PropTypes.bool.isRequired,
		onClose: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);
		this.state = {
			isLoading: true,
			id: 0,
			item: {},
		};
	}

	onOpen = (id) => {
		this.setState({isLoading: true, id, item: {}});
		postsAdminService.show({id})
			.then((response) => this.setState({isLoading: false, item: response.data.data || {}}))
			.catch((data) => Modal.error({title: "Ocorreu um erro!", content: String(data), onOk: () => this.onClose()}));
	};

	onClose = () => this.props.onClose();

	render() {
		const {visible} = this.props;
		const {id, isLoading, item} = this.state;
		const previewUrl = item.site_preview_url || item.site_url;
		const authorName = item.author?.stage_name || item.author?.name || "-";
		const visibilityLabel = item.visibility === "public" ? "Público" : item.visibility === "private" ? "Privado" : "Não listado";

		return (
			<UIDrawerForm
				visible={visible}
				width={1320}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar publicação [${id}]`}>
				<Form layout="vertical">
					<Descriptions bordered column={2} size="small">
						<Descriptions.Item label="Título" span={2}>{item.title || "-"}</Descriptions.Item>
						<Descriptions.Item label="Comunidade">{item.organization?.name || "-"}</Descriptions.Item>
						<Descriptions.Item label="Autor">{authorName}</Descriptions.Item>
						<Descriptions.Item label="Status">
							<Tag color={item.is_published ? "#0acf97" : "#fa5c7c"}>{item.is_published ? "Publicado" : "Rascunho"}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label="Visibilidade">
							<Tag color={item.visibility === "public" ? "#39afd1" : item.visibility === "private" ? "#6c757d" : "#f7b84b"}>{visibilityLabel}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label="Curtidas">{item.likes_count || 0}</Descriptions.Item>
						<Descriptions.Item label="Comentários">{item.comments_count || 0}</Descriptions.Item>
						<Descriptions.Item label="Visualizações">{item.views_count || 0}</Descriptions.Item>
						<Descriptions.Item label="Duração">{item.duration_seconds || 0}s</Descriptions.Item>
						<Descriptions.Item label="Publicado em">{item.published_at ? moment(item.published_at).format("DD/MM/YYYY HH:mm") : "-"}</Descriptions.Item>
						<Descriptions.Item label="Criado em">{item.created_at ? moment(item.created_at).format("DD/MM/YYYY HH:mm") : "-"}</Descriptions.Item>
					</Descriptions>

					<Form.Item style={{marginTop: 16, marginBottom: 8}}>
						<div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8}}>
							<div style={{fontWeight: 600}}>Renderização oficial do site</div>
							{previewUrl && (
								<Button type="primary" ghost href={previewUrl} target="_blank" rel="noopener noreferrer" icon={<i className="fal fa-external-link-square-alt" />}>
									Abrir em nova aba
								</Button>
							)}
						</div>
					</Form.Item>

					{previewUrl ? (
						<div style={{border: "1px solid #e8eaef", borderRadius: 8, overflow: "hidden", background: "#fff"}}>
							<iframe
								title={`preview-post-${id}`}
								src={previewUrl}
								style={{width: "100%", minHeight: "70vh", border: "none"}}
							/>
						</div>
					) : (
						<Alert
							type="warning"
							showIcon
							message="Prévia indisponível"
							description="Não foi possível gerar a URL de visualização desta publicação."
						/>
					)}
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;

