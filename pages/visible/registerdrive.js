// pages/registerdrive.js

import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { AuthContext } from 'contexts/AuthContext';

const NewDriveWizard = () => {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);

  // Redirect if the user is not logged in or not an org admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!user.is_org_admin) {
        router.push('/visible/registerorg');
      }
    }
  }, [user, loading, router]);

  // State for drive data; note the new "drivePhoto" field.
  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
    drivePhoto: null,
  });

  // Track current step for the wizard (3 steps now)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setDriveData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    } else {
      setDriveData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async () => {
    // Create a FormData instance to include the file
    const formData = new FormData();
    formData.append('name', driveData.driveTitle);
    formData.append('description', driveData.driveDescription);
    formData.append('start_date', driveData.startDate);
    formData.append('end_date', driveData.endDate);
    formData.append('photo', driveData.drivePhoto);

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/drives`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push('../admin/currentDrives');
    } catch (err) {
      console.error('Error creating new drive:', err);
      alert('Failed to create drive. Please check your input and try again.');
    }
  };

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Validate current step's fields
  let isStepValid = false;
  if (currentStep === 1) {
    isStepValid = driveData.driveTitle.trim() !== '' && driveData.driveDescription.trim() !== '';
  } else if (currentStep === 2) {
    isStepValid = driveData.startDate.trim() !== '' && driveData.endDate.trim() !== '';
  } else if (currentStep === 3) {
    isStepValid = driveData.drivePhoto !== null;
  }

  // Render fields based on the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <input
              type="text"
              name="driveTitle"
              value={driveData.driveTitle}
              onChange={handleChange}
              placeholder="Drive Title"
              className="border px-3 py-2 w-full"
              required
            />
            <textarea
              name="driveDescription"
              value={driveData.driveDescription}
              onChange={handleChange}
              placeholder="Drive Description"
              rows={3}
              className="border px-3 py-2 w-full"
              required
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold my-2">Start Date</h3>
              <input
                type="date"
                name="startDate"
                value={driveData.startDate}
                onChange={handleChange}
                className="border px-3 py-2 w-full"
                required
              />
            </div>
            <div>
              <h3 className="text-xl font-bold my-2">End Date</h3>
              <input
                type="date"
                name="endDate"
                value={driveData.endDate}
                onChange={handleChange}
                className="border px-3 py-2 w-full"
                required
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700">Drive Photo</span>
              <input
                type="file"
                name="drivePhoto"
                onChange={handleChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-700 file:text-white hover:file:bg-teal-800"
                required
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 py-32">
      <h2 className="text-2xl font-bold mb-4">Create a New Drive</h2>
      {renderStep()}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <button
            onClick={prevStep}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        )}
        <button
          onClick={nextStep}
          disabled={!isStepValid}
          className={`bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 ml-auto ${
            !isStepValid ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {currentStep === totalSteps ? 'Create Drive' : 'Next'}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded">
          <div
            style={{ width: `${progressPercentage}%` }}
            className="bg-teal-700 text-xs font-medium text-blue-100 text-center p-1 leading-none rounded"
          >
            {progressPercentage}%
          </div>
        </div>
        <p className="text-center mt-2">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;
