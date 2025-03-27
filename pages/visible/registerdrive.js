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

  // State for drive data
  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
    drivePhoto: null,
  });

  // Track current step (3 steps)
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
            <h2 className="text-2xl font-bold mb-4">First, Let&apos;s Set Up Your Drive</h2>
            <h3 className="text-lg font-semibold">Drive Title</h3>
            <input
              type="text"
              name="driveTitle"
              value={driveData.driveTitle}
              onChange={handleChange}
              placeholder="e.g. Food Drive 2025"
              required
              className="border px-3 py-2 w-full rounded"
            />
            <h3 className="text-lg font-semibold">Drive Description</h3>
            <textarea
              name="driveDescription"
              value={driveData.driveDescription}
              onChange={handleChange}
              placeholder="Describe your drive..."
              required
              className="border px-3 py-2 w-full rounded"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mb-4">Set the Dates for Your Drive</h2>
            <div className="flex space-x-4">
              <div className="w-1/2">
                <h3 className="text-lg font-semibold">Start Date</h3>
                <input
                  type="date"
                  name="startDate"
                  value={driveData.startDate}
                  onChange={handleChange}
                  required
                  className="border px-3 py-2 w-full rounded"
                />
              </div>
              <div className="w-1/2">
                <h3 className="text-lg font-semibold">End Date</h3>
                <input
                  type="date"
                  name="endDate"
                  value={driveData.endDate}
                  onChange={handleChange}
                  required
                  className="border px-3 py-2 w-full rounded"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <label className="block text-lg font-semibold">Pick a Photo For Your Drive</label>
            <div className="mb-4 border-2 border-dashed border-gray-300 p-4 rounded text-center">
              <p>No image selected. Please upload your drive&apos;s photo.</p>
            </div>
            <input
              type="file"
              name="drivePhoto"
              onChange={handleChange}
              accept="image/*"
              required
              className="hidden"
              id="drivePhotoInput"
            />
            <label
              htmlFor="drivePhotoInput"
              className="cursor-pointer inline-block bg-ggreen text-white px-6 py-2 rounded-full hover:bg-teal-800"
            >
              Choose Photo
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
    <div className="container mx-auto px-4 min-h-screen flex flex-col pt-40 pb-64">
      {/* Main Content */}
      <div className="flex-1">
        {renderStep()}
      </div>

      {/* Footer / Navigation Buttons */}
      <div className="mt-12 flex">
        <div className="w-full mr-8">
          <div className="w-full bg-gray-200 rounded-full">
            <div
              style={{ width: `${Math.round(progressPercentage)}%` }}
              className="bg-ggreen text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full"
            />
          </div>
          <p className="text-center mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="flex justify-between">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="border-2 border-ggreen text-ggreen px-12 py-3 mr-4 rounded-full hover:bg-ggreen hover:text-white"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!isStepValid}
            className={`border-2 border-ggreen bg-ggreen text-white px-12 py-3 rounded-full hover:bg-teal-800 ${
              !isStepValid ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {currentStep === totalSteps ? 'Create Drive' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;
