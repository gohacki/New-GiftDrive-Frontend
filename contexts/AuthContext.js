// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react'; // Remove useContext
import PropTypes from 'prop-types';
import axios from 'axios';
// import { CartContext } from './CartContext'; // <-- REMOVE THIS IMPORT

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // const { fetchCart, resetCart } = useContext(CartContext); // <-- REMOVE THIS LINE

  axios.defaults.withCredentials = true;

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true); // Set loading true at the start
      try {
        const response = await axios.get(`${apiUrl}/api/auth/me`);
        setUser(response.data.user);
        // *** DO NOT CALL fetchCart() HERE ***
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []); // Fetch user only on mount

  const login = async (credentials) => {
    const response = await axios.post(`${apiUrl}/api/auth/login`, credentials);
    setUser(response.data.user);
    // *** Trigger cart fetch/merge *after* state update, from outside ***
  };

  const logout = async () => {
    await axios.post(`${apiUrl}/api/auth/logout`);
    setUser(null);
    // *** Trigger cart reset *after* state update, from outside ***
  };

  // The value provided ONLY includes auth-related state and functions
  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};