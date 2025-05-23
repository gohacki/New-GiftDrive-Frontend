// pages/visible/profile.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Navbar from '../../components/Navbars/AuthNavbar';
import Footer from '../../components/Footers/Footer';
import { formatCurrency } from '../../lib/utils';
import Link from 'next/link';
import { toast } from 'react-toastify';

import AuthModal from '../../components/auth/AuthModal';
import OrderDetailDisplay from '../../components/Orders/OrderDetailDisplay';
import StatusDisplay from '../../components/Cards/StatusDisplay';
import PropTypes from 'prop-types';

// Change Password Form Component
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormMessage({ type: '', text: '' });

    if (newPassword !== confirmNewPassword) {
      setFormMessage({ type: 'error', text: 'New passwords do not match.' });
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setFormMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/account/change-password', {
        currentPassword,
        newPassword,
      }, { withCredentials: true });

      setFormMessage({ type: 'success', text: response.data.message });
      toast.success(response.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const apiError = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to change password.';
      setFormMessage({ type: 'error', text: apiError });
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Change Password</h3>
      {formMessage.text && (
        <div className={`mb-4 p-3 text-sm rounded ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {formMessage.text}
        </div>
      )}
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPassword">
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="6"
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmNewPassword">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 bg-ggreen text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

// Deactivate Account Form/Section Component
const DeactivateAccountSection = ({ userProvider }) => {
  const [password, setPassword] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();

  const needsPasswordConfirmation = userProvider === 'credentials';

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const payload = {};
      if (needsPasswordConfirmation) {
        if (!password) {
          toast.error("Password is required to confirm deactivation.");
          setIsDeactivating(false);
          return;
        }
        payload.password = password;
      }
      await axios.post('/api/account/deactivate', payload, { withCredentials: true });
      toast.success('Your account has been deactivated. You will be logged out.');
      await signOut({ redirect: false });
      router.push('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate account.');
      setIsDeactivating(false);
      setShowConfirmation(false);
    }
    // No finally setIsDeactivating(false) here, as successful deactivation logs out.
  };

  if (showConfirmation) {
    return (
      <AuthModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)}>
        <div className="p-2">
          <h3 className="text-xl font-semibold text-red-600 mb-4">Confirm Account Deactivation</h3>
          <p className="text-sm text-gray-700 mb-4">
            Are you absolutely sure you want to deactivate your account? This action cannot be undone.
            Your personal information will be anonymized, but your order history will be retained.
          </p>
          {needsPasswordConfirmation && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="deactivatePassword">
                Enter Password to Confirm <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="deactivatePassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
              />
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={isDeactivating}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeactivate}
              disabled={isDeactivating || (needsPasswordConfirmation && !password)}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isDeactivating ? 'Deactivating...' : 'Yes, Deactivate My Account'}
            </button>
          </div>
        </div>
      </AuthModal>
    );
  }

  return (
    <div className="mt-12 p-6 border border-red-300 rounded-lg shadow-sm bg-red-50">
      <h3 className="text-xl font-semibold text-red-700 mb-3">Deactivate Account</h3>
      <p className="text-sm text-gray-700 mb-4">
        Deactivating your account will anonymize your personal data and prevent future logins.
        Your order history will be retained for record-keeping. This action is irreversible.
      </p>
      <button
        onClick={() => setShowConfirmation(true)}
        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 transition-colors"
      >
        Deactivate My Account
      </button>
    </div>
  );
};

DeactivateAccountSection.propTypes = {
  userProvider: PropTypes.string.isRequired,
}


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

  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState(user?.profile_picture_url || '/img/default-avatar.svg');

  const canChangePassword = user?.provider === 'credentials';

  useEffect(() => {
    if (user?.profile_picture_url) {
      setCurrentProfilePicUrl(user.profile_picture_url);
    } else if (authStatus === "authenticated" && user) { // Ensure user object exists
      setCurrentProfilePicUrl('/img/default-avatar.svg');
    }
  }, [user?.profile_picture_url, authStatus, user]);

  const fetchOrderList = async () => {
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
      router.push('/auth/login?callbackUrl=/visible/profile');
    }
  }, [user, authStatus, router]);

  const handleViewOrderDetails = async (ryeOrderId) => {
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

  const closeOrderDetailModal = () => {
    setIsOrderDetailModalOpen(false);
    setSelectedOrderDetails(null);
    setDetailsError(null);
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 2MB.");
        event.target.value = null;
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.");
        event.target.value = null;
        return;
      }
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
      const newPicUrl = response.data.profile_picture_url + `?v=${new Date().getTime()}`;
      setCurrentProfilePicUrl(newPicUrl);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      document.getElementById('profilePictureInput').value = null; // Clear file input
      await updateSession({ ...session, user: { ...user, profile_picture_url: response.data.profile_picture_url } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload profile picture.');
      console.error('Profile picture upload error:', err.response?.data || err);
    } finally {
      setIsUploading(false);
    }
  };

  if (authStatus === "loading") {
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
  if (authStatus === "unauthenticated" || !user) {
    // This condition should be caught by useEffect and redirect, but as a fallback
    // or if useEffect hasn't run yet on initial server render followed by client nav
    if (typeof window !== 'undefined') router.push('/auth/login?callbackUrl=/visible/profile');
    return ( // Return a loading/redirecting state
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
                <div className="relative mb-6">
                  <Image
                    src={profilePicturePreview || currentProfilePicUrl}
                    alt="Profile Picture"
                    width={120} height={120} key={currentProfilePicUrl}
                    className="rounded-full object-cover shadow-md border-2 border-gray-200"
                    onError={(e) => { e.currentTarget.src = '/img/default-avatar.svg'; }}
                  />
                  <label htmlFor="profilePictureInput" className="absolute -bottom-2 -right-2 bg-ggreen text-white p-2 rounded-full cursor-pointer hover:bg-teal-700 transition-colors shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <input type="file" id="profilePictureInput" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleProfilePictureChange} className="hidden" />
                  </label>
                </div>
                {profilePictureFile && (
                  <div className="mb-4 text-center">
                    <button onClick={handleProfilePictureUpload} disabled={isUploading} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50">
                      {isUploading ? 'Uploading...' : 'Save Picture'}
                    </button>
                    <button onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(null); document.getElementById('profilePictureInput').value = null; }} disabled={isUploading} className="ml-2 px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 disabled:opacity-50">
                      Cancel
                    </button>
                  </div>
                )}
                <h3 className="text-3xl font-semibold mb-1 text-gray-800">{user.name || user.email}</h3>
                <div className="text-sm mb-2 text-gray-600 font-bold uppercase"><i className="fas fa-envelope mr-2 text-lg text-gray-600"></i>{user.email}</div>
                {!user.email_verified_at && (<div className="text-xs text-yellow-600 bg-yellow-100 border border-yellow-300 px-2 py-1 rounded-full mb-2">Email not verified</div>)}
                {user.is_org_admin && user.org_id && (<Link href="/admin/dashboard" className="mt-2 text-blue-500 hover:underline text-sm">Go to Organization Dashboard</Link>)}
                {user.is_super_admin && (<Link href="/admin/superAdmin" className="mt-1 text-purple-500 hover:underline text-sm">Go to Super Admin Dashboard</Link>)}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="mt-3 px-4 py-2 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Log Out</button>
              </div>

              {canChangePassword ? (
                <ChangePasswordForm />
              ) : (
                <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50 text-center">
                  <p className="text-sm text-gray-600">
                    Password management is not available for accounts created via {user.provider || 'social login'}.
                  </p>
                </div>
              )}

              <DeactivateAccountSection userProvider={user.provider} />

              <div className="mt-10 py-10 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Order History</h2>
                <StatusDisplay isLoading={authStatus === "loading" && !orders.length && !error} error={error} />
                {authStatus !== "loading" && !error && orders.length === 0 && (<p className="text-gray-600 italic">You have no orders yet.</p>)}
                {orders.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                      <thead><tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"><th className="py-2 px-4">Order ID</th><th className="py-2 px-4">Date</th><th className="py-2 px-4">Total</th><th className="py-2 px-4">Status</th><th className="py-2 px-4">Rye Ref</th><th className="py-2 px-4">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                        {orders.map(order => (
                          <tr key={order.order_id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 text-sm text-gray-800 font-mono">#{order.order_id}</td>
                            <td className="py-2 px-4 text-sm text-gray-800">{new Date(order.order_date).toLocaleDateString()}</td>
                            <td className="py-2 px-4 text-sm text-gray-800 font-medium">{formatCurrency(order.total_amount ? parseFloat(order.total_amount) * 100 : null, order.currency)}</td>
                            <td className="py-2 px-4 text-sm text-gray-800 capitalize">{order.status || 'N/A'}</td>
                            <td className="py-2 px-4 text-xs text-gray-500 font-mono">{order.primary_rye_order_id || 'N/A'}</td>
                            <td className="py-2 px-4 text-sm">
                              <button onClick={() => handleViewOrderDetails(order.primary_rye_order_id)} disabled={!order.primary_rye_order_id || isFetchingOrderDetails} className="px-3 py-1 text-xs bg-ggreen text-white rounded shadow-sm hover:bg-teal-700 disabled:opacity-50">
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