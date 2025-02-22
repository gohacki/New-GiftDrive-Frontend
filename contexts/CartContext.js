// src/contexts/CartContext.js

import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';

export const CartContext = createContext();

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  const resetCart = () => {
    setCart(null); 
  };

  /**
   * Fetches the current cart from the backend.
   */
  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/cart`, { withCredentials: true });
      setCart(response.data.cart);
    } catch (error) {
      console.error('Error fetching cart:', error.response?.data || error.message);
      toast.error('Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /**
   * Adds an item to the cart.
   */
  const addToCart = async (item_id, config_id = null, child_id = null, quantity = 1) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/add`,
        { item_id, config_id, child_id, quantity },
        { withCredentials: true }
      );
      fetchCart();
      toast.success('Item added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to add item to cart.');
    }
  };

  /**
   * Removes an item from the cart.
   */
  const removeFromCart = async (cart_item_id) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/remove`,
        { cart_item_id },
        { withCredentials: true }
      );
      fetchCart();
      toast.success('Item removed from cart.');
    } catch (error) {
      console.error('Error removing from cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove item from cart.');
    }
  };

  /**
   * Updates the quantity of a cart item.
   */
  const updateCartItemQuantity = async (cart_item_id, quantity) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/update`,
        { cart_item_id, quantity },
        { withCredentials: true }
      );
      fetchCart();
      toast.success('Cart updated successfully.');
    } catch (error) {
      console.error('Error updating cart item quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update cart item quantity.');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCartItemQuantity, loading, fetchCart , resetCart,}}>
      {children}
    </CartContext.Provider>
  );
};

// PropTypes validation for CartProvider
CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
