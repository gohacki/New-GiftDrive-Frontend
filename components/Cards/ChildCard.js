// components/Cards/ChildCard.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Validate apiUrl
if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const ChildCard = ({ child, onDelete, onUpdateChild }) => {
  const { openModal } = useModal();
  const [loading, setLoading] = useState(false); // Optional: To handle loading state
  const [error, setError] = useState(null); // Optional: To handle errors

  /**
   * Handles the edit action by fetching the latest child data and opening the modal.
   */
  const handleEdit = async (e) => {
    // If this function is called from the card's onClick, prevent default behavior
    if (e) {
      e.stopPropagation(); // Prevent triggering other onClick events
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch child details
      const childResponse = await axios.get(
        `${apiUrl}/api/children/${child.child_id}`,
        { withCredentials: true }
      );

      // Fetch child items
      const itemsResponse = await axios.get(
        `${apiUrl}/api/children/${child.child_id}/items`,
        { withCredentials: true }
      );

      const mergedChild = {
        ...childResponse.data,
        items: itemsResponse.data,
      };

      openModal(MODAL_TYPES.EDIT_CHILD, {
        child: mergedChild,
        onUpdateChild,
      });
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('Failed to load child data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleEdit} // Set onClick to handleEdit
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {child.child_photo && (
            <img
              src={child.child_photo}
              alt={`${child.child_name}'s profile`}
              className="w-16 h-16 object-cover rounded-full"
            />
          )}
          <h5 className="text-lg font-medium">{child.child_name}</h5>
        </div>
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()} // Prevent triggering handleEdit
        >
          <button
            onClick={handleEdit}
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(child.child_id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-500 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

ChildCard.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    child_photo: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number,
        child_id: PropTypes.number,
        item_id: PropTypes.number,
        item_name: PropTypes.string,
        description: PropTypes.string,
        price: PropTypes.number,
        item_photo: PropTypes.string,
        quantity: PropTypes.number,
        users_with_item_in_cart: PropTypes.number,
      })
    ),
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired,
};

export default ChildCard;
