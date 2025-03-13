import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

// Initialize Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const CartPage = () => {
  const { cart, removeFromCart, updateCartItemQuantity, loading } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Guest checkout modal state
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone_number: '',
  });

  useEffect(() => {
    if (cart && cart.items) {
      setCartItems(cart.items);
    } else {
      setCartItems([]);
    }
  }, [cart]);

  // Remove item handler
  const handleRemoveItem = async (cartItemId) => {
    try {
      await removeFromCart(cartItemId);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item. Please try again.');
    }
  };

  // Update quantity handler
  const handleUpdateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1) {
      toast.warn('Quantity must be at least 1.');
      return;
    }
    try {
      await updateCartItemQuantity(cartItemId, quantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity. Please try again.');
    }
  };

  // Proceed to checkout (authenticated)
  const handleProceedToCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkout/create-checkout-session`,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      const { sessionId } = response.data;
      if (!sessionId) throw new Error('No session ID returned from the server.');

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        console.error('Stripe Checkout error:', error);
        toast.error('An error occurred while redirecting to checkout.');
      }
    } catch (error) {
      console.error('Error proceeding to checkout:', error.response?.data || error.message);
      toast.error('Failed to initiate checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Guest checkout submission
  const handleGuestCheckout = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Basic form validation
      if (
        !guestInfo.first_name ||
        !guestInfo.last_name ||
        !guestInfo.email ||
        !guestInfo.address ||
        !guestInfo.city ||
        !guestInfo.state ||
        !guestInfo.zip_code
      ) {
        toast.error('Please fill in all required fields.');
        setIsProcessing(false);
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkout/guest`,
        { buyer_info: guestInfo },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      if (response.data.order_id) {
        toast.success('Order placed successfully!');
        router.push(`/visible/order-success?order_id=${response.data.order_id}`);
      } else {
        throw new Error('No order ID returned.');
      }
    } catch (error) {
      console.error('Error during guest checkout:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
      setIsGuestCheckout(false);
    }
  };

  // Calculate total price
  const totalPrice = cartItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 1),
    0
  );

  // Increment quantity
  const incrementQuantity = (item) => {
    if (item.quantity < item.maxAvailable) {
      handleUpdateQuantity(item.cart_item_id, item.quantity + 1);
    } else {
      toast.warn('You have reached the maximum available quantity for this item.');
    }
  };

  // Decrement quantity
  const decrementQuantity = (item) => {
    if (item.quantity === 1) {
      const confirmRemove = window.confirm('Do you want to remove this item from your cart?');
      if (confirmRemove) {
        handleRemoveItem(item.cart_item_id);
      }
    } else {
      handleUpdateQuantity(item.cart_item_id, item.quantity - 1);
    }
  };

  return (
    <>
      <Navbar transparent />
      <main className="pt-24 min-h-screen bg-secondary_green text-gray-800">
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center items-center">
              <p>Loading your cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-3xl font-semibold mb-4">Your Cart is Empty</h2>
              <Link href="/visible/orglist" className="text-ggreen hover:underline">
                Browse Organizations
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-semibold mb-6">Your Cart</h2>
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <table className="w-full">
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
                        {/* Product Info */}
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
                            <div className="font-semibold">{item.item_name}</div>
                            {(item.size || item.color) && (
                              <div className="text-sm text-gray-600">
                                {item.size && <span>Size: {item.size} </span>}
                                {item.color && <span>Color: {item.color}</span>}
                              </div>
                            )}
                            {item.child_id ? (
                              <div className="text-sm text-gray-600">
                                Child:&nbsp;
                                <Link href={`/visible/child/${item.child_id}`} className="text-ggreen hover:underline">
                                    {item.child_name || 'View Child'}
                                </Link>
                              </div>
                            ) : (
                              item.drive_id && (
                                <div className="text-sm text-gray-600 italic">
                                  Item-only drive
                                </div>
                              )
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4">${Number(item.price).toFixed(2)}</td>

                        {/* Quantity Controls */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => decrementQuantity(item)}
                              className="px-2 py-1 border border-gray-300 rounded-lg text-gray-800"
                              aria-label={`Decrease quantity of ${item.item_name}`}
                            >
                              -
                            </button>
                            <span className="mx-2 w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => incrementQuantity(item)}
                              className={`px-2 py-1 border border-gray-300 rounded-lg text-gray-800 ${
                                item.quantity >= item.maxAvailable ? 'bg-gray-200 cursor-not-allowed' : ''
                              }`}
                              disabled={item.quantity >= item.maxAvailable}
                              aria-label={`Increase quantity of ${item.item_name}`}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Subtotal */}
                        <td className="px-6 py-4">
                          ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                        </td>

                        {/* Remove Button */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRemoveItem(item.cart_item_id)}
                            className="text-red-500 hover:underline"
                            aria-label={`Remove ${item.item_name} from cart`}
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
                      <td className="px-6 py-4 font-semibold">${totalPrice.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Checkout Buttons */}
              <div className="flex justify-end mt-6 space-x-4">
                {user ? (
                  <button
                    onClick={handleProceedToCheckout}
                    className={`bg-ggreen text-white font-semibold px-6 py-3 rounded-full hover:shadow-lg transition-all duration-150 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isProcessing}
                    aria-label="Proceed to Checkout"
                  >
                    {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsGuestCheckout(true)}
                    className={`bg-ggreen text-white font-semibold px-6 py-3 rounded-full hover:shadow-lg transition-all duration-150 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isProcessing}
                    aria-label="Checkout as Guest"
                  >
                    Checkout as Guest
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Guest Checkout Modal */}
        {isGuestCheckout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 p-6">
              <h2 className="text-2xl font-semibold mb-4">Guest Checkout</h2>
              <form onSubmit={handleGuestCheckout} className="space-y-4">
                <div>
                  <label htmlFor="first_name" className="block text-gray-800">
                    First Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={guestInfo.first_name}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, first_name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-gray-800">
                    Last Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={guestInfo.last_name}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, last_name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-gray-800">
                    Email<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={guestInfo.email}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, email: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-gray-800">
                    Address<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={guestInfo.address}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, address: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label htmlFor="city" className="block text-gray-800">
                      City<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={guestInfo.city}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, city: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                    />
                  </div>
                  <div className="w-1/2">
                    <label htmlFor="state" className="block text-gray-800">
                      State<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={guestInfo.state}
                      onChange={(e) =>
                        setGuestInfo({ ...guestInfo, state: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="zip_code" className="block text-gray-800">
                    ZIP Code<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    value={guestInfo.zip_code}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, zip_code: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div>
                  <label htmlFor="phone_number" className="block text-gray-800">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={guestInfo.phone_number}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, phone_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring transition-all duration-150"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsGuestCheckout(false)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Cancel Guest Checkout"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-ggreen text-white rounded-full hover:shadow-lg transition-colors ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isProcessing}
                    aria-label="Submit Guest Checkout"
                  >
                    {isProcessing ? 'Processing...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default CartPage;
