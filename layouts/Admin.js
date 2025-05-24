// components/Admin.js

import React from "react";
import PropTypes from 'prop-types';

// Components
import AuthNavbar from "components/Navbars/AuthNavbar.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import Footer from "components/Footers/Footer.js";

const Admin = ({ children }) => {
  return (
    <>
      <AuthNavbar /> {/* Moved outside, props will be default (not transparent, isBladeOpen=false) */}
      <Sidebar />
      <div className="relative md:ml-64 bg-white"> {/* Changed background to bg-white */}
        <div className="px-4 md:px-10 mx-auto w-full -m-24">
          {children}
        </div>
      </div>
      <Footer /> {/* Moved outside, props will be default (isBladeOpen=false) */}
    </>
  );
};

Admin.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Admin;