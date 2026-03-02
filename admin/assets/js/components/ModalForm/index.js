import React, { Component, Fragment } from "react";
import * as PropTypes from "prop-types";
import { Button, Modal, Spin } from "antd";

class UIModalForm extends Component {
	static propTypes = {
		visible           : PropTypes.bool.isRequired,
		onClose           : PropTypes.func.isRequired,
		formId            : PropTypes.any,
		isLoading         : PropTypes.bool,
		isSending         : PropTypes.bool,
		width             : PropTypes.any,
		title             : PropTypes.any,
		showBtnSave       : PropTypes.bool,
		btnSaveText       : PropTypes.any,
		btnSaveTextSending: PropTypes.any,
		btnCancelText     : PropTypes.any,
		modalProps        : PropTypes.object,
	};

	static defaultProps = {
		isLoading         : false,
		isSending         : false,
		width             : 500,
		title             : "",
		showBtnSave       : true,
		btnSaveText       : "Salvar",
		btnSaveTextSending: "Salvando",
		btnCancelText     : "Cancelar",
		modalProps        : {},
	};

	render() {
		const {visible, formId, isLoading, isSending, width, title, showBtnSave, btnSaveTextSending, btnSaveText, btnCancelText, modalProps} = this.props;

		return (
			<Modal
				visible={visible}
				style={{top: 20}}
				className="modal-form"
				title={title}
				width={width}
				destroyOnClose={true}
				maskClosable={!isLoading && !isSending}
				closable={!isLoading && !isSending}
				keyboard={!isLoading && !isSending}
				onCancel={this.props.onClose}
				onClose={this.props.onClose}
				footer={(
					<Fragment>
						<Button className="btn-close" onClick={this.props.onClose} icon={<i className="far fa-times" />} disabled={isLoading || isSending}>{btnCancelText}</Button>
						{showBtnSave && <Button type="primary" form={formId} htmlType="submit" className="btn-save" icon={<i className="far fa-check" />} loading={isSending} disabled={isLoading}>{isSending ? btnSaveTextSending : btnSaveText}</Button>}
					</Fragment>
				)}
				{...modalProps}>
				{isLoading ? (
					<div className="text-center" style={{padding: 20}}>
						<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
					</div>
				) : this.props.children}
			</Modal>
		)
	}
}

export default UIModalForm;
