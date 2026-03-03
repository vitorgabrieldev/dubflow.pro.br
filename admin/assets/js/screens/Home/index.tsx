import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { Card, Col, Modal, Row, Spin } from "antd";
import QueueAnim from "rc-queue-anim";

import moment from "moment";

import { dashboardService } from "./../../redux/services";

class Home extends Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading          : true,
			users_total        : 0,
			roles_total        : 0,
			logs_total         : 0,
			system_logs_total  : 0,
			platform_users_total: 0,
			communities_total   : 0,
			playlists_total     : 0,
			opportunities_total : 0,
			comments_total      : 0,
			notifications_total : 0,
		};
	}

	componentDidMount() {
		this.fetchGetAll();
	};

	fetchGetAll = () => {
		this.setState({
			isLoading: true,
		});

		dashboardService.getAll()
		.then((response) => {
			const data = response.data.data || {};

			this.setState({
				isLoading        : false,
				users_total      : data.users_total || 0,
				roles_total      : data.roles_total || 0,
				logs_total       : data.logs_total || 0,
				system_logs_total: data.system_logs_total || 0,
				platform_users_total: data.platform_users_total || 0,
				communities_total   : data.communities_total || 0,
				playlists_total     : data.playlists_total || 0,
				opportunities_total : data.opportunities_total || 0,
				comments_total      : data.comments_total || 0,
				notifications_total : data.notifications_total || 0,
			});
		})
		.catch((data) => {
			this.setState({
				isLoading: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	goTo = (path) => {
		if( !path ) return null;
		this.props.history.push(path);
	};

	greeting = () => {
		const hour = moment().hour();
		let day    = "Bom dia";

		if( hour >= 19 )
		{
			day = "Boa noite";
		}
		else if( hour >= 12 )
		{
			day = "Boa tarde";
		}

		return `Olá ${this.props.user.name}, ${day}!`;
	};

	render() {
		const {isLoading} = this.state;
		const cards       = [
			{
				title     : "Usuários administradores",
				value     : this.state.users_total,
				icon      : "fad fa-users-cog",
				path      : "/administrator/users",
				permission: "users.list",
			},
			{
				title     : "Papéis",
				value     : this.state.roles_total,
				icon      : "fad fa-user-shield",
				path      : "/administrator/roles-and-permissions",
				permission: "roles.list",
			},
			{
				title     : "Registros de alterações",
				value     : this.state.logs_total,
				icon      : "fad fa-clipboard-list-check",
				path      : "/administrator/logs",
				permission: "log.list",
			},
			{
				title     : "Registros de erros",
				value     : this.state.system_logs_total,
				icon      : "fad fa-bug",
				path      : "/administrator/system-log",
				permission: "system-log.list",
			},
			{
				title     : "Usuários da plataforma",
				value     : this.state.platform_users_total,
				icon      : "fad fa-users",
				path      : "/administrator/platform-users",
				permission: "platform-users.list",
			},
			{
				title     : "Comunidades",
				value     : this.state.communities_total,
				icon      : "fad fa-users-class",
				path      : "/administrator/communities",
				permission: "communities.list",
			},
			{
				title     : "Playlists",
				value     : this.state.playlists_total,
				icon      : "fad fa-list-music",
				path      : "/administrator/playlists",
				permission: "playlists.list",
			},
			{
				title     : "Oportunidades",
				value     : this.state.opportunities_total,
				icon      : "fad fa-microphone-stand",
				path      : "/administrator/opportunities",
				permission: "opportunities.list",
			},
			{
				title     : "Comentários",
				value     : this.state.comments_total,
				icon      : "fad fa-comments",
				path      : "/administrator/comments",
				permission: "comments.list",
			},
			{
				title     : "Notificações",
				value     : this.state.notifications_total,
				icon      : "fad fa-bell",
				path      : "/administrator/notifications",
				permission: "notifications.list",
			},
		].filter(card => this.props.permissions.includes(card.permission));

		return (
			<QueueAnim className="site-content-inner page-home">
				<div className="page-content" key="1">
					<h1 className="page-title">{this.greeting()}</h1>
					{isLoading ? (
						<div className="text-center">
							<Spin indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />} />
						</div>
					) : (
						<Fragment>
							<div className="cards">
								<Row gutter={16}>
									{cards.map((card) => (
										<Col key={card.title} xs={24} sm={12} lg={8} xxl={6}>
											<Card
												hoverable={!!card.path}
												className={card.path ? "dashboard-card-link" : ""}
												onClick={card.path ? () => this.goTo(card.path) : undefined}>
												<h3>{card.title}</h3>
												<div className="value">{card.value}</div>
												<i className={card.icon} />
											</Card>
										</Col>
									))}
								</Row>
							</div>
						</Fragment>
					)}
				</div>
			</QueueAnim>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		user       : state.auth.userData,
		permissions: state.auth.userData.permissions,
	};
};

export default connect(mapStateToProps)(Home);
