import React, { Component, Fragment } from "react";
import * as PropTypes from "prop-types";
import { Popover } from "antd";

class UILabelHelp extends Component {
	static propTypes = {
		title    : PropTypes.any,
		content  : PropTypes.any,
		placement: PropTypes.oneOf(['top', 'left', 'right', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom']),
	};

	static defaultProps = {
		title    : "",
		content  : "",
		placement: "top",
	};

	constructor(props) {
		super(props);

		this.state = {
			visible: false,
		};
	}

	show = (visible) => {
		this.setState({visible});
	};

	render() {
		const {title, content, placement} = this.props;

		const {visible} = this.state;

		return (
			<Fragment>
				{!!title && title}
				<Popover
					visible={visible}
					trigger="click"
					placement={placement}
					content={content}
					onVisibleChange={this.show}
					overlayClassName="field-help-tooltip">
					<i className="fas fa-info-circle field-help-icon" />
				</Popover>
			</Fragment>
		);
	}
}

export default UILabelHelp;
