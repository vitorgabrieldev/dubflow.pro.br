import { Menu } from "antd";
import * as PropTypes from "prop-types";
import React, { Component } from "react";
import { connect } from "react-redux";
import { NavLink, withRouter } from "react-router-dom";

const SubMenu = Menu.SubMenu;

class MainNavigation extends Component {
  static propTypes = {
    onClick: PropTypes.func,
  };

  static defaultProps = {
    onClick: () => null,
  };

  constructor(props) {
    super(props);

    this.state = {
      openKeys: this.getOpenKeysFromLocation(props.location),
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.pathname !== this.props.location.pathname) {
      const nextOpenKeys = this.getOpenKeysFromLocation(this.props.location);

      this.setState({
        openKeys: nextOpenKeys,
      });
    }
  }

  getOpenKeysFromLocation = (location) => {
    const paths = location.pathname.split("/").filter(Boolean);

    if (!paths.length) {
      return [];
    }

    return [`/${paths[0]}`];
  };

  onOpenChange = (openKeys) => {
    const latestOpenKey = openKeys.find((key) => !this.state.openKeys.includes(key));

    this.setState({
      openKeys: latestOpenKey ? [latestOpenKey] : openKeys,
    });
  };

  render() {
    const { location } = this.props;
    const selectedKeys = [location.pathname];

    const base = location.pathname.split("/").filter(Boolean)[0];
    if (base) {
      selectedKeys.push(`/${base}`);
    }

    const canSeeAdministrator =
      this.props.permissions.includes("roles.list") ||
      this.props.permissions.includes("log.list") ||
      this.props.permissions.includes("system-log.list") ||
      this.props.permissions.includes("users.list");

    return (
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={selectedKeys}
        selectedKeys={selectedKeys}
        openKeys={this.state.openKeys}
        onOpenChange={this.onOpenChange}
        onClick={this.props.onClick}>
        <Menu.Item key="/" icon={<i className="fal fa-tachometer-fast" />}>
          <NavLink to="/">Início</NavLink>
        </Menu.Item>

        {canSeeAdministrator && (
          <SubMenu key="/administrator" title="Administrador" icon={<i className="fal fa-sliders-v" />}>
            {this.props.permissions.includes("log.list") && (
              <Menu.Item key="/administrator/logs">
                <NavLink to="/administrator/logs">Registros de alterações</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("system-log.list") && (
              <Menu.Item key="/administrator/system-log">
                <NavLink to="/administrator/system-log">Registros de erros</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("users.list") && (
              <Menu.Item key="/administrator/users">
                <NavLink to="/administrator/users">Usuários administradores</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("roles.list") && (
              <Menu.Item key="/administrator/roles-and-permissions">
                <NavLink to="/administrator/roles-and-permissions">Papéis e permissões</NavLink>
              </Menu.Item>
            )}
          </SubMenu>
        )}
      </Menu>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    permissions: state.auth.userData.permissions,
  };
};

export default connect(mapStateToProps)(withRouter(MainNavigation));
