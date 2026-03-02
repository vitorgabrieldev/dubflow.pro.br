import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Form, Input, message, Modal, Switch, Select, Spin } from "antd";
import axios from "axios";

import { vehicleModelsService, vehicleBrandsService } from "./../../redux/services";

import {
	UIDrawerForm,
} from "./../../components";

const formId = `form-drawer-${Math.floor(Math.random() * 10001)}`;

class Create extends Component {
	static propTypes = {
		visible   : PropTypes.bool.isRequired,
		onComplete: PropTypes.func.isRequired,
		onClose   : PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			isLoading: true,
			isSending: false,
			nextOrder: 1,
			vehicleIsLoading: false,
			brands: [],
		};
	}

	onOpen = () => {
		this.setState({
			isLoading: false,
		});
	};

	resetFields = () => {
	};

	onClose = () => {
		// Reset fields
		this.resetFields();

		// Callback
		this.props.onClose();
	};

	onFinish = (values) => {
		this.setState({
			isSending: true,
		});

		const data = {
			...values,
		};

		vehicleModelsService.create(data)
		.then((response) => {
			this.setState({
				isSending: false,
			});

			// Reset fields
			this.resetFields();

			// Success message
			message.success("Registro cadastrado com sucesso.");

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

	fetchvehiclesBrands = (value) => {
		if (this._axiosCancelVehiclesBrandToken) {
			this._axiosCancelVehiclesBrandToken.cancel("Only one request allowed at a time.");
		}

		this._axiosCancelVehiclesBrandToken = axios.CancelToken.source();

		this.setState({
			vehicleIsLoading: true,
		});

		vehicleBrandsService.getAutocomplete({
			search: value,
			cancelToken: this._axiosCancelVehiclesBrandToken.token,
		})
			.then((response) => {
				this.setState({
					vehicleIsLoading: false,
					brands: response.data.data,
				});
			})
			.catch((data) => {
				if (data.error_type === API_ERRO_TYPE_CANCEL) return null;

				this.setState({
					vehicleIsLoading: false,
				});

				Modal.error({
					title: "Ocorreu um erro!",
					content: String(data),
				});
			});
	};

	render() {
		const {visible} = this.props;

		const {isLoading, isSending, nextOrder, vehicleIsLoading, brands} = this.state;

		return (
			<UIDrawerForm
				visible={visible}
				width={500}
				onClose={this.onClose}
				isLoading={isLoading}
				isSending={isSending}
				formId={formId}
				title="Incluir registro">
				<Form
					ref={el => this.form = el}
					id={formId}
					layout="vertical"
					scrollToFirstError
					onFinish={this.onFinish}
					initialValues={{
						order    : nextOrder,
						is_active: true,
					}}>

					<Form.Item name="marca_id" label="Marca" rules={[{required: true}]}>
						<Select
							filterOption={false}
							allowClear
							notFoundContent={vehicleIsLoading ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : null}
							onSearch={this.fetchvehiclesBrands}
							showSearch
							onDropdownVisibleChange={visible => {
								if (visible && !brands.length) {
									this.fetchvehiclesBrands('');
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

export default Create;
