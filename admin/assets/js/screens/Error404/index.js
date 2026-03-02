import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Button, Layout } from "antd";
import QueueAnim from "rc-queue-anim";

const {Content} = Layout;

class Error404 extends Component {
	renderContent = () => (
		<QueueAnim className="site-content-inner page-404">
			<div className="page-content" key="1">
				<figure className="icon">
					<img src="images/404.svg" />
				</figure>
				<h1>Página não encontrada!</h1>
				<p>O conteúdo que você solicitou não foi encontrado em nossos servidores.</p>
				<Link to="/">
					<Button type="primary" size="large">Voltar para o Início</Button>
				</Link>
			</div>
		</QueueAnim>
	);

	renderContentPublic = () => (
		<Layout className="page-error-404 page-error-404-public">
			<Content className="site-content">
				<QueueAnim className="site-content-inner">
					{this.renderContent()}
				</QueueAnim>
			</Content>
		</Layout>
	);

	renderContentLoggedIn = () => this.renderContent();

	render() {
		return this.props.isAuthenticated ? this.renderContentLoggedIn() : this.renderContentPublic()
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		isAuthenticated: state.auth.isAuthenticated,
	};
};

export default connect(mapStateToProps)(Error404);
