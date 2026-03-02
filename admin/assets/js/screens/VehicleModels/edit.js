import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Switch, Select, Spin } from "antd";
import axios from "axios";

import { vehicleBrandsService, vehicleModelsService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Edit extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			uuid     : 0,
			isLoading: true,
			isSending: false,
			vehiclesIsLoading: false,
			brands: [],
		};
	}

	onOpen = (uuid) => {
		this.setState({
			isLoading: true,
			uuid     : uuid,
		});

		vehicleModelsService.show({uuid})
		.then((response) => {
			const item = response.data.data;
			this.setState({
				isLoading: false,
			}, () => {
				// Fill form
				this.fillForm(item);
			});
		})
		.catch((data) => {
			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
				onOk   : () => {
					// Force close
					return this.onClose();
				}
			});
		});
	};

	fillForm = (data) => {
		this.form.setFieldsValue({
			marca_id     : data.marca?.uuid,
			name    	 : data.name,
			cilindrada   : data.cilindrada,
			is_active	 : data.is_active,
		});

		if (data.marca)
		{
			let brand = data.marca;
			this.setState({
				brands: [{
					name: brand.name,
					uuid: brand.uuid
				}]
			});
		}
	};

	onClose = () => {
		// Callback
		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const {uuid} = this.state;

		const data = {...values};

		// uuid
		data.uuid = uuid;

		vehicleModelsService.edit(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Success message
			message.success("Registro atualizado com sucesso.");

			// Callback
			this.props.onComplete();
		})
		.catch((data) => {
			this.setState({
				isSending: false,
			});

			Modal.error({
				title  : "Ocorreu um erro!",
				content: String(data),
			});
		});
	};

	fetchVehiclesBrands = (value) => {
		if (this._axiosCancelvehiclesBrandToken) {
			this._axiosCancelvehiclesBrandToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelvehiclesBrandToken = axios.CancelToken.source();

		this.setState({
			vehiclesIsLoading: true,
		});

		vehicleBrandsService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelvehiclesBrandToken.token,
		})
			.then((response) => {
				this.setState({
					vehiclesIsLoading: false,
					brands: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					vehiclesIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	render() {
		const {visible} = this.props;

		const {isLoading, isSending, vehiclesIsLoading, brands} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title={`Editar registro`}>
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}>
					<Form.Item name="marca_id" label="Marca" rules={[{required: true, message: "Campo obrigatório."}]}>
						<Select
							filterOption={false}
							allowClear
							notFoundContent={vehiclesIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
							onSearch={this.fetchVehiclesBrands}
							showSearch
							onDropdownVisibleChange={visible => {
								if (visible && !brands.length) {
									this.fetchVehiclesBrands('');
								}
							}}
							options={brands.map((item, index) => ({
								label: item.name,
								value: item.uuid
							}))}
						/>
					</Form.Item>

					<Form.Item name="name" label="Nome" hasFeedback rules={[{required: true, message: "Campo obrigatório."}]}>
						<Input maxLength={191} />
					</Form.Item>

					<Form.Item name="is_active" label="Ativo" valuePropName="checked">
						<Switch />
					</Form.Item>
				</Form>
			</UIDrawerForm>
		)
	}
}

export default Edit;
