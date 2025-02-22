// src/components/Footers/Footer.js

import React from "react";

export default function Footer() {
  return (
    <footer className="bg-green-900 text-white px-4 py-8">
    <div className="w-full mx-auto flex flex-col sm:flex-row justify-between">
      {/* Footer Links */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-12 mb-6 sm:mb-0">
        <div>
          <h4 className="font-semibold mb-2">Features</h4>
          <ul className="text-sm space-y-1">
            <li>Organize Drives</li>
            <li>Support Kids</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Help</h4>
          <ul className="text-sm space-y-1">
            <li>About Us</li>
            <li><a
        href="mailto:lbvaughan25@gmail.com?subject=Inquiry from Gyftly Website&body=Hello Gyftly Team,"
        >
        Contact
      </a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Privacy Policy</h4>
          <ul className="text-sm space-y-1">
            <li>Terms of Service</li>
            <li>Media</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Bottom Legal Info */}
    <div className="border-t border-gray-700 mt-6 pt-4 text-sm text-gray-300">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-2 sm:mb-0">
          <p>Privacy Notice &bull; Your Privacy Choices</p>
        </div>
        <p className="text-center">Gyftly ©2025</p>
      </div>
    </div>
  </footer>
  );
}