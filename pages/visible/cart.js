// pages/visible/cart.js

import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../contexts/CartContext';
import axios from 'axios';
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const CartPage = () => {
  const { cart, removeFromCart } = useContext(CartContext);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    if (cart && cart.items) {
      setCartItems(cart.items);
    } else {
      setCartItems([]);
    }
  }, [cart]);

  const handleRemoveItem = async (cartLineId) => {
    try {
      await removeFromCart(cartLineId);
      setCartItems(cartItems.filter((item) => item.cartLineId !== cartLineId));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleUpdateQuantity = async (cartLineId, quantity) => {
    try {
      await axios.post(
        `${apiUrl}/api/cart/update`,
        { cartLineId, quantity },
        { withCredentials: true }
      );
      // Update the local cart items state
      setCartItems(
        cartItems.map((item) =>
          item.cartLineId === cartLineId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleProceedToCheckout = () => {
    // Implement your checkout logic here
    // For example, redirect to a checkout page
  };

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <>
      <Navbar transparent />
      <main className="pt-20 min-h-[80vh] bg-gray-800">
        <div className="container mx-auto px-4 py-8">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-screen-minus-nav-footer text-white">
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
                      <tr key={item.cartLineId} className="border-b">
                        <td className="px-6 py-4 flex items-center">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-16 h-16 object-cover mr-4 rounded"
                          />
                          <span>{item.productName}</span>
                        </td>
                        <td className="px-6 py-4">${item.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(item.cartLineId, parseInt(e.target.value))
                            }
                            className="w-16 border border-gray-300 rounded p-1 text-center"
                          />
                        </td>
                        <td className="px-6 py-4">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRemoveItem(item.cartLineId)}
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
                  className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
                >
                  Proceed to Checkout
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