// contexts/CartContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
// No longer need useRouter here if all redirects are handled by pages or NextAuth
import { useSession } from 'next-auth/react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true); // True initially to fetch cart
  const { status: authStatus } = useSession(); // Only need authStatus to trigger re-fetch

  const fetchCart = useCallback(async () => {
    console.log("CartContext: fetchCart called. Auth status:", authStatus);
    // Don't set loading true here if it's a background refresh,
    // only if it's the initial load or a major context change.
    // The `loading` state here primarily reflects the cart's readiness.
    // If authStatus is "loading", we might want to wait before fetching.
    if (authStatus === "loading") {
      setLoading(true); // Keep context loading until auth is resolved
      return;
    }

    setLoading(true); // Indicate cart fetching
    try {
      const response = await axios.get(`/api/cart`, { withCredentials: true });
      setCart(response.data || null);
      console.log("CartContext: Cart data fetched/updated:", response.data);
    } catch (error) {
      console.error('CartContext: Error fetching cart:', error.response?.data || error.message);
      setCart(null); // Clear cart on error
      // Optionally toast an error if it's not a silent fetch
      // toast.error("Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }, [authStatus]); // Re-fetch when authStatus changes

  useEffect(() => {
    // Fetch cart initially when auth status is determined (authenticated or unauthenticated)
    // This ensures guest carts are loaded if a cookie exists.
    fetchCart();
  }, [fetchCart]); // fetchCart dependency includes authStatus

  const resetCart = useCallback(() => {
    setCart(null);
    // Optionally, you might want to call an API endpoint to clear the guestCartToken cookie
    // if you want guests to explicitly "clear" their cart token.
    // For now, just clearing client-side state.
    console.log("CartContext: Cart reset locally.");
  }, []);

  const addToCart = async (payload) => {
    // No longer check authStatus or redirect. API handles guest/user logic.
    console.log(`CartContext: Adding item via API:`, payload);
    setLoading(true); // Indicate cart operation
    try {
      const response = await axios.post(
        `/api/cart/add`,
        payload,
        { withCredentials: true }
      );
      setCart(response.data);
      toast.success('Item added to cart!');
      return true;
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to add item to cart.');
      // Fetch cart to sync state in case of partial failure or if backend returns old state on error
      await fetchCart();
      throw error; // Re-throw so calling component can handle if needed
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (ryeItemId, marketplace) => {
    // No authStatus check here
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/cart/remove`,
        { itemId: ryeItemId, marketplace },
        { withCredentials: true }
      );
      const updatedCart = response.data;
      // Rye might return an empty cart object rather than null if all items are removed.
      // Check if the cart is truly empty.
      const isEmpty = !updatedCart?.stores || updatedCart.stores.every(s => !s.cartLines || s.cartLines.length === 0);
      setCart(isEmpty ? null : updatedCart);
      toast.success('Item removed from cart.');
    } catch (error) {
      console.error('CartContext: Error removing from cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove item from cart.');
      await fetchCart(); // Sync state
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemQuantity = async (ryeItemId, marketplace, quantity) => {
    // No authStatus check here
    if (quantity <= 0) { // Delegate to removeFromCart
      try {
        await removeFromCart(ryeItemId, marketplace);
      } catch { /* Error already handled by removeFromCart */ }
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/cart/update`,
        { itemId: ryeItemId, marketplace, quantity },
        { withCredentials: true }
      );
      setCart(response.data);
      // Optionally, toast a success message, but can be noisy for quantity changes
      // toast.info('Cart quantity updated.');
    } catch (error) {
      console.error('CartContext: Error updating quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update item quantity.');
      await fetchCart(); // Sync state
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      setCart, // Keep for direct manipulation if ever needed (e.g., after order success)
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      loading, // This 'loading' reflects cart operations / initial fetch
      fetchCart, // Expose if manual refresh is needed from components
      resetCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};