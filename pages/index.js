// pages/index.js

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion"; // Import Framer Motion

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";
import { FaArrowRight } from 'react-icons/fa'; // For the button arrow

// Reusable component for animating text lines with a slide-up effect
const AnimatedTextLine = ({ children }) => {
  // Variants for the text line animation
  const textLineVariants = {
    hidden: { opacity: 0, y: '100%' }, // Start below its visible position and transparent
    visible: {
      opacity: 1,
      y: '0%', // Slide up to its original position
      transition: { duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }, // Custom cubic-bezier for smooth animation
    },
  };

  // The outer motion.div provides the clipping mask (overflow: hidden)
  // and applies the animation variants.
  return (
    <motion.div variants={textLineVariants}>
      {children}
    </motion.div>
  );
};

export default function Landing() {
  // Variants for the main hero content container to orchestrate staggering
  const heroContentVariants = {
    hidden: { opacity: 1 }, // Parent container itself is not animated visually here
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,   // Initial delay before any child animation starts
        staggerChildren: 0.3, // Time between the start of H1 block, and the right content block
      },
    },
  };

  // Variants for the H1 block, which will stagger its own lines
  const h1BlockVariants = {
    hidden: { opacity: 1 }, // H1 block itself is not animated visually
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Time between each AnimatedTextLine animation
      },
    },
  };

  // Variants for individual content items like the paragraph and CTA block
  const slideUpItemVariants = {
    hidden: { opacity: 0, y: 30 }, // Start slightly below and transparent
    visible: {
      opacity: 1,
      y: 0, // Slide up to original position
      transition: { duration: 0.5, ease: [0.4, 0.0, 0.2, 1] },
    },
  };

  return (
    <>
      <Navbar transparent />
      <main className="min-h-screen bg-hero-bg-muted-teal text-white relative flex flex-col">
        {/* Hero Section */}
        <section className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 pb-12 md:pb-48">
          {/* This motion.div orchestrates the animation of its direct children (H1 and the right content block) */}
          <motion.div
            className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center"
            variants={heroContentVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left: Main Heading */}
            {/* This motion.h1 will apply h1BlockVariants to stagger its AnimatedTextLine children */}
            <motion.h1
              className="font-semibold text-7xl sm:text-8xl lg:text-9xl leading-tight text-white drop-shadow-lg"
              variants={h1BlockVariants}
            // initial and animate props are inherited from the parent motion.div
            >
              <AnimatedTextLine>Make</AnimatedTextLine>
              {/* Replaced <br className="mb-12" /> with a div for explicit height. h-12 = height: 3rem */}
              <div className="h-12" />
              <AnimatedTextLine>Giving</AnimatedTextLine>
              <div className="h-12" />
              <AnimatedTextLine>Simple</AnimatedTextLine>
            </motion.h1>

            {/* Right: Sub-content & CTAs */}
            {/* This motion.div groups the paragraph and CTAs, and will stagger them */}
            <motion.div
              className="md:col-span-1 text-center md:text-left flex flex-col items-center md:items-start md:pt-8 lg:pt-12"
              variants={{ // Inline variants to stagger its own children (paragraph and CTA div)
                hidden: {},
                visible: { transition: { staggerChildren: 0.2 } }
              }}
            // initial and animate props are inherited
            >
              <motion.p
                className="text-2xl sm:text-3xl lg:text-4xl mb-10 md:mb-12 leading-relaxed"
                variants={slideUpItemVariants} // This paragraph will use the slideUpItemVariants
              >
                Organize physical item donation drives for any occasion.
              </motion.p>
              <motion.div
                className="flex flex-col items-center md:items-start space-y-5"
                variants={slideUpItemVariants} // This div (containing buttons) will also use slideUpItemVariants
              >
                <Link href="/visible/registerorg" legacyBehavior>
                  <a className="inline-flex items-center justify-center px-8 py-4 bg-ggreen text-white text-lg font-semibold rounded-full shadow-md hover:bg-opacity-90 transition-colors duration-300">
                    Get Started, It's Free
                    <FaArrowRight className="ml-3 h-5 w-5" />
                  </a>
                </Link>
                <Link href="/visible/orglist" legacyBehavior>
                  <a className="text-white text-md hover:opacity-80 transition-opacity underline">
                    Find a Donation Drive Page
                  </a>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works Section (Unchanged) */}
        <section className="bg-white px-4 py-12 sm:py-20">
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
                  <div className="flex items-center justify-center w-16 h-24 rounded-full bg-ggreen text-white font-bold mx-auto mt-4 mb-12">
                    {step}
                  </div>
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

        {/* Who It’s For Section (Unchanged) */}
        <section className="bg-white px-4 py-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="inter-bold text-2xl sm:text-3xl mb-2">
                Who It’s For
              </h2>
              <p className="inter-medium text-gray-600 mb-6">
                GiftDrive is designed for anyone organizing a donation drive for physical goods.
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

        {/* Recommended By Section (Unchanged) */}
        <section className="bg-secondary_green px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl inter-bold mb-8">
              Recommended By
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-24 bg-ggreen rounded-full p-2 mb-4">
              <div className="relative w-24 h-24">
                <Image
                  src="/lund.png"
                  alt="Lund"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="relative w-24 h-24">
                <Image
                  src="/wfs.png"
                  alt="WFS"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="relative w-24 h-24">
                <Image
                  src="/tsa.png"
                  alt="TSA"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="relative w-24 h-24">
                <Image
                  src="/uvmch.png"
                  alt="UVMCH"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="relative w-24 h-24">
                <Image
                  src="/bgcw.png"
                  alt="BGCW"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                <p className="text-gray-700 mb-4">
                  “GiftDrive made organizing our school's back-to-school supplies drive
                  easier than ever. We reached our goal way faster than in previous years,
                  and it was super simple to share with everyone!”
                </p>
                <p className="inter-semi-bold text-gray-900">Rowan Vexley</p>
                <p className="text-sm text-gray-500">Westbrook Elementary, Oregon</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                <p className="text-gray-700 mb-4">
                  “Thanks to GiftDrive, we were finally able to take our drive online,
                  something we've been aiming to do for years! We hit our goal and
                  saved a lot of time and effort in the busy holiday season!”
                </p>
                <p className="inter-semi-bold text-gray-900">Lila Fairbrooke</p>
                <p className="text-sm text-gray-500">Haven Hope Shelter, Maine</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                <p className="text-gray-700 mb-4">
                  “You won't regret taking your drive online with GiftDrive. Being able
                  to track progress in real time and have items shipped directly to us
                  saved so much hassle. There's no going back!”
                </p>
                <p className="inter-semi-bold text-gray-900">Jaxon Tremont</p>
                <p className="text-sm text-gray-500">
                  Star Community Church, Illinois
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action (Unchanged) */}
        <section className="px-4 py-12 bg-white">
          <div className="max-w-7xl mx-auto bg-secondary_green rounded-xl shadow p-6 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2">
              <Image
                src="/donationdrive.jpg"
                alt="Donation Drive"
                width={500}
                height={300}
                className="w-full h-auto rounded-md object-cover"
              />
            </div>
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