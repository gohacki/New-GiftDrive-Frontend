import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditDriveModal = ({ drive, onClose, onUpdateDrive }) => {
  // We initialize from existing props
  const [driveData, setDriveData] = useState({
    name: drive.name || '',
    description: drive.description || '',
    photo: null, // New photo file if uploaded
    start_date: drive.start_date || '',
    end_date: drive.end_date || '',
    is_item_only: drive.is_item_only || false, // NEW
  });

  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);

  // Focus management for accessibility
  useEffect(() => {
    if (modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, textarea, button');
      if (firstInput) {
        firstInput.focus();
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle changes, including the checkbox
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setDriveData({ ...driveData, [name]: checked });
    } else {
      setDriveData({ ...driveData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setDriveData({ ...driveData, photo: e.target.files[0] });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!driveData.name || driveData.name.trim().length < 3) {
      newErrors.name = 'Drive name must be at least 3 characters long.';
    }
    if (driveData.description.length > 500) {
      newErrors.description = 'Description must be under 500 characters.';
    }
    if (!driveData.start_date) {
      newErrors.start_date = 'Start date is required.';
    }
    if (!driveData.end_date) {
      newErrors.end_date = 'End date is required.';
    } else if (driveData.end_date < driveData.start_date) {
      newErrors.end_date = 'End date cannot be before the start date.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return; // Prevent submission if validation fails

    const formData = new FormData();
    formData.append('name', driveData.name.trim());
    formData.append('description', driveData.description.trim());
    if (driveData.photo) {
      formData.append('photo', driveData.photo);
    }
    formData.append('start_date', driveData.start_date);
    formData.append('end_date', driveData.end_date);
    formData.append('is_item_only', driveData.is_item_only); // NEW

    try {
      const response = await axios.put(
        `${apiUrl}/api/drives/${drive.drive_id}`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      onUpdateDrive(response.data); // Update the drive in the parent
      onClose();
    } catch (error) {
      console.error('Error updating drive:', error);
      // Optionally set a global or local error message here
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-drive-modal-title"
      ref={modalRef}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
          aria-label="Close modal"
        >
          &times;
        </button>

        <h2 id="edit-drive-modal-title" className="text-xl font-semibold mb-4">
          Edit Drive
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          {/* Drive Name */}
          <div className="mb-4">
            <label htmlFor="drive-name" className="block font-medium mb-1">
              Drive Name
            </label>
            <input
              type="text"
              id="drive-name"
              name="name"
              value={driveData.name}
              onChange={handleInputChange}
              className={`w-full border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } rounded p-2`}
              required
              minLength={3}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'drive-name-error' : undefined}
            />
            {errors.name && (
              <p id="drive-name-error" className="text-red-500 text-sm">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="drive-description" className="block font-medium mb-1">
              Description
            </label>
            <textarea
              id="drive-description"
              name="description"
              value={driveData.description}
              onChange={handleInputChange}
              className={`w-full border ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              } rounded p-2`}
              maxLength={500}
              aria-invalid={errors.description ? 'true' : 'false'}
              aria-describedby={
                errors.description ? 'drive-description-error' : undefined
              }
            />
            {errors.description && (
              <p id="drive-description-error" className="text-red-500 text-sm">
                {errors.description}
              </p>
            )}
          </div>

          {/* Photo */}
          <div className="mb-4">
            <label htmlFor="drive-photo" className="block font-medium mb-1">
              Photo
            </label>
            <input
              type="file"
              id="drive-photo"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full"
            />
            {/* If old photo exists and no new photo is chosen, show old one */}
            {drive.photo && !driveData.photo && (
              <div className="mt-2">
                <p>Current Photo:</p>
                <img
                  src={drive.photo}
                  alt={drive.name}
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
            {/* Preview of new photo, if chosen */}
            {driveData.photo && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(driveData.photo)}
                  alt="Drive Preview"
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="mb-4">
            <label htmlFor="start-date" className="block font-medium mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              name="start_date"
              value={driveData.start_date}
              onChange={handleInputChange}
              className={`w-full border ${
                errors.start_date ? 'border-red-500' : 'border-gray-300'
              } rounded p-2`}
              required
              aria-invalid={errors.start_date ? 'true' : 'false'}
              aria-describedby={
                errors.start_date ? 'start-date-error' : undefined
              }
            />
            {errors.start_date && (
              <p id="start-date-error" className="text-red-500 text-sm">
                {errors.start_date}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="end-date" className="block font-medium mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              name="end_date"
              value={driveData.end_date}
              onChange={handleInputChange}
              className={`w-full border ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              } rounded p-2`}
              required
              aria-invalid={errors.end_date ? 'true' : 'false'}
              aria-describedby={errors.end_date ? 'end-date-error' : undefined}
            />
            {errors.end_date && (
              <p id="end-date-error" className="text-red-500 text-sm">
                {errors.end_date}
              </p>
            )}
          </div>

          {/* NEW: is_item_only field */}
          <div className="mb-4">
            <label htmlFor="is_item_only" className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_item_only"
                name="is_item_only"
                checked={driveData.is_item_only}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="block font-medium">Is Item-Only Drive?</span>
            </label>
            <p className="text-sm text-gray-500">
              If checked, you manage items directly instead of children.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditDriveModal.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    start_date: PropTypes.string,
    end_date: PropTypes.string,
    photo: PropTypes.string,
    is_item_only: PropTypes.bool, // new
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateDrive: PropTypes.func.isRequired,
};

export default EditDriveModal;
