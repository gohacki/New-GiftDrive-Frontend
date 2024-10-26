import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import DriveCard from '../../components/Cards/DriveCard';
import { AuthContext } from '../../contexts/AuthContext';

import Admin from "layouts/Admin.js";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const PastDrives = () => {
  const [drives, setDrives] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.org_id) {
      fetchPastDrives();
    }
  }, [user]);

  const fetchPastDrives = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/drives/organization/${user.org_id}/past`,
        { withCredentials: true }
      );
      setDrives(response.data);
    } catch (error) {
      console.error('Error fetching past drives:', error);
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (confirm('Are you sure you want to delete this drive? This action cannot be undone.')) {
      try {
        await axios.delete(`${apiUrl}/api/drives/${driveId}`, { withCredentials: true });
        setDrives(drives.filter((drive) => drive.drive_id !== driveId));
      } catch (error) {
        console.error('Error deleting drive:', error);
      }
    }
  };

  const handleUpdateDrive = (updatedDrive) => {
    setDrives((prevDrives) =>
      prevDrives.map((drive) =>
        drive.drive_id === updatedDrive.drive_id ? updatedDrive : drive
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-32">
      <h2 className="text-2xl font-semibold mb-4">Past Drives</h2>

      {drives.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {drives.map((drive) => (
            <DriveCard
              key={drive.drive_id}
              drive={drive}
              onDelete={handleDeleteDrive}
              onUpdateDrive={handleUpdateDrive}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-10">No past drives available.</p>
      )}
    </div>
  );
};

PastDrives.layout = Admin;

export default PastDrives;