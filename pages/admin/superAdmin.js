// src/pages/superadmin/organizations.js

import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import React from 'react';
import { FaTrash, FaSync } from 'react-icons/fa'; // Optional: For icons

import Navbar from 'components/Navbars/AuthNavbar';


const OrganizationsAdminPage = () => {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const [organizations, setOrganizations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    website_link: '',
    photo: null,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (!user.is_super_admin) {
      router.push('/');
    } else {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/organizations`, { withCredentials: true });
      setOrganizations(response.data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setErrorMessage('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, photo: e.target.files[0] });
  };

  const handleAddOrganization = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      setErrorMessage('Organization name is required.');
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach((key) => {
      submitData.append(key, formData[key]);
    });

    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/organizations`, submitData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setErrorMessage('');
      setFormData({
        name: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        website_link: '',
        photo: null,
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Error adding organization:', error);
      setErrorMessage('Failed to add organization.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (org_id) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      setLoading(true);
      try {
        await axios.delete(`${apiUrl}/api/organizations/${org_id}`, { withCredentials: true });
        fetchOrganizations();
      } catch (error) {
        console.error('Error deleting organization:', error);
        alert('Failed to delete organization.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTrackProduct = async () => {
    if (!productUrl.trim()) {
      setSyncMessage('Please enter a valid product URL.');
      return;
    }

    setSyncLoading(true);
    try {
      await axios.post(`${apiUrl}/api/items/track`, { url: productUrl }, { withCredentials: true });
      setSyncMessage('Product tracking initiated successfully!');
      setProductUrl('');
    } catch (error) {
      console.error('Error tracking product:', error);
      setSyncMessage('Failed to track product.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <>
    <Navbar transparent/>
    <div className="py-24 px-6 bg-black p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
      </header>

      {/* Product Tracking Section */}
      <section className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Track a New Product</h2>
        {syncMessage && (
          <div
            className={`mb-4 px-4 py-2 rounded ${
              syncMessage.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {syncMessage}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center">
          <input
            type="text"
            placeholder="Enter product URL..."
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            className="w-full sm:w-auto flex-grow px-4 py-2 border border-gray-300 rounded mb-4 sm:mb-0 sm:mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTrackProduct}
            disabled={syncLoading}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            {syncLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            ) : (
              <FaSync className="mr-2" />
            )}
            Start Tracking
          </button>
        </div>
      </section>

      {/* Organization Addition Form */}
      <section className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New Organization</h2>
        {errorMessage && (
          <div className="mb-4 px-4 py-2 rounded bg-red-100 text-red-700">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleAddOrganization} encType="multipart/form-data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Website Link */}
            <div>
              <label htmlFor="website_link" className="block text-gray-700 font-medium mb-2">
                Website Link
              </label>
              <input
                type="url"
                name="website_link"
                id="website_link"
                value={formData.website_link}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-gray-700 font-medium mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                id="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-gray-700 font-medium mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                id="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zip Code */}
            <div>
              <label htmlFor="zip_code" className="block text-gray-700 font-medium mb-2">
                Zip Code
              </label>
              <input
                type="text"
                name="zip_code"
                id="zip_code"
                value={formData.zip_code}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-gray-700 font-medium mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide a brief description of the organization..."
              ></textarea>
            </div>

            {/* Photo */}
            <div className="md:col-span-2">
              <label htmlFor="photo" className="block text-gray-700 font-medium mb-2">
                Photo
              </label>
              <input
                type="file"
                name="photo"
                id="photo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              ) : (
                'Add Organization'
              )}
              {loading ? 'Adding...' : 'Add Organization'}
            </button>
          </div>
        </form>
      </section>

      {/* Organization List */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Existing Organizations</h2>
        {loading ? (
          <div className="flex justify-center items-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span className="ml-2 text-gray-700">Loading organizations...</span>
          </div>
        ) : organizations.length === 0 ? (
          <p className="text-gray-500">No organizations found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.org_id} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {/* Optional: Display organization photo */}
                        {org.photo && (
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              src={org.photo}
                              alt={`${org.name} Logo`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {org.description.length > 100
                        ? `${org.description.substring(0, 100)}...`
                        : org.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <button
                        onClick={() => handleDeleteOrganization(org.org_id)}
                        className="flex items-center text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </>
  );
};


export default OrganizationsAdminPage;