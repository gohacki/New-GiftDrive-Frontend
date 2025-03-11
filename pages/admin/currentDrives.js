// pages/CurrentDrives.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import DriveCard from '../../components/Cards/DriveCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import { AuthContext } from '../../contexts/AuthContext';
import Admin from 'layouts/Admin.js';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const CurrentDrives = () => {
  const [drives, setDrives] = useState([]);
  const { openModal } = useModal();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.org_id) {
      fetchDrives();
    }
  }, [user]);

  const fetchDrives = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/drives/organization/${user.org_id}/current`, {
        withCredentials: true,
      });
      setDrives(response.data);
    } catch (error) {
      console.error('Error fetching current drives:', error);
    }
  };
  
  const handleAddDrive = (newDrive) => {
    setDrives([...drives, newDrive]);
  };

  const handleDeleteDrive = async (driveId) => {
    if (confirm('Are you sure you want to delete this drive?')) {
      try {
        await axios.delete(`${apiUrl}/api/drives/${driveId}`, { withCredentials: true });
        setDrives(drives.filter((drive) => drive.drive_id !== driveId));
      } catch (error) {
        console.error('Error deleting drive:', error);
      }
    }
  };

  const triggerAddDriveModal = () => {
    openModal(MODAL_TYPES.ADD_DRIVE, {
      onAddDrive: handleAddDrive,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Current Drives</h2>
        <button
          onClick={triggerAddDriveModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Drive
        </button>
      </div>

      {drives.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {drives.map((drive) => (
            <DriveCard
              key={drive.drive_id}
              drive={drive}
              onDelete={handleDeleteDrive}
              onUpdateDrive={fetchDrives}
            />
          ))}
        </div>
      ) : (
        <p>No current drives available.</p>
      )}
    </div>
  );
};

CurrentDrives.layout = Admin;

export default CurrentDrives;