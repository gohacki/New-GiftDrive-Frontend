// src/components/Footers/Footer.js

import React from "react";
import Link from "next/link";
import { FaTwitter, FaFacebookSquare } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="relative bg-blueGray-200 pt-24 pb-6 overflow-x-hidden">
      {/* Decorative SVG */}
      <div
        className="bottom-auto top-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden -mt-20 h-20"
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
      
      {/* Main Footer Content */}
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap text-center lg:text-left">
          {/* Contact & Social Media */}
          <div className="w-full lg:w-6/12 px-4">
            <h4 className="text-3xl font-semibold text-blueGray-800">Let&apos;s keep in touch!</h4>
            <h5 className="text-lg mt-0 mb-2 text-blueGray-600">
              Find us on any of these platforms, we respond 1-2 business days.
            </h5>
            <div className="mt-6 flex justify-center lg:justify-start">
              {/* Twitter */}
              <a
                href="https://twitter.com/yourprofile"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-blueGray-400 shadow-lg font-normal h-10 w-10 flex items-center justify-center rounded-full outline-none focus:outline-none mr-2 transition transform hover:scale-110"
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
              {/* Facebook */}
              <a
                href="https://facebook.com/yourprofile"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-blueGray-600 shadow-lg font-normal h-10 w-10 flex items-center justify-center rounded-full outline-none focus:outline-none mr-2 transition transform hover:scale-110"
                aria-label="Facebook"
              >
                <FaFacebookSquare />
              </a>
            </div>
          </div>
          
          {/* Useful Links */}
          <div className="w-full lg:w-6/12 px-4">
            <div className="flex flex-wrap items-top mb-6">
              {/* Useful Links */}
              <div className="w-full lg:w-4/12 px-4 ml-auto">
                <span className="block uppercase text-blueGray-500 text-sm font-semibold mb-2">
                  Useful Links
                </span>
                <ul className="list-unstyled">
                  <li>
                    <Link href="/visible/about">
                      <span className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer">
                        About Us
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact">
                      <span className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer">
                        Contact Us
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/careers">
                      <span className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer">
                        Careers
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Other Resources */}
              <div className="w-full lg:w-4/12 px-4">
                <span className="block uppercase text-blueGray-500 text-sm font-semibold mb-2">
                  Other Resources
                </span>
                <ul className="list-unstyled">
                  <li>
                    <span
                      onClick={() => window.open("https://yourwebsite.com/terms", "_blank", "noopener,noreferrer")}
                      className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer"
                    >
                      Terms & Conditions
                    </span>
                  </li>
                  <li>
                    <span
                      onClick={() => window.open("https://yourwebsite.com/privacy", "_blank", "noopener,noreferrer")}
                      className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer"
                    >
                      Privacy Policy
                    </span>
                  </li>
                  <li>
                    <span
                      onClick={() => window.open("https://yourwebsite.com/support", "_blank", "noopener,noreferrer")}
                      className="text-blueGray-600 hover:text-blueGray-800 font-semibold block pb-2 text-sm cursor-pointer"
                    >
                      Support
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <hr className="my-6 border-blueGray-300" />
        
        {/* Copyright */}
        <div className="flex flex-wrap items-center md:justify-between justify-center">
          <div className="w-full md:w-4/12 px-4 mx-auto text-center">
            <div className="text-sm text-blueGray-500 font-semibold py-1">
              &copy; {new Date().getFullYear()} GiftDrive. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}