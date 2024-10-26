import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditDriveModal = ({ drive, onClose, onUpdateDrive }) => {
  const [driveData, setDriveData] = useState({
    name: drive.name || '',
    description: drive.description || '',
    photo: null, // New photo file if uploaded
    start_date: drive.start_date || '',
    end_date: drive.end_date || '',
  });

  const [errors, setErrors] = useState({}); // Stores field-specific errors

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriveData({ ...driveData, [name]: value });
  };

  const handleFileChange = (e) => {
    setDriveData({ ...driveData, photo: e.target.files[0] });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!driveData.name || driveData.name.length < 3) {
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

    try {
      const formData = new FormData();
      formData.append('name', driveData.name);
      formData.append('description', driveData.description);
      if (driveData.photo) {
        formData.append('photo', driveData.photo);
      }
      formData.append('start_date', driveData.start_date);
      formData.append('end_date', driveData.end_date);

      const response = await axios.put(
        `${apiUrl}/api/drives/${drive.drive_id}`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      onUpdateDrive(response.data); // Update the drive in the parent component
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error updating drive:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Drive</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block font-medium mb-1">Drive Name</label>
            <input
              type="text"
              name="name"
              value={driveData.name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              required
              minLength={3}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={driveData.description}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              maxLength={500}
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Photo</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {drive.photo && !driveData.photo && (
              <div className="mt-2">
                <p>Current Photo:</p>
                <img src={drive.photo} alt={drive.name} className="w-32 h-32 object-cover rounded" />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={driveData.start_date}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              required
            />
            {errors.start_date && <p className="text-red-500 text-sm">{errors.start_date}</p>}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">End Date</label>
            <input
              type="date"
              name="end_date"
              value={driveData.end_date}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              required
            />
            {errors.end_date && <p className="text-red-500 text-sm">{errors.end_date}</p>}
          </div>

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
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateDrive: PropTypes.func.isRequired,
};

export default EditDriveModal;