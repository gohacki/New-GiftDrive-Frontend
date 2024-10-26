import React from "react";
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';

// pages/404.js

import Link from 'next/link';

const Custom404 = () => {
  return (
    <>
    <Navbar />
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-500 px-4">
      {/* 404 Heading */}
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      
      {/* Subheading */}
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
      
      {/* Description */}
      <p className="text-gray-600 mb-6 text-center">
        Oops! The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      
      {/* Home Button */}
      <Link href="/" className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300">
          Go Back Home
      </Link>
    </div>
    <Footer />
    </>
  );
};

export default Custom404;