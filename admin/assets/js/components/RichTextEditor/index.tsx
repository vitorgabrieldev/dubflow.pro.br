import React, { PureComponent } from "react";
import { connect } from "react-redux";
import * as PropTypes from "prop-types";
import { Form } from "antd";
import CKEditor from '@ckeditor/ckeditor5-react';
import * as ClassicEditor from './../../vendor/ckeditor5/build/ckeditor';

import { API_URL } from "./../../config/general";

import UILabelHelp from "./../LabelHelp";

class UIRichTextEditor extends PureComponent {
	static propTypes = {
		name         : PropTypes.string.isRequired,
		label        : PropTypes.any,
		help         : PropTypes.any,
		required     : PropTypes.bool,
		disabled     : PropTypes.bool,
		formItemProps: PropTypes.any,
		editorProps  : PropTypes.any,
	};

	static defaultProps = {
		label        : "",
		help         : "",
		required     : false,
		formItemProps: {},
		editorProps  : {},
	};

	constructor(props) {
		super(props);

		this._timeout = null;
	}

	componentWillUnmount() {
		clearTimeout(this._timeout);
	}

	setValue = (value) => {
		if( this.editor && this.editor.editor )
		{
			this.editor.editor.setData(value === null ? '' : value);
		}
		else
		{
			// Initializing
			this._timeout = setTimeout(() => {
				this.setValue(value);
			}, 50);
		}
	};

	getValue = () => {
		return this.editor.editor.getData();
	};

	render() {
		const {name, label, help, required, disabled, formItemProps, editorProps} = this.props;

		const editorConfiguration = {
			language    : 'pt-br',
			toolbar     : {
				items: [
					'undo',
					'redo',
					'heading',
					'|',
					'alignment',
					'fontSize',
					'fontColor',
					'fontBackgroundColor',
					'bold',
					'italic',
					'underline',
					'removeFormat',
					'link',
					'bulletedList',
					'numberedList',
					'|',
					'indent',
					'outdent',
					'|',
					'imageUpload',
					'blockQuote',
					'insertTable',
					'horizontalLine'
				]
			},
			link        : {
				decorators: {
					isExternal: {
						mode      : 'manual',
						label     : 'Abrir em nova aba',
						attributes: {
							target: '_blank',
							rel   : 'noopener noreferrer'
						},
					},
				},
			},
			image       : {
				//resizeUnit   : 'px',
				// Configure the available styles.
				styles: [
					'full',
					'alignLeft',
					'alignCenter',
					'alignRight'
				],
				// Configure the available image resize options.
				resizeOptions: [
					{
						name : 'imageResize:original',
						label: 'Original',
						value: null
					},
					{
						name : 'imageResize:50',
						label: '50%',
						value: '50'
					},
					{
						name : 'imageResize:75',
						label: '75%',
						value: '75'
					}
				],
				toolbar      : [
					'imageStyle:full',
					'imageStyle:alignLeft',
					'imageStyle:alignCenter',
					'imageStyle:alignRight',
					'|',
					'imageResize',
					'|',
					'imageTextAlternative',
					'|',
					'linkImage',
				],
				upload       : {
					types: ['png', 'jpeg', 'gif', 'webp'],
				}
			},
			table       : {
				contentToolbar: [
					'tableColumn',
					'tableRow',
					'mergeTableCells',
					'tableCellProperties',
					'tableProperties',
				]
			},
			simpleUpload: {
				uploadUrl      : API_URL + "rich-text-editor/upload-image",
				withCredentials: false,
				headers        : {
					Accept       : "application/json",
					Language     : "pt",
					Authorization: this.props.accessToken,
				}
			},
		};

		return (
			<div className={`rich-text-editor ${disabled ? 'disabled' : ''}`}>
				{!!label && <label className={`form-label ${required ? 'required' : ''}`}>{help ? <UILabelHelp title={label} content={help} /> : label}</label>}
				<Form.Item
					name={name}
					valuePropName="data"
					initialValue=""
					getValueFromEvent={(event, editor) => editor.getData()}
					hasFeedback={!disabled}
					rules={required ? [{required: true, message: "Campo obrigatório."}] : []}
					{...formItemProps}>
					<CKEditor
						ref={el => this.editor = el}
						editor={ClassicEditor}
						config={editorConfiguration}
						data=""
						disabled={disabled}
						{...editorProps}
					/>
				</Form.Item>
			</div>
		);
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		accessToken: state.auth.access_token,
	};
};

export default connect(mapStateToProps, null, null, {forwardRef: true})(UIRichTextEditor);
