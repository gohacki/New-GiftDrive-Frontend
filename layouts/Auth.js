// components/Auth.js

import React from "react";
import PropTypes from "prop-types"; // Import PropTypes

// components
import Navbar from "components/Navbars/AuthNavbar.js";
import Footer from "components/Footers/Footer.js";

export default function Auth({ children }) {
  return (
    <>
      <Navbar transparent />
      <main>
          {children}
          <Footer absolute />
      </main>
    </>
  );
}

// Add prop validation
Auth.propTypes = {
  children: PropTypes.node.isRequired, // Validate that children is a React node and required
};