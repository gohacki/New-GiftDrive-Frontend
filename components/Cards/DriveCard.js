import React, { useState } from 'react';
import EditDriveModal from '../Modals/EditDriveModal';

const DriveCard = ({ drive, onDelete, onUpdateDrive }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showEditDriveModal, setShowEditDriveModal] = useState(false);

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <div onClick={() => setShowDetails(!showDetails)} className="cursor-pointer">
        <h3 className="text-lg font-bold">{drive.name}</h3>
        <p>{drive.description}</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={() => setShowEditDriveModal(true)}
            className="bg-yellow-500 text-white px-2 py-1 rounded"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(drive.drive_id)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4">
          <p><strong>Start Date:</strong> {new Date(drive.start_date).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> {new Date(drive.end_date).toLocaleDateString()}</p>
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

export default DriveCard;