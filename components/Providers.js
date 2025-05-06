// src/components/Providers.js
import React from "react";
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { StatisticsProvider } from '../contexts/StatisticsContext';
import PropTypes from 'prop-types'; // Import PropTypes

const Providers = ({ children }) => {
  return (
    // AuthProvider should be higher up the tree
    <AuthProvider>
      {/* CartProvider can now access AuthContext */}
      <CartProvider>
        <StatisticsProvider>
          {children}
        </StatisticsProvider>
      </CartProvider>
    </AuthProvider>
  );
};

Providers.propTypes = {
  children: PropTypes.node.isRequired, // children should be a React node and is required
};

export default Providers;