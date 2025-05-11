// pages/visible/profile.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbars/AuthNavbar';
import Footer from '../../components/Footers/Footer';
import { formatCurrency } from '../../lib/utils'; // Import utility

// --- Import Modal and Detail Display ---
import AuthModal from '../../components/auth/AuthModal'; // Adjust path
import OrderDetailDisplay from '../../components/Orders/OrderDetailDisplay'; // Adjust path
import StatusDisplay from '../../components/Cards/StatusDisplay'; // For loading/error feedback

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AccountPage = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, loading: authLoading } = useContext(AuthContext);

  // --- State for Order Details ---
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [isFetchingOrderDetails, setIsFetchingOrderDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null); // Specific error for modal

  const fetchOrderList = async () => {
    if (!user || !user.account_id) return; // Guard against fetching without user
    setError(null); // Clear previous list errors
    try {
      console.log("Profile: Fetching order list...");
      // Fetches from YOUR backend's /api/orders route
      const response = await axios.get(`${apiUrl}/api/orders`, { withCredentials: true });
      setOrders(response.data || []);
      console.log("Profile: Order list fetched:", response.data);
    } catch (err) {
      console.error('Error fetching order list:', err.response?.data || err);
      setError('Failed to load order history.');
      setOrders([]); // Clear orders on error
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchOrderList();
    } else if (!authLoading && !user) {
      // Redirect if user logs out while on the page (or arrived unauthenticated)
      router.push('/auth/login');
    }
  }, [user, authLoading, router]); // Effect runs when user or authLoading changes


  // --- Handler to Fetch and Show Order Details ---
  const handleViewOrderDetails = async (ryeOrderId) => {
    if (!ryeOrderId || isFetchingOrderDetails) return;

    console.log(`Profile: Fetching details for Rye Order ID: ${ryeOrderId}`);
    setIsFetchingOrderDetails(true);
    setDetailsError(null); // Clear previous detail errors
    setSelectedOrderDetails(null); // Clear previous details
    setIsOrderDetailModalOpen(true); // Open modal immediately (shows loading state)

    try {
      // Calls YOUR backend's POST /api/orders/details endpoint
      const response = await axios.post(
        `${apiUrl}/api/orders/details`,
        { ryeOrderId }, // Send the primary Rye Order ID
        { withCredentials: true }
      );
      console.log("Profile: Order details received:", response.data);
      setSelectedOrderDetails(response.data); // Set the details fetched from Rye
    } catch (err) {
      console.error('Error fetching order details:', err.response?.data || err);
      setDetailsError(err.response?.data?.error || 'Failed to load order details.');
      setSelectedOrderDetails(null); // Clear details on error
      // Keep modal open to show error message within OrderDetailDisplay
    } finally {
      setIsFetchingOrderDetails(false); // Stop loading indicator
    }
  };

  // Close modal function
  const closeOrderDetailModal = () => {
    setIsOrderDetailModalOpen(false);
    setSelectedOrderDetails(null);
    setDetailsError(null);
  }

  // --- Render Logic ---

  if (authLoading || (!user && !authLoading)) { // Show loading or let redirect happen
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

  // Should not happen if redirect works, but as a fallback
  if (!user) return null;

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 pt-24">
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="bg-white shadow-xl rounded-lg p-6">
              {/* User Info Section (Keep as is) */}
              <div className="flex flex-col items-center mb-10">
                <h3 className="text-4xl font-semibold mb-2 text-gray-800">
                  {user.username || user.email} {/* Display username if available */}
                </h3>
                <div className="text-sm mb-2 text-gray-600 font-bold uppercase">
                  <i className="fas fa-envelope mr-2 text-lg text-gray-600"></i>
                  {user.email}
                </div>
                {/* Add Links to Profile/Password Update pages if they exist */}
                {/* ... buttons ... */}
              </div>

              {/* Order History Section */}
              <div className="mt-10 py-10 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Order History</h2>
                {/* Display list loading/error status */}
                <StatusDisplay isLoading={authLoading && !orders.length} error={error} />

                {!authLoading && !error && orders.length === 0 && (
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
                              {/* CORRECTED: Convert string to number, then to cents */}
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

      {/* Order Detail Modal */}
      <AuthModal isOpen={isOrderDetailModalOpen} onClose={closeOrderDetailModal}>
        {/* Pass potential error to the display component */}
        {detailsError && <p className="text-red-600 text-sm mb-2 text-center">{detailsError}</p>}
        <OrderDetailDisplay
          orderDetails={selectedOrderDetails}
          isLoading={isFetchingOrderDetails}
          onClose={closeOrderDetailModal}
        // onReturnRequest={handleRequestReturn} // Pass return handler if implemented
        />
      </AuthModal>
    </>
  );
};

export default AccountPage;