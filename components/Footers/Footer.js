// src/components/Footers/Footer.js
import React from "react";
import PropTypes from 'prop-types';
import Link from 'next/link'; // Import Link from Next.js

// If you want actual icons, install react-icons and uncomment the imports below:
// import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer({ isBladeOpen }) { // Add isBladeOpen prop
  return (
    <footer
      className={`bg-ggreen text-white px-6 py-8
                 ${isBladeOpen ? 'mr-[15rem]' : 'mr-0'}
                 transition-all duration-300 ease-in-out`} // Added transition
    >
      <div className="max-w-7xl mx-auto">
        {/* Top Section: 4 columns of links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-2">Start a Drive</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/visible/drivelist">
                  <span className="cursor-pointer hover:text-slate-300">Find a Drive</span>
                </Link>
              </li>
              <li>
                {/* Assuming Testimonials might be a page or section */}
                <Link href="/visible/testimonials">
                  <span className="cursor-pointer hover:text-slate-300">Testimonials</span>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Register</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/auth/login">
                  <span className="cursor-pointer hover:text-slate-300">Login</span>
                </Link>
              </li>
              <li>
                {/* Assuming this links to a user's dashboard or profile */}
                <Link href="/visible/profile">
                  <span className="cursor-pointer hover:text-slate-300">Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Help Center</h4>
            <ul className="space-y-1 text-sm">
              <li>
                {/* Assuming Resources might be a page or section */}
                <Link href="/visible/resources">
                  <span className="cursor-pointer hover:text-slate-300">Resources</span>
                </Link>
              </li>
              <li>
                <Link href="/visible/contact">
                  <span className="cursor-pointer hover:text-slate-300">Contact Us</span>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Legal</h4> {/* Changed heading for clarity */}
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/visible/privacy"> {/* Assuming a privacy page */}
                  <span className="cursor-pointer hover:text-slate-300">Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/visible/terms"> {/* Assuming a terms page */}
                  <span className="cursor-pointer hover:text-slate-300">Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link href="/visible/about">
                  <span className="cursor-pointer hover:text-slate-300">About Us</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: border, copyright, icons, and extra link */}
        <div className="border-t border-gray-700 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between text-sm">
          {/* Left: Copyright text */}
          <div className="mb-4 sm:mb-0">
            <p>© {new Date().getFullYear()} GiftDrive, LLC. All rights reserved.</p>
          </div>

          {/* Right: Icons + Extra Link */}
          <div className="flex items-center space-x-6">
            {/* Social Icons (remain <a> tags as they are external) */}
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-slate-300">
                {/* <FaFacebookF /> */}
                FB
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-slate-300">
                {/* <FaInstagram /> */}
                IG
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" className="hover:text-slate-300">
                {/* <FaTwitter /> or another X icon */}
                X
              </a>
            </div>
            {/* This link is kept as <a> if it's a placeholder or external. If internal, change to <Link> */}
            <a
              href="#" // Replace with actual internal path if needed, e.g., "/blog/donation-tips"
              className="inline-flex items-center text-gray-300 hover:text-white"
            >
              Tips, tricks, and advice around donation drives →
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  isBladeOpen: PropTypes.bool,
};

Footer.defaultProps = {
  isBladeOpen: false,
};