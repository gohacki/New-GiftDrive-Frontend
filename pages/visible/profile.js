// pages/visible/profile.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession, signOut } from 'next-auth/react'; // Use signOut from next-auth
import { useRouter } from 'next/router';
import Image from 'next/image'; // Import Next.js Image
import Navbar from '../../components/Navbars/AuthNavbar';
import Footer from '../../components/Footers/Footer';
import { formatCurrency } from '../../lib/utils';
import Link from 'next/link';
import { toast } from 'react-toastify';

import AuthModal from '../../components/auth/AuthModal';
import OrderDetailDisplay from '../../components/Orders/OrderDetailDisplay';
import StatusDisplay from '../../components/Cards/StatusDisplay';

const AccountPage = () => {
  const { data: session, status: authStatus, update: updateSession } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [isFetchingOrderDetails, setIsFetchingOrderDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Profile picture state
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState(user?.profile_picture_url || '/img/default-avatar.svg');

  useEffect(() => {
    if (user?.profile_picture_url) {
      setCurrentProfilePicUrl(user.profile_picture_url);
    } else {
      setCurrentProfilePicUrl('/img/default-avatar.svg');
    }
  }, [user?.profile_picture_url]);


  const fetchOrderList = async () => { /* ... (existing logic) ... */
    if (!user || !user.id) return;
    setError(null);
    try {
      const response = await axios.get(`/api/orders`, { withCredentials: true });
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error fetching order list:', err.response?.data || err);
      setError('Failed to load order history.');
      setOrders([]);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated" && user) {
      fetchOrderList();
    } else if (authStatus === "unauthenticated") {
      router.push('/auth/login');
    }
  }, [user, authStatus, router]);

  const handleViewOrderDetails = async (ryeOrderId) => { /* ... (existing logic) ... */
    if (!ryeOrderId || isFetchingOrderDetails) return;
    setIsFetchingOrderDetails(true);
    setDetailsError(null);
    setSelectedOrderDetails(null);
    setIsOrderDetailModalOpen(true);
    try {
      const response = await axios.post(`/api/orders/details`, { ryeOrderId }, { withCredentials: true });
      setSelectedOrderDetails(response.data);
    } catch (err) {
      setDetailsError(err.response?.data?.error || 'Failed to load order details.');
      setSelectedOrderDetails(null);
    } finally {
      setIsFetchingOrderDetails(false);
    }
  };

  const closeOrderDetailModal = () => { /* ... (existing logic) ... */
    setIsOrderDetailModalOpen(false);
    setSelectedOrderDetails(null);
    setDetailsError(null);
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePictureFile) {
      toast.error('Please select an image file.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', profilePictureFile);

    try {
      const response = await axios.post('/api/account/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      toast.success(response.data.message || 'Profile picture updated!');
      setCurrentProfilePicUrl(response.data.profile_picture_url); // Update displayed image
      setProfilePictureFile(null); // Reset file input state
      setProfilePicturePreview(null); // Reset preview
      // Important: Trigger session update to reflect new URL globally
      await updateSession({ profile_picture_url: response.data.profile_picture_url });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload profile picture.');
      console.error('Profile picture upload error:', err.response?.data || err);
    } finally {
      setIsUploading(false);
    }
  };


  if (authStatus === "loading") { /* ... (existing logic) ... */
    return (
      <>
        <Navbar transparent />
        <main className="min-h-screen bg-secondary_green pt-24 flex items-center justify-center">
          <p className="text-xl text-gray-600">Loading Account...</p>
        </main>
        <Footer />
      </>
    );
  }
  if (authStatus === "unauthenticated" || !user) { /* ... (existing logic) ... */
    return (
      <>
        <Navbar transparent />
        <main className="min-h-screen bg-secondary_green pt-24 flex items-center justify-center">
          <p className="text-xl text-gray-600">Redirecting to login...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 pt-24">
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="bg-white shadow-xl rounded-lg p-6">
              <div className="flex flex-col items-center mb-10">
                {/* Profile Picture Display and Upload */}
                <div className="relative mb-6">
                  <Image
                    src={profilePicturePreview || currentProfilePicUrl}
                    alt="Profile Picture"
                    width={120}
                    height={120}
                    className="rounded-full object-cover shadow-md border-2 border-gray-200"
                    onError={(e) => { e.currentTarget.src = '/img/default-avatar.svg'; }}
                  />
                  <label htmlFor="profilePictureInput" className="absolute -bottom-2 -right-2 bg-ggreen text-white p-2 rounded-full cursor-pointer hover:bg-teal-700 transition-colors shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <input
                      type="file"
                      id="profilePictureInput"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {profilePictureFile && (
                  <div className="mb-4 text-center">
                    <button
                      onClick={handleProfilePictureUpload}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Save Picture'}
                    </button>
                    <button
                      onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(null); }}
                      disabled={isUploading}
                      className="ml-2 px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <h3 className="text-3xl font-semibold mb-1 text-gray-800">
                  {user.name || user.email}
                </h3>
                <div className="text-sm mb-2 text-gray-600 font-bold uppercase">
                  <i className="fas fa-envelope mr-2 text-lg text-gray-600"></i>
                  {user.email}
                </div>
                {user.is_org_admin && user.org_id && (
                  <Link href="/admin/dashboard" className="mt-2 text-blue-500 hover:underline text-sm">
                    Go to Organization Dashboard
                  </Link>
                )}
                {user.is_super_admin && (
                  <Link href="/admin/superAdmin" className="mt-1 text-purple-500 hover:underline text-sm">
                    Go to Super Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="mt-3 px-4 py-2 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Log Out
                </button>
              </div>

              <div className="mt-10 py-10 border-t border-gray-200">
                {/* ... (Order History JSX remains the same) ... */}
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Order History</h2>
                <StatusDisplay isLoading={authStatus === "loading" && !orders.length} error={error} />

                {authStatus !== "loading" && !error && orders.length === 0 && (
                  <p className="text-gray-600 italic">You have no orders yet.</p>
                )}

                {orders.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                      <thead>
                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <th className="py-2 px-4">Order ID</th>
                          <th className="py-2 px-4">Date</th>
                          <th className="py-2 px-4">Total</th>
                          <th className="py-2 px-4">Status</th>
                          <th className="py-2 px-4">Rye Ref</th>
                          <th className="py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orders.map(order => (
                          <tr key={order.order_id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 text-sm text-gray-800 font-mono">#{order.order_id}</td>
                            <td className="py-2 px-4 text-sm text-gray-800">{new Date(order.order_date).toLocaleDateString()}</td>
                            <td className="py-2 px-4 text-sm text-gray-800 font-medium">
                              {formatCurrency(
                                order.total_amount ? parseFloat(order.total_amount) * 100 : null,
                                order.currency
                              )}
                            </td>
                            <td className="py-2 px-4 text-sm text-gray-800 capitalize">{order.status || 'N/A'}</td>
                            <td className="py-2 px-4 text-xs text-gray-500 font-mono">{order.primary_rye_order_id || 'N/A'}</td>
                            <td className="py-2 px-4 text-sm">
                              <button
                                onClick={() => handleViewOrderDetails(order.primary_rye_order_id)}
                                disabled={!order.primary_rye_order_id || isFetchingOrderDetails}
                                className="px-3 py-1 text-xs bg-ggreen text-white rounded shadow-sm hover:bg-teal-700 disabled:opacity-50"
                              >
                                {isFetchingOrderDetails && selectedOrderDetails?.id === order.primary_rye_order_id ? 'Loading...' : 'View Details'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <AuthModal isOpen={isOrderDetailModalOpen} onClose={closeOrderDetailModal}>
        {/* ... (Modal content JSX remains the same) ... */}
        {detailsError && <p className="text-red-600 text-sm mb-2 text-center">{detailsError}</p>}
        <OrderDetailDisplay
          orderDetails={selectedOrderDetails}
          isLoading={isFetchingOrderDetails}
          onClose={closeOrderDetailModal}
        />
      </AuthModal>
    </>
  );
};

export default AccountPage;