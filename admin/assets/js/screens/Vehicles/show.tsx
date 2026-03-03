import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Row, Col, Modal, Tabs, Typography, Tag, Avatar, List } from "antd";
import moment from "moment";
import { vehiclesService } from "./../../redux/services";
import { UIDrawerForm, UIUpload } from "./../../components";

class Show extends Component {
  static propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onImagePreview: PropTypes.func.isRequired,
  };

  state = {
    isLoading: true,
    item: {},
    previewVisible: false,
    previewImage: '',
  };

  onOpen = (uuid) => {
    this.setState({ isLoading: true, item: {} });

    vehiclesService
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
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
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
        width={500}
        onClose={this.onClose}
        isLoading={isLoading}
        showBtnSave={false}
        title="Visualizar registro"
      >
        <Form layout="vertical">
          <UIUpload
            ref={el => {
              this.uploadMoto = el;
              if (el && item?.media) el.setFiles(item.media.map(mediaItem => ({ url: mediaItem.file, type: 'image/*', uuid: mediaItem.uuid })));
            }}
            label="Imagens"
            disabled
            acceptedFiles={['jpg', 'jpeg', 'png']}
          />
          {this.renderFormItems([
            { label: "Profissional", value: item.profissional?.name || 'N/A' },
            { label: "Marca/modelo", value: (item.marca?.name && item.modelo?.name) ? `${item.marca.name} - ${item.modelo.name}` : 'N/A' },
            { label: "Tipo", value: this.capitalize(item.type) || 'N/A' },
            { label: "Placa", value: item.placa || 'N/A' },
            { label: "Ativo", value: item.is_active ? 'Sim' : 'Não' },
            { label: "Data e hora do cadastro", value: item.created_at ? moment(item.created_at).format('DD/MM/YYYY HH:mm') : 'N/A' },
            { label: "Última modificação", value: item.updated_at ? moment(item.updated_at).format('DD/MM/YYYY HH:mm') : 'N/A' },
          ])}
        </Form>
      </UIDrawerForm>
    );
  }
}

export default Show;