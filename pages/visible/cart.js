// pages/visible/cart.js

import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../contexts/CartContext';
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

// Initialize Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const CartPage = () => {
  const { cart, removeFromCart, updateCartItemQuantity, loading } = useContext(CartContext);
  const [cartItems, setCartItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false); // To handle button state

  useEffect(() => {
    if (cart && cart.items) {
      setCartItems(cart.items);
    } else {
      setCartItems([]);
    }
  }, [cart]);

  const handleRemoveItem = async (cartItemId) => {
    try {
      await removeFromCart(cartItemId);
      // The CartContext should automatically update cartItems via context
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const handleUpdateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1) {
      alert('Quantity must be at least 1.');
      return;
    }

    try {
      await updateCartItemQuantity(cartItemId, quantity);
      // The CartContext should automatically update cartItems via context
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity. Please try again.');
    }
  };

  const handleProceedToCheckout = async () => {
    setIsProcessing(true); // Disable the button to prevent multiple clicks
    try {
      // Create a Checkout Session on the Express backend
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkout/create-checkout-session`,
        {}, // Include any necessary data here if required by your backend
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true, // Ensure cookies are sent if needed for authentication
        }
      );

      const { sessionId } = response.data;

      if (!sessionId) {
        throw new Error('No session ID returned from the server.');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe Checkout error:', error);
        alert('An error occurred while redirecting to checkout.');
      }
    } catch (error) {
      console.error('Error proceeding to checkout:', error.response?.data || error.message);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setIsProcessing(false); // Re-enable the button
    }
  };

  const totalPrice = cartItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 1),
    0
  );

  return (
    <>
      <Navbar transparent />
      <main className="pt-20 min-h-[80vh] bg-gray-800">
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center items-center text-white">
              <p>Loading your cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-white">
              <h2 className="text-3xl font-semibold mb-4">Your Cart is Empty</h2>
              <Link href="/visible/orglist" className="text-blue-400 hover:underline">
                Browse Organizations
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-semibold mb-6 text-white">Your Cart</h2>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg shadow-md">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.cart_item_id} className="border-b">
                        <td className="px-6 py-4 flex items-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-16 h-16 object-cover mr-4 rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-300 mr-4 rounded"></div>
                          )}
                          <div>
                            <Link href={`/visible/child/${item.child_id}`} className="text-blue-500 hover:underline">
                              {item.item_name}
                            </Link>
                            {(item.size || item.color) && (
                              <div className="text-sm text-gray-600">
                                {item.size && <span>Size: {item.size} </span>}
                                {item.color && <span>Color: {item.color}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">${Number(item.price).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.cart_item_id,
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="w-16 border border-gray-300 rounded p-1 text-center"
                          />
                        </td>
                        <td className="px-6 py-4">
                          ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRemoveItem(item.cart_item_id)}
                            className="text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-right font-semibold">
                        Total:
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${totalPrice.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleProceedToCheckout}
                  className={`bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CartPage;
