// src/components/Footers/Footer.js
import React from "react";
import PropTypes from 'prop-types'; // Import PropTypes

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
                <a href="#">Find a Drive</a>
              </li>
              <li>
                <a href="#">Testimonials</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Register</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#">Login</a>
              </li>
              <li>
                <a href="#">Dashboard</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Help Center</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#">Resources</a>
              </li>
              <li>
                <a href="#">Contact Us</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Privacy Policy</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#">Terms of Service</a>
              </li>
              <li>
                <a href="#">About Us</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: border, copyright, icons, and extra link */}
        <div className="border-t border-gray-700 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between text-sm">
          {/* Left: Copyright text */}
          <div className="mb-4 sm:mb-0">
            <p>© {new Date().getFullYear()} GiftDrive, LLC. All rights reserved.</p> {/* Updated year dynamically */}
          </div>

          {/* Right: Icons + Extra Link */}
          <div className="flex items-center space-x-6">
            {/* Social Icons (replace # with your links) */}
            <div className="flex space-x-4">
              <a href="#" aria-label="Facebook">
                {/* <FaFacebookF /> */}
                FB
              </a>
              <a href="#" aria-label="Instagram">
                {/* <FaInstagram /> */}
                IG
              </a>
              <a href="#" aria-label="X">
                {/* <FaTwitter /> or another X icon */}
                X
              </a>
            </div>
            <a
              href="#"
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