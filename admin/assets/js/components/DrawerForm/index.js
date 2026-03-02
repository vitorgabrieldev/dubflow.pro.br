import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Button, Drawer, Spin } from "antd";

class UIDrawerForm extends Component {
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
		drawerProps       : PropTypes.object,
		disabledBtn		  : PropTypes.bool,
	};

	static defaultProps = {
		isLoading         : false,
		isSending         : false,
		disabledBtn 	  : false,
		width             : 500,
		title             : "",
		showBtnSave       : true,
		btnSaveText       : "Salvar",
		btnSaveTextSending: "Salvando",
		drawerProps       : {},
	};

	render() {
		const {visible, formId, isLoading, isSending, width, title, showBtnSave, btnSaveTextSending, btnSaveText, drawerProps, disabledBtn} = this.props;

		return (
			<Drawer
				visible={visible}
				className="drawer-form"
				width={width}
				destroyOnClose={true}
				maskClosable={!isLoading && !isSending}
				closable={false}
				keyboard={!isLoading && !isSending}
				placement="right"
				onClose={this.props.onClose}
				{...drawerProps}>
				<div className="drawer-form-inner">
					<div className="drawer-form-header">
						<Button className="btn-close" onClick={this.props.onClose} icon={<i className="far fa-times" />} disabled={disabledBtn || isLoading || isSending} />
						<div className="ant-drawer-title">{title}</div>
						{showBtnSave && <Button type="primary" form={formId} htmlType="submit" className="btn-save" icon={<i className="far fa-check" />} loading={isSending} disabled={disabledBtn || isLoading}>{isSending ? btnSaveTextSending : btnSaveText}</Button>}
					</div>
					<div className="drawer-form-body">
						{isLoading ? (
							<div className="text-center" style={{padding: 20}}>
								<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
							</div>
						) : (
							<div className="drawer-form-body-inner">
								{this.props.children}
							</div>
						)}
					</div>
				</div>
			</Drawer>
		)
	}
}

export default UIDrawerForm;
