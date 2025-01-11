// src/pages/superadmin/organizations.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import Navbar from 'components/Navbars/AuthNavbar';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

const OrganizationsAdminPage = () => {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // State variables for organizations
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
  const [loading, setLoading] = useState(false);

  // State variables for unpurchased order items
  const [unpurchasedItems, setUnpurchasedItems] = useState([]);
  const [unpurchasedLoading, setUnpurchasedLoading] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({
    order_number: '',
    tracking_number: '',
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState('');

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
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
  }, [apiUrl]);

  // Fetch unpurchased order items
  const fetchUnpurchasedItems = useCallback(async () => {
    setUnpurchasedLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/order_items/unpurchased`, { withCredentials: true });
      setUnpurchasedItems(response.data);
    } catch (error) {
      console.error('Error fetching unpurchased order items:', error);
      // Optionally set an error state
    } finally {
      setUnpurchasedLoading(false);
    }
  }, [apiUrl]);

  // Handle authentication and fetch data
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (!user.is_super_admin) {
      router.push('/');
    } else {
      fetchOrganizations();
      fetchUnpurchasedItems();
    }
  }, [user, router, fetchOrganizations, fetchUnpurchasedItems]);

  // Handle input changes for organization form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, photo: e.target.files[0] }));
  };

  // Handle adding a new organization
  const handleAddOrganization = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMessage('Organization name is required.');
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) {
        submitData.append(key, formData[key]);
      }
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

  // Handle deleting an organization
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

  // Handle opening the purchase modal
  const openPurchaseModal = (orderItem) => {
    setSelectedOrderItem(orderItem);
    setPurchaseForm({
      order_number: orderItem.order_number || '',
      tracking_number: orderItem.tracking_number || '',
    });
    setPurchaseError('');
    setPurchaseSuccess('');
    setPurchaseModal(true);
  };

  // Handle closing the purchase modal
  const closePurchaseModal = () => {
    setPurchaseModal(false);
    setSelectedOrderItem(null);
    setPurchaseForm({
      order_number: '',
      tracking_number: '',
    });
  };

  // Handle input changes for purchase form
  const handlePurchaseInputChange = (e) => {
    const { name, value } = e.target;
    setPurchaseForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle submitting the purchase form
  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    const { order_number, tracking_number } = purchaseForm;

    if (!order_number || !tracking_number) {
      setPurchaseError('Both order number and tracking number are required.');
      return;
    }

    setPurchaseLoading(true);
    try {
      await axios.post(
        `${apiUrl}/api/order_items/${selectedOrderItem.order_item_id}/purchase`,
        { order_number, tracking_number },
        { withCredentials: true }
      );
      setPurchaseSuccess('Order item marked as purchased successfully.');
      // Refresh the unpurchased items list
      fetchUnpurchasedItems();
      // Optionally, remove the item from the current list
      setUnpurchasedItems((prev) =>
        prev.filter((item) => item.order_item_id !== selectedOrderItem.order_item_id)
      );
      // Close the modal after a short delay
      setTimeout(() => {
        closePurchaseModal();
      }, 1500);
    } catch (error) {
      console.error('Error marking order item as purchased:', error);
      setPurchaseError(
        error.response?.data?.error || 'Failed to mark order item as purchased.'
      );
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <>
      <Navbar transparent />
      <div className="py-24 px-6 bg-gray-400 p-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
        </header>


        {/* Unpurchased Order Items Section */}
        <section className="bg-white p-6 rounded-lg shadow-md my-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Unpurchased Order Items</h2>
          {unpurchasedLoading ? (
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
              <span className="ml-2 text-gray-700">Loading unpurchased order items...</span>
            </div>
          ) : unpurchasedItems.length === 0 ? (
            <p className="text-gray-500">No unpurchased order items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white table-fixed">
                <thead>
                  <tr>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                      Item Name
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer Email
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Internal Item Order Number
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amazon Order Number
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tracking Number
                    </th>
                    <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unpurchasedItems.map((item) => (
                    <tr key={item.order_item_id} className="hover:bg-gray-100" onClick={() => openPurchaseModal(item)}>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[12rem] truncate"
                        title={item.item_name} // Shows full text on hover
                      >
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.customer_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.order_item_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.tracking_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <button
                          onClick={() => openPurchaseModal(item)}
                          className="flex items-center text-green-600 hover:text-green-800"
                        >
                          Mark as Purchased
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                          <div className="text-sm font-medium text-gray-900">{org.name}
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


        {/* Purchase Modal */}
        {purchaseModal && selectedOrderItem && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
              <h3 className="text-xl font-semibold mb-4">Mark as Purchased</h3>
              {purchaseError && (
                <div className="mb-4 px-4 py-2 rounded bg-red-100 text-red-700">
                  {purchaseError}
                </div>
              )}
              {purchaseSuccess && (
                <div className="mb-4 px-4 py-2 rounded bg-green-100 text-green-700">
                  {purchaseSuccess}
                </div>
              )}
              <form onSubmit={handleSubmitPurchase}>
                <div className="mb-4">
                  <label htmlFor="order_number" className="block text-gray-700 font-medium mb-2">
                    Order Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="order_number"
                    id="order_number"
                    value={purchaseForm.order_number}
                    onChange={handlePurchaseInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="tracking_number" className="block text-gray-700 font-medium mb-2">
                    Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tracking_number"
                    id="tracking_number"
                    value={purchaseForm.tracking_number}
                    onChange={handlePurchaseInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closePurchaseModal}
                    className="mr-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={purchaseLoading}
                    className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center ${
                      purchaseLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {purchaseLoading && (
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
                    )}
                    {purchaseLoading ? 'Processing...' : 'Mark as Purchased'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrganizationsAdminPage;
