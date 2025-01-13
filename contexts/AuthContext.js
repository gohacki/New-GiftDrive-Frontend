// src/contexts/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  axios.defaults.withCredentials = true;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/auth/me`);
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (credentials) => {
    const response = await axios.post(`${apiUrl}/api/auth/login`, credentials);
    setUser(response.data.user);
  };

  const logout = async () => {
    await axios.post(`${apiUrl}/api/auth/logout`);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Define PropTypes for AuthProvider
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired, // children must be a renderable node and is required
};
