import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Row, Col, Modal, Tabs, Typography, Tag, Avatar } from "antd";
import moment from "moment";
import { callsForHelpService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

class Show extends Component {
  static propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  state = {
    isLoading: true,
    item: {},
    previewVisible: false,
    previewImage: '',
  };

  onOpen = (uuid) => {
    this.setState({ isLoading: true, item: {} });

    callsForHelpService
      .show({ uuid })
      .then((response) => {
        const item = response.data.data;
        this.setState({ isLoading: false, item });
      })
      .catch((data) => {
        Modal.error({
          title: "Ocorreu um erro!",
          content: String(data),
          onOk: this.onClose,
        });
      });
  };

  onClose = () => {
    this.setState({ item: {} });
    this.props.onClose();
  };

  renderFormItems = (fields) => (
    <Row gutter={16}>
      {fields.map(({ label, value }, index) => (
        <Col span={12} key={index}>
          <Form.Item label={label}>{value}</Form.Item>
        </Col>
      ))}
    </Row>
  );

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

    return (
      <UIDrawerForm
        visible={visible}
        width={700}
        onClose={this.onClose}
        isLoading={isLoading}
        showBtnSave={false}
        title="Visualizar registro"
      >
        <Form layout="vertical">
          <Tabs defaultActiveKey="general">
            <Tabs.TabPane forceRender tab="Infos gerais" key="general">
              {this.renderFormItems([
                { label: "Endereço atual do profissional", value: item.endereco_profissional || 'N/A' },
                { label: "Endereço de origem do usuário", value: item.endereco_customer_origem || 'N/A' },
                { label: "Endereço de destino do usuário", value: item.endereco_customer_destino || 'N/A' },
                { label: "Condição da motocicleta", value: item.condicao_moto || 'N/A' },
                { label: "Tipo de transporte", value: this.capitalize(item.tipo_transporte) },
                {
                  label: "Forma de pagamento",
                  value: item.forma_pagamento === 'pix'
                    ? 'Pix'
                    : item.forma_pagamento === 'cartao-credito'
                      ? 'Cartão de Crédito'
                      : 'N/A'
                },
                { label: "Valor do serviço", value: this.formatValue(item?.valor_servico) },
                { label: "Valor do trajeto", value: this.formatValue(item?.valor_trajeto) },
                { label: "Valor total", value: this.formatValue(item?.valor_total) },
                { label: "Distância de deslocamento", value: this.formatDistance(item?.distancia_deslocamento) },
                { label: "Distância do trajeto", value: this.formatDistance(item?.distancia_trajeto) },
                { label: "Distância total", value: this.formatDistance(item?.distancia_total) },
                { label: "Previsão de chegada no destino", value: item?.previsao_chegada ? 
                    (() => {
                      const time = item?.previsao_chegada.replace('.0000', '');
                      const [hours, minutes, seconds] = time.split(':');
                      return `${hours}:${minutes}:${seconds}`;
                    })()
                    : "00:00:00" 
                },
                { label: "Status", 
                  value: (
                    <Tag color={item?.status_color || "#8a8a8a"}>{this.capitalize(item?.status)}</Tag>
                  ) 
                },
                { label: "Motivo do cancelamento", value: item?.motivo?.slug === 'outro' ? item?.text_motivo : item?.motivo?.title || '-' },
                { label: "Data e hora do pedido", value: moment(item?.pedido_em).format('DD/MM/YYYY HH:mm') },
                { label: "Data e hora do cancelamento", value: item?.cancelado_em ? moment(item?.cancelado_em).format('DD/MM/YYYY HH:mm') : '-' },
                { label: "Data e hora da entrega", value: item?.entregue_em ? moment(item?.entregue_em).format('DD/MM/YYYY HH:mm') : '-' },
              ])}
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Infos do usuário" key="customer">
              {this.renderFormItems([
                { label: "Nome completo", value: item?.customer?.name || 'N/A' },
                { label: "Telefone", value: item?.customer?.phone || 'N/A' },
                { label: "E-mail", value: item?.customer?.email || 'N/A' },
                { label: "CPF", value: item?.customer?.document || 'N/A' },
              ])}
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Infos da motocicleta" key="motorcycle">
              <UIUpload
                ref={el => {
                  this.uploadMoto = el;
                  if (el && item?.motorcycle?.avatar) {
                    el.setFiles([{ 
                      url: item?.motorcycle?.avatar, 
                      type: 'image/*', 
                      uuid: item?.motorcycle?.uuid 
                    }]);
                  }
                }}
                label="Imagem"
                disabled
                acceptedFiles={['jpg', 'jpeg', 'png']}
                style={{ 
                  '& .ant-upload-list-item': {
                    width: '200px',
                    height: '200px'
                  },
                  '& .ant-upload-list-item-thumbnail': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }
                }}
              />
              {this.renderFormItems([
                { label: "Marca", value: item?.motorcycle?.modelo?.marca?.name || 'N/A' },
                { label: "Modelo", value: item?.motorcycle?.modelo?.name || 'N/A' },
                { label: "Ano de fabricação", value: item?.motorcycle?.ano_fabricacao || 'N/A' },
                { label: "Ano do modelo", value: item?.motorcycle?.ano_modelo || 'N/A' },
              ])}
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Infos do profissional" key="provider">
              {this.renderFormItems([
                { label: "Nome completo", value: item?.profissional?.name || 'N/A' },
                { label: "CPF", value: item?.profissional?.document || 'N/A' },
                { label: "Telefone", value: item?.profissional?.phone || 'N/A' },
                { label: "E-mail", value: item?.profissional?.email || 'N/A' },
                {
                  label: "Cidade/UF",
                  value: item?.profissional
                    ? [item.profissional.city, item.profissional.uf].filter(Boolean).join("/")
                    : "N/A"
                },                
              ])}
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Infos do veículo" key="vehicle">
              <UIUpload ref={el => (this.uploadVehicle = el)} label="Imagem" disabled files={item?.vehicle?.avatar ? [{ url: item?.vehicle.avatar }] : []} />
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Marca - Modelo">
                    {item?.vehicle 
                      ? `${item?.vehicle?.modelo?.marca?.name || ' - '} - ${item?.vehicle.modelo?.name || '-'}` 
                      : 'N/A'}
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Placa">
                    {item?.vehicle?.placa || 'N/A'}
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Tipo">
                    {this.capitalize(item?.vehicle?.type) || 'N/A'}
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Mensagens" key="messages">
              {item?.chats?.length > 0 ? (
                <div className="chat-container">
                  {item.chats.map((msg) => {
                    const isCustomer = msg.type === "Customer";
                    const sender = msg.user;
                    const avatarUrl =
                      sender?.avatar_sizes?.admin_listing ||
                      sender?.avatar ||
                      null;

                    return (
                      <div
                        key={msg.uuid}
                        className={`chat-message ${isCustomer ? "left" : "right"}`}
                      >
                        <div className="chat-meta">
                          <Avatar src={avatarUrl}>
                            {!avatarUrl && sender?.name?.[0]}
                          </Avatar>
                          <div>
                            <strong>{sender?.name || "Remetente"}</strong>
                            <div className="chat-time">
                              {moment(msg.created_at).format("DD/MM/YYYY HH:mm")}
                            </div>
                          </div>
                        </div>
                        <div className="chat-bubble">
                          <span>{msg.message}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Typography.Text type="secondary">
                  Nenhuma mensagem registrada.
                </Typography.Text>
              )}
            </Tabs.TabPane>

            <Tabs.TabPane forceRender tab="Avaliação" key="rating">
              {this.renderFormItems([
                { label: "Nota para o usuário", value: item?.nota_customer },
                { label: "Nota para o profissional", value: item?.nota_profissional },
              ])}
            </Tabs.TabPane>
          </Tabs>
        </Form>
      </UIDrawerForm>
    );
  }
}

export default Show;