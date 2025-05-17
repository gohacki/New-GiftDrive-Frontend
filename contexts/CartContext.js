// contexts/CartContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react'; // Removed useContext as AuthContext is no longer directly used here
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react'; // Import useSession from next-auth

export const CartContext = createContext();

// const apiUrl = process.env.NEXT_PUBLIC_API_URL; // This will be for your Next.js API routes

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null); // Will hold the Rye cart object or null
  const [loading, setLoading] = useState(true); // Cart-specific loading
  const { data: session, status: authStatus } = useSession(); // Get session data and status from next-auth
  const router = useRouter();

  const fetchCart = useCallback(async () => {
    // Only fetch if user is authenticated and session is not loading
    if (authStatus === "authenticated" && session?.user) {
      console.log("CartContext: Fetching cart from backend API route...");
      setLoading(true);
      try {
        // Calls YOUR Next.js API route for fetching the cart
        // Example: /api/cart (assuming it's a GET request)
        const response = await axios.get(`/api/cart`, { withCredentials: true }); // Relative path to Next.js API
        if (response.data === null || response.data === '') {
          setCart(null);
        } else {
          console.log("CartContext: Received cart data from backend:", response.data);
          setCart(response.data);
        }
      } catch (error) {
        console.error('CartContext: Error fetching cart:', error.response?.data || error.message);
        setCart(null);
      } finally {
        setLoading(false);
      }
    } else if (authStatus === "unauthenticated") {
      // If not authenticated, clear cart and stop loading
      setCart(null);
      setLoading(false);
    }
    // If authStatus is "loading", do nothing yet, wait for it to resolve.
    // The useEffect below will re-trigger fetchCart when authStatus changes.
  }, [session, authStatus]); // Depend on session and authStatus

  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // useEffect depends on the stable fetchCart

  const resetCart = useCallback(() => { // useCallback for resetCart if passed as prop
    console.log("CartContext: Resetting cart state.");
    setCart(null);
  }, []);

  const addToCart = async (payload) => {
    if (authStatus !== "authenticated" || !session?.user) {
      toast.error("Please log in to add items to your cart.");
      router.push('/auth/login'); // Redirect to login
      return;
    }
    console.log(`CartContext: Adding item via detailed payload to backend API:`, payload);
    try {
      // Calls YOUR Next.js API route for adding to cart
      const response = await axios.post(
        `/api/cart/add`, // Relative path to Next.js API
        payload,
        { withCredentials: true }
      );
      setCart(response.data); // Update with the cart returned from your API
      toast.success('Item added to cart!');
      // router.push('/visible/cart'); // Optional: redirect to cart page
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to add item to cart.');
      // Optionally re-fetch cart on error to ensure consistency if your API doesn't return the cart on error
      // await fetchCart();
    }
  };

  const removeFromCart = async (ryeItemId, marketplace) => {
    if (authStatus !== "authenticated" || !session?.user) return;
    console.log(`CartContext: Removing Rye Item ID ${ryeItemId} (${marketplace}) via backend API`);
    try {
      // Calls YOUR Next.js API route for removing from cart
      const response = await axios.post(
        `/api/cart/remove`, // Relative path to Next.js API
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
      await fetchCart(); // Refetch cart on error to ensure consistency
    }
  };

  const updateCartItemQuantity = async (ryeItemId, marketplace, quantity) => {
    if (authStatus !== "authenticated" || !session?.user) return;
    if (quantity <= 0) {
      removeFromCart(ryeItemId, marketplace);
      return;
    }
    console.log(`CartContext: Updating Rye Item ID ${ryeItemId} (${marketplace}) to Qty: ${quantity} via backend API`);
    try {
      // Calls YOUR Next.js API route for updating cart item quantity
      const response = await axios.post(
        `/api/cart/update`, // Relative path to Next.js API
        { itemId: ryeItemId, marketplace, quantity },
        { withCredentials: true }
      );
      setCart(response.data);
    } catch (error) {
      console.error('CartContext: Error updating quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update item quantity.');
      await fetchCart();
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      setCart, // Expose setCart if needed for direct manipulation (e.g., after order completion)
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      loading, // Cart-specific loading state
      fetchCart, // Expose fetchCart if manual refresh is needed from components
      resetCart   // Expose resetCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};