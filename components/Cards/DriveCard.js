// components/Cards/DriveCard.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ChildList from './ChildList'; // Import ChildList
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
    e.stopPropagation(); // Prevent triggering the toggle of details
    openModal(MODAL_TYPES.EDIT_DRIVE, {
      drive,
      onUpdateDrive,
    });
  };

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
      role="button"
      aria-expanded={showDetails}
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter') setShowDetails(!showDetails);
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold mb-2">{drive.name}</h3>
          <p className="text-gray-600">{drive.description}</p>
        </div>
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()} // Prevent triggering the toggle of details
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter') setShowDetails(!showDetails);
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Manage Drive Donees
          </button>
          <button
            onClick={handleEdit}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Edit Drive Info
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-6">
          <p>
            <strong>Start Date:</strong> {new Date(drive.start_date).toLocaleDateString()}
          </p>
          <p>
            <strong>End Date:</strong> {new Date(drive.end_date).toLocaleDateString()}
          </p>
          <div className="mt-4">
            <ChildList driveId={drive.drive_id} />
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
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateDrive: PropTypes.func.isRequired,
};

export default DriveCard;