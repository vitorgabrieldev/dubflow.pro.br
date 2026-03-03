import React, { Component } from "react";
import { connect } from "react-redux";
import { Col, Form, Input, message, Modal, Progress, Row, Tag, Upload } from "antd";
import QueueAnim from "rc-queue-anim";

import { API_URL } from "./../../config/general";

import { authActions } from "./../../redux/actions";

/**
 * Before upload avatar
 *
 * @param file
 * @returns {boolean}
 */
function avatarBeforeUpload(file) {
	if( file.type !== "image/jpeg" && file.type !== "image/png" )
	{
		message.error("Somente são aceitos arquivos JPG e PNG!");
	}

	const isLt2M = file.size / 1024 / 1024 < 2;

	if( !isLt2M )
	{
		message.error("A imagem não pode ultrapassar o tamanho de 2MB!");
	}

	return isLt2M;
}

class Account extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isSendingAvatar: false,
			avatarPercent  : 0,
		};
	}

	avatarHandleChange = (info) => {
		if( info.file.status === "uploading" )
		{
			this.setState({
				isSendingAvatar: true,
				avatarPercent  : Math.round(info.file.percent),
			});

			return;
		}

		this.setState({
			isSendingAvatar: false,
		});

		if( info.file.status === "done" )
		{
			// Do update avatar
			this.props.doUpdateAvatar(info.file.response.file_url);
		}
		else if( info.file.status === "error" )
		{
			Modal.error({
				title  : "Ocorreu um erro no upload!",
				content: info.file.response.message,
			});
		}
	};

	renderAvatar = () => {
		const imageUrl = this.props.user.avatar;

		return (
			<Upload
				name="avatar"
				listType="picture-card"
				className={`avatar-uploader ${this.state.isSendingAvatar ? "is-sending" : "not-sending"}`}
				showUploadList={false}
				action={API_URL + "auth/change-avatar"}
				headers={{
					Accept       : "application/json",
					Language     : "pt",
					Authorization: this.props.access_token,
				}}
				beforeUpload={avatarBeforeUpload}
				onChange={this.avatarHandleChange}>
				{imageUrl ? (
					<img src={imageUrl} alt="avatar" />
				) : (
					<div>
						<i className="far fa-plus" />
						<div className="ant-upload-text">Selecionar</div>
					</div>
				)}
				<Progress type="circle" percent={this.state.avatarPercent} width={168} />
			</Upload>
		);
	};

	render() {
		const {user} = this.props;

		return (
			<QueueAnim className="site-content-inner page-account">
				<div className="page-content" key="1">
					<h1 className="page-title">Meus dados</h1>
					<Form
						ref={el => this.form = el}
						layout="vertical"
						scrollToFirstError
						initialValues={{
							name : user.name,
							email: user.email,
						}}>
						<div className="avatar">
							<h4>Avatar</h4>
							{this.renderAvatar()}
						</div>
						<Row gutter={16}>
							<Col xs={24} sm={12} lg={8}>
								<Form.Item name="name" label="Nome">
									<Input disabled />
								</Form.Item>
							</Col>
							<Col xs={24} sm={12} lg={8}>
								<Form.Item name="email" label="E-mail">
									<Input disabled />
								</Form.Item>
							</Col>
						</Row>
						<div className="roles">
							<h5>Papéis</h5>
							{user.roles.map((role, i) => {
								return (
									<Tag key={i}>{role.name}</Tag>
								);
							})}
						</div>
					</Form>
				</div>
			</QueueAnim>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		access_token: state.auth.access_token,
		user        : state.auth.userData,
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		doUpdateAvatar: (avatar) => {
			dispatch(authActions.updateAvatar(avatar));
		}
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(Account);
