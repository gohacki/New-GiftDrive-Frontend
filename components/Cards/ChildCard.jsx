// File: components/Cards/ChildCard.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import axios from 'axios';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// REMOVED: Validate apiUrl block
// if (!apiUrl) {
//   throw new Error('NEXT_PUBLIC_API_URL is not defined');
// }

const ChildCard = ({ child, onDelete, onUpdateChild }) => {
  const { openModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEdit = async (e) => {
    if (e) {
      e.stopPropagation();
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch child details
      // UPDATED to relative path
      const childResponse = await axios.get(
        `/api/children/${child.child_id}`,
        { withCredentials: true }
      );

      // Fetch child items
      // UPDATED to relative path
      const itemsResponse = await axios.get(
        `/api/children/${child.child_id}/items`,
        { withCredentials: true }
      );

      const mergedChild = {
        ...childResponse.data,
        items: itemsResponse.data,
      };

      openModal(MODAL_TYPES.EDIT_CHILD, {
        child: mergedChild,
        onUpdateChild, // This prop is passed to EditChildModal
      });
    } catch (err) {
      console.error('Error fetching child data for edit:', err);
      setError('Failed to load child data for editing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleEdit}
      role="button" // Added for accessibility
      tabIndex={0} // Added for accessibility
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEdit(e); }} // Added for accessibility
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
          onClick={(e) => e.stopPropagation()} // Prevent triggering handleEdit from button clicks
        >
          <button
            onClick={handleEdit} // Explicitly call handleEdit here too
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Edit'}
          </button>
          <button
            onClick={() => onDelete(child.child_id)} // Assuming onDelete is passed from parent
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
    // 'items' prop is not directly used by ChildCard but fetched within handleEdit.
    // It's good practice for the parent (ChildList) to ensure child objects passed to ChildCard
    // have at least the IDs and names, even if detailed items are fetched on demand by the modal.
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired, // This is passed to the EditChildModal
};

export default ChildCard;