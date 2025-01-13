import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { AuthContext } from '../../contexts/AuthContext';
import Image from 'next/image';

import Admin from "layouts/Admin.js";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditOrganizationInfo = () => {
  const { user } = useContext(AuthContext);
  const [organization, setOrganization] = useState({
    name: '',
    description: '',
    website: '',
    photo: null,
    address: '',
    city: '',
    country: '',
    postalCode: '',
  });
  const [previewPhoto, setPreviewPhoto] = useState(null); // State for new photo preview
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.org_id) {
      fetchOrganizationInfo();
    }

    // Cleanup the object URL when component unmounts or when a new file is selected
    return () => {
      if (previewPhoto) {
        URL.revokeObjectURL(previewPhoto);
      }
    };
  }, [user]);

  const fetchOrganizationInfo = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/organizations/${user.org_id}`,
        { withCredentials: true }
      );

      // Debugging log
      console.log('Fetched organization data:', response.data);

      // Assuming the API returns address details
      setOrganization({
        name: response.data.name || '',
        description: response.data.description || '',
        website: response.data.website || '',
        photo: response.data.photo || null,
        address: response.data.address || '',
        city: response.data.city || '',
        country: response.data.country || '',
        postalCode: response.data.postalCode || '',
      });
    } catch (error) {
      console.error('Error fetching organization info:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization({ ...organization, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setOrganization({ ...organization, photo: file });

    if (file) {
      // Revoke the previous object URL if it exists to prevent memory leaks
      if (previewPhoto) {
        URL.revokeObjectURL(previewPhoto);
      }
      const previewUrl = URL.createObjectURL(file);
      setPreviewPhoto(previewUrl);
    } else {
      // If no file is selected, remove the preview
      if (previewPhoto) {
        URL.revokeObjectURL(previewPhoto);
      }
      setPreviewPhoto(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!organization.name || organization.name.length < 3) {
      newErrors.name = 'Organization name must be at least 3 characters long.';
    }
    if (organization.description.length > 500) {
      newErrors.description = 'Description must be under 500 characters.';
    }
    // Add more validations as needed

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
    formData.append('address', organization.address);
    formData.append('city', organization.city);
    formData.append('country', organization.country);
    formData.append('postalCode', organization.postalCode);
    if (organization.photo) {
      formData.append('photo', organization.photo);
    }

    try {
      setLoading(true);
      await axios.put(
        `${apiUrl}/api/organizations/${user.org_id}`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      alert('Organization info updated successfully!');
      setLoading(false);
      // Optionally, refetch organization info to update the state with the new photo URL
      fetchOrganizationInfo();
      // Reset preview photo after successful upload
      if (previewPhoto) {
        URL.revokeObjectURL(previewPhoto);
        setPreviewPhoto(null);
      }
    } catch (error) {
      console.error('Error updating organization info:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blueGray-100 p-6 pt-32">
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">Edit Organization Info</h6>
            <button
              className="bg-blueGray-700 active:bg-blueGray-600 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150"
              type="button"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit}>
            {/* Organization Information */}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              Organization Information
            </h6>
            <div className="flex flex-wrap">
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="name"
                  >
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={organization.name}
                    onChange={handleInputChange}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 ${
                      errors.name ? 'border-red-500' : ''
                    }`}
                    placeholder="Organization Name"
                    required
                    minLength={3}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>
              </div>
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="website"
                  >
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={organization.website}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={organization.description}
                    onChange={handleInputChange}
                    className={`border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                    placeholder="Organization Description"
                    maxLength={500}
                    rows="4"
                  ></textarea>
                  {errors.description && (
                    <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                  )}
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />

            {/* Contact Information */}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              Contact Information
            </h6>
            <div className="flex flex-wrap">
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="address"
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={organization.address}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="1234 Main St"
                  />
                </div>
              </div>
              <div className="w-full lg:w-3/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="city"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={organization.city}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="New York"
                  />
                </div>
              </div>
              <div className="w-full lg:w-3/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="country"
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={organization.country}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="United States"
                  />
                </div>
              </div>
              <div className="w-full lg:w-3/12 px-4">
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="postalCode"
                  >
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={organization.postalCode}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />

            {/* Photo Upload */}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              Organization Photo
            </h6>
            <div className="flex flex-wrap">
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  />
                  {/* Display Current Photo */}
                  {organization.photo && typeof organization.photo === 'string' && (
                    <div className="mt-2 flex items-center">
                      <p className="text-blueGray-700 text-sm mr-2">Current Photo:</p>
                      <div className="relative w-32 h-32">
                        <Image
                          src={organization.photo}
                          alt="Organization Photo"
                          className="rounded object-cover"
                          layout="fill" // Use 'fill' with proper parent styling
                          objectFit="cover"
                          priority={true} // Optional: prioritize loading if necessary
                        />
                      </div>
                    </div>
                  )}
                  {/* Display New Photo Preview */}
                  {previewPhoto && (
                    <div className="mt-2 flex items-center">
                      <p className="text-blueGray-700 text-sm mr-2">New Photo Preview:</p>
                      <div className="relative w-32 h-32">
                        <Image
                          src={previewPhoto}
                          alt="New Organization Photo"
                          className="rounded object-cover"
                          layout="fill"
                          objectFit="cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={`bg-blueGray-700 text-white active:bg-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 ${
                  loading ? 'bg-blueGray-500 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

EditOrganizationInfo.propTypes = {
  user: PropTypes.shape({
    org_id: PropTypes.number.isRequired,
  }),
};

EditOrganizationInfo.layout = Admin;

export default EditOrganizationInfo;