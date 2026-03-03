import React, { Component } from "react";
import { Layout } from "antd";
import QueueAnim from "rc-queue-anim";

const {Content} = Layout;

class loginTemplate extends Component {
	render() {
		return (
			<Layout className="template-login">
				<Content className="site-content">
				<div className="site-content-logo">
					<img src="/admin/images/logos/logo-cor.png" className="login-brand-logo" alt="DubFlow" />
					</div>
					<QueueAnim className="site-content-inner">
						{this.props.children}
					</QueueAnim>
				</Content>
			</Layout>
		)
	}
}

export default loginTemplate;
