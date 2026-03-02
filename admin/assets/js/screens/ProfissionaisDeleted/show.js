import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Row, Col, Modal, Switch, Tabs, List, Avatar, Typography, Card } from "antd";
import moment from "moment";
import { profissionaisDeletedService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

const config = {
  externalName: "cliente",
};

class Show extends Component {
  static propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    external: PropTypes.bool,
  };

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      uuid: 0,
      item: {},
      previewVisible: false,
      previewImage: '',
    };
  }

  onOpen = (uuid) => {
    this.state = {
      isLoading: true,
      uuid: 0,
      item: {},
    };

    profissionaisDeletedService
      .show({ uuid })
      .then((response) => {
        let item = response.data.data;

        this.setState({
          isLoading: false,
          item: item,
        }, () => {
          if (item.avatar) {
            
          }
        });
      })
      .catch((data) => {
        Modal.error({
          title: "Ocorreu um erro!",
          content: String(data),
          onOk: () => {
            return this.onClose();
          },
        });
      });
  };

  resetFields = () => {
    this.setState({
      item: {},
    });
  };

  onClose = () => {
    this.resetFields();
    this.props.onClose();
  };

  capitalize = (text) => text ? text.charAt(0).toUpperCase() + text.slice(1) : 'N/A';

  formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  formatDistance = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value} km`;
  };

  render() {
    const { visible } = this.props;
    const { isLoading, item } = this.state;

    if (this.upload) {
      const files = item.media && item.media.length > 0 ? item.media.map((mediaItem) => ({
        uuid: mediaItem.uuid,
        url: mediaItem.file_sizes.admin_listing,
        type: 'image/jpeg',
      })) : [];
    
      this.upload.setFiles(files);
    }

    return (
      <UIDrawerForm
        visible={visible}
        width={500}
        onClose={this.onClose}
        isLoading={isLoading}
        showBtnSave={false}
        title={`Visualizar registro`}>
        <Form layout="vertical">
          <Tabs defaultActiveKey="general">
            <Tabs.TabPane forceRender tab="Infos gerais" key="general">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Nome completo">
                    {item.name || 'N/A'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="CPF">
                    {item.document || 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Telefone">
                    {item.phone || 'N/A'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="E-mail">
                    {item.email || 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Ocupação">
                    {item.profissao || 'N/A'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data de nascimento">
                    {item.birth_date ? moment.utc(item.birth_date).format('DD/MM/YYYY') : 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Cidade/UF">
                    {item.city && item.uf ? `${item.city}/${item.uf}` : 'N/A'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Rendimento mensal">
                    {item.renda_mensal ? this.formatValue(item.renda_mensal) : 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Nota">
                    {item.nota ?? '-'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Aceite dos Termos de uso">
                    {item.accepted_term_of_users_at ? moment(item.accepted_term_of_users_at).format('DD/MM/YYYY HH:mm') : 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Aceite da Política de privacidade">
                    {item.accepted_policy_privacy_at ? moment(item.accepted_policy_privacy_at).format('DD/MM/YYYY HH:mm') : 'N/A'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data e hora do cadastro">
                    {item.created_at ? moment(item.created_at).calendar() : 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Última alteração">
                    {item.updated_at ? moment(item.updated_at).calendar() : 'Sem informação'}
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data e hora da remoção da conta">
                    {item.deleted_at ? moment(item.deleted_at).calendar() : 'N/A'}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Ativo">
                    <Switch disabled checked={item.is_active} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Aprovado">
                    <Switch disabled checked={item.approved} />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Veículo" key="vehicle">
              {item.vehicles && item.vehicles.length > 0 ? (
                item.vehicles.map((vehicle) => (
                  <Card key={vehicle.uuid} style={{ marginBottom: 16 }}>
                    {vehicle.media && vehicle.media.length > 0 && (
                      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                        <UIUpload
                          ref={el => {
                            if (el) {
                              const formattedMedia = vehicle.media.map(mediaItem => ({
                                url: mediaItem.file_sizes?.app_listing || mediaItem.file,
                                type: 'image/*',
                                uuid: mediaItem.uuid
                              }));
                              el.setFiles(formattedMedia);
                            }
                          }}
                          label="Imagens"
                          disabled
                          acceptedFiles={['jpg', 'jpeg', 'png']}
                        />
                      </Row>
                    )}

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item label="Marca - Modelo">
                          {`${vehicle.marca?.name || 'N/A'} - ${vehicle.modelo?.name || 'N/A'}`}
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Placa">
                          {vehicle.placa || 'N/A'}
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Tipo">
                          {this.capitalize(vehicle.type) || 'N/A'}
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))
              ) : (
                <Typography.Text type="secondary">Nenhum veículo cadastrado.</Typography.Text>
              )}

              <Modal
                visible={this.state.previewVisible}
                footer={null}
                centered
                onCancel={() => this.setState({ previewVisible: false })}
                destroyOnClose>
                <img src={this.state.previewImage} style={{ width: "100%" }} />
              </Modal>
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Dados bancários" key="bank">
				<Row gutter={16}>
					<Col span={12}>
					<Form.Item label="Tipo da conta">
						{item.bank_details_type || 'N/A'}
					</Form.Item>
					</Col>
					<Col span={12}>
					<Form.Item label="Banco">
						{item.bank?.name || 'N/A'}
					</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
					<Form.Item label="Agência">
						{item.bank_details_agency || 'N/A'}
					</Form.Item>
					</Col>
					<Col span={12}>
					<Form.Item label="Conta">
						{item.bank_details_account || 'N/A'}
					</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label="Dígito">
							{item.bank_details_digit_count || 'N/A'}
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label="CPF do titular">
							{item.bank_details_cpf || 'N/A'}
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label="Nome do titular">
							{item.bank_details_holder || 'N/A'}
						</Form.Item>
					</Col>
				</Row>
			</Tabs.TabPane>
          </Tabs>
        </Form>
      </UIDrawerForm>
    );
  }
}

export default Show;