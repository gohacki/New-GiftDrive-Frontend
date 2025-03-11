// components/Cards/DriveCard.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ChildList from './ChildList';
import DriveItemList from './DriveItemList'; // NEW IMPORT
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';

const DriveCard = ({ drive, onDelete, onUpdateDrive }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { openModal } = useModal();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this drive?')) {
      onDelete(drive.drive_id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent toggling details
    openModal(MODAL_TYPES.EDIT_DRIVE, {
      drive,
      onUpdateDrive,
    });
  };

  // Toggle the details section
  const toggleDetails = (e) => {
    // If triggered by keyboard enter or direct click, toggle
    if (!e.key || e.key === 'Enter') {
      setShowDetails((prev) => !prev);
    }
  };

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={toggleDetails}
      role="button"
      aria-expanded={showDetails}
      tabIndex={0}
      onKeyPress={toggleDetails}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold mb-2">{drive.name}</h3>
          <p className="text-gray-600">{drive.description}</p>
        </div>
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()} // Stop from toggling details
        >
          {/* Manage Items or Children */}
          <button
            onClick={toggleDetails}
            aria-expanded={showDetails}
            tabIndex={0}
            onKeyPress={toggleDetails}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Manage
          </button>
          {/* Edit Drive Info */}
          <button
            onClick={handleEdit}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Edit
          </button>
          {/* Delete Drive */}
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-6">
          <p>
            <strong>Start Date:</strong>{' '}
            {new Date(drive.start_date).toLocaleDateString()}
          </p>
          <p>
            <strong>End Date:</strong>{' '}
            {new Date(drive.end_date).toLocaleDateString()}
          </p>
          <div className="mt-4">
            {/* If drive.is_item_only, show DriveItemList; else ChildList */}
            {drive.is_item_only ? (
              <DriveItemList driveId={drive.drive_id} />
            ) : (
              <ChildList driveId={drive.drive_id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

DriveCard.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    start_date: PropTypes.string.isRequired,
    end_date: PropTypes.string.isRequired,
    is_item_only: PropTypes.bool, // added
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateDrive: PropTypes.func.isRequired,
};

export default DriveCard;
