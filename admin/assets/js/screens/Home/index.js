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
			isLoading                   : true,
			despachante_active_total    : 0,
			despachante_inactive_total  : 0,
			customer_active_total       : 0,
			customer_inactive_total     : 0,
			customer_removed_total      : 0,
			process_total               : 0,
			document_total              : 0,
		};
	}

	componentDidMount() {
		// Fecth all
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
				isLoading                  : false,
				despachante_active_total   : data.despachante_active_total || 0,
				despachante_inactive_total : data.despachante_inactive_total || 0,
				customer_active_total      : data.customer_active_total || 0,
				customer_inactive_total    : data.customer_inactive_total || 0,
				customer_removed_total     : data.customer_removed_total || 0,
				process_total              : data.process_total || 0,
				document_total             : data.document_total || 0,
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
			const cards = [
				{
					title: "Despachantes ativos",
					value: this.state.despachante_active_total,
					icon : "fad fa-user-tie",
					path : "/list/despachantes?is_active=true",
				},
				{
					title: "Despachantes inativos",
					value: this.state.despachante_inactive_total,
					icon : "fad fa-user-slash",
					path : "/list/despachantes?is_active=false",
				},
				{
					title: "Clientes ativos",
					value: this.state.customer_active_total,
					icon : "fad fa-user-check",
					path : "/list/customers?is_active=true",
				},
				{
					title: "Clientes inativos",
					value: this.state.customer_inactive_total,
					icon : "fad fa-user-times",
					path : "/list/customers?is_active=false",
				},
				{
					title: "Clientes removidos",
					value: this.state.customer_removed_total,
					icon : "fad fa-user-minus",
					path : "/list-deleted/customers-deleted",
				},
				{
					title: "Total de processos",
					value: this.state.process_total,
					icon : "fad fa-clipboard-list",
					path : "/list/processes",
				},
				{
					title: "Total de documentos",
					value: this.state.document_total,
					icon : "fad fa-file-alt",
					path : "/list/documents",
				},
			];

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
