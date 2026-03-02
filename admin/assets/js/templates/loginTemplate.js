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
						<img src="images/logos/logo.svg" width={200} height={300} alt="" />
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
