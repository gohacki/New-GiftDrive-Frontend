// contexts/CartContext.js

import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const CartContext = createContext();

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  /**
   * Fetches the current cart from the backend.
   */
  const fetchCart = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/cart`, { withCredentials: true });
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error.response?.data || error.message);
    }
  };

  /**
   * Adds an item to the cart using rye_item_id.
   * @param {string} ryeItemId - The unique identifier for the Amazon product.
   * @param {number} quantity - The quantity of the item to add.
   */
  const addToCart = async (ryeItemId, quantity = 1) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/add`,
        { rye_item_id: ryeItemId, quantity }, // Updated to use rye_item_id
        { withCredentials: true }
      );
      fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error.response?.data || error.message);
    }
  };

  /**
   * Removes an item from the cart using the cartLineId.
   * @param {string} cartLineId - The unique identifier for the cart line to remove.
   */
  const removeFromCart = async (cartLineId) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/remove`,
        { cartLineId },
        { withCredentials: true }
      );
      fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error.response?.data || error.message);
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};