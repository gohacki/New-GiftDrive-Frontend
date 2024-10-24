// contexts/StatisticsContext.js

import React, { createContext, useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes

// Create the StatisticsContext
export const StatisticsContext = createContext();

// Create a provider component
export const StatisticsProvider = ({ children }) => {
  const [statistics, setStatistics] = useState(null);

  return (
    <StatisticsContext.Provider value={{ statistics, setStatistics }}>
      {children}
    </StatisticsContext.Provider>
  );
};

// Add prop validation
StatisticsProvider.propTypes = {
  children: PropTypes.node.isRequired, // Validates that children is a React node
};