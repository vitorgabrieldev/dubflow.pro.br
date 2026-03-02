import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Dropdown, Input, Menu, Spin, Tag } from 'antd';

export default function SortableItem({item, mode, openItem, activateDeactivateItem, deleteItem, changeDescription, dragOverlay}) {
	const sortable = useSortable({id: item.uuid});

	const {attributes, listeners, setNodeRef, transform, transition} = sortable;

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const menu = (
		<Menu className="actions-dropdown-menu">
			<Menu.Item key="activate/deactivate" className="divider">
				<a onClick={() => activateDeactivateItem(item, !item.is_active)}>
					{item.is_active ? <i className="fal fa-eye-slash" /> : <i className="fal fa-eye" />}{item.is_active ? "Desativar" : "Ativar"}
				</a>
			</Menu.Item>
			<Menu.Item key="delete" className="divider btn-delete">
				<a onClick={() => deleteItem(item)}>
					<i className="fal fa-trash" />Excluir
				</a>
			</Menu.Item>
		</Menu>
	)

	const isEditMode = mode === 'edit';

	return (
		<div className={`listing-gallery-item ${dragOverlay ? 'drag-overlay' : ''}`} ref={setNodeRef} style={style}>
			<figure onClick={() => openItem(item)}>
				<img src={item.file_sizes.admin_listing_medium} />
			</figure>
			<div className="content">
				{isEditMode ? (
					<Input.TextArea
						maxLength={400}
						autoSize={{minRows: 3, maxRows: 3}}
						placeholder="Descrição"
						defaultValue={item.description}
						onBlur={(e) => e.target.value !== (item.description ?? '') ? changeDescription(item, e.target.value) : null}
						disabled={item.is_editing_description ?? false}
					/>
				):(
					<div className="description-show-mode">{item.description}</div>
				)}
				{item.is_editing_description && <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} />}
			</div>
			<div className="btns">
				{item.is_activating ? <Spin indicator={<i className="fad fa-spinner-third fa-spin" />} /> : <Tag color={item.is_active ? "#0acf97" : "#fa5c7c"}>{item.is_active ? "Ativo" : "Inativo"}</Tag>}
				{isEditMode && <span className="order-handle fal fa-arrows"  {...attributes} {...listeners} />}
				{isEditMode && <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
					<Button icon={<i className="fal fa-ellipsis-v" />} />
				</Dropdown>}
			</div>
		</div>
	);
}