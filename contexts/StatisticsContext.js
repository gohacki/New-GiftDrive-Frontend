// contexts/StatisticsContext.js

import React, { createContext, useState } from 'react';

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