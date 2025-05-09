// pages/visible/registerorg.js (or similar component for org registration)
import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js'; // Assuming you use this layout
import { AuthContext } from 'contexts/AuthContext'; // Assuming path

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const RegisterOrganization = () => {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useContext(AuthContext); // Add setUser

  const [orgData, setOrgData] = useState({
    orgName: '',
    orgWebsite: '',
    orgDescription: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '', // <<< NEW FIELD
    orgPhoto: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Or however many steps you have
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user && user.is_org_admin) {
        // If already an org admin, maybe redirect to dashboard or drive creation
        router.push('/admin/dashboard'); // Or /visible/registerdrive
      }
    }
  }, [user, authLoading, router]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'orgPhoto') {
      const file = files[0];
      setOrgData((prev) => ({ ...prev, orgPhoto: file }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(file ? URL.createObjectURL(file) : null);
    } else {
      setOrgData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError(''); // Clear error on change
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!orgData.orgName || !orgData.phone || !orgData.streetAddress /* add other required fields */) {
      setFormError('Please fill in all required fields, including organization name and phone.');
      return;
    }

    const formData = new FormData();
    formData.append('name', orgData.orgName);
    formData.append('description', orgData.orgDescription);
    formData.append('address', orgData.streetAddress);
    formData.append('city', orgData.city);
    formData.append('state', orgData.state);
    formData.append('zip_code', orgData.zipCode);
    formData.append('website_link', orgData.orgWebsite);
    formData.append('phone', orgData.phone); // <<< ADD PHONE TO FORMDATA
    if (orgData.orgPhoto) {
      formData.append('photo', orgData.orgPhoto);
    }

    try {
      const response = await axios.post(
        `${apiUrl}/api/organizations/register`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      // Update user context after successful org registration
      if (user && response.data.org_id) {
        setUser(prevUser => ({
          ...prevUser,
          is_org_admin: true,
          org_id: response.data.org_id
        }));
      }
      router.push('/visible/registerdrive'); // Or /admin/dashboard
    } catch (err) {
      console.error('Error registering organization:', err.response?.data || err);
      setFormError(err.response?.data?.error || 'Failed to register organization. Please try again.');
    }
  };

  const nextStep = () => {
    // Add validation for current step before proceeding
    if (currentStep === 1 && (!orgData.orgName || !orgData.orgDescription || !orgData.orgWebsite)) {
      setFormError('Please fill in Organization Name, Description, and Website.');
      return;
    }
    if (currentStep === 2 && (!orgData.streetAddress || !orgData.city || !orgData.state || !orgData.zipCode || !orgData.phone)) {
      setFormError('Please fill in all address fields, including Phone Number.');
      return;
    }
    // No specific validation for step 3 photo upload here, handled by submit

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

  // Render fields based on the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1: // Organization Details
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 1: Organization Details</h2>
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Organization Name <span className="text-red-500">*</span></label>
              <input type="text" name="orgName" id="orgName" value={orgData.orgName} onChange={handleChange} placeholder="e.g. The Giving Tree Foundation" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div>
              <label htmlFor="orgWebsite" className="block text-sm font-medium text-gray-700">Organization Website <span className="text-red-500">*</span></label>
              <input type="url" name="orgWebsite" id="orgWebsite" value={orgData.orgWebsite} onChange={handleChange} placeholder="https://example.org" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div>
              <label htmlFor="orgDescription" className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
              <textarea name="orgDescription" id="orgDescription" value={orgData.orgDescription} onChange={handleChange} rows="3" placeholder="A brief description of your organization's mission." required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"></textarea>
            </div>
          </div>
        );
      case 2: // Address and Phone
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 2: Contact Information</h2>
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">Street Address <span className="text-red-500">*</span></label>
              <input type="text" name="streetAddress" id="streetAddress" value={orgData.streetAddress} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                <input type="text" name="city" id="city" value={orgData.city} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">State/Province <span className="text-red-500">*</span></label>
                <input type="text" name="state" id="state" value={orgData.state} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">ZIP/Postal Code <span className="text-red-500">*</span></label>
                <input type="text" name="zipCode" id="zipCode" value={orgData.zipCode} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
              <div> {/* <<< PHONE INPUT FIELD ADDED HERE >>> */}
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(e.g., +12125551212)</span>
                </label>
                <input type="tel" name="phone" id="phone" value={orgData.phone} onChange={handleChange} placeholder="+1XXXXXXXXXX" required pattern="\+[0-9]{1,3}[0-9]{9,14}" title="Enter phone in E.164 format, e.g., +12125551212" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
            </div>
          </div>
        );
      case 3: // Photo Upload
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 3: Organization Photo</h2>
            {previewUrl ? (
              <div className="mb-4 flex justify-center">
                <img src={previewUrl} alt="Preview" className="max-h-48 rounded shadow-md" />
              </div>
            ) : (
              <div className="mb-4 border-2 border-dashed border-gray-300 p-6 rounded text-center text-gray-500">
                Upload a logo or photo for your organization.
              </div>
            )}
            <div className="flex justify-center">
              <input type="file" name="orgPhoto" onChange={handleChange} accept="image/*" className="hidden" id="orgPhotoInput" />
              <label htmlFor="orgPhotoInput" className="cursor-pointer inline-block bg-ggreen text-white px-6 py-3 rounded-full hover:bg-teal-800 transition-colors">
                {orgData.orgPhoto ? "Change Photo" : "Choose Photo"}
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center pt-10 pb-20">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl">
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {formError}
          </div>
        )}
        {renderStep()}

        <div className="mt-12">
          <div className="w-full bg-gray-200 rounded-full mb-2">
            <div style={{ width: `${Math.round(progressPercentage)}%` }} className="bg-ggreen text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full h-2"></div>
          </div>
          <p className="text-center text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mt-8 flex justify-between">
          {currentStep > 1 && (
            <button onClick={prevStep} className="border-2 border-ggreen text-ggreen px-8 py-3 rounded-full hover:bg-ggreen hover:text-white transition-colors">
              Back
            </button>
          )}
          {/* Spacer to push Next/Submit button to the right if "Back" is not visible */}
          {currentStep === 1 && <div className="w-20"></div>}
          <button onClick={nextStep} className="border-2 border-ggreen bg-ggreen text-white px-8 py-3 rounded-full hover:bg-teal-800 transition-colors">
            {currentStep === totalSteps ? 'Register Organization' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

RegisterOrganization.layout = Auth;
export default RegisterOrganization;