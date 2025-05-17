import React, { useState, useEffect } from 'react'; // Removed useContext
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
// import { AuthContext } from 'contexts/AuthContext'; // REMOVE THIS LINE
import { useSession } from 'next-auth/react'; // ADD THIS LINE

const NewDriveWizard = () => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession(); // USE useSession hook
  const user = session?.user; // User object from NextAuth session
  // const { loading } = useContext(AuthContext); // REMOVE THIS LINE, use authStatus

  // Redirect if the user is not logged in or not an org admin
  useEffect(() => {
    if (authStatus === "loading") { // If auth is still loading, do nothing yet
      return;
    }
    if (!user) {
      router.push('/auth/login');
    } else if (!user.is_org_admin) {
      // If user is authenticated but not an org admin, redirect them
      // (e.g., to register org or to their profile)
      router.push('/visible/registerorg'); // Or a different page like '/visible/profile'
    }
  }, [user, authStatus, router]); // Depend on authStatus as well

  // State for drive data
  const [driveData, setDriveData] = useState({
    startDate: '',
    endDate: '',
    driveTitle: '',
    driveDescription: '',
    drivePhoto: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

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
    setIsSubmitting(true); // Set submitting state
    // Create a FormData instance to include the file
    const formData = new FormData();
    formData.append('name', driveData.driveTitle);
    formData.append('description', driveData.driveDescription);
    formData.append('start_date', driveData.startDate);
    formData.append('end_date', driveData.endDate);
    if (driveData.drivePhoto) { // Only append if a photo is selected
      formData.append('photo', driveData.drivePhoto);
    }


    try {
      // UPDATED: Relative path for internal API call
      await axios.post(`/api/drives`, formData, { // Use relative path
        withCredentials: true, // Keep for session cookie
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push('../admin/currentDrives'); // Redirect to a relevant page after success
    } catch (err) {
      console.error('Error creating new drive:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Failed to create drive. Please check your input and try again.');
    } finally {
      setIsSubmitting(false); // Reset submitting state
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
    // Optional: Add date validation (e.g., end date after start date)
    if (isStepValid && new Date(driveData.endDate) < new Date(driveData.startDate)) {
      isStepValid = false; // Or show an error message
      // You might want to display a specific error for this to the user
    }
  } else if (currentStep === 3) {
    // Photo is optional for drive creation based on your API logic.
    // If it's required, then: isStepValid = driveData.drivePhoto !== null;
    // If optional, it's always valid to proceed from this step.
    isStepValid = true; // Assuming photo is optional. Change if required.
  }

  // Render fields based on the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">First, Let&apos;s Set Up Your Drive</h2>
            <div>
              <label htmlFor="driveTitle" className="block text-sm font-medium text-gray-700 mb-1">Drive Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="driveTitle"
                id="driveTitle"
                value={driveData.driveTitle}
                onChange={handleChange}
                placeholder="e.g. Holiday Toy Drive 2024"
                required
                className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
              />
            </div>
            <div>
              <label htmlFor="driveDescription" className="block text-sm font-medium text-gray-700 mb-1">Drive Description <span className="text-red-500">*</span></label>
              <textarea
                name="driveDescription"
                id="driveDescription"
                value={driveData.driveDescription}
                onChange={handleChange}
                placeholder="Describe the purpose and goals of your drive..."
                required
                rows="4"
                className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mb-4">Set the Dates for Your Drive</h2>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="sm:w-1/2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  value={driveData.startDate}
                  onChange={handleChange}
                  required
                  className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
                />
              </div>
              <div className="sm:w-1/2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  value={driveData.endDate}
                  onChange={handleChange}
                  required
                  min={driveData.startDate} // Basic validation: end date can't be before start date
                  className="border px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Upload a Photo For Your Drive (Optional)</h2>
            <div className="mb-4 border-2 border-dashed border-gray-300 p-6 rounded text-center">
              {driveData.drivePhoto ? (
                <p className="text-gray-700">Selected: {driveData.drivePhoto.name}</p>
              ) : (
                <p className="text-gray-500">No image selected. Click below to upload.</p>
              )}
            </div>
            <input
              type="file"
              name="drivePhoto"
              onChange={handleChange}
              accept="image/*"
              // required // Make optional if drivePhoto can be null
              className="hidden"
              id="drivePhotoInput"
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
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  if (authStatus === "loading") {
    return (
      <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center pt-10 pb-20 md:pt-20">
      <div className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-lg shadow-xl">
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
            >
              Back
            </button>
          ) : <div className="w-full sm:w-auto"></div> /* Placeholder for alignment */}
          <button
            onClick={nextStep}
            disabled={!isStepValid || isSubmitting} // Disable if not valid or submitting
            className={`w-full sm:w-auto border-2 border-ggreen bg-ggreen text-white px-8 py-3 rounded-full hover:bg-teal-700 transition-colors font-semibold ${(!isStepValid || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isSubmitting ? 'Submitting...' : (currentStep === totalSteps ? 'Create Drive' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;