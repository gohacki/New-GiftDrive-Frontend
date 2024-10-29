// src/components/Providers.js

import React from "react";
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { StatisticsProvider } from '../contexts/StatisticsContext';

const Providers = ({ children }) => {
  return (
    <AuthProvider>
      <CartProvider>
        <StatisticsProvider>
          {children}
        </StatisticsProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default Providers;