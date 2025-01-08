// pages/about.js

import React from "react";
import Image from "next/image";

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";

export default function About() {
  return (
    <>
      <Navbar transparent />
      <main>
        {/* 1. Main Header Section */}
        <div className="relative pt-16 pb-32 flex content-center items-center justify-center min-h-[75vh]">
          {/* Background Image */}
          <div className="absolute top-0 w-full h-full">
            <Image
              src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/aboutpage-header.png"
              alt="About Us Background"
              layout="fill"
              objectFit="cover"
              quality={100}
              priority
            />
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-75 bg-black"
            ></span>
          </div>

          {/* Content Container */}
          <div className="container relative mx-auto px-4">
            <div className="items-center flex flex-wrap">
              <div className="w-full lg:w-6/12 px-4 ml-auto mr-auto text-center">
                <div className="pr-0 lg:pr-12">
                  {/* Heading */}
                  <h1 className="text-white font-semibold text-4xl sm:text-5xl md:text-6xl">
                    About Gyftly
                  </h1>

                  {/* Paragraph */}
                  <p className="mt-4 text-lg sm:text-xl text-blueGray-200">
                    At Gyftly, we believe that everyone deserves a little joy,
                    especially during the holidays. Our platform bridges the gap
                    between organizations and generous supporters to help children
                    in need.
                  </p>
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

        {/* 2. Our Mission Section */}
        <section className="pb-20 bg-blueGray-200 ">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold text-blueGray-700">
                Our Mission
              </h2>
              <p className="mt-4 text-lg text-blueGray-500">
                We aim to empower communities by providing a platform for
                effortless giving. Together, we can ensure every child feels
                loved and supported.
              </p>
            </div>

            <div className="flex flex-wrap">
              {/* Core Value 1 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-emerald-400">
                      <i className="fas fa-heart"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Compassion</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Putting love and care into every interaction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Value 2 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-blue-400">
                      <i className="fas fa-hand-holding-heart"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Generosity</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Connecting kind hearts with meaningful causes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Value 3 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-red-400">
                      <i className="fas fa-globe"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Community</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Strengthening bonds to build a brighter future.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Our Story Section */}
        <section className="py-20 bg-blueGray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold text-white">Our Story</h2>
              <p className="text-lg leading-relaxed m-4 text-blueGray-200">
                Gyftly started with a simple idea: make giving accessible and
                impactful. Over the years, we&apos;ve grown into a community-driven
                platform dedicated to helping those in need.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blueGray-100 shadow-lg rounded-lg overflow-hidden">
                <Image
                  src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/aboutpage-story1.png"
                  alt="Our Beginnings"
                  layout="responsive"
                  width={400}
                  height={250}
                />
                <div className="px-4 py-5">
                  <h6 className="text-xl font-semibold text-blueGray-700">
                    Humble Beginnings
                  </h6>
                  <p className="mt-2 text-blueGray-500">
                    Our journey began with a small team passionate about making a
                    difference during the holidays.
                  </p>
                </div>
              </div>
              <div className="bg-blueGray-100 shadow-lg rounded-lg overflow-hidden">
                <Image
                  src="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/aboutpage-story2.png"
                  alt="Our Vision"
                  layout="responsive"
                  width={400}
                  height={250}
                />
                <div className="px-4 py-5">
                  <h6 className="text-xl font-semibold text-blueGray-700">
                    Growing Together
                  </h6>
                  <p className="mt-2 text-blueGray-500">
                    With the support of our community, we&apos;ve expanded to
                    connect hundreds of organizations with compassionate donors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
