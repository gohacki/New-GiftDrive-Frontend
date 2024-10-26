// components/Landing.js

import React from "react";
import Link from "next/link";

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";

export default function Landing() {
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
                    Making it easy to give joy to those in need. Connect with
                    children from partnered organizations, browse curated gift
                    ideas, and make a lasting impact—all from the comfort of your
                    home.
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

        {/* 2. Features Section */}
        <section className="pb-20 bg-blueGray-200 -mt-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap">
              {/* Feature 1 */}
              <div className="lg:pt-12 pt-6 w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-red-400">
                      <i className="fas fa-gift"></i>
                    </div>
                    <h6 className="text-xl font-semibold">
                      Connect with Organizations
                    </h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Browse and connect with trusted organizations to support
                      children in need.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-lightBlue-400">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <h6 className="text-xl font-semibold">Curated Gift Ideas</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Discover a selection of curated gift ideas tailored to each
                      child&apos;s needs and wishes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="pt-6 w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-emerald-400">
                      <i className="fas fa-heart"></i>
                    </div>
                    <h6 className="text-xl font-semibold">
                      Make a Lasting Impact
                    </h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Your contributions bring joy and make a meaningful
                      difference in a child&apos;s life.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Drive Types Section */}
        <section className="relative py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold">Our Drive Types</h2>
              <p className="text-lg leading-relaxed m-4 text-blueGray-500">
                Choose from various types of gift drives to support children in
                need.
              </p>
            </div>
            <div className="flex flex-wrap">
              {/* Drive Type 1 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-blueGray-100 w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <img
                      alt="Toy Drives"
                      src="path/to/toy-drive-image.jpg"
                      className="w-full rounded-t-lg"
                    />
                    <h6 className="text-xl font-semibold mt-5">Toy Drives</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Provide new toys to children to brighten their day.
                    </p>
                  </div>
                </div>
              </div>
              {/* Drive Type 2 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-blueGray-100 w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <img
                      alt="Clothing Drives"
                      src="path/to/clothing-drive-image.jpg"
                      className="w-full rounded-t-lg"
                    />
                    <h6 className="text-xl font-semibold mt-5">
                      Clothing Drives
                    </h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Donate clothing items to keep children warm and comfortable.
                    </p>
                  </div>
                </div>
              </div>
              {/* Drive Type 3 */}
              <div className="w-full md:w-4/12 px-4 text-center">
                <div className="relative flex flex-col min-w-0 break-words bg-blueGray-100 w-full mb-8 shadow-lg rounded-lg">
                  <div className="px-4 py-5 flex-auto">
                    <img
                      alt="Educational Supplies Drives"
                      src="path/to/education-drive-image.jpg"
                      className="w-full rounded-t-lg"
                    />
                    <h6 className="text-xl font-semibold mt-5">
                      Educational Supplies Drives
                    </h6>
                    <p className="mt-2 mb-4 text-blueGray-500">
                      Help equip children with necessary educational materials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Testimonials Section */}
        <section className="relative py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold">What Our Supporters Say</h2>
              <p className="text-lg leading-relaxed m-4 text-blueGray-500">
                Hear from individuals who have made a difference through our
                platform.
              </p>
            </div>
            <div className="flex flex-wrap">
              {/* Testimonial 1 */}
              <div className="w-full md:w-4/12 px-4">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded-lg">
                  <img
                    alt="..."
                    src="path/to/testimonial-image1.jpg"
                    className="w-full align-middle rounded-t-lg"
                  />
                  <blockquote className="relative p-8 mb-4">
                    <h4 className="text-xl font-bold text-blueGray-700">
                      &quot;An amazing experience&quot;
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      I was able to make a real difference in a child&apos;s life with
                      just a few clicks.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-blueGray-600">
                        - John Doe
                      </p>
                    </div>
                  </blockquote>
                </div>
              </div>
              {/* Testimonial 2 */}
              <div className="w-full md:w-4/12 px-4">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded-lg">
                  <img
                    alt="..."
                    src="path/to/testimonial-image2.jpg"
                    className="w-full align-middle rounded-t-lg"
                  />
                  <blockquote className="relative p-8 mb-4">
                    <h4 className="text-xl font-bold text-blueGray-700">
                      &quot;Easy and impactful&quot;
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      The process was seamless, and I loved knowing exactly where
                      my gift was going.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-blueGray-600">
                        - Jane Smith
                      </p>
                    </div>
                  </blockquote>
                </div>
              </div>
              {/* Testimonial 3 */}
              <div className="w-full md:w-4/12 px-4">
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded-lg">
                  <img
                    alt="..."
                    src="path/to/testimonial-image3.jpg"
                    className="w-full align-middle rounded-t-lg"
                  />
                  <blockquote className="relative p-8 mb-4">
                    <h4 className="text-xl font-bold text-blueGray-700">
                      &quot;Highly recommend&quot;
                    </h4>
                    <p className="text-md font-light mt-2 text-blueGray-500">
                      A wonderful way to give back during the holidays and beyond.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-blueGray-600">
                        - Emily Johnson
                      </p>
                    </div>
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Stats Section */}
        <section className="py-20 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap text-center">
              <div className="w-full md:w-3/12 px-4">
                <h2 className="text-5xl font-semibold text-blueGray-700">
                  500+
                </h2>
                <p className="mt-2 mb-4 text-blueGray-500">
                  Children Supported
                </p>
              </div>
              <div className="w-full md:w-3/12 px-4">
                <h2 className="text-5xl font-semibold text-blueGray-700">
                  200+
                </h2>
                <p className="mt-2 mb-4 text-blueGray-500">
                  Organizations Partnered
                </p>
              </div>
              <div className="w-full md:w-3/12 px-4">
                <h2 className="text-5xl font-semibold text-blueGray-700">
                  1,000+
                </h2>
                <p className="mt-2 mb-4 text-blueGray-500">Gifts Donated</p>
              </div>
              <div className="w-full md:w-3/12 px-4">
                <h2 className="text-5xl font-semibold text-blueGray-700">
                  100%
                </h2>
                <p className="mt-2 mb-4 text-blueGray-500">Transparency</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Call to Action Section */}
        <section className="relative block py-24 bg-blueGray-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center">
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200">
                  <div className="flex-auto p-5 lg:p-10">
                    <h4 className="text-2xl font-semibold">
                      Register Your Organization
                    </h4>
                    <p className="leading-relaxed mt-1 mb-4 text-blueGray-500">
                      Join us in making a difference. Enroll your organization to
                      connect with more supporters.
                    </p>
                    <div className="text-center mt-6">
                      <Link href="/visible/registerorg" className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none ease-linear transition-all duration-150">
                          Register Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Optional: Additional Spacing or Decorative Elements */}
        {/* You can add more sections or decorative elements here as needed */}
      </main>
      <Footer />
    </>
  );
}