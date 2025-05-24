// File: components/Modals/AddDriveModal.js
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Image from 'next/image'; // Import Next.js Image for preview

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AddDriveModal = ({ onClose, onAddDrive }) => {
  const [driveData, setDriveData] = useState({
    name: '',
    description: '',
    photo: null, // Will store the File object
    start_date: '',
    end_date: '',
  });
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null); // For image preview
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Added submitting state
  const modalRef = useRef(null);

  useEffect(() => {
    // Reset form when modal opens
    setDriveData({ name: '', description: '', photo: null, start_date: '', end_date: '' });
    setPreviewPhotoUrl(null);
    setErrors({});
    setIsSubmitting(false);

    if (modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl); // Clean up preview URL
    };
  }, [onClose]); // Rerun effect if onClose changes, which is unlikely but good practice

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriveData({ ...driveData, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null })); // Clear error for this field
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDriveData({ ...driveData, photo: file });
      if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl);
      setPreviewPhotoUrl(URL.createObjectURL(file));
      if (errors.photo) setErrors(prev => ({ ...prev, photo: null }));
    } else {
      setDriveData({ ...driveData, photo: null });
      if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl);
      setPreviewPhotoUrl(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!driveData.name || driveData.name.trim().length < 3) {
      newErrors.name = 'Drive name must be at least 3 characters long.';
    }
    if (driveData.description && driveData.description.length > 500) { // Description is optional
      newErrors.description = 'Description must be under 500 characters.';
    }
    if (!driveData.start_date) {
      newErrors.start_date = 'Start date is required.';
    }
    if (!driveData.end_date) {
      newErrors.end_date = 'End date is required.';
    } else if (driveData.start_date && driveData.end_date < driveData.start_date) {
      newErrors.end_date = 'End date cannot be before the start date.';
    }
    // Optional: Photo validation (e.g., type, size) can be added here if needed
    // if (driveData.photo && driveData.photo.size > 5 * 1024 * 1024) { // 5MB example
    //   newErrors.photo = 'Photo is too large (max 5MB).';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({}); // Clear previous global errors

    const formData = new FormData();
    formData.append('name', driveData.name.trim());
    formData.append('description', driveData.description.trim());
    if (driveData.photo) {
      formData.append('photo', driveData.photo);
    }
    formData.append('start_date', driveData.start_date);
    formData.append('end_date', driveData.end_date);

    try {
      // UPDATED to relative path
      const response = await axios.post(`/api/drives`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onAddDrive) onAddDrive(response.data); // Pass the new drive data back
      onClose();
    } catch (error) {
      console.error('Error adding drive:', error.response?.data || error.message);
      setErrors(prev => ({ ...prev, form: error.response?.data?.error || 'Failed to add drive. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-drive-modal-title"
      ref={modalRef}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative border border-slate-200"> {/* Updated container */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-2xl" /* Updated close button */
          aria-label="Close modal"
          disabled={isSubmitting}
        >
          ×
        </button>

        <h2 id="add-drive-modal-title" className="text-slate-800 text-xl font-semibold border-b border-slate-200 pb-3 mb-4"> {/* Updated title */}
          Add New Drive
        </h2>

        {errors.form && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="drive-name" className="block text-sm font-medium text-slate-700 mb-1">Drive Name <span className="text-red-500">*</span></label> {/* Updated label */}
            <input
              type="text" id="drive-name" name="name" value={driveData.name} onChange={handleInputChange}
              className={`w-full border ${errors.name ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-ggreen focus:ring-1 focus:ring-ggreen`} /* Updated input */
              required minLength={3} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'drive-name-error' : undefined}
            />
            {errors.name && <p id="drive-name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="drive-description" className="block text-sm font-medium text-slate-700 mb-1">Description</label> {/* Updated label */}
            <textarea
              id="drive-description" name="description" value={driveData.description} onChange={handleInputChange}
              className={`w-full border ${errors.description ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-ggreen focus:ring-1 focus:ring-ggreen`} /* Updated textarea */
              maxLength={500} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'drive-description-error' : undefined}
              rows="3"
            />
            {errors.description && <p id="drive-description-error" className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="drive-photo" className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label> {/* Updated label */}
            <input
              type="file" id="drive-photo" name="photo" accept="image/*" onChange={handleFileChange}
              className={`w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ggreen file:text-white hover:file:bg-teal-700 ${errors.photo ? 'border-red-500' : 'border-slate-300'}`} /* Ensure border-slate-300 if needed, keeping file button style */
              aria-invalid={!!errors.photo} aria-describedby={errors.photo ? 'drive-photo-error' : undefined}
            />
            {errors.photo && <p id="drive-photo-error" className="text-red-500 text-xs mt-1">{errors.photo}</p>}
            {previewPhotoUrl && (
              <div className="mt-2">
                {/* Photo Preview Label can be added here if needed, e.g., <p className="text-xs text-slate-500 mb-1">Preview:</p> */}
                <Image src={previewPhotoUrl} alt="Drive Preview" width={128} height={128} className="w-32 h-32 object-cover rounded shadow" />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label> {/* Updated label */}
            <input
              type="date" id="start-date" name="start_date" value={driveData.start_date} onChange={handleInputChange}
              className={`w-full border ${errors.start_date ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-ggreen focus:ring-1 focus:ring-ggreen`} /* Updated input */
              required aria-invalid={!!errors.start_date} aria-describedby={errors.start_date ? 'start-date-error' : undefined}
            />
            {errors.start_date && <p id="start-date-error" className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label> {/* Updated label */}
            <input
              type="date" id="end-date" name="end_date" value={driveData.end_date} onChange={handleInputChange}
              className={`w-full border ${errors.end_date ? 'border-red-500' : 'border-slate-300'} rounded-md p-2 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-ggreen focus:ring-1 focus:ring-ggreen`} /* Updated input */
              required min={driveData.start_date || undefined} aria-invalid={!!errors.end_date} aria-describedby={errors.end_date ? 'end-date-error' : undefined}
            />
            {errors.end_date && <p id="end-date-error" className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm font-medium" /* Updated cancel button */
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 text-sm font-medium shadow-sm disabled:opacity-60 cursor-not-allowed" /* Updated submit button */
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddDriveModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddDrive: PropTypes.func.isRequired,
};

export default AddDriveModal;