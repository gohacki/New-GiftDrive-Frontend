import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { AuthContext } from '../../contexts/AuthContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditOrganizationInfo = () => {
  const { user } = useContext(AuthContext);
  const [organization, setOrganization] = useState({
    name: '',
    description: '',
    website: '',
    logo: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.org_id) {
      fetchOrganizationInfo();
    }
  }, [user]);

  const fetchOrganizationInfo = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/organizations/${user.org_id}`,
        { withCredentials: true }
      );
      setOrganization(response.data);
    } catch (error) {
      console.error('Error fetching organization info:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization({ ...organization, [name]: value });
  };

  const handleFileChange = (e) => {
    setOrganization({ ...organization, logo: e.target.files[0] });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!organization.name || organization.name.length < 3) {
      newErrors.name = 'Organization name must be at least 3 characters long.';
    }
    if (organization.description.length > 500) {
      newErrors.description = 'Description must be under 500 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('name', organization.name);
    formData.append('description', organization.description);
    formData.append('website', organization.website);
    if (organization.logo) {
      formData.append('logo', organization.logo);
    }

    try {
      setLoading(true);
      const response = await axios.put(
        `${apiUrl}/api/organizations/${user.org_id}`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      alert('Organization info updated successfully!');
      setLoading(false);
    } catch (error) {
      console.error('Error updating organization info:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-2xl font-semibold mb-4">Edit Organization Info</h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md max-w-lg mx-auto">
        <div className="mb-4">
          <label className="block font-medium mb-1">Organization Name</label>
          <input
            type="text"
            name="name"
            value={organization.name}
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
            value={organization.description}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded p-2"
            maxLength={500}
          />
          {errors.description && (
            <p className="text-red-500 text-sm">{errors.description}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Website</label>
          <input
            type="url"
            name="website"
            value={organization.website}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Logo</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {organization.logo && !organization.logo.name && (
            <div className="mt-2">
              <p>Current Logo:</p>
              <img
                src={organization.logo}
                alt="Organization Logo"
                className="w-32 h-32 object-cover rounded"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-white rounded ${
              loading ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

EditOrganizationInfo.propTypes = {
  user: PropTypes.shape({
    org_id: PropTypes.number.isRequired,
  }),
};

export default EditOrganizationInfo;