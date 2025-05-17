// File: pages/admin/superAdmin.js
import React, { useState, useEffect, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import Navbar from 'components/Navbars/AuthNavbar'; // Using AuthNavbar as per original
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import StatusDisplay from '@/components/Cards/StatusDisplay';
import { toast } from 'react-toastify'; // For user feedback

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// Layout (If this page should use the Admin layout)
// import Admin from "layouts/Admin.js"; // Uncomment if using Admin layout

const OrganizationsAdminPage = () => {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [organizations, setOrganizations] = useState([]);
  const [orgFormData, setOrgFormData] = useState({ name: '', description: '', address: '', city: '', state: '', zip_code: '', website_link: '', photo: null });
  const [orgErrorMessage, setOrgErrorMessage] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  const [unpurchasedItems, setUnpurchasedItems] = useState([]);
  const [unpurchasedLoading, setUnpurchasedLoading] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({ order_number: '', tracking_number: '' });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  // const [purchaseSuccess, setPurchaseSuccess] = useState(''); // Replaced by toast

  const [newItemUrl, setNewItemUrl] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemStatus, setAddItemStatus] = useState({ type: '', message: '' }); // Kept for specific status display if needed

  const fetchOrganizations = useCallback(async () => {
    setOrgLoading(true);
    try {
      // UPDATED to relative path
      const response = await axios.get(`/api/organizations`, { withCredentials: true });
      setOrganizations(response.data || []);
      setOrgErrorMessage('');
    } catch (error) {
      console.error('Error fetching organizations:', error.response?.data || error.message);
      setOrgErrorMessage(error.response?.data?.error || 'Failed to load organizations.');
      toast.error(error.response?.data?.error || 'Failed to load organizations.');
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const fetchUnpurchasedItems = useCallback(async () => {
    setUnpurchasedLoading(true);
    try {
      // UPDATED to relative path
      const response = await axios.get(`/api/orders/unpurchased`, { withCredentials: true });
      setUnpurchasedItems(response.data || []);
    } catch (error) {
      console.error('Error fetching unpurchased order items:', error.response?.data || error.message);
      toast.error('Failed to load unpurchased items.');
    } finally {
      setUnpurchasedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated" || !user) {
      router.push('/auth/login');
    } else if (!user.is_super_admin) {
      toast.error("Access Denied: Super Admin only.");
      router.push('/');
    } else {
      fetchOrganizations();
      fetchUnpurchasedItems();
    }
  }, [user, authStatus, router, fetchOrganizations, fetchUnpurchasedItems]);

  const handleOrgInputChange = (e) => { /* ... (remains the same) ... */
    const { name, value } = e.target;
    setOrgFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleOrgFileChange = (e) => { /* ... (remains the same) ... */
    setOrgFormData((prev) => ({ ...prev, photo: e.target.files[0] }));
  };

  const handleAddOrganization = async (e) => {
    e.preventDefault();
    if (!orgFormData.name) {
      setOrgErrorMessage('Organization name is required.');
      toast.error('Organization name is required.');
      return;
    }
    const submitData = new FormData();
    Object.keys(orgFormData).forEach((key) => {
      if (orgFormData[key] !== null) submitData.append(key, orgFormData[key]);
    });
    setOrgLoading(true);
    try {
      // UPDATED to relative path
      await axios.post(`/api/organizations`, submitData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Organization added successfully!');
      setOrgErrorMessage('');
      setOrgFormData({ name: '', description: '', address: '', city: '', state: '', zip_code: '', website_link: '', photo: null });
      fetchOrganizations();
    } catch (error) {
      console.error('Error adding organization:', error.response?.data || error.message);
      const apiError = error.response?.data?.error || 'Failed to add organization.';
      setOrgErrorMessage(apiError);
      toast.error(apiError);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleDeleteOrganization = async (org_id) => {
    if (confirm('Are you sure you want to delete this organization? This action CANNOT be undone and will affect associated drives and users.')) {
      setOrgLoading(true);
      try {
        // UPDATED to relative path
        await axios.delete(`/api/organizations/${org_id}`, { withCredentials: true });
        toast.success('Organization deleted successfully!');
        fetchOrganizations();
      } catch (error) {
        console.error('Error deleting organization:', error.response?.data || error.message);
        const apiError = error.response?.data?.error || 'Failed to delete organization.';
        alert(apiError); // Keep alert for critical ops or use toast.error
        setOrgErrorMessage(apiError); // Also set local error if needed
      } finally {
        setOrgLoading(false);
      }
    }
  };

  const openPurchaseModal = (orderItem) => { /* ... (remains the same) ... */
    setSelectedOrderItem(orderItem);
    setPurchaseForm({ order_number: orderItem.order_number || '', tracking_number: orderItem.tracking_number || '' });
    setPurchaseError('');
    // setPurchaseSuccess(''); // Replaced by toast
    setPurchaseModal(true);
  };
  const closePurchaseModal = () => { /* ... (remains the same) ... */
    setPurchaseModal(false);
    setSelectedOrderItem(null);
    setPurchaseForm({ order_number: '', tracking_number: '' });
  };
  const handlePurchaseInputChange = (e) => { /* ... (remains the same) ... */
    const { name, value } = e.target;
    setPurchaseForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    const { order_number, tracking_number } = purchaseForm;
    if (!order_number || !tracking_number) {
      setPurchaseError('Both order number and tracking number are required.');
      toast.error('Both order number and tracking number are required.');
      return;
    }
    setPurchaseLoading(true);
    setPurchaseError('');
    // setPurchaseSuccess(''); // Replaced by toast
    try {
      // UPDATED to relative path
      await axios.post(
        `/api/orders/items/${selectedOrderItem.order_item_id}/purchase`,
        { order_number, tracking_number },
        { withCredentials: true }
      );
      toast.success('Order item marked as purchased successfully.');
      fetchUnpurchasedItems();
      setTimeout(() => { closePurchaseModal(); }, 1500);
    } catch (error) {
      console.error('Error marking order item as purchased:', error.response?.data || error.message);
      const apiError = error.response?.data?.error || 'Failed to mark order item as purchased.';
      setPurchaseError(apiError);
      toast.error(apiError);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleUrlChange = (e) => { setNewItemUrl(e.target.value); };

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!newItemUrl.trim()) return;
    setIsAddingItem(true);
    setAddItemStatus({ type: '', message: '' }); // Reset specific status
    try {
      // UPDATED to relative path
      const response = await axios.post(
        `/api/items/add-via-url`,
        { productUrl: newItemUrl },
        { withCredentials: true }
      );
      setAddItemStatus({ type: 'success', message: response.data.message || 'Item added/found successfully!' });
      toast.success(response.data.message || 'Item processed successfully!');
      setNewItemUrl('');
    } catch (error) {
      console.error('Error adding item via URL:', error.response?.data || error.message);
      const apiError = error.response?.data?.error || 'Failed to add item.';
      setAddItemStatus({ type: 'error', message: apiError });
      toast.error(apiError);
    } finally {
      setIsAddingItem(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <>
        <Navbar transparent />
        <div className="py-24 px-6 bg-gray-100 p-6 min-h-screen flex justify-center items-center">
          <p className='text-gray-700 text-lg'>Loading authorization...</p>
        </div>
      </>
    );
  }

  if (authStatus === "unauthenticated" || (authStatus === "authenticated" && !user?.is_super_admin)) {
    // This ensures non-super admins are also handled, though useEffect should redirect.
    return (
      <>
        <Navbar transparent />
        <div className="py-24 px-6 bg-gray-100 p-6 min-h-screen flex flex-col justify-center items-center">
          <p className='text-red-600 text-lg font-semibold mb-4'>Unauthorized Access</p>
          <p className='text-gray-700'>You do not have permission to view this page.</p>
          <button onClick={() => router.push('/')} className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to Homepage
          </button>
        </div>
      </>
    );
  }

  // Global loading indicator for initial data fetches or major ops
  const isPageLoading = orgLoading || unpurchasedLoading;

  return (
    <>
      <Navbar transparent /> {/* Using AuthNavbar for this page */}
      <div className="py-24 px-4 sm:px-6 bg-gray-100 min-h-screen">
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
        </header>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Display global loading/error only if not specific to a section */}
          {isPageLoading && <StatusDisplay isLoading={true} />}
          {orgErrorMessage && !orgLoading && <StatusDisplay error={orgErrorMessage} />}
          {purchaseError && !purchaseLoading && <StatusDisplay error={purchaseError} />}

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Item to Global Catalog</h2>
            {/* Specific status display for item adding */}
            <StatusDisplay isLoading={isAddingItem} error={addItemStatus.type === 'error' ? addItemStatus.message : null} />
            {addItemStatus.type === 'success' && !isAddingItem && (
              <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 border border-green-300 rounded">
                {addItemStatus.message}
              </div>
            )}
            <form onSubmit={handleAddItemSubmit}>
              {/* ... (Add Item form JSX remains the same) ... */}
              <div className="mb-4">
                <label htmlFor="newItemUrl" className="block text-gray-700 font-medium mb-2 text-sm">
                  Product URL (Amazon or Shopify):
                </label>
                <input
                  type="url"
                  id="newItemUrl"
                  name="newItemUrl"
                  value={newItemUrl}
                  onChange={handleUrlChange}
                  required
                  placeholder="https://www.amazon.com/dp/ASIN or https://store.myshopify.com/products/handle"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingItem || !newItemUrl.trim()}
                className={`w-full md:w-auto px-5 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm ${(isAddingItem || !newItemUrl.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isAddingItem ? 'Adding Item...' : 'Add Item to Catalog'}
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Unpurchased Order Items</h2>
            {unpurchasedLoading && !unpurchasedItems.length ? ( /* Better loading check */
              <div className="flex justify-center items-center p-4">
                {/* ... (SVG loader remains the same) ... */}
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path> </svg>
                <span className="ml-2 text-gray-600">Loading items...</span>
              </div>
            ) : unpurchasedItems.length === 0 && !unpurchasedLoading ? (
              <p className="text-gray-500 italic">No unpurchased items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white table-auto">
                  {/* ... (Unpurchased Items table JSX remains the same) ... */}
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Internal ID</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order #</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tracking #</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {unpurchasedItems.map((item) => (
                      <tr key={item.order_item_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openPurchaseModal(item)}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" title={item.item_name}>{item.item_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.customer_email}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 font-mono">{item.order_item_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.order_number || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.tracking_number || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          <button onClick={(e) => { e.stopPropagation(); openPurchaseModal(item); }} className="text-green-600 hover:text-green-800 hover:underline text-xs font-medium">Mark Purchased</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Organization</h2>
            {/* Use StatusDisplay for org form errors if preferred, or keep specific message */}
            {orgErrorMessage && !orgLoading && (
              <div className="mb-4 px-4 py-2 rounded bg-red-100 text-red-700 text-sm">{orgErrorMessage}</div>
            )}
            <form onSubmit={handleAddOrganization} encType="multipart/form-data">
              {/* ... (Add Organization form JSX remains the same) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="org-name" className="block text-gray-700 font-medium mb-1 text-sm">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="org-name" value={orgFormData.name} onChange={handleOrgInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label htmlFor="org-website_link" className="block text-gray-700 font-medium mb-1 text-sm">Website Link</label>
                  <input type="url" name="website_link" id="org-website_link" value={orgFormData.website_link} onChange={handleOrgInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="https://example.com" />
                </div>
                <div>
                  <label htmlFor="org-city" className="block text-gray-700 font-medium mb-1 text-sm">City</label>
                  <input type="text" name="city" id="org-city" value={orgFormData.city} onChange={handleOrgInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label htmlFor="org-state" className="block text-gray-700 font-medium mb-1 text-sm">State</label>
                  <input type="text" name="state" id="org-state" value={orgFormData.state} onChange={handleOrgInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label htmlFor="org-zip_code" className="block text-gray-700 font-medium mb-1 text-sm">Zip Code</label>
                  <input type="text" name="zip_code" id="org-zip_code" value={orgFormData.zip_code} onChange={handleOrgInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="org-address" className="block text-gray-700 font-medium mb-1 text-sm">Address</label>
                  <input type="text" name="address" id="org-address" value={orgFormData.address} onChange={handleOrgInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="org-description" className="block text-gray-700 font-medium mb-1 text-sm">Description</label>
                  <textarea name="description" id="org-description" value={orgFormData.description} onChange={handleOrgInputChange} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Brief description..."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="org-photo" className="block text-gray-700 font-medium mb-1 text-sm">Photo</label>
                  <input type="file" name="photo" id="org-photo" accept="image/*" onChange={handleOrgFileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>
              <div className="mt-6">
                <button type="submit" disabled={orgLoading} className={`w-full md:w-auto flex justify-center items-center px-5 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors text-sm ${orgLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {orgLoading ? (<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>) : null}
                  {orgLoading ? 'Adding...' : 'Add Organization'}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Existing Organizations</h2>
            {orgLoading && !organizations.length ? (
              <div className="flex justify-center items-center p-4">
                {/* ... (SVG loader) ... */}
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path> </svg>
                <span className="ml-2 text-gray-600">Loading organizations...</span>
              </div>
            ) : organizations.length === 0 && !orgLoading ? (
              <p className="text-gray-500 italic">No organizations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  {/* ... (Existing Organizations table JSX remains the same) ... */}
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-2 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {organizations.map((org) => (
                      <tr key={org.org_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 font-medium">{org.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-md truncate" title={org.description}>{org.description}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          <button onClick={() => handleDeleteOrganization(org.org_id)} disabled={orgLoading} className="flex items-center text-red-600 hover:text-red-800 disabled:opacity-50 text-xs"> <FaTrash className="mr-1" /> Delete </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {purchaseModal && selectedOrderItem && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                {/* ... (Purchase Modal JSX remains the same) ... */}
                <button onClick={closePurchaseModal} className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-2xl">×</button>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Mark Item as Purchased</h3>
                <div className='mb-4 text-sm bg-gray-50 p-3 border rounded'>
                  <p><strong>Item:</strong> {selectedOrderItem.item_name}</p>
                  <p><strong>Qty:</strong> {selectedOrderItem.quantity}</p>
                  <p><strong>Customer:</strong> {selectedOrderItem.customer_email}</p>
                  <p><strong>Internal ID:</strong> {selectedOrderItem.order_item_id}</p>
                </div>
                {purchaseError && (<div className="mb-3 px-3 py-2 rounded bg-red-100 text-red-700 text-sm">{purchaseError}</div>)}
                {/* {purchaseSuccess && (<div className="mb-3 px-3 py-2 rounded bg-green-100 text-green-700 text-sm">{purchaseSuccess}</div>)} */}
                <form onSubmit={handleSubmitPurchase}>
                  <div className="mb-3">
                    <label htmlFor="order_number" className="block text-gray-700 font-medium mb-1 text-sm">Order Number <span className="text-red-500">*</span></label>
                    <input type="text" name="order_number" id="order_number" value={purchaseForm.order_number} onChange={handlePurchaseInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-sm" />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="tracking_number" className="block text-gray-700 font-medium mb-1 text-sm">Tracking Number <span className="text-red-500">*</span></label>
                    <input type="text" name="tracking_number" id="tracking_number" value={purchaseForm.tracking_number} onChange={handlePurchaseInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-sm" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={closePurchaseModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">Cancel</button>
                    <button type="submit" disabled={purchaseLoading} className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center text-sm ${purchaseLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {purchaseLoading && (<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>)}
                      {purchaseLoading ? 'Processing...' : 'Mark as Purchased'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Uncomment if using Admin layout explicitly for this page
// OrganizationsAdminPage.layout = Admin;

export default OrganizationsAdminPage;