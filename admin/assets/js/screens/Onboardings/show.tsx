import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Col, Form, Modal, Row, Switch } from "antd";

import moment from "moment";

import { onboardingService } from "./../../redux/services";

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

	getImageUrl = (item) => {
		return item?.image || item?.file || item?.icon || item?.avatar || null;
	};

	getTitle = (item) => item?.title || item?.frase || "N/A";

	getPhrase = (item) => item?.phrase || item?.frase2 || "N/A";

	onOpen = (uuid) => {
		this.setState({
			...this.stateClean,
			uuid,
		});

		onboardingService.show({uuid})
		.then((response) => {
			const item = response?.data?.data || {};

			this.setState({
				isLoading: false,
				item     : item,
			}, () => {
				const imageUrl = this.getImageUrl(item);
				if( this.upload )
				{
					this.upload.reset();

					if( imageUrl )
					{
						this.upload.setFiles([{
							uuid: item.uuid,
							url : imageUrl,
							type: "image/*",
						}]);
					}
				}
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
		this.upload && this.upload.reset();
		this.props.onClose();
	};

	render() {
		const {visible} = this.props;
		const {uuid, isLoading, item} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				showBtnSave={false}
				title={`Visualizar registro [${uuid}]`}>
				<Form layout="vertical">
					<UIUpload
						ref={el => this.upload = el}
						label="Imagem"
						disabled
						acceptedFiles={["png", "jpg", "jpeg", "webp"]}
					/>

					<Form.Item label="Título">
						{this.getTitle(item)}
					</Form.Item>

					<Form.Item label="Frase">
						{this.getPhrase(item)}
					</Form.Item>

					<Form.Item label="Ordem">
						{typeof item?.order === "undefined" || item?.order === null ? "N/A" : item.order}
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
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Show;
