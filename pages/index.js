// pages.index.js

import React from "react";
import Link from "next/link";
import Image from "next/image";

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";

export default function Landing() {
  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative">
        {/* Hero Section */}
        <section className="bg-background px-4 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <h1 className="font-georgia text-black text-3xl sm:text-5xl mt-20 mb-4">
              Making donation drives as
              <br />
              simple as online shopping.
            </h1>
            <Link href="/visible/orglist">
              <div className="mt-4 px-6 py-3 bg-ggreen text-white font-semibold rounded-full text-center cursor-pointer">
                Browse Organizations
              </div>
            </Link>
            <Link href="/visible/registerorg">
              <div className="mt-4 px-6 py-3 bg-ggreen text-white font-semibold rounded-full text-center cursor-pointer">
                Register Your Drive Now
              </div>
            </Link>
            <a
              href="mailto:lbvaughan25@gmail.com?subject=Inquiry from Gyftly Website&body=Hello Gyftly Team,"
              className="mt-2 text-sm text-ggreen cursor-pointer mb-20">
              Contact Us
            </a>

            {/* Updated Image Section */}
            <div className="flex items-center justify-center mt-8 space-x-4">
              <div className="w-1/2 h-20 flex items-center justify-center">
                <Image
                  src="/AllGifts.png"
                  alt="All Gifts"
                  width={1200} // Adjust based on your image dimensions
                  height={800}
                  className="h-auto w-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* "How It Works" Section */}
        <section className="px-4 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-georgia text-2xl sm:text-3xl font-bold text-center mb-10">
              How It Works
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-center">
              {/* Steps 1 to 4 */}
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="bg-white rounded-full p-6 shadow w-64 h-64 mx-auto"
                >
                  <div className="mb-4 w-12 h-12 mx-auto rounded-full bg-ggreen flex items-center justify-center font-bold text-white mt-6">
                    {step}
                  </div>
                  <h3 className="font-semibold mb-2">
                    {step === 1 && 'Identify a Drive'}
                    {step === 2 && 'Choose a Child'}
                    {step === 3 && 'Purchase Gifts'}
                    {step === 4 && 'Make a Difference'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step === 1 &&
                      'Find or create a gift drive for children in need.'}
                    {step === 2 &&
                      "Browse children's wishlists and pick one to sponsor."}
                    {step === 3 &&
                      'Select and purchase items from their wishlist.'}
                    {step === 4 &&
                      'Help a child feel special and cared for.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* "Who It’s For" Section */}
        <section className="bg-white px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-georgia text-2xl sm:text-3xl font-bold mb-2">
                Who It’s For
              </h2>
              <p className="text-gray-600">
                Gyftly is for everyone who wants to make a difference during the
                holiday season or throughout the year.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-around">
              <div className="flex flex-col space-y-2 text-center font-bold sm:text-left mt-8 bg-secondary_green p-8 rounded-lg">
                {/* Left column of bullet points */}
                <p className="text-gray-700">• Holiday Giving</p>
                <p className="text-gray-700">• Community Support</p>
                <p className="text-gray-700">• Charitable Events</p>
                <p className="text-gray-700">• Personal Initiatives</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-secondary_green p-8 rounded-full">
                <div className="w-20 h-20 relative ml-2">
                  <Image
                    src="/MainGift.png"
                    alt="Main Gift"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <div className="w-20 h-20 relative ml-2">
                  <Image
                    src="/Backpack.png"
                    alt="Backpack"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <div className="w-24 h-24 relative">
                  <Image
                    src="/Coat.png"
                    alt="Coat"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <div className="w-20 h-20 relative mt-2 ml-2">
                  <Image
                    src="/Book.png"
                    alt="Book"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-2 text-center sm:text-left font-bold mt-8 bg-secondary_green p-8 rounded-lg">
                {/* Right column of bullet points */}
                <p className="text-gray-700">• School Drives</p>
                <p className="text-gray-700">• Workplace Giving</p>
                <p className="text-gray-700">• Church Contributions</p>
                <p className="text-gray-700">• Family Projects</p>
              </div>

            </div>
          </div>
        </section>
      </main>
      <Footer />
          </>
  );
}