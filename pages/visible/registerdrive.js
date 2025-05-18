// File: pages/visible/registerdrive.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image'; // Import Next.js Image

// Import AddItemBlade
import AddItemBlade from '@/components/Blades/AddItemBlade';

const NewDriveWizard = () => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const authLoading = authStatus === "loading";

  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
    drivePhoto: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState('');

  // --- NEW ---
  const totalSteps = 4; // Increased from 3 to 4
  const [createdDriveId, setCreatedDriveId] = useState(null); // To store the ID of the new drive
  const [isAddItemBladeOpen, setIsAddItemBladeOpen] = useState(false);
  // --- END NEW ---


  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      router.push('/auth/login?callbackUrl=/visible/registerdrive');
    } else if (user && !user.is_org_admin) {
      toast.error("You must be an organization administrator to create a drive.");
      router.push('/visible/registerorg');
    } else if (user && user.is_org_admin && !user.org_id) {
      toast.error("Your account is not fully configured for an organization. Please contact support.");
      router.push('/visible/profile');
    }
  }, [user, authStatus, router]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      setDriveData((prev) => ({ ...prev, [name]: file }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(file ? URL.createObjectURL(file) : null);
    } else {
      setDriveData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError('');
  };

  // This function will now ONLY create the drive. Navigation is handled by nextStep or Finish button.
  const handleCreateDrive = async () => {
    setFormError('');
    // Validate all required fields for drive creation (from steps 1, 2, and optionally 3's photo)
    if (!driveData.driveTitle.trim() || !driveData.driveDescription.trim() || !driveData.startDate || !driveData.endDate) {
      setFormError("Please ensure all required fields (Title, Description, Start Date, End Date) are filled before proceeding.");
      toast.error("Please ensure all required fields (Title, Description, Start Date, End Date) are filled.");
      return false; // Indicate failure
    }
    if (new Date(driveData.endDate) < new Date(driveData.startDate)) {
      setFormError("End date cannot be before the start date.");
      toast.error("End date cannot be before the start date.");
      return false; // Indicate failure
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('name', driveData.driveTitle.trim());
    formData.append('description', driveData.driveDescription.trim());
    formData.append('start_date', driveData.startDate);
    formData.append('end_date', driveData.endDate);
    if (driveData.drivePhoto) {
      formData.append('photo', driveData.drivePhoto);
    }

    try {
      const response = await axios.post(`/api/drives`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Drive created successfully! Now add some gifts.');
      setCreatedDriveId(response.data.drive_id); // Store the new drive ID
      // Update driveTitle in state if it was modified by backend (e.g. trimming)
      setDriveData(prev => ({ ...prev, driveTitle: response.data.name }));
      setIsSubmitting(false);
      return true; // Indicate success
    } catch (err) {
      console.error('Error creating new drive:', err.response?.data || err.message);
      const apiError = err.response?.data?.error || 'Failed to create drive. Please check your input and try again.';
      setFormError(apiError);
      toast.error(apiError);
      setIsSubmitting(false);
      return false; // Indicate failure
    }
  };

  const nextStep = async () => {
    setFormError('');
    let isValidForStep = true;
    if (currentStep === 1 && (!driveData.driveTitle.trim() || !driveData.driveDescription.trim())) {
      setFormError('Drive Title and Description are required for this step.');
      isValidForStep = false;
    } else if (currentStep === 2 && (!driveData.startDate || !driveData.endDate)) {
      setFormError('Start Date and End Date are required for this step.');
      isValidForStep = false;
    } else if (currentStep === 2 && driveData.startDate && driveData.endDate && new Date(driveData.endDate) < new Date(driveData.startDate)) {
      setFormError('End date cannot be before the start date.');
      isValidForStep = false;
    }

    if (!isValidForStep) {
      toast.error(formError || "Please complete the current step correctly.");
      return;
    }

    // If on Step 3 (Photo step), next action is to create the drive
    if (currentStep === (totalSteps - 1)) { // This is Step 3 (Photo), before Add Gifts
      const driveCreated = await handleCreateDrive();
      if (driveCreated) {
        setCurrentStep((prev) => prev + 1); // Proceed to Add Gifts step
      }
      // If driveCreated is false, handleCreateDrive already set errors/toasts
    } else if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // This is the final step (Add Gifts), "Next" button is "Finish"
      router.push('/admin/currentDrives'); // Or wherever you want to redirect
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setFormError('');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Title & Description
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 1: Set Up Your Drive Details</h2>
            <div>
              <label htmlFor="driveTitle" className="block text-sm font-medium text-gray-700 mb-1">Drive Title <span className="text-red-500">*</span></label>
              <input
                type="text" name="driveTitle" id="driveTitle" value={driveData.driveTitle}
                onChange={handleChange} placeholder="e.g. Holiday Toy Drive 2024" required
                className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
              />
            </div>
            <div>
              <label htmlFor="driveDescription" className="block text-sm font-medium text-gray-700 mb-1">Drive Description <span className="text-red-500">*</span></label>
              <textarea
                name="driveDescription" id="driveDescription" value={driveData.driveDescription}
                onChange={handleChange} placeholder="Describe the purpose and goals of your drive..."
                required rows="4"
                className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
              />
            </div>
          </div>
        );
      case 2: // Dates
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mb-4">Step 2: Set the Dates for Your Drive</h2>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="sm:w-1/2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date" name="startDate" id="startDate" value={driveData.startDate}
                  onChange={handleChange} required
                  className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
                />
              </div>
              <div className="sm:w-1/2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date" name="endDate" id="endDate" value={driveData.endDate}
                  onChange={handleChange} required min={driveData.startDate || undefined} // Ensure min is not empty string
                  className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
                />
              </div>
            </div>
          </div>
        );
      case 3: // Photo
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 3: Upload a Photo (Optional)</h2>
            {previewUrl ? (
              <div className="mb-4 flex justify-center">
                <Image src={previewUrl} alt="Drive Photo Preview" width={192} height={192} className="max-h-48 w-auto rounded shadow-md object-contain" />
              </div>
            ) : (
              <div className="mb-4 border-2 border-dashed border-gray-300 p-6 rounded text-center">
                <p className="text-gray-500">No image selected. Click below to upload.</p>
              </div>
            )}
            <input
              type="file" name="drivePhoto" onChange={handleChange} accept="image/*"
              className="hidden" id="drivePhotoInput"
            />
            <div className="text-center">
              <label
                htmlFor="drivePhotoInput"
                className="cursor-pointer inline-block bg-ggreen text-white px-6 py-3 rounded-full hover:bg-teal-700 transition-colors"
              >
                {driveData.drivePhoto ? "Change Photo" : "Choose Photo"}
              </label>
            </div>
          </div>
        );
      // --- NEW STEP ---
      case 4: // Add Gifts
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Step 4: Add Gifts for &quot;{driveData.driveTitle}&quot;</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your drive has been created. Now, add the items you&apos;d like supporters to donate. You can add more items later from your dashboard.
            </p>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsAddItemBladeOpen(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
              >
                Add Gift Item
              </button>
            </div>
            {/* AddItemBlade will be rendered outside this specific div if it's a true blade */}
            {/* For simplicity, we are just providing a button to open it. */}
            {/* Optionally, list items already added here - requires fetching drive items */}
          </div>
        );
      // --- END NEW STEP ---
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl text-gray-700">Loading...</p>
      </div>
    );
  }
  if (authStatus === "unauthenticated" || (user && !user.is_org_admin)) {
    return (
      <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-xl text-red-600 mb-4">Access Denied</p>
        <p className="text-gray-700">You must be logged in as an organization administrator to create a drive.</p>
        <button
          onClick={() => router.push(user ? '/visible/registerorg' : '/auth/login')}
          className="mt-6 px-6 py-2 bg-ggreen text-white rounded hover:bg-teal-700"
        >
          {user ? 'Register Your Organization' : 'Login'}
        </button>
      </div>
    );
  }

  return (
    <> {/* Fragment to wrap page content and modal/blade */}
      <div className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center pt-10 pb-20 md:pt-20">
        <div className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-lg shadow-xl">
          {formError && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="flex-1 mb-8">
            {renderStep()}
          </div>

          <div className="mt-8">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                style={{ width: `${Math.round(progressPercentage)}%` }}
                className="bg-ggreen h-2.5 rounded-full transition-all duration-300 ease-out"
              />
            </div>
            <p className="text-center text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="w-full sm:w-auto border-2 border-ggreen text-ggreen px-8 py-3 rounded-full hover:bg-ggreen hover:text-white transition-colors font-semibold"
                disabled={isSubmitting}
              >
                Back
              </button>
            ) : <div className="w-full sm:w-auto"></div>}
            <button
              onClick={nextStep}
              disabled={isSubmitting}
              className={`w-full sm:w-auto border-2 border-ggreen bg-ggreen text-white px-8 py-3 rounded-full hover:bg-teal-700 transition-colors font-semibold ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (currentStep === (totalSteps - 1) ? 'Creating Drive...' : 'Processing...')
                : (currentStep === totalSteps ? 'Finish Drive Setup'
                  : (currentStep === (totalSteps - 1) ? 'Create Drive & Add Gifts' : 'Next'))}
            </button>
          </div>
        </div>
      </div>

      {/* Render AddItemBlade conditionally */}
      {createdDriveId && (
        <AddItemBlade
          isOpen={isAddItemBladeOpen}
          driveId={createdDriveId}
          existingDriveItem={null} // Not editing, adding new
          onSave={() => {
            // Item saved, blade will show toast.
            // Optionally close blade or keep open to add more.
            // setIsAddItemBladeOpen(false); // If you want it to close after each add
            // Potentially refetch items if displaying them in Step 4
            toast.success('Gift item added to drive!');
          }}
          onClose={() => setIsAddItemBladeOpen(false)}
        />
      )}
    </>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;