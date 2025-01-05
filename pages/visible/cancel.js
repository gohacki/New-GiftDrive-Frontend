// pages/checkout/cancel.js
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';
import React from 'react';

const CancelPage = () => {
  return (
    <>
      <Navbar transparent />
      <main className="pt-20 min-h-[80vh] bg-gray-800">
        <div className="container mx-auto px-4 py-8 text-center text-white">
          <h2 className="text-3xl font-semibold mb-4">Payment Canceled</h2>
          <p className="mb-6">Your payment was canceled. You can continue shopping.</p>
          <div className='flex flex-col'>
          <Link href="/visible/cart" className="text-blue-400 hover:underline">
            Back to Cart
          </Link>
          <Link href="/visible/orglist" className="text-blue-400 hover:underline">
            Browse Organizations
          </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CancelPage;
