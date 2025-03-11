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
  if (!loading && (!user || !user.is_org_admin)) {
    router.push('/auth/login');
  }

  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
    itemsNeededApprox: 0,
    driveCategory: '',
    isItemOnly: false,
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
      // Additional fields can be included as needed.
    };

    try {
      // Post to the drive creation endpoint
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/drives`, payload, {
        withCredentials: true,
      });
      router.push('admin/currenDrives'); // Or another page indicating success
    } catch (err) {
      console.error('Error creating new drive:', err);
      alert('Failed to create drive. Please check your input and try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Create a New Drive</h2>
      <div className="space-y-4">
        <input
          type="date"
          name="startDate"
          value={driveData.startDate}
          onChange={handleChange}
          className="border px-3 py-2 w-full"
        />
        <input
          type="date"
          name="endDate"
          value={driveData.endDate}
          onChange={handleChange}
          className="border px-3 py-2 w-full"
        />
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
        <input
          type="number"
          name="itemsNeededApprox"
          value={driveData.itemsNeededApprox}
          onChange={handleChange}
          placeholder="Approximate number of items needed"
          className="border px-3 py-2 w-full"
          min={0}
        />
        <div className="flex space-x-2">
          <button
            type="button"
            className={`px-3 py-1 border rounded ${
              driveData.driveCategory === 'Angel Tree' ? 'bg-blue-300' : ''
            }`}
            onClick={() => handleChange({ target: { name: 'driveCategory', value: 'Angel Tree' } })}
          >
            Angel Tree
          </button>
          <button
            type="button"
            className={`px-3 py-1 border rounded ${
              driveData.driveCategory === 'Food & Meal' ? 'bg-blue-300' : ''
            }`}
            onClick={() => handleChange({ target: { name: 'driveCategory', value: 'Food & Meal' } })}
          >
            Food & Meal
          </button>
          <button
            type="button"
            className={`px-3 py-1 border rounded ${
              driveData.driveCategory === 'Clothing' ? 'bg-blue-300' : ''
            }`}
            onClick={() => handleChange({ target: { name: 'driveCategory', value: 'Clothing' } })}
          >
            Clothing
          </button>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="isItemOnly"
            checked={driveData.isItemOnly}
            onChange={handleChange}
            className="mr-2"
          />
          Make this drive item-only
        </label>
      </div>
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
