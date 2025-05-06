// pages/admin/currentDrives.js
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

  // Define fetchDrives (keep existing logic)
  const fetchDrives = async () => {
    if (!user || !user.org_id) return; // Ensure user context is loaded
    console.log("Fetching drives..."); // Add log
    try {
      const response = await axios.get(`${apiUrl}/api/drives/organization/${user.org_id}/current`, {
        withCredentials: true,
      });
      setDrives(response.data);
      console.log("Drives state updated:", response.data);
    } catch (error) {
      console.error('Error fetching current drives:', error);
      // Handle error display if needed
    }
  };

  useEffect(() => {
    // Fetch drives when the component mounts or user changes
    fetchDrives();
  }, [user]); // Dependency on user ensures it runs after login/context update

  // *** MODIFIED FUNCTION ***
  // This function will be called AFTER the AddDriveModal successfully adds a drive.
  const handleDriveAddedSuccessfully = () => {
    console.log("Drive added callback triggered, re-fetching drives list...");
    fetchDrives(); // Re-fetch the list from the server
  };

  const handleDeleteDrive = async (driveId) => {
    // Keep existing logic...
    if (confirm('Are you sure you want to delete this drive?')) {
      try {
        await axios.delete(`${apiUrl}/api/drives/${driveId}`, { withCredentials: true });
        // Instead of filtering local state, re-fetch for consistency
        fetchDrives(); // Re-fetch after delete
      } catch (error) {
        console.error('Error deleting drive:', error);
      }
    }
  };

  // This function handles UPDATES from the EditDriveModal
  const handleDriveUpdated = () => {
    console.log("Drive update callback triggered, re-fetching drives list...");
    fetchDrives(); // Re-fetch after update
  };


  const triggerAddDriveModal = () => {
    openModal(MODAL_TYPES.ADD_DRIVE, {
      // *** PASS THE CORRECT CALLBACK ***
      onAddDrive: handleDriveAddedSuccessfully, // Pass the function that re-fetches
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
              // *** Pass handleDriveUpdated for the Edit modal callback ***
              onUpdateDrive={handleDriveUpdated}
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