// pages/registerdrive.js

import React, { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { AuthContext } from 'contexts/AuthContext';

const NewDriveWizard = () => {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);

  // If the user is not logged in or not an org admin, you might want to redirect them to login or organization registration
  if (!loading && (!user)) {
    router.push('/auth/login');
  }
  else if (!loading && (!user.is_org_admin)) {
    router.push('/visible/registerorg');
  }



  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDriveData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'itemsNeededApprox' ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    const payload = {
      name: driveData.driveTitle, // maps to drive's name field in your database
      description: driveData.driveDescription,
      start_date: driveData.startDate,
      end_date: driveData.endDate,
    };

    try {
      // Post to the drive creation endpoint
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/drives`, payload, {
        withCredentials: true,
      });
      router.push('../admin/currentDrives'); // Or another page indicating success
    } catch (err) {
      console.error('Error creating new drive:', err);
      alert('Failed to create drive. Please check your input and try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-32">
      <h2 className="text-2xl font-bold mb-4">Create a New Drive</h2>
      <div className="space-y-4">
        <input
          type="text"
          name="driveTitle"
          value={driveData.driveTitle}
          onChange={handleChange}
          placeholder="Drive Title"
          className="border px-3 py-2 w-full"
        />
        <textarea
          name="driveDescription"
          value={driveData.driveDescription}
          onChange={handleChange}
          placeholder="Drive Description"
          rows={3}
          className="border px-3 py-2 w-full"
        />
      </div>
      <h3 className="text-xl font-bold my-2">Start Date</h3>
      <input
          type="date"
          name="startDate"
          value={driveData.startDate}
          onChange={handleChange}
          className="border px-3 py-2 w-full"
        />
        <h3 className="text-xl font-bold my-2">End Date</h3>
        <input
          type="date"
          name="endDate"
          value={driveData.endDate}
          onChange={handleChange}
          className="border px-3 py-2 w-full"
        />
      <button
        onClick={handleSubmit}
        className="mt-6 bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800"
      >
        Create Drive
      </button>
    </div>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;
