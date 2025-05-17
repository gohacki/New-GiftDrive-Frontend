// contexts/CartContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const fetchCart = useCallback(async () => {
    if (authStatus === "authenticated" && session?.user) {
      setLoading(true);
      try {
        const response = await axios.get(`/api/cart`, { withCredentials: true });
        setCart(response.data || null); // Ensure null if empty response
      } catch (error) {
        console.error('CartContext: Error fetching cart:', error.response?.data || error.message);
        setCart(null);
      } finally {
        setLoading(false);
      }
    } else if (authStatus === "unauthenticated") {
      setCart(null);
      setLoading(false);
    }
  }, [session, authStatus]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const resetCart = useCallback(() => {
    setCart(null);
  }, []);

  const addToCart = async (payload) => {
    if (authStatus !== "authenticated" || !session?.user) {
      toast.error("Please log in to add items to your cart.");
      router.push('/auth/login');
      throw new Error("User not authenticated for addToCart"); // Throw error to stop further processing
    }
    console.log(`CartContext: Adding item via detailed payload to backend API:`, payload);
    try {
      const response = await axios.post(
        `/api/cart/add`,
        payload,
        { withCredentials: true }
      );
      setCart(response.data);
      toast.success('Item added to cart!');
      return true; // Indicate success
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to add item to cart.');
      throw error; // --- MODIFICATION: Re-throw the error ---
    }
  };

  const removeFromCart = async (ryeItemId, marketplace) => {
    // ... (implementation as before, consider re-throwing errors here too if needed by callers)
    if (authStatus !== "authenticated" || !session?.user) return;
    try {
      const response = await axios.post(
        `/api/cart/remove`,
        { itemId: ryeItemId, marketplace },
        { withCredentials: true }
      );
      const updatedCart = response.data;
      const isEmpty = !updatedCart?.stores || updatedCart.stores.every(s => !s.cartLines || s.cartLines.length === 0);
      setCart(isEmpty ? null : updatedCart);
      toast.success('Item removed from cart.');
    } catch (error) {
      console.error('CartContext: Error removing from cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove item from cart.');
      await fetchCart(); // Refetch to ensure consistency
      throw error; // Optional: re-throw if callers need to know
    }
  };

  const updateCartItemQuantity = async (ryeItemId, marketplace, quantity) => {
    // ... (implementation as before, consider re-throwing errors)
    if (authStatus !== "authenticated" || !session?.user) return;
    if (quantity <= 0) {
      try {
        await removeFromCart(ryeItemId, marketplace); // removeFromCart might throw
      } catch {
        // Already handled by removeFromCart's toast
      }
      return;
    }
    try {
      const response = await axios.post(
        `/api/cart/update`,
        { itemId: ryeItemId, marketplace, quantity },
        { withCredentials: true }
      );
      setCart(response.data);
    } catch (error) {
      console.error('CartContext: Error updating quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update item quantity.');
      await fetchCart();
      throw error; // Optional: re-throw if callers need to know
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      setCart,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      loading,
      fetchCart,
      resetCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};