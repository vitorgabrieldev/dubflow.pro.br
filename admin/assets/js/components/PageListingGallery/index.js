import React, { useEffect, useState } from "react";
import * as PropTypes from "prop-types";
import { Empty, Modal, Spin } from "antd";
import {
	DndContext,
	closestCenter,
	MouseSensor,
	TouchSensor,
	DragOverlay,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	rectSortingStrategy,
} from '@dnd-kit/sortable';

import Item from './item';

function UIPageListingGallery(props) {
	const [items, setItems]       = useState([]);
	const [activeId, setActiveId] = useState(null);
	const sensors                 = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

	// Images
	const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
	const [imagePreviewImage, setImagePreviewImage]     = useState('');

	useEffect(() => {
		setItems(props.data);
	}, [props.data]);

	function handleDragStart(e) {
		setActiveId(e.active.id);
	}

	function handleDragEnd(e) {
		const {active, over} = e;

		if( active.id !== over.id )
		{
			setItems((items) => {
				const oldIndex = items.findIndex(item => item.uuid === active.id);
				const newIndex = items.findIndex(item => item.uuid === over.id);

				const newItems = arrayMove(items, oldIndex, newIndex);

				props.onChangeOrder(newItems);

				return newItems;
			});
		}

		setActiveId(null);
	}

	function handleDragCancel() {
		setActiveId(null);
	}

	function openItem(item) {
		setImagePreviewImage(item.file);
		setImagePreviewVisible(true);
	}

	function _renderEmpty() {
		return (
			<Empty {...props.emptyProps} />
		)
	}

	function _renderList() {
		if( !props.data.length )
		{
			return _renderEmpty();
		}

		const isEditMode = props.mode === 'edit';

		return (
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}>
				<SortableContext items={items} strategy={rectSortingStrategy}>
					<div className="listing-gallery-items">
						{items.map((item, index) => (
							<Item
								key={item.uuid}
								openItem={openItem}
								activateDeactivateItem={props.onActivateDeactivateItem}
								deleteItem={props.onDeleteItem}
								changeDescription={props.onChangeDescription}
								item={item}
								mode={props.mode}
							/>
						))}
					</div>
				</SortableContext>
				{isEditMode && <DragOverlay adjustScale={true}>
					{activeId ? (
						<Item
							item={items.find(item => item.uuid === activeId)}
							openItem={null}
							activateDeactivateItem={null}
							deleteItem={null}
							changeDescription={null}
							dragOverlay={true}
							mode={props.mode}
						/>
					) : null}
				</DragOverlay>}
			</DndContext>
		)
	}

	return (
		<div className="listing-gallery">
			<Spin spinning={props.isLoading} indicator={<i className="fad fa-spinner-third fa-spin fa-3x" />}>
				{_renderList()}
			</Spin>
			<Modal wrapClassName="modal-image" visible={imagePreviewVisible} centered footer={null} destroyOnClose={true} onCancel={() => setImagePreviewVisible(false)}>
				<img src={imagePreviewImage} />
			</Modal>
		</div>
	)
}

UIPageListingGallery.propTypes = {
	onDeleteItem            : PropTypes.func,
	onActivateDeactivateItem: PropTypes.func,
	onChangeOrder           : PropTypes.func,
	onChangeDescription     : PropTypes.func,
	isLoading               : PropTypes.bool,
	data                    : PropTypes.array,
	mode                    : PropTypes.oneOf(['show', 'edit']).isRequired,
};

UIPageListingGallery.defaultProps = {
	onDeleteItem            : () => null,
	onActivateDeactivateItem: () => null,
	onChangeOrder           : () => null,
	onChangeDescription     : () => null,
	isLoading               : false,
	data                    : [],
	mode                    : 'edit',
};

export default UIPageListingGallery;
