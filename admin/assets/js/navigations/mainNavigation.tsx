import { Menu } from "antd";
import * as PropTypes from "prop-types";
import React, { Component } from "react";
import { connect } from "react-redux";
import { NavLink, withRouter } from "react-router-dom";

const SubMenu = Menu.SubMenu;

const ADMIN_SECTION_OPEN_KEYS = {
  users: "/nav-access",
  "roles-and-permissions": "/nav-access",
  logs: "/nav-audit",
  "system-log": "/nav-audit",
  communities: "/nav-platform",
  playlists: "/nav-publications",
  opportunities: "/nav-publications",
  comments: "/nav-publications",
  "platform-users": "/nav-moderation",
  notifications: "/nav-moderation",
};

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

    if (paths[0] === "administrator" && paths[1]) {
      const sectionOpenKey = ADMIN_SECTION_OPEN_KEYS[paths[1]];

      if (sectionOpenKey) {
        return [sectionOpenKey];
      }
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

    const canSeeAdminAccess =
      this.props.permissions.includes("users.list") ||
      this.props.permissions.includes("roles.list");

    const canSeeAudit =
      this.props.permissions.includes("log.list") ||
      this.props.permissions.includes("system-log.list");

    const canSeePlatform = this.props.permissions.includes("communities.list");
    const canSeePublications =
      this.props.permissions.includes("playlists.list") ||
      this.props.permissions.includes("opportunities.list") ||
      this.props.permissions.includes("comments.list");
    const canSeeModeration =
      this.props.permissions.includes("platform-users.list") ||
      this.props.permissions.includes("notifications.list");

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

        {canSeeAdminAccess && (
          <SubMenu key="/nav-access" title="Acesso e permissões" icon={<i className="fal fa-user-lock" />}>
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

        {canSeeAudit && (
          <SubMenu key="/nav-audit" title="Auditoria e monitoramento" icon={<i className="fal fa-clipboard-list-check" />}>
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
          </SubMenu>
        )}

        {canSeePlatform && (
          <SubMenu key="/nav-platform" title="Plataforma" icon={<i className="fal fa-users-class" />}>
            <Menu.Item key="/administrator/communities">
              <NavLink to="/administrator/communities">Comunidades</NavLink>
            </Menu.Item>
          </SubMenu>
        )}

        {canSeePublications && (
          <SubMenu key="/nav-publications" title="Publicações" icon={<i className="fal fa-film-alt" />}>
            {this.props.permissions.includes("playlists.list") && (
              <Menu.Item key="/administrator/playlists">
                <NavLink to="/administrator/playlists">Playlists</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("opportunities.list") && (
              <Menu.Item key="/administrator/opportunities">
                <NavLink to="/administrator/opportunities">Oportunidades</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("comments.list") && (
              <Menu.Item key="/administrator/comments">
                <NavLink to="/administrator/comments">Comentários</NavLink>
              </Menu.Item>
            )}
          </SubMenu>
        )}

        {canSeeModeration && (
          <SubMenu key="/nav-moderation" title="Moderação" icon={<i className="fal fa-shield-check" />}>
            {this.props.permissions.includes("platform-users.list") && (
              <Menu.Item key="/administrator/platform-users">
                <NavLink to="/administrator/platform-users">Usuários do sistema</NavLink>
              </Menu.Item>
            )}
            {this.props.permissions.includes("notifications.list") && (
              <Menu.Item key="/administrator/notifications">
                <NavLink to="/administrator/notifications">Notificações</NavLink>
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
