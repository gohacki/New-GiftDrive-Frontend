// File: pages/visible/registerdrive.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import AddItemBlade from '@/components/Blades/AddItemBlade'; // For advanced item adding
import DriveItemList from '@/components/Cards/DriveItemList'; // To display current items
import PropTypes from 'prop-types';

// New component for inline item search
const NewItemSearchSection = ({ driveId, onNewItemAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault(); // Allow calling without event for programmatic search
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchAttempted(true); // Mark that a search was attempted (even if empty)
      return;
    }
    setIsLoading(true);
    setSearchAttempted(true);
    try {
      const response = await axios.get(`/api/items?search=${encodeURIComponent(searchQuery.trim())}`, { withCredentials: true });
      setSearchResults(response.data || []);
    } catch {
      toast.error("Failed to search items.");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (item) => {
    if (!driveId) {
      toast.error("Drive ID is not available to add item.");
      return;
    }
    // Simplified payload for adding directly from search
    const payload = {
      quantity: 1,
      base_catalog_item_id: item.item_id,
      selected_rye_variant_id: item.rye_variant_id || item.rye_product_id, // Prefer variant_id if available
      selected_rye_marketplace: item.marketplace,
      variant_display_name: item.name,
      variant_display_price: item.price,
      variant_display_photo: item.image_url,
    };
    try {
      await axios.post(`/api/drives/${driveId}/items`, payload, { withCredentials: true });
      toast.success(`"${item.name}" added to drive!`);
      if (onNewItemAdded) onNewItemAdded();
      // Optional: Clear search query and results after adding
      // setSearchQuery('');
      // setSearchResults([]);
      // setSearchAttempted(false);
    } catch (error) {
      toast.error(`Failed to add "${item.name}": ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
      <h3 className="text-xl font-semibold mb-3 text-gray-800">Add New Gifts by Searching</h3>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 e.g., Girls Coat, Lego Set..."
          className="flex-grow border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen sm:text-sm"
        />
        <button type="submit" disabled={isLoading} className="bg-ggreen text-white px-5 py-2 rounded-md hover:bg-teal-700 disabled:opacity-50 text-sm font-medium">
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {isLoading && <p className="text-sm text-gray-500 text-center py-4">Loading search results...</p>}
      {!isLoading && searchResults.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Results:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {searchResults.map(item => (
              <div key={item.item_id} className="border border-gray-200 p-3 rounded-md shadow-sm bg-gray-50 flex flex-col items-center text-center">
                <div className="w-24 h-24 relative mb-2 bg-white rounded overflow-hidden border border-gray-200">
                  <Image src={item.image_url || '/img/default-item.png'} alt={item.name} layout="fill" objectFit="contain" />
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate w-full h-10 flex items-center justify-center px-1" title={item.name}>{item.name}</p>
                <p className="text-xs text-gray-600 mb-2">
                  {item.price != null ? `$${Number(item.price).toFixed(2)}` : 'Price N/A'}
                </p>
                <button
                  onClick={() => handleAddItem(item)}
                  className="w-full bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add to Drive
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isLoading && searchAttempted && searchResults.length === 0 && searchQuery.trim() && (
        <p className="text-sm text-gray-500 text-center py-4">No items found for &quot;{searchQuery}&quot;. Try a different search.</p>
      )}
    </div>
  );
};


// --- Prop Types Validation ---
NewItemSearchSection.propTypes = {
  /**
   * The ID of the drive to which new items will be added.
   * This is crucial for the 'Add to Drive' functionality.
   */
  driveId: PropTypes.oneOfType([ // driveId could be a string or a number
    PropTypes.string,
    PropTypes.number
  ]).isRequired,

  /**
   * Optional callback function that is triggered after an item
   * has been successfully added to the drive.
   */
  onNewItemAdded: PropTypes.func,
};

// --- Default Props (Optional but good practice for optional props) ---
NewItemSearchSection.defaultProps = {
  onNewItemAdded: () => { }, // No-op function if not provided
};


const NewDriveWizard = () => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [driveData, setDriveData] = useState({
    driveTitle: '',
    driveDescription: '',
    startDate: '',
    endDate: '',
    drivePhoto: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState('');

  const totalSteps = 3; // Updated total steps
  const [createdDriveId, setCreatedDriveId] = useState(null);
  const [isAddItemBladeOpen, setIsAddItemBladeOpen] = useState(false);
  const [refreshItemListTrigger, setRefreshItemListTrigger] = useState(0);


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

  const handleCreateDrive = async () => {
    setFormError('');
    if (!driveData.driveTitle.trim() || !driveData.driveDescription.trim() || !driveData.startDate || !driveData.endDate) {
      const msg = "Please ensure Title, Description, Start Date, and End Date are filled.";
      setFormError(msg);
      toast.error(msg);
      return false;
    }
    if (new Date(driveData.endDate) < new Date(driveData.startDate)) {
      const msg = "End date cannot be before the start date.";
      setFormError(msg);
      toast.error(msg);
      return false;
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
      toast.success('Drive created successfully! Now add gifts.');
      setCreatedDriveId(response.data.drive_id);
      setDriveData(prev => ({ ...prev, driveTitle: response.data.name })); // Update title if backend modified it
      setIsSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error creating new drive:', err.response?.data || err.message);
      const apiError = err.response?.data?.error || 'Failed to create drive.';
      setFormError(apiError);
      toast.error(apiError);
      setIsSubmitting(false);
      return false;
    }
  };

  const triggerItemRefresh = () => {
    setRefreshItemListTrigger(prev => prev + 1);
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

    if (currentStep === 2) { // Step 2 is "Drive Configuration", "Next" button creates drive
      const driveCreated = await handleCreateDrive();
      if (driveCreated) {
        setCurrentStep(3); // Proceed to Add Gifts step
      }
    } else if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else { // Current step is 3 (Add Gifts), button is "Publish"
      handlePublishDrive();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setFormError('');
    }
  };

  const handlePublishDrive = () => {
    if (!createdDriveId) {
      toast.error("Drive has not been created yet. Please complete previous steps.");
      return;
    }
    // Here you might call an API to mark the drive as "published"
    // For now, we'll just navigate.
    toast.success(`Drive "${driveData.driveTitle}" setup complete!`);
    router.push(`/visible/drive/${createdDriveId}`); // Navigate to the new drive's page
    // Or router.push('/admin/currentDrives');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Drive Details
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Step 1: Tell Us About Your Drive</h2>
            <div>
              <label htmlFor="driveTitle" className="block text-sm font-medium text-gray-700 mb-1">Drive Title <span className="text-red-500">*</span></label>
              <input type="text" name="driveTitle" id="driveTitle" value={driveData.driveTitle} onChange={handleChange} placeholder="e.g., Annual Holiday Toy Drive" required className="border border-gray-300 px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen" />
            </div>
            <div>
              <label htmlFor="driveDescription" className="block text-sm font-medium text-gray-700 mb-1">Drive Description <span className="text-red-500">*</span></label>
              <textarea name="driveDescription" id="driveDescription" value={driveData.driveDescription} onChange={handleChange} placeholder="Describe the purpose, goals, and impact of your drive..." required rows="5" className="border border-gray-300 px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen" />
            </div>
          </div>
        );
      case 2: // Drive Configuration (Dates & Photo)
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Step 2: Drive Configuration</h2>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-6 sm:space-y-0">
              <div className="sm:w-1/2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" name="startDate" id="startDate" value={driveData.startDate} onChange={handleChange} required className="border border-gray-300 px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen" />
              </div>
              <div className="sm:w-1/2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input type="date" name="endDate" id="endDate" value={driveData.endDate} onChange={handleChange} required min={driveData.startDate || undefined} className="border border-gray-300 px-3 py-2 w-full rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen" />
              </div>
            </div>
            <div>
              <label htmlFor="drivePhotoInput" className="block text-sm font-medium text-gray-700 mb-1">Drive Photo (Optional)</label>
              {previewUrl ? (
                <div className="my-3 flex justify-center">
                  <Image src={previewUrl} alt="Drive Photo Preview" width={192} height={192} className="max-h-48 w-auto rounded-md shadow-md object-contain border border-gray-200" />
                </div>
              ) : (
                <div className="my-3 border-2 border-dashed border-gray-300 p-6 rounded-md text-center">
                  <p className="text-gray-500 text-sm">No image selected.</p>
                </div>
              )}
              <input type="file" name="drivePhoto" onChange={handleChange} accept="image/*" className="hidden" id="drivePhotoInput" />
              <div className="text-center">
                <label htmlFor="drivePhotoInput" className="cursor-pointer inline-block bg-gray-200 text-gray-700 px-5 py-2.5 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium">
                  {driveData.drivePhoto ? "Change Photo" : "Upload Photo"}
                </label>
              </div>
            </div>
          </div>
        );
      case 3: // Add Gifts
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">Step 3: Add Gifts for &quot;{driveData.driveTitle}&quot;</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your drive has been created. Search for items below or use the &quot;Add Item (Advanced)&quot; button for more options.
            </p>

            {/* List of already added items */}
            {createdDriveId && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Gifts in Drive:</h3>
                <DriveItemList
                  driveId={createdDriveId}
                  key={`drive-item-list-${refreshItemListTrigger}`} // Force re-render on refresh
                />
              </div>
            )}

            {/* New Item Search Section */}
            {createdDriveId && (
              <NewItemSearchSection driveId={createdDriveId} onNewItemAdded={triggerItemRefresh} />
            )}

            <div className="text-center mt-8 border-t pt-6">
              <button
                type="button"
                onClick={() => setIsAddItemBladeOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-sm"
              >
                Add Item (Advanced Options)
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const progressPercentage = Math.min(100, (currentStep / totalSteps) * 100);

  if (authStatus === "loading" || (authStatus === "authenticated" && !user)) {
    return (
      <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center pt-10 pb-20 md:pt-20">
        <div className="w-full max-w-3xl bg-white p-6 md:p-10 rounded-lg shadow-2xl">
          {formError && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="flex-1 mb-8">
            {renderStep()}
          </div>

          <div className="mt-10">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                style={{ width: `${progressPercentage}%` }}
                className="bg-ggreen h-2.5 rounded-full transition-all duration-500 ease-out"
              />
            </div>
            <p className="text-center text-xs text-gray-500">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="w-full sm:w-auto border-2 border-gray-400 text-gray-700 px-8 py-3 rounded-full hover:bg-gray-100 transition-colors font-semibold text-sm"
                disabled={isSubmitting}
              >
                Back
              </button>
            ) : <div className="w-full sm:w-auto h-12"></div>} {/* Placeholder for alignment */}
            <button
              onClick={nextStep}
              disabled={isSubmitting}
              className={`w-full sm:w-auto border-2 border-ggreen bg-ggreen text-white px-8 py-3 rounded-full hover:bg-teal-700 transition-colors font-semibold text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (currentStep === 2 ? 'Creating Drive...' : 'Processing...')
                : (currentStep === totalSteps ? 'Publish Drive'
                  : (currentStep === 2 ? 'Create Drive & Add Gifts' : 'Next Step'))}
            </button>
          </div>
        </div>
      </div>

      {createdDriveId && (
        <AddItemBlade
          isOpen={isAddItemBladeOpen}
          driveId={createdDriveId}
          existingDriveItem={null}
          onSave={() => {
            triggerItemRefresh();
            setIsAddItemBladeOpen(false); // Close blade after save
            toast.success('Gift item added via advanced options!');
          }}
          onClose={() => setIsAddItemBladeOpen(false)}
        />
      )}
    </>
  );
};

NewDriveWizard.layout = Auth;
export default NewDriveWizard;