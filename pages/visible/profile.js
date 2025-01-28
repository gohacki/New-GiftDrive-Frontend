// pages/visible/profile.js

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext'; // Adjust the path as necessary
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbars/AuthNavbar'; // Adjust the path as necessary
import Footer from '../../components/Footers/Footer'; // Adjust the path as necessary

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AccountPage = () => {
  // Removed cartItems state
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

        // Removed cart fetching
        /*
        // Fetch user's cart items
        const cartResponse = await axios.get(`${apiUrl}/api/cart`, { withCredentials: true });
        setCartItems(cartResponse.data || []); // Fallback to empty array
        */

        // Fetch user's orders
        const ordersResponse = await axios.get(`${apiUrl}/api/orders`, { withCredentials: true });
        setOrders(ordersResponse.data || []); // Fallback to empty array
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
        <main className="profile-page">
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
        <main className="profile-page">
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
      router.push('/auth/login'); // Adjust the login route as necessary
    }
    return null;
  }

  return (
    <>
      <Navbar transparent />
      <main className="profile-page">
        {/* Profile Header Section */}
        <section className="relative block h-500-px">
          <div
            className="absolute top-0 w-full h-full bg-center bg-cover"
            style={{
              backgroundImage:
                "url('https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/christmas_present.png')",
            }}
          >
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-50 bg-black"
            ></span>
          </div>
          <div
            className="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-16"
            style={{ transform: "translateZ(0)" }}
          >
            <svg
              className="absolute bottom-0 overflow-hidden"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              version="1.1"
              viewBox="0 0 2560 100"
              x="0"
              y="0"
            >
              <polygon
                className="text-blueGray-200 fill-current"
                points="2560 0 2560 100 0 100"
              ></polygon>
            </svg>
          </div>
        </section>

        {/* Profile Information Section */}
        <section className="relative py-16 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-xl rounded-lg -mt-96">
              <div className="px-6">
                <div className="flex flex-wrap justify-center">
                  {/* User Information */}
                  <div className="text-center mt-12">
                    <h3 className="text-4xl font-semibold leading-normal mb-2 text-blueGray-700">
                      {user.username}
                    </h3>
                    <div className="text-sm leading-normal mt-0 mb-2 text-blueGray-400 font-bold uppercase">
                      <i className="fas fa-envelope mr-2 text-lg text-blueGray-400"></i>
                      {user.email}
                    </div>
                    <div className="flex flex-wrap justify-center">
                      <div className="w-full lg:w-9/12 px-4">
                        <button
                          className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150"
                          type="button"
                          onClick={() => router.push('/account/update-profile')} // Adjust the route as necessary
                        >
                          Update Profile
                        </button>
                        <button
                          className="bg-blueGray-600 text-white active:bg-blueGray-500 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150 mt-2"
                          type="button"
                          onClick={() => router.push('/account/change-password')} // Adjust the route as necessary
                        >
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order History */}
                <div className="mt-10 py-10 border-t border-blueGray-200">
                  <h2 className="text-2xl font-semibold text-blueGray-700 mb-4">Your Order History</h2>
                  {orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead>
                          <tr>
                            <th className="py-2 px-4 bg-blueGray-100 text-left text-xs font-semibold text-blueGray-600 uppercase tracking-wider">
                              Order ID
                            </th>
                            <th className="py-2 px-4 bg-blueGray-100 text-left text-xs font-semibold text-blueGray-600 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="py-2 px-4 bg-blueGray-100 text-left text-xs font-semibold text-blueGray-600 uppercase tracking-wider">
                              Total Amount
                            </th>
                            <th className="py-2 px-4 bg-blueGray-100 text-left text-xs font-semibold text-blueGray-600 uppercase tracking-wider">
                              Items
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(order => (
                            <tr key={order.order_id} className="border-b">
                              <td className="py-2 px-4 text-sm text-blueGray-700">
                                #{order.order_id}
                              </td>
                              <td className="py-2 px-4 text-sm text-blueGray-700">
                                {new Date(order.order_date).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-4 text-sm text-blueGray-700">
                                ${Number(order.total_amount).toFixed(2)}
                              </td>
                              <td className="py-2 px-4 text-sm text-blueGray-700">
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
                    <p className="text-blueGray-600">You have no orders yet.</p>
                  )}
                </div>
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
