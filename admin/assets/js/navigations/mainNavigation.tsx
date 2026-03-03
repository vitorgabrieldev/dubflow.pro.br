import { Menu } from "antd";
import * as PropTypes from "prop-types";
import React, { Component } from "react";
import { connect } from "react-redux";
import { NavLink, withRouter } from "react-router-dom";

const SubMenu = Menu.SubMenu;
const SHOW_PUSH_MENU = false;

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
    let base = "";
    let selectedKeys = [];
    let paths = location.pathname.split("/").filter(function (el) {
      return el;
    });

    paths.forEach((path, index) => {
      if (path) {
        if (index === 0) {
          base = `/${path}`;
        }
      }
    });

    selectedKeys.push(location.pathname);
    selectedKeys.push(base);

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
					<NavLink to="/">
						Início
					</NavLink>
				</Menu.Item>
				{(
					this.props.permissions.includes("roles.list")
					|| this.props.permissions.includes("log.list")
					|| this.props.permissions.includes("system-log.list")
					|| this.props.permissions.includes("customers.list")
					|| this.props.permissions.includes("users.list")) && (
					<SubMenu key="/administrator" title="Administrador" icon={<i className="fal fa-sliders-v" />}>
						{this.props.permissions.includes("log.list") && <Menu.Item key="/administrator/logs">
							<NavLink to="/administrator/logs">
								Registros de alterações
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("system-log.list") && <Menu.Item key="/administrator/system-log">
							<NavLink to="/administrator/system-log">
								Registros de erros
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("users.list") && <Menu.Item key="/administrator/users">
							<NavLink to="/administrator/users">
								Usuários administradores
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("roles.list") && <Menu.Item key="/administrator/roles-and-permissions">
							<NavLink to="/administrator/roles-and-permissions">
								Papéis e permissões
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
				{(
					this.props.permissions.includes("despachantes.list")
					|| this.props.permissions.includes("document_types.list")
					|| this.props.permissions.includes("service_categories.list")
					|| this.props.permissions.includes("service_types.list")
					|| this.props.permissions.includes("services.list")
					) && (
					<SubMenu key="/settings" title="Configurações" icon={<i className="fal fa-tools" />}>
						{this.props.permissions.includes("despachantes.list") && <Menu.Item key="/list/despachantes">
							<NavLink to="/list/despachantes">
								Despachantes
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("document_types.list") && <Menu.Item key="/settings/document-types">
							<NavLink to="/settings/document-types">
								Tipos dos documentos
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("service_categories.list") && <Menu.Item key="/settings/service-categories">
							<NavLink to="/settings/service-categories">
								Categorias dos serviços
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("service_types.list") && <Menu.Item key="/settings/service-types">
							<NavLink to="/settings/service-types">
								Tipos de serviços
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("services.list") && <Menu.Item key="/settings/services">
							<NavLink to="/settings/services">
								Serviços
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
				{(
					this.props.permissions.includes("about-company.edit")
					|| this.props.permissions.includes("faq.edit")
					|| this.props.permissions.includes("privacy-policy.edit")
					|| this.props.permissions.includes("terms-of-use.edit")
					|| this.props.permissions.includes("onboarding.list")) && (
					<SubMenu key="/institutional" title="Institucional" icon={<i className="fal fa-file-alt" />}>
						{this.props.permissions.includes("onboarding.list") && <Menu.Item key="/institutional/onboardings">
							<NavLink to="/institutional/onboardings">
								Onboarding
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("terms-of-use.edit") && <Menu.Item key="/institutional/terms-of-use">
							<NavLink to="/institutional/terms-of-use">
								Termos de uso
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("privacy-policy.edit") && <Menu.Item key="/institutional/privacy-policy">
							<NavLink to="/institutional/privacy-policy">
								Política de privacidade
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("about-company.edit") && <Menu.Item key="/institutional/about">
							<NavLink to="/institutional/about">
								Sobre nós
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("faq.list") && <Menu.Item key="/institutional/faq">
							<NavLink to="/institutional/faq">
								Dúvidas frequentes 
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
				{(
					this.props.permissions.includes("marcasveiculos.list")
					|| this.props.permissions.includes("modelosveiculos.list")
					|| this.props.permissions.includes("motivosrecusa.list")) && (
					<SubMenu key="/register" title="Cadastros" icon={<i className="fal fa-user" />}>
						{this.props.permissions.includes("marcasveiculos.list") && <Menu.Item key="/register/vehicle-brands">
							<NavLink to="/register/vehicle-brands">
								Marcas de veículos 
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("modelosveiculos.list") && <Menu.Item key="/register/vehicle-models">
							<NavLink to="/register/vehicle-models">
								Modelos de veículos  
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("motivosrecusa.list") && <Menu.Item key="/register/reasons-for-refusal">
							<NavLink to="/register/reasons-for-refusal">
								Motivos de recusa   
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
				{(
					this.props.permissions.includes("customers.list") ||
					this.props.permissions.includes("customers-deleted.list") ||
					this.props.permissions.includes("processes.list") ||
					this.props.permissions.includes("documents.list") ||
					this.props.permissions.includes("despachante_users.list") ||
					this.props.permissions.includes("vehicles.list") ||
					this.props.permissions.includes("profissionais.list")) && (
					<SubMenu key="/list" title={'Consultas'} icon={<i className="fal fa-search" />}>
						{this.props.permissions.includes("customers.list") && <Menu.Item key="/list/customers">
							<NavLink to="/list/customers">
								Clientes
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("customers-deleted.list") && <Menu.Item key="/list-deleted/customers-deleted">
							<NavLink to="/list-deleted/customers-deleted">
								Clientes removidos
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("processes.list") && <Menu.Item key="/list/processes">
							<NavLink to="/list/processes">
								Processos
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("documents.list") && <Menu.Item key="/list/documents">
							<NavLink to="/list/documents">
								Documentos
							</NavLink>
						</Menu.Item>}
						{(
							this.props.permissions.includes("despachante_users.list")) && <Menu.Item key="/list/despachante-users">
							<NavLink to="/list/despachante-users">
								Usuários dos despachantes
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("profissionais.list") && <Menu.Item key="/list/profissionais">
							<NavLink to="/list/profissionais">
								Profissionais
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("pedido-socorro.list") && <Menu.Item key="/list/calls-for-help">
							<NavLink to="/list/calls-for-help">
								Pedidos de socorro
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("vehicles.list") && <Menu.Item key="/list/vehicles">
							<NavLink to="/list/vehicles">
								Veículos 
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
				{(
					this.props.permissions.includes("profissionais-deleted.list")) && (
					<SubMenu key="/list-deleted" title="Excluídos" icon={<i className="fal fa-trash" />}>
						{this.props.permissions.includes("profissionais-deleted.list") && <Menu.Item key="/list-deleted/profissionais-deleted">
							<NavLink to="/list-deleted/profissionais-deleted">
								Profissionais
							</NavLink>
						</Menu.Item>}
					</SubMenu>
				)}
					{(SHOW_PUSH_MENU && (
						this.props.permissions.includes("push-general.list")
						|| this.props.permissions.includes("push-city.list")
						|| this.props.permissions.includes("push-state.list")
						|| this.props.permissions.includes("push-user.list"))) && (
						<SubMenu key="/push" title={'Push'} icon={<i className="fal fa-bell" />}>
						{this.props.permissions.includes("push-general.list") && <Menu.Item key="/push/general">
							<NavLink to="/push/general">
								Geral
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("push-city.list") && <Menu.Item key="/push/city">
							<NavLink to="/push/city">
								Por cidade
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("push-state.list") && <Menu.Item key="/push/state">
							<NavLink to="/push/state">
								Por estado
							</NavLink>
						</Menu.Item>}
						{this.props.permissions.includes("push-user.list") && <Menu.Item key="/push/user">
							<NavLink to="/push/user">
								Por usuário
							</NavLink>
						</Menu.Item>}
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
