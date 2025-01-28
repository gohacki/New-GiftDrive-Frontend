// src/contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { CartContext } from './CartContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchCart } = useContext(CartContext); // Access CartContext

  axios.defaults.withCredentials = true;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/auth/me`);
        setUser(response.data.user);
        if (response.data.user) {
          fetchCart(); // Fetch the merged cart after login
        }
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
      await axios.post(`${apiUrl}/api/cart/merge`, {}, { withCredentials: true });
      fetchCart(); // Fetch the merged cart after login
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

// PropTypes validation for AuthProvider
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
