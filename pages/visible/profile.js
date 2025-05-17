// pages/visible/profile.js
import React, { useState, useEffect } from 'react'; // Removed useContext
import axios from 'axios';
// import { AuthContext } from '../../contexts/AuthContext'; // REMOVE THIS LINE
import { useSession } from 'next-auth/react'; // ADD THIS LINE
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbars/AuthNavbar';
import Footer from '../../components/Footers/Footer';
import { formatCurrency } from '../../lib/utils';
import Link from 'next/link';

// --- Import Modal and Detail Display ---
import AuthModal from '../../components/auth/AuthModal';
import OrderDetailDisplay from '../../components/Orders/OrderDetailDisplay';
import StatusDisplay from '../../components/Cards/StatusDisplay';

// const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Not needed for internal API calls

const AccountPage = () => {
  const { data: session, status: authStatus } = useSession(); // USE useSession hook
  const user = session?.user; // User object from NextAuth session
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  // const { loading: authLoading } = useContext(AuthContext); // REMOVE THIS LINE, use authStatus === "loading"

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [isFetchingOrderDetails, setIsFetchingOrderDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const fetchOrderList = async () => {
    if (!user || !user.id) return; // Guard against fetching without user.id (from NextAuth session)
    setError(null);
    try {
      console.log("Profile: Fetching order list...");
      // Calls YOUR Next.js API route for fetching the cart
      const response = await axios.get(`/api/orders`, { withCredentials: true }); // Relative path to Next.js API
      setOrders(response.data || []);
      console.log("Profile: Order list fetched:", response.data);
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
      // Redirect if user logs out while on the page (or arrived unauthenticated)
      console.log("Profile page: User not authenticated, redirecting to login.");
      router.push('/auth/login');
    }
    // If authStatus is "loading", the UI will show a loading state.
  }, [user, authStatus, router]); // Effect runs when user or authStatus changes

  const handleViewOrderDetails = async (ryeOrderId) => {
    if (!ryeOrderId || isFetchingOrderDetails) return;

    console.log(`Profile: Fetching details for Rye Order ID: ${ryeOrderId}`);
    setIsFetchingOrderDetails(true);
    setDetailsError(null);
    setSelectedOrderDetails(null);
    setIsOrderDetailModalOpen(true);

    try {
      const response = await axios.post(
        `/api/orders/details`, // Relative path to Next.js API
        { ryeOrderId },
        { withCredentials: true }
      );
      console.log("Profile: Order details received:", response.data);
      setSelectedOrderDetails(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err.response?.data || err);
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
  }

  // --- Render Logic ---

  if (authStatus === "loading") { // Show loading or let redirect happen
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

  // If unauthenticated, the useEffect above should redirect.
  // This is a fallback or for the brief moment before redirect.
  if (authStatus === "unauthenticated" || !user) {
    // router.push('/auth/login'); // Handled by useEffect, but can be here for immediate attempt
    return ( // Or a more explicit "You need to login" message
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
                <h3 className="text-4xl font-semibold mb-2 text-gray-800">
                  {user.name || user.email} {/* Use user.name from NextAuth session */}
                </h3>
                <div className="text-sm mb-2 text-gray-600 font-bold uppercase">
                  <i className="fas fa-envelope mr-2 text-lg text-gray-600"></i>
                  {user.email}
                </div>
                {/* Example: Add links if you have admin roles in your session.user object */}
                {user.is_org_admin && user.org_id && (
                  <Link href="/admin/dashboard" className="mt-2 text-blue-500 hover:underline">
                    Go to Organization Dashboard
                  </Link>
                )}
                {user.is_super_admin && (
                  <Link href="/admin/superAdmin" className="mt-2 text-purple-500 hover:underline">
                    Go to Super Admin Dashboard
                  </Link>
                )}
              </div>

              <div className="mt-10 py-10 border-t border-gray-200">
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
                                {/* Update loading state indication to be specific to the button/action */}
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
        // onReturnRequest={handleRequestReturn} // Pass if you implement returns
        />
      </AuthModal>
    </>
  );
};

export default AccountPage;