import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbars/AuthNavbar';
import Footer from '../../components/Footers/Footer';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AccountPage = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        if (!user || !user.account_id) {
          setError('User not authenticated.');
          return;
        }
        // Fetch user's orders
        const ordersResponse = await axios.get(`${apiUrl}/api/orders`, { withCredentials: true });
        setOrders(ordersResponse.data || []);
      } catch (err) {
        console.error('Error fetching account data:', err);
        setError('Failed to load account information.');
      }
    };

    if (!loading) {
      fetchAccountData();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <>
        <Navbar transparent />
        <main className="min-h-screen bg-secondary_green text-gray-800">
          <div className="container mx-auto px-4 py-20">
            <p className="text-center text-xl">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar transparent />
        <main className="min-h-screen bg-secondary_green text-gray-800">
          <div className="container mx-auto px-4 py-20">
            <p className="text-center text-red-500 text-xl">{error}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login');
    }
    return null;
  }

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 pt-24">
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="bg-white shadow-xl rounded-lg p-6">
              <div className="flex flex-col items-center">
                <h3 className="text-4xl font-semibold mb-2 text-gray-800">
                  {user.username}
                </h3>
                <div className="text-sm mb-2 text-gray-600 font-bold uppercase">
                  <i className="fas fa-envelope mr-2 text-lg text-gray-600"></i>
                  {user.email}
                </div>
                <div className="flex flex-wrap justify-center mt-4">
                  <button
                    className="bg-ggreen text-white text-sm font-bold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 mr-2 mb-2"
                    type="button"
                    onClick={() => router.push('/account/update-profile')}
                  >
                    Update Profile
                  </button>
                  <button
                    className="bg-ggreen text-white text-sm font-bold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 mr-2 mb-2"
                    type="button"
                    onClick={() => router.push('/account/change-password')}
                  >
                    Change Password
                  </button>
                </div>
              </div>

              <div className="mt-10 py-10 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Order History</h2>
                {orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Total Amount
                          </th>
                          <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Items
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.order_id} className="border-b">
                            <td className="py-2 px-4 text-sm text-gray-800">
                              #{order.order_id}
                            </td>
                            <td className="py-2 px-4 text-sm text-gray-800">
                              {new Date(order.order_date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-4 text-sm text-gray-800">
                              ${Number(order.total_amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-4 text-sm text-gray-800">
                              <ul className="list-disc list-inside">
                                {order.items.map(item => (
                                  <li key={item.order_item_id}>
                                    {item.item_name} {item.size && `(${item.size}`}{item.size && item.color && `, ${item.color})`} - Qty: {item.quantity}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600">You have no orders yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AccountPage;
