// pages/register-org.js

import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { AuthContext } from 'contexts/AuthContext';

const RegisterOrganization = () => {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);

  // If not loading and no user, force login
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user && user.is_org_admin) {
        router.push('/visible/registerdrive');
      }
    }
  }, [user, loading, router]);

  // State to hold form data
  const [orgData, setOrgData] = useState({
    orgName: '',
    orgWebsite: '',
    orgDescription: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    orgPhoto: null,
  });

  // Track the current step of the wizard
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Update form state on input change
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'orgPhoto') {
      setOrgData((prev) => ({
        ...prev,
        orgPhoto: files[0],
      }));
    } else {
      setOrgData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Submit the form when finished
  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('name', orgData.orgName);
    formData.append('description', orgData.orgDescription);
    formData.append('address', orgData.streetAddress);
    formData.append('city', orgData.city);
    formData.append('state', orgData.state);
    formData.append('zip_code', orgData.zipCode);
    formData.append('website_link', orgData.orgWebsite);
    formData.append('photo', orgData.orgPhoto);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/register`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      router.push('visible/registerdrive');
    } catch (err) {
      console.error('Error registering organization:', err);
      alert('Failed to register organization. Please check your input and try again.');
    }
  };

  // Navigate to next step or submit if on final step
  const nextStep = () => {
    // Validate required fields for current step
    if (currentStep === 1) {
      if (!orgData.orgName || !orgData.orgWebsite || !orgData.orgDescription) {
        alert('Please fill in all required fields.');
        return;
      }
    } else if (currentStep === 2) {
      if (!orgData.streetAddress || !orgData.city || !orgData.state || !orgData.zipCode) {
        alert('Please fill in all required fields.');
        return;
      }
    } else if (currentStep === 3) {
      if (!orgData.orgPhoto) {
        alert('Please upload a photo of your organization.');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  // Navigate back to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Render fields based on the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <input
              type="text"
              name="orgName"
              value={orgData.orgName}
              onChange={handleChange}
              placeholder="Organization Name"
              required
              className="border px-3 py-2 w-full"
            />
            <input
              type="text"
              name="orgWebsite"
              value={orgData.orgWebsite}
              onChange={handleChange}
              placeholder="Organization Website"
              required
              className="border px-3 py-2 w-full"
            />
            <textarea
              name="orgDescription"
              value={orgData.orgDescription}
              onChange={handleChange}
              placeholder="Organization Description"
              required
              className="border px-3 py-2 w-full"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <input
              type="text"
              name="streetAddress"
              value={orgData.streetAddress}
              onChange={handleChange}
              placeholder="Street Address"
              required
              className="border px-3 py-2 w-full"
            />
            <div className="flex space-x-4">
              <input
                type="text"
                name="city"
                value={orgData.city}
                onChange={handleChange}
                placeholder="City"
                required
                className="border px-3 py-2 w-full"
              />
              <input
                type="text"
                name="state"
                value={orgData.state}
                onChange={handleChange}
                placeholder="State"
                required
                className="border px-3 py-2 w-full"
              />
            </div>
            <input
              type="text"
              name="zipCode"
              value={orgData.zipCode}
              onChange={handleChange}
              placeholder="Zip Code"
              required
              className="border px-3 py-2 w-full"
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <input
              type="file"
              name="orgPhoto"
              onChange={handleChange}
              accept="image/*"
              required
              className="border px-3 py-2 w-full"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 pt-40 pb-32">
      <h2 className="text-2xl font-bold mb-4">Register Your Organization</h2>
      {renderStep()}

      

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
      <div className="w-full mr-8">
      <p className="text-center mt-2">
          Step {currentStep} of {totalSteps}
        </p>
        <div className="w-full bg-gray-200 rounded-full">
        <div
          style={{ width: `${Math.round(progressPercentage)}%` }}
          className="bg-ggreen text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full"
        >
          {Math.round(progressPercentage)}%
        </div>
      </div>


      </div>

        {currentStep > 1 && (
          <button
            onClick={prevStep}
            className="border-2 border-ggreen text-ggreen px-12 py-3 rounded-full hover:bg-ggreen hover:text-white ml-auto"
          >
            Back
          </button>
        )}
        <button
          onClick={nextStep}
          className="bg-ggreen text-white px-12 py-3 rounded-full hover:bg-teal-800 ml-12"
        >
          {currentStep === totalSteps ? 'Submit' : 'Next'}
        </button>

      </div>
    </div>
  );
};

RegisterOrganization.layout = Auth;
export default RegisterOrganization;
