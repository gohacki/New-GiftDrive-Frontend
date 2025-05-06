// contexts/CartContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from './AuthContext'; // Import AuthContext to check login status

export const CartContext = createContext();

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null); // Will hold the Rye cart object or null
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useContext(AuthContext); // Get user status

  // Define fetchCart using useCallback to stabilize its identity
  const fetchCart = useCallback(async () => {
    if (!user || authLoading) {
      // Don't fetch if not logged in or auth is still loading
      setCart(null);
      setLoading(false);
      return;
    }
    console.log("CartContext: Fetching cart from backend...");
    setLoading(true);
    try {
      // Calls YOUR backend's GET /api/cart endpoint
      const response = await axios.get(`${apiUrl}/api/cart`, { withCredentials: true });
      if (response.data === null || response.data === '') {
        setCart(null);
      } else {
        console.log("CartContext: Received cart data from backend:", response.data);
        setCart(response.data); // Set the Rye cart object
      }
    } catch (error) {
      console.error('CartContext: Error fetching cart:', error.response?.data || error.message);
      // Avoid persistent error toasts on initial load unless critical
      // toast.error('Failed to load cart.');
      setCart(null); // Clear cart on error
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]); // Depend on user and authLoading

  // Fetch cart initially and when user logs in/out
  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // useEffect depends on the stable fetchCart

  const resetCart = () => {
    console.log("CartContext: Resetting cart state.");
    setCart(null);
  };

  /**
   * Adds an item to the cart via YOUR backend.
   * Passes the INTERNAL GiftDrive item ID.
   */
  const addToCart = async (giftDriveItemId, quantity = 1) => {
    if (!user) {
      toast.error("Please log in to add items to your cart.");
      return;
    }
    console.log(`CartContext: Adding GiftDrive Item ID ${giftDriveItemId} (Qty: ${quantity})`);
    // No need to set loading here, rely on feedback from API call
    try {
      // Calls YOUR backend's POST /api/cart/add endpoint
      const response = await axios.post(
        `${apiUrl}/api/cart/add`,
        { giftDriveItemId, quantity }, // Send GiftDrive ID
        { withCredentials: true }
      );
      setCart(response.data); // Update state with the new Rye cart object from backend
      toast.success('Item added to cart!');
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to add item to cart.');
    }
  };

  /**
   * Removes an item from the Rye cart via YOUR backend.
   * Requires the Rye Product/Variant ID and Marketplace.
   */
  const removeFromCart = async (ryeItemId, marketplace) => {
    if (!user) return; // Should not happen if called from cart page
    console.log(`CartContext: Removing Rye Item ID ${ryeItemId} (${marketplace})`);
    try {
      // Calls YOUR backend's POST /api/cart/remove endpoint
      const response = await axios.post(
        `${apiUrl}/api/cart/remove`,
        { itemId: ryeItemId, marketplace }, // Send Rye identifiers
        { withCredentials: true }
      );
      const updatedCart = response.data;
      // Check if the cart is now empty
      const isEmpty = !updatedCart?.stores || updatedCart.stores.every(s => !s.cartLines || s.cartLines.length === 0);
      setCart(isEmpty ? null : updatedCart); // Set to null if empty, otherwise update

      toast.success('Item removed from cart.');
    } catch (error) {
      console.error('CartContext: Error removing from cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove item from cart.');
      fetchCart(); // Refetch cart on error to ensure consistency
    }
  };

  /**
   * Updates item quantity in the Rye cart via YOUR backend.
   * Requires the Rye Product/Variant ID, Marketplace, and new quantity.
   */
  const updateCartItemQuantity = async (ryeItemId, marketplace, quantity) => {
    if (!user) return;
    if (quantity <= 0) {
      // If quantity is 0 or less, treat as removal
      removeFromCart(ryeItemId, marketplace);
      return;
    }
    console.log(`CartContext: Updating Rye Item ID ${ryeItemId} (${marketplace}) to Qty: ${quantity}`);
    try {
      // Calls YOUR backend's POST /api/cart/update endpoint
      const response = await axios.post(
        `${apiUrl}/api/cart/update`,
        { itemId: ryeItemId, marketplace, quantity }, // Send Rye identifiers
        { withCredentials: true }
      );
      setCart(response.data); // Update state with the new Rye cart object
      // Optional: Success toast? Might be too noisy for quantity changes.
      // toast.success('Cart updated.');
    } catch (error) {
      console.error('CartContext: Error updating quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update item quantity.');
      fetchCart(); // Refetch cart on error
    }
  };

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, removeFromCart, updateCartItemQuantity, loading, fetchCart, resetCart }}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};