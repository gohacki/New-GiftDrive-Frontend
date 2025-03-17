// pages/index.js

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
            <h1 className="inter-regular text-ggreen text-3xl sm:text-5xl mt-20 mb-4">
              Making donation drives as
              <br />
              simple as online shopping.
            </h1>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              <Link href="/visible/registerorg">
                <div className="px-6 py-3 bg-ggreen text-white inter-semi-bold rounded-full cursor-pointer">
                  Get Started, It&apos;s Free
                </div>
              </Link>
              <Link href="/visible/orglist">
                <div className="px-6 py-3 text-ggreen inter-semi-bold cursor-pointer">
                  Find a Donation Drive Page
                </div>
              </Link>
            </div>

            {/* Hero Image */}
<div className="flex items-center justify-center mt-8">
  <div className="w-full h-auto flex items-center justify-center">
    <Image
      src="/mainimage.jpg"
      alt="All Gifts"
      width={2400}
      height={2400}
      className="h-full w-full rounded-2xl"
    />
  </div>
</div>

          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-4 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="inter-bold text-2xl sm:text-3xl text-center mb-10">
              How It Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-center">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="bg-white rounded-xl p-6 shadow w-64 h-64 mx-auto flex flex-col"
                >
                  <h3 className="inter-semi-bold mb-2">
                    {step === 1 && "Identify a Drive"}
                    {step === 2 && "Choose a Child"}
                    {step === 3 && "Purchase Gifts"}
                    {step === 4 && "Make a Difference"}
                  </h3>
                  <p className="inter-medium text-gray-600">
                    {step === 1 &&
                      "Find or create a gift drive for children in need."}
                    {step === 2 &&
                      "Browse children's wishlists and pick one to sponsor."}
                    {step === 3 &&
                      "Select and purchase items from their wishlist."}
                    {step === 4 &&
                      "Help a child feel special and cared for."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who It’s For Section */}
<section className="bg-white px-4 py-12">
  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
    {/* Left side: Heading, description, bullet points */}
    <div>
      <h2 className="inter-bold text-2xl sm:text-3xl mb-2">
        Who It’s For
      </h2>
      <p className="inter-medium text-gray-600 mb-6">
        Gyftly is designed for anyone organizing a donation drive for physical goods.
      </p>
      <div className="grid grid-cols-2 gap-2">
      <ul className="inter-medium list-disc list-inside text-gray-700 space-y-2">
        <li>Giving & Angel Tree</li>
        <li>Food & Meal</li>
        <li>School Supplies</li>
        <li>Disaster Relief</li>

      </ul>
      <ul className="inter-medium list-disc list-inside text-gray-700 space-y-2">
      <li>Toy & Clothing</li>
        <li>Homeless Shelter</li>
        <li>Healthcare Supplies</li>
        <li>Refuge Support</li>
        </ul>
      </div>
    </div>

    {/* Right side: 2×2 grid of images */}
    <div className="grid grid-cols-2 gap-2 mx-24">
      <div className="w-full h-40 relative">
        <Image
          src="/example1.png"
          alt="Example 1"
          width={200}
          height={200}
        />
      </div>
      <div className="w-full h-40 mb-12 relative">
        <Image
          src="/example2.png"
          alt="Example 2"
          width={200}
          height={200}
        />
      </div>
      <div className="w-full h-40 relative">
        <Image
          src="/example3.png"
          alt="Example 3"
          width={200}
          height={200}
        />
      </div>
      <div className="w-full h-40 mb-8 relative">
        <Image
          src="/example4.png"
          alt="Example 4"
          width={200}
          height={200}
        />
      </div>
    </div>
  </div>
</section>

{/* Recommended By Section */}
<section className="bg-secondary_green px-4 py-12">
  <div className="max-w-7xl mx-auto">
    {/* Section Heading */}
    <h2 className="text-center text-2xl sm:text-3xl inter-bold mb-8">
      Recommended By
    </h2>

    {/* Logo Row */}
    <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
      {/* Replace these gray boxes with actual <Image> tags or <img> tags */}
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
    </div>

    {/* Testimonial Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Card 1 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
        <p className="text-gray-700 mb-4">
          “Gyftly made organizing our school&apos;s back-to-school supplies drive 
          easier than ever. We reached our goal way faster than in previous years, 
          and it was super simple to share with everyone!”
        </p>
        <p className="inter-semi-bold text-gray-900">Rowan Vexley</p>
        <p className="text-sm text-gray-500">Westbrook Elementary, Oregon</p>
      </div>

      {/* Card 2 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
        <p className="text-gray-700 mb-4">
          “Thanks to Gyftly, we were finally able to take our drive online, 
          something we&apos;ve been aiming to do for years! We hit our goal and 
          saved a lot of time and effort in the busy holiday season!”
        </p>
        <p className="inter-semi-bold text-gray-900">Lila Fairbrooke</p>
        <p className="text-sm text-gray-500">Haven Hope Shelter, Maine</p>
      </div>

      {/* Card 3 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
        <p className="text-gray-700 mb-4">
          “You won&apos;t regret taking your drive online with Gyftly. Being able 
          to track progress in real time and have items shipped directly to us 
          saved so much hassle. There&apos;s no going back!”
        </p>
        <p className="inter-semi-bold text-gray-900">Jaxon Tremont</p>
        <p className="text-sm text-gray-500">
          Star Community Church, Illinois
        </p>
      </div>
    </div>
  </div>
</section>

        {/* Final Call to Action */}
{/* Final Call to Action */}
<section className="px-4 py-12 bg-white">
  <div className="max-w-7xl mx-auto bg-secondary_green rounded-xl shadow p-6 md:p-12 flex flex-col md:flex-row items-center gap-8">
    {/* Image (Left Column) */}
    <div className="w-full md:w-1/2">
      <Image
        src="/donationdrive.jpg" 
        alt="Donation Drive"
        width={500}
        height={300}
        className="w-full h-auto rounded-md object-cover"
      />
    </div>

    {/* Text + Buttons (Right Column) */}
    <div className="w-full md:w-1/2">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">
        Start organizing a donation drive today.
      </h2>
      <p className="text-gray-700 mb-6">
        Create a free donation page for your drive
      </p>
      <div className="flex space-x-4">
        <Link href="/visible/registerorg">
          <button className="px-6 py-3 bg-ggreen text-white font-semibold rounded-full cursor-pointer">
            Get Started
          </button>
        </Link>
        <Link href="/visible/learn-more">
          <button className="px-6 py-3 bg-transparent text-ggreen font-semibold rounded-full cursor-pointer">
            Learn More
          </button>
        </Link>
      </div>
    </div>
  </div>
</section>

      </main>
      <Footer />
    </>
  );
}
