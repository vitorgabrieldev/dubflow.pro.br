import React, { Component } from "react";
import { connect } from "react-redux";
import { BackTop, Drawer, Layout } from "antd";
import enquire from "enquire.js";

const {Content, Header, Sider} = Layout;

import {
	generalActions,
} from "./../redux/actions";

import MainNavigation from "./../navigations/mainNavigation";
import UserDropdownNavigation from "./../navigations/userDropdownNavigation";

class DefaultTemplate extends Component {
	constructor(props) {
		super(props);

		this.state = {
			siderBarDrawer: false,
		};

		this.mdSideBarOn  = "screen and (max-width: 1199px)";
		this.mdSideBarOff = "screen and (min-width: 1200px)";
	}

	componentDidMount() {
		enquire.register(this.mdSideBarOn, () => {
			this.setState({
				siderBarDrawer: true,
			})
		});

		enquire.register(this.mdSideBarOff, () => {
			this.setState({
				siderBarDrawer: false,
			})
		});
	};

	componentWillUnmount() {
		enquire.unregister(this.mdSideBarOn);
		enquire.unregister(this.mdSideBarOff);
	};

	toggle = () => {
		this.props.siderToggle(!this.props.siderCollapsed);
	};

	render() {
		const {siderBarDrawer} = this.state;
		const {siderCollapsed} = this.props;

		const siderWidth = siderBarDrawer ? 0 : (siderCollapsed ? 80 : 256);

		return (
			<Layout className="template-default">
				{siderBarDrawer ? (
					<Drawer
						placement="left"
						closable={false}
						onClose={this.toggle}
						visible={!siderCollapsed}
						className="template-default-ant-drawer site-menu">
						<div className="logo">
							<img src="/admin/images/logos/logo-white.svg" width={160} alt="" />
						</div>
						<MainNavigation
							onClick={this.toggle}
						/>
					</Drawer>
				) : (
					<Sider
						theme="dark"
						trigger={null}
						collapsible={true}
						collapsed={siderCollapsed}
						breakpoint="lg"
                        width={265}
						collapsedWidth={80}
						className="site-menu">
							<div className="logo" >
								<img src="/admin/images/logos/logo-white.svg" width={160} alt="" />
								<img src="/admin/images/logos/logo-white.svg" width={90} className="logo-icon" alt="" />
						</div>
						<MainNavigation />
					</Sider>
				)}
				<Layout style={{paddingLeft: siderWidth}}>
					<Header key="1" className="site-header" style={{left: siderWidth}}>
						<i className={`trigger ${siderCollapsed ? "fad fa-indent" : "fad fa-outdent"}`} onClick={this.toggle} />
						<div className="inner">
							<UserDropdownNavigation />
						</div>
					</Header>
					<Content className="site-content">
						{this.props.children}
					</Content>
					<BackTop />
				</Layout>
			</Layout>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		siderCollapsed: state.general.siderCollapsed,
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		siderToggle: (collapsed) => {
			dispatch(generalActions.siderToggle(collapsed));
		}
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(DefaultTemplate);
