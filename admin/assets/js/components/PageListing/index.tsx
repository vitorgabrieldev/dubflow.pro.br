import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { Badge, Button, Checkbox, Empty, Input, Pagination, Select, Spin, Typography } from "antd";
import QueueAnim from "rc-queue-anim";

class UIPageListing extends Component {
	static propTypes = {
		onSearch             : PropTypes.func,
		onSearchChange       : PropTypes.func,
		onPaginationChange   : PropTypes.func,
		onOrderChange        : PropTypes.func,
		onListTypeChange     : PropTypes.func,
		onFiltersClick       : PropTypes.func,
		onSelectItem         : PropTypes.func,
		isLoading            : PropTypes.bool,
		theme                : PropTypes.oneOf(["default", "small"]),
		listType             : PropTypes.oneOf(["list", "card"]),
		showListTypeChange   : PropTypes.bool,
		orderByField         : PropTypes.string,
		orderBySort          : PropTypes.string,
		orders               : PropTypes.arrayOf(
			PropTypes.shape({
				label  : PropTypes.string.isRequired,
				field  : PropTypes.string.isRequired,
				sort   : PropTypes.string.isRequired,
				default: PropTypes.bool,
			}),
		),
		enableSearch         : PropTypes.bool,
		search               : PropTypes.string,
		searchPlaceholder    : PropTypes.string,
		data                 : PropTypes.array,
		enablePagination     : PropTypes.bool,
		pagination           : PropTypes.object,
		columns              : PropTypes.arrayOf(
			PropTypes.shape({
				title    : PropTypes.string,
				className: PropTypes.string,
				width    : PropTypes.any,
				visible  : PropTypes.bool,
				render   : PropTypes.func.isRequired,
			}),
		),
		buttons              : PropTypes.arrayOf(
			PropTypes.shape({
				visible: PropTypes.bool.isRequired,
				onClick: PropTypes.func.isRequired,
				title  : PropTypes.string,
				icon   : PropTypes.any,
				loading: PropTypes.bool,
			}),
		),
		showFilters          : PropTypes.bool,
		totalFilters         : PropTypes.number,
		allowSelect          : PropTypes.bool,
		selectedItems        : PropTypes.arrayOf(PropTypes.number),
		renderOnItemsSelected: PropTypes.any,
		emptyProps           : PropTypes.object,
		appendSearch         : PropTypes.any,
	};

	static defaultProps = {
		onSearch             : () => null,
		onSearchChange       : () => null,
		onPaginationChange   : () => null,
		onOrderChange        : () => null,
		onListTypeChange     : () => null,
		onFiltersClick       : () => null,
		onSelectItem         : () => null,
		isLoading            : false,
		theme                : "default",
		listType             : "list",
		showListTypeChange   : true,
		orderByField         : "",
		orderBySort          : "",
		orders               : [],
		enableSearch         : true,
		search               : "",
		searchPlaceholder    : "Buscar por nome",
		data                 : [],
		enablePagination     : true,
		pagination           : {},
		columns              : [],
		buttons              : [],
		showFilters          : false,
		totalFilters         : 0,
		allowSelect          : false,
		selectedItems        : [],
		renderOnItemsSelected: null,
		emptyProps           : {},
		appendSearch         : null,
	};

	_renderEmpty = () => {
		return (
			<Empty {...this.props.emptyProps} />
		)
	};

	_renderList = () => {
		if( !this.props.data.length )
		{
			return this._renderEmpty();
		}

		const columns = this.props.columns.filter(column => !column.hasOwnProperty("visible") || column.visible);

		const {listType, allowSelect, selectedItems, enablePagination} = this.props;

		return (
			<div className={`list-items ${listType === "list" ? "list-type" : "card-type"}`}>
				{listType === "list" && <div className="list-items-header">
					<div className="row">
						{allowSelect && <div className="col col-select" data-title="" />}
						{columns.map((column, index) => {
							let columnProps = {
								key      : index,
								className: `col ${column.className || ""}`,
								style    : {},
							};

							if( column.width )
							{
								columnProps.style.maxWidth = column.width;
							}

							return (
								<div {...columnProps}>
									<div>{column.title}</div>
								</div>
							)
						})}
					</div>
				</div>}
				<QueueAnim type="bottom" className="list-items-body">
					{this.props.data.map((item, index) => (
						<div key={index} className={`list-items-item ${selectedItems.indexOf(item.id) !== -1 ? "selected" : ""}`}>
							<div className="row">
								{allowSelect && <div className="col col-select" data-title="">
									<div>
										<Checkbox
											onChange={(e) => this.props.onSelectItem(item, e.target.checked)}
											checked={selectedItems.indexOf(item.id) !== -1}
										/>
									</div>
								</div>}
								{columns.map((column, index) => {
									let columnProps = {
										key      : index,
										className: `col ${column.className || ""}`,
										style    : {},
									};

									if( column.width )
									{
										columnProps.style.maxWidth = column.width;
									}

									return (
										<div data-title={column.title} {...columnProps}>
											<div>{column.render(item)}</div>
										</div>
									)
								})}
							</div>
						</div>
					))}
				</QueueAnim>
				{enablePagination && <Pagination
					showSizeChanger={false}
					{...this.props.pagination}
					onChange={this.props.onPaginationChange}
				/>}
			</div>
		)
	};

	render() {
		return (
			<div className={`page-listing page-listing-${this.props.theme}`}>
				{this.props.selectedItems.length === 0 && <QueueAnim type="alpha">
					<div key="1" className="page-listing-header">
						{this.props.appendSearch}
						{this.props.enableSearch && <div className="search">
							<Input.Search
								placeholder={this.props.searchPlaceholder}
								onSearch={this.props.onSearch}
								onChange={this.props.onSearchChange}
								allowClear
								loading={this.props.isLoading}
								onPressEnter={(e) => {
									// Prevent parent form submit
									e.preventDefault();

									// Search
									this.props.onSearch(e.target.value);

									return false;
								}}
							/>
						</div>}
						{this.props.orders.length > 0 && <div className="order">
							<Select onChange={this.props.onOrderChange} value={`${this.props.orderByField}:${this.props.orderBySort}`}>
								{this.props.orders.map((item, index) => (
									<Select.Option key={index} value={`${item.field}:${item.sort}`}>{item.label}</Select.Option>
								))}
							</Select>
						</div>}
						<div className="btns">
							{this.props.showListTypeChange && <Button.Group className="btn-group-list-type">
								<Button type="primary" className={`action-btn ${this.props.listType === "list" && "active"}`} icon={<i className="fas fa-list-ul" />} shape="round" onClick={() => this.props.onListTypeChange("list")} />
								<Button type="primary" className={`action-btn ${this.props.listType === "card" && "active"}`} icon={<i className="fas fa-th" />} shape="round" onClick={() => this.props.onListTypeChange("card")} />
							</Button.Group>}
							{this.props.showFilters && <Button type="primary" className="action-btn" icon={<i className="fal fa-filter" />} onClick={this.props.onFiltersClick}><Badge showZero={false} offset={[8, -5]} count={this.props.totalFilters}>Filtros</Badge></Button>}
							<div style={{flex: 1}} />
							{this.props.buttons.map((button, index) => button.visible && <Button key={index} type="primary" className="action-btn" icon={button.icon} disabled={button.loading} loading={button.loading} onClick={button.onClick}>{button.title}</Button>)}
						</div>
					</div>
				</QueueAnim>}
				{this.props.allowSelect && this.props.selectedItems.length > 0 && <QueueAnim type="alpha">
					<div key="1" className="page-listing-header-selected-items">
						{this.props.renderOnItemsSelected}
					</div>
				</QueueAnim>}
				{this.props.search && <Typography.Paragraph>Buscando por <Typography.Text mark>{this.props.search}</Typography.Text></Typography.Paragraph>}
				<Spin spinning={this.props.isLoading} indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />}>
					{this._renderList()}
				</Spin>
			</div>
		)
	}
}

export default UIPageListing;
