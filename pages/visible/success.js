// pages/checkout/success.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';

const SuccessPage = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (session_id) {
      // Optionally, fetch order details using the session_id
      // This depends on how you've structured your backend
      axios
        .get(`/api/orders/${session_id}`)
        .then((response) => setOrder(response.data))
        .catch((error) => console.error('Error fetching order:', error));
    }
  }, [session_id]);

  return (
    <>
      <Navbar transparent />
      <main className="pt-20 min-h-[80vh] bg-gray-800">
        <div className="container mx-auto px-4 py-8 text-center text-white">
          <h2 className="text-3xl font-semibold mb-4">Thank You for Your Purchase!</h2>
          <p className="mb-6">Your order has been placed successfully.</p>
          {order && (
            <div>
              <h3 className="text-2xl font-semibold">Order Details</h3>
              {/* Display order details */}
            </div>
          )}
          <a href="/visible/orglist" className="text-blue-400 hover:underline">
            Continue Shopping
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SuccessPage;
