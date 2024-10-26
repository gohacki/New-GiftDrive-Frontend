// components/Landing.js

import React, { useState } from "react";
import Link from "next/link";

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";

export default function Landing() {
  // State for Drive Types
  const [selectedDrive, setSelectedDrive] = useState("Gift Drive");

  // Sample Drive Types Data
  const driveTypes = {
    "Gift Drive": {
      title: "Gift Drive",
      description:
        "Connect with children from partnered organizations, browse curated gift ideas, and make a lasting impact through our Gift Drives.",
      image: "https://images.unsplash.com/photo-1604697964221-ece2c433f1b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Toy Drive": {
      title: "Toy Drive",
      description:
        "Donate toys to bring joy to children in need. Our Toy Drives ensure that every child receives a special gift this holiday season.",
      image: "https://images.unsplash.com/photo-1595433562696-2e98b8e15ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    "Clothing Drive": {
      title: "Clothing Drive",
      description:
        "Provide essential clothing to families during the colder months. Our Clothing Drives help ensure everyone stays warm and comfortable.",
      image: "https://images.unsplash.com/photo-1605460375648-278bcbd579a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
  };

  return (
    <>
      <Navbar transparent />
      <main>
        {/* 1. Main Header Section */}
        <div className="relative pt-16 pb-32 flex content-center items-center justify-center min-h-screen-75">
          <div
            className="absolute top-0 w-full h-full bg-center bg-cover"
            style={{
              backgroundImage:
                "url('https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/homeimage1.png')",
            }}
          >
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-75 bg-black"
            ></span>
          </div>
          <div className="container relative mx-auto">
            <div className="items-center flex flex-wrap">
              <div className="w-full lg:w-6/12 px-4 ml-auto mr-auto text-center">
                <div className="pr-12">
                  <h1 className="text-white font-semibold text-5xl">
                    Gift Drives Start Here.
                  </h1>
                  <p className="mt-4 text-lg text-blueGray-200">
                    Making it easy to give joy to those in need. Connect with children from partnered organizations, browse curated gift ideas, and make a lasting impact—all from the comfort of your home.
                  </p>
                  <div className="mt-8">
                    <Link href="/visible/orglist" className="bg-white text-blueGray-700 active:bg-blueGray-50 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 transition-all duration-150">
                        Explore Organizations
                    </Link>
                    <Link href="/visible/registerorg" className="bg-blueGray-700 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ml-1 mb-1 transition-all duration-150">
                        Enroll Your Organization
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative SVG */}
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
        </div>

        {/* 2. Digital Drives Section */}
        <section className="pb-20 bg-blueGray-200 -mt-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center">
              {/* Text Content */}
              <div className="w-full md:w-6/12 px-4">
                <div className="md:pr-12">
                  <h3 className="text-3xl font-semibold">Bringing Drives Digital</h3>
                  <p className="mt-4 text-lg leading-relaxed text-blueGray-500">
                    Transitioning to digital drives allows for seamless management, broader reach, and enhanced impact. Embrace technology to make your drives more efficient and effective.
                  </p>
                  <Link href="/visible/OrganizationList" className="mt-8 bg-blueGray-700 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 transition-all duration-150">
                      Explore Current Drives
                  </Link>
                </div>
              </div>
              {/* Image */}
              <div className="w-full md:w-6/12 px-4">
                <img
                  alt="Digital Drives"
                  src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                  className="max-w-full rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Features Section */}
        <section className="relative py-20 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center text-center mb-24">
              <div className="w-full lg:w-6/12 px-4">
                <h2 className="text-4xl font-semibold">Our Features</h2>
                <p className="text-lg leading-relaxed m-4 text-blueGray-500">
                  Discover the features that make our platform the best choice for managing and participating in gift drives.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap">
              {/* Feature 1 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-red-400">
                      <i className="fas fa-award"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Award-Winning Support</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Our dedicated support team ensures that your drives run smoothly and efficiently.
                    </p>
                  </div>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-lightBlue-400">
                      <i className="fas fa-retweet"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Real-Time Tracking</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Monitor the progress of your drives in real-time with our intuitive dashboard.
                    </p>
                  </div>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-emerald-400">
                      <i className="fas fa-fingerprint"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Secure Transactions</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Ensure the safety and security of all transactions with our robust security measures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Drive Types Section */}
        <section className="relative py-20 bg-blueGray-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center text-center mb-12">
              <div className="w-full lg:w-6/12 px-4">
                <h2 className="text-4xl font-semibold text-white">Drive Types We Support</h2>
                <p className="text-lg leading-relaxed mt-4 mb-4 text-blueGray-400">
                  Choose from a variety of drive types to suit your organization&apos;s needs. Click on a drive type to learn more about it.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center">
              {/* Drive Type Buttons */}
              {Object.keys(driveTypes).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedDrive(type)}
                  className={`m-2 px-4 py-2 rounded-full focus:outline-none ${
                    selectedDrive === type
                      ? "bg-white text-blueGray-800"
                      : "bg-blueGray-700 text-white hover:bg-blueGray-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {/* Drive Type Details */}
            <div className="flex flex-wrap items-center mt-12">
              <div className="w-full md:w-6/12 px-4">
                <img
                  alt={driveTypes[selectedDrive].title}
                  src={driveTypes[selectedDrive].image}
                  className="max-w-full rounded-lg shadow-lg"
                />
              </div>
              <div className="w-full md:w-6/12 px-4">
                <div className="md:pr-12">
                  <h3 className="text-3xl font-semibold text-white">{driveTypes[selectedDrive].title}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-blueGray-400">
                    {driveTypes[selectedDrive].description}
                  </p>
                  <Link href="/visible/registerorg" className="mt-8 bg-white text-blueGray-700 active:bg-blueGray-50 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 transition-all duration-150">
                      Enroll Your Organization
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Testimonials Section */}
        <section className="relative py-20">
          <div
            className="bottom-auto top-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-20"
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

          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center text-center mb-24">
              <div className="w-full lg:w-6/12 px-4">
                <h2 className="text-4xl font-semibold">What Our Partners Say</h2>
                <p className="text-lg leading-relaxed m-4 text-blueGray-500">
                  Hear from organizations and participants about their experiences with our platform.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap">
              {/* Testimonial 1 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <blockquote className="relative p-8 mb-4">
                    <svg
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 583 95"
                      className="absolute left-0 w-full block h-95-px -top-94-px"
                    >
                      <polygon
                        points="-30,95 583,95 583,65"
                        className="text-blueGray-700 fill-current"
                      ></polygon>
                    </svg>
                    <h4 className="text-xl font-bold text-blueGray-700">
                      Outstanding Support
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      &quot;The support team was incredibly responsive and helped us set up our first drive seamlessly. Highly recommend!&quot;
                    </p>
                  </blockquote>
                </div>
              </div>
              {/* Testimonial 2 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <blockquote className="relative p-8 mb-4">
                    <svg
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 583 95"
                      className="absolute left-0 w-full block h-95-px -top-94-px"
                    >
                      <polygon
                        points="-30,95 583,95 583,65"
                        className="text-blueGray-700 fill-current"
                      ></polygon>
                    </svg>
                    <h4 className="text-xl font-bold text-blueGray-700">
                      User-Friendly Interface
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      &quot;Managing our drives has never been easier. The intuitive design allows us to focus more on our mission.&quot;
                    </p>
                  </blockquote>
                </div>
              </div>
              {/* Testimonial 3 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <blockquote className="relative p-8 mb-4">
                    <svg
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 583 95"
                      className="absolute left-0 w-full block h-95-px -top-94-px"
                    >
                      <polygon
                        points="-30,95 583,95 583,65"
                        className="text-blueGray-700 fill-current"
                      ></polygon>
                    </svg>
                    <h4 className="text-xl font-bold text-blueGray-700">
                      Increased Reach
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      &quot;Our drives have reached a much wider audience thanks to the platform&apos;s extensive network.&quot;
                    </p>
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Call-to-Action Section */}
        <section className="relative block py-24 bg-blueGray-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center text-center mb-12">
              <div className="w-full lg:w-8/12 px-4">
                <h2 className="text-4xl font-semibold text-white">
                  Ready to Make a Difference?
                </h2>
                <p className="text-lg leading-relaxed mt-4 mb-4 text-blueGray-400">
                  Join thousands of organizations in making gift drives more efficient and impactful. Register now to get started.
                </p>
                <Link href="/visible/registerorg" className="mt-8 bg-white text-blueGray-700 active:bg-blueGray-50 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 transition-all duration-150">
                    Register Now
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