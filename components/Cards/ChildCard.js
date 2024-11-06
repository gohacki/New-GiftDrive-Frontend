// components/Cards/ChildCard.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ItemList from './ItemList';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';

const ChildCard = ({ child, onDelete, onUpdateChild }) => {
  const [showItems, setShowItems] = useState(false);
  const { openModal } = useModal();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this child? This action cannot be undone.')) {
      onDelete(child.child_id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent triggering the toggle of ItemList
    openModal(MODAL_TYPES.EDIT_CHILD, {
      child,
      onUpdateChild,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setShowItems(!showItems)}
      >
        <div className="flex items-center space-x-4">
          <img
            src={child.child_photo}
            alt={`${child.child_name}'s profile`}
            className="w-16 h-16 object-cover rounded-full"
          />
          <h5 className="text-lg font-medium">{child.child_name}</h5>
        </div>
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()} // Prevent triggering the toggle of ItemList
        >
          <button
            onClick={handleEdit}
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {showItems && (
        <div className="mt-4">
          <ItemList childId={child.child_id} />
        </div>
      )}
    </div>
  );
};

ChildCard.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    child_photo: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired,
};

export default ChildCard;