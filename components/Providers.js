// src/components/Providers.js
import React from "react";
import { CartProvider } from '../contexts/CartContext';
import { StatisticsProvider } from '../contexts/StatisticsContext';
import PropTypes from 'prop-types';

const Providers = ({ children }) => {
  return (
    // AuthProvider is removed. SessionProvider from next-auth/react is in _app.js
    <CartProvider>
      <StatisticsProvider>
        {children}
      </StatisticsProvider>
    </CartProvider>
  );
};

Providers.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Providers;