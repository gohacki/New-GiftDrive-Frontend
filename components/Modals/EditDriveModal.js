// File: components/Modals/EditDriveModal.js
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Image from 'next/image'; // Import Next.js Image for preview

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditDriveModal = ({ drive, onClose, onUpdateDrive }) => {
  const [driveData, setDriveData] = useState({
    name: drive.name || '',
    description: drive.description || '',
    photo: null, // For new photo file
    start_date: drive.start_date ? new Date(drive.start_date).toISOString().split('T')[0] : '', // Format for date input
    end_date: drive.end_date ? new Date(drive.end_date).toISOString().split('T')[0] : '',     // Format for date input
  });
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(drive.photo || null); // Existing photo URL
  const [previewNewPhotoUrl, setPreviewNewPhotoUrl] = useState(null); // For new photo preview
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    // Populate form when drive prop changes or modal opens
    setDriveData({
      name: drive.name || '',
      description: drive.description || '',
      photo: null,
      start_date: drive.start_date ? new Date(drive.start_date).toISOString().split('T')[0] : '',
      end_date: drive.end_date ? new Date(drive.end_date).toISOString().split('T')[0] : '',
    });
    setCurrentPhotoUrl(drive.photo || null);
    setPreviewNewPhotoUrl(null);
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
      if (previewNewPhotoUrl) URL.revokeObjectURL(previewNewPhotoUrl);
    };
  }, [drive, onClose]); // Depend on `drive` to re-initialize if it changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriveData({ ...driveData, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDriveData({ ...driveData, photo: file });
      if (previewNewPhotoUrl) URL.revokeObjectURL(previewNewPhotoUrl);
      setPreviewNewPhotoUrl(URL.createObjectURL(file));
      if (errors.photo) setErrors(prev => ({ ...prev, photo: null }));
    } else {
      setDriveData({ ...driveData, photo: null });
      if (previewNewPhotoUrl) URL.revokeObjectURL(previewNewPhotoUrl);
      setPreviewNewPhotoUrl(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!driveData.name || driveData.name.trim().length < 3) {
      newErrors.name = 'Drive name must be at least 3 characters long.';
    }
    if (driveData.description && driveData.description.length > 500) {
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData();
    formData.append('name', driveData.name.trim());
    formData.append('description', driveData.description.trim());
    if (driveData.photo instanceof File) { // Only append if a new file is selected
      formData.append('photo', driveData.photo);
    }
    formData.append('start_date', driveData.start_date);
    formData.append('end_date', driveData.end_date);

    try {
      // UPDATED to relative path
      const response = await axios.put(
        `/api/drives/${drive.drive_id}`, // The API endpoint for updating a specific drive
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      if (onUpdateDrive) onUpdateDrive(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating drive:', error.response?.data || error.message);
      setErrors(prev => ({ ...prev, form: error.response?.data?.error || 'Failed to update drive. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-drive-modal-title"
      ref={modalRef}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="Close modal"
          disabled={isSubmitting}
        >
          ×
        </button>

        <h2 id="edit-drive-modal-title" className="text-xl font-semibold mb-4">
          Edit Drive
        </h2>
        {errors.form && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {errors.form}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="edit-drive-name" className="block font-medium mb-1">Drive Name <span className="text-red-500">*</span></label>
            <input
              type="text" id="edit-drive-name" name="name" value={driveData.name} onChange={handleInputChange}
              className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded p-2 focus:ring-ggreen focus:border-ggreen`}
              required minLength={3} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'edit-drive-name-error' : undefined}
            />
            {errors.name && <p id="edit-drive-name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="edit-drive-description" className="block font-medium mb-1">Description</label>
            <textarea
              id="edit-drive-description" name="description" value={driveData.description} onChange={handleInputChange}
              className={`w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded p-2 focus:ring-ggreen focus:border-ggreen`}
              maxLength={500} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'edit-drive-description-error' : undefined}
              rows="3"
            />
            {errors.description && <p id="edit-drive-description-error" className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="edit-drive-photo" className="block font-medium mb-1">Change Photo (Optional)</label>
            <input
              type="file" id="edit-drive-photo" name="photo" accept="image/*" onChange={handleFileChange}
              className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ggreen file:text-white hover:file:bg-teal-700 ${errors.photo ? 'border-red-500' : 'border-gray-300'}`}
              aria-invalid={!!errors.photo} aria-describedby={errors.photo ? 'edit-drive-photo-error' : undefined}
            />
            {errors.photo && <p id="edit-drive-photo-error" className="text-red-500 text-xs mt-1">{errors.photo}</p>}
            <div className="mt-2 flex space-x-4 items-start">
              {currentPhotoUrl && !previewNewPhotoUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Photo:</p>
                  <Image src={currentPhotoUrl} alt={drive.name || "Current drive photo"} width={100} height={100} className="rounded object-cover shadow" />
                </div>
              )}
              {previewNewPhotoUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">New Photo Preview:</p>
                  <Image src={previewNewPhotoUrl} alt="New drive photo preview" width={100} height={100} className="rounded object-cover shadow" />
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-start-date" className="block font-medium mb-1">Start Date <span className="text-red-500">*</span></label>
            <input
              type="date" id="edit-start-date" name="start_date" value={driveData.start_date} onChange={handleInputChange}
              className={`w-full border ${errors.start_date ? 'border-red-500' : 'border-gray-300'} rounded p-2 focus:ring-ggreen focus:border-ggreen`}
              required aria-invalid={!!errors.start_date} aria-describedby={errors.start_date ? 'edit-start-date-error' : undefined}
            />
            {errors.start_date && <p id="edit-start-date-error" className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="edit-end-date" className="block font-medium mb-1">End Date <span className="text-red-500">*</span></label>
            <input
              type="date" id="edit-end-date" name="end_date" value={driveData.end_date} onChange={handleInputChange}
              className={`w-full border ${errors.end_date ? 'border-red-500' : 'border-gray-300'} rounded p-2 focus:ring-ggreen focus:border-ggreen`}
              required min={driveData.start_date || undefined} aria-invalid={!!errors.end_date} aria-describedby={errors.end_date ? 'edit-end-date-error' : undefined}
            />
            {errors.end_date && <p id="edit-end-date-error" className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditDriveModal.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    start_date: PropTypes.string, // Expecting ISO string or similar parseable by new Date()
    end_date: PropTypes.string,   // Expecting ISO string or similar parseable by new Date()
    photo: PropTypes.string,      // URL of the current photo
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateDrive: PropTypes.func.isRequired,
};

export default EditDriveModal;