import React, { useState } from 'react';
import PropTypes from 'prop-types';
import EditDriveModal from '../Modals/EditDriveModal';
import ChildList from './ChildList'; // Import ChildList

const DriveCard = ({ drive, onDelete, onUpdateDrive }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEditDriveModal, setShowEditDriveModal] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div onClick={() => setShowDetails(!showDetails)} className="cursor-pointer">
        <h3 className="text-xl font-bold mb-2">{drive.name}</h3>
        <p className="text-gray-600">{drive.description}</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={() => setShowEditDriveModal(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(drive.drive_id)}
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
            <ChildList driveId={drive.drive_id} /> {/* Include ChildList */}
          </div>
        </div>
      )}

      {showEditDriveModal && (
        <EditDriveModal
          drive={drive}
          onClose={() => setShowEditDriveModal(false)}
          onUpdateDrive={onUpdateDrive}
        />
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