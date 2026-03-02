import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Empty, message, Modal, Upload } from "antd";

import UILabelHelp from "./../LabelHelp";

const isAudio = type => /^audio/.test(type);
const isImage = type => /^image/.test(type);
const isVideo = type => /^video/.test(type);

class UIUpload extends Component {
	static propTypes = {
		label        : PropTypes.any,
		labelError   : PropTypes.string,
		disabled     : PropTypes.bool,
		multiple     : PropTypes.bool,
		minFiles     : PropTypes.number,
		maxFiles     : PropTypes.number,
		maxFileSize  : PropTypes.number, // in MegaByte
		acceptedFiles: PropTypes.array.isRequired,
		help         : PropTypes.any,
		extra        : PropTypes.any,
	};

	static defaultProps = {
		label        : "",
		labelError   : "",
		disabled     : false,
		multiple     : false,
		minFiles     : 0,
		maxFiles     : 1,
		maxFileSize  : 4,
		acceptedFiles: [],
		allowReorder : false,
		help         : "",
		extra        : "",
	};

	constructor(props) {
		super(props);

		this.state = {
			files             : [],
			filesDeleted      : [],
			previewVisible    : false,
			previewVisibleFile: "",
			previewVisibleType: null,
		};
	}

	componentWillUnmount() {
		this.state.files.forEach((file) => {
			// Blob url
			if( /^blob/.test(file.url) )
			{
				window.URL.revokeObjectURL(file.url);
			}
		});
	}

	setFiles = (files) => {
		this.setState({
			files: files.map(file => {
				let fileType = 'other';

				if( isImage(file.type) )
				{
					fileType = 'image';
				}
				else if( isVideo(file.type) )
				{
					fileType = 'video';
				}
				else if( isAudio(file.type) )
				{
					fileType = 'audio';
				}

				return {
					uid   : file.uuid,
					name  : file.url.split("/").pop(),
					status: "done",
					url   : file.url,
					// Has uuid, is api file
					uuid: file.uuid,
					// Additional
					extension: file.url.split(".").pop(),
					fileType : fileType,
				}
			}),
		});
	}

	getFiles = () => {
		let hasError = false;
		let error    = null;

		if( this.props.minFiles > 0 && !this.state.files.length )
		{
			hasError = true;
			error    = `${this.props.labelError} é obrigatório.`;
		}
		else if( this.props.minFiles > 0 && this.state.files.length < this.props.minFiles )
		{
			hasError = true;
			error    = `É necessário incluir pelo menos ${this.props.minFiles} ${this.props.labelError}.`;
		}

		return {
			hasError,
			error,
			files       : this.state.files,
			filesDeleted: this.state.filesDeleted,
		};
	};

	reset = () => {
		this.setState({
			files             : [],
			filesDeleted      : [],
			previewVisible    : false,
			previewVisibleFile: "",
			previewVisibleType: null,
		});
	};

	processFile = (file) => {
		const {maxFiles, maxFileSize, acceptedFiles} = this.props;

		file.extension = file.name.split(".").pop().toLowerCase();
		file.fileType  = 'other';

		if( isImage(file.type) )
		{
			file.fileType = 'image';
		}
		else if( isVideo(file.type) )
		{
			file.fileType = 'video';
		}
		else if( isAudio(file.type) )
		{
			file.fileType = 'audio';
		}

		// Validate extension
		if( !acceptedFiles.includes(file.extension) )
		{
			message.error(`Somente são aceitos ${this.props.labelError} no formato ${acceptedFiles.join(", ").toUpperCase()}!`);

			return false;
		}

		// Validate size
		if( !(file.size / 1024 / 1024 < maxFileSize) )
		{
			message.error(`${this.props.labelError} não pode ultrapassar o tamanho de ${maxFileSize}MB!`);

			return false;
		}

		// Create temp url
		file.url = window.URL.createObjectURL(file);

		this.setState(state => {
			if( state.files.length >= maxFiles )
			{
				return null;
			}

			return {
				files: [
					...state.files,
					file,
				],
			}
		});

		return false;
	};

	onRemoveFile = (file) => {
		this.setState(state => {
			const filesNew        = [...state.files];
			const filesDeletedNew = [...state.filesDeleted];

			const index = filesNew.findIndex(item => file.uid === item.uid);

			if( index !== -1 )
			{
				filesNew.splice(index, 1);

				// Has uuid
				if( file.uuid )
				{
					filesDeletedNew.push(file.uuid);
				}
			}

			return {
				files       : filesNew,
				filesDeleted: filesDeletedNew,
			}
		}, () => {
			// Blob url
			if( /^blob/.test(file.url) )
			{
				window.URL.revokeObjectURL(file.url);
			}
		});
	};

	onPreviewFile = (file) => {
		if( file.fileType === 'other' )
		{
			const a = document.createElement('a');
			document.body.appendChild(a);
			a.style.display = 'none';
			a.href          = file.url;
			a.download      = file.name;

			if( file.extension === 'pdf' )
			{
				a.target = '_blank';
			}

			a.click();

			a.remove();

			return false;
		}

		this.setState({
			previewVisible    : true,
			previewVisibleFile: file.url,
			previewVisibleType: file.fileType,
		});
	};

	onHideFile = () => {
		this.setState({
			previewVisible    : false,
			previewVisibleFile: "",
			previewVisibleType: null,
		});
	};

	render() {
		const {label, help, disabled, extra} = this.props;

		const {files, previewVisibleFile, previewVisibleType} = this.state;

		const uploadButton = (
			<div>
				<i className="far fa-plus" />
				<div className="ant-upload-text">{`Selecionar ${this.props.maxFiles > 1 ? 'arquivos' : 'arquivo'}`}</div>
			</div>
		);

		return (
			<div>
				{!!label && <label className={`form-label ${this.props.minFiles > 0 ? 'required' : ''}`}>{help ? <UILabelHelp title={label} content={help} /> : label}</label>}
				<div className="media-images-wrap">
					{(disabled && !files.length) ? (
						<Empty
							image={Empty.PRESENTED_IMAGE_SIMPLE}
						/>
					) : (
						<Upload
							accept={`.${this.props.acceptedFiles.join(",.")}`}
							listType="picture-card"
							className={`media-images-uploader ${disabled ? 'media-images-view' : ''}`}
							fileList={files}
							multiple={this.props.maxFiles > 1}
							onPreview={this.onPreviewFile}
							onRemove={this.onRemoveFile}
							beforeUpload={this.processFile}>
							{(disabled || files.length >= this.props.maxFiles) ? null : uploadButton}
						</Upload>
					)}
					{!!extra && <div className="extra">{extra}</div>}
				</div>
				<Modal wrapClassName="modal-image" visible={this.state.previewVisible} centered footer={null} destroyOnClose={true} onCancel={this.onHideFile}>
					{previewVisibleType === 'image' && <img src={previewVisibleFile} />}
					{previewVisibleType === 'video' && <video autoPlay controls loop={false}>
						<source src={previewVisibleFile} />
					</video>}
					{previewVisibleType === 'audio' && <audio autoPlay controls loop={false} muted={false}>
						<source src={previewVisibleFile} />
					</audio>}
				</Modal>
			</div>
		);
	}
}

export default UIUpload;
