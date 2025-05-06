// pages/visible/cart.js
import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';
import axios from 'axios'; // Keep axios for direct calls if needed
import { toast } from 'react-toastify';

// --- Import Checkout Components ---
import CartDisplay from '../../components/Cards/CartDisplay';
// REMOVE: import IdentityForm from '../../components/checkout/IdentityForm';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import StripePaymentForm from '../../components/checkout/StripePaymentForm';
import CheckoutResult from '../../components/checkout/CheckoutResult';
import StatusDisplay from '../../components/Cards/StatusDisplay';
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// --- NEW Component: Display Fixed Shipping Address ---
import PropTypes from 'prop-types'; // 1. Import PropTypes

const ShippingAddressDisplay = ({ address }) => {
  // Handles null/undefined gracefully, so address prop itself doesn't strictly
  // need to be required by PropTypes if the parent might pass null/undefined.
  // However, if the parent *should* always pass an object when rendering this,
  // making the prop required is better for catching errors.
  // Let's assume the parent ensures it's an object if rendered.
  if (!address) return null;

  return (
    <fieldset className="border p-4 rounded-md shadow bg-gray-50 mt-6">
      <legend className="text-lg font-semibold px-2">Shipping To</legend>
      <div className="text-sm text-gray-700 space-y-1 pl-2">
        {/* Display fields only if they exist */}
        {(address.firstName || address.lastName) && <p>{address.firstName} {address.lastName}</p>}
        {address.address1 && <p>{address.address1}</p>}
        {address.address2 && <p>{address.address2}</p>}
        {(address.city || address.provinceCode || address.postalCode) && (
          <p>
            {address.city}{address.city && (address.provinceCode || address.postalCode) ? ', ' : ''}
            {address.provinceCode}{address.provinceCode && address.postalCode ? ' ' : ''}
            {address.postalCode}
          </p>
        )}
        {address.countryCode && <p>{address.countryCode}</p>}
        {address.email && <p>{address.email}</p>}
        {address.phone && <p>{address.phone}</p>}
        <p className="text-xs italic text-gray-500 pt-2">Items will be shipped directly to the organization.</p>
      </div>
    </fieldset>
  );
};
ShippingAddressDisplay.propTypes = {
  /**
   * The address object containing shipping details.
   * Should conform to Rye's BuyerIdentity structure.
   */
  address: PropTypes.shape({
    firstName: PropTypes.string, // Often included, but might be org name
    lastName: PropTypes.string,  // Often included, but might be org name part 2
    address1: PropTypes.string.isRequired, // Essential for shipping
    address2: PropTypes.string,            // Optional apartment, suite, etc.
    city: PropTypes.string.isRequired,     // Essential for shipping
    provinceCode: PropTypes.string.isRequired, // State/Province code (e.g., 'CA', 'NY')
    postalCode: PropTypes.string.isRequired,   // ZIP/Postal code
    countryCode: PropTypes.string.isRequired,  // 2-letter ISO country code (e.g., 'US')
    email: PropTypes.string,               // Often included, useful for confirmation/tracking
    phone: PropTypes.string,               // Often included, useful for delivery issues
  }), // Making the address prop itself not required, as the component handles null check.
  // If the parent component *guarantees* it passes an object, you could add `.isRequired` here.
};


const CartPage = () => {
  const { cart, setCart, removeFromCart, updateCartItemQuantity, loading: cartLoading, fetchCart } = useContext(CartContext);
  const { user, loading: authLoading } = useContext(AuthContext);
  // --- State for Checkout Flow ---
  // REMOVE 'identity' step possibility
  const [checkoutStep, setCheckoutStep] = useState('idle'); // 'idle', 'payment', 'complete'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutResultData, setCheckoutResultData] = useState(null);
  const [hideAmazonPrice, setHideAmazonPrice] = useState(true);

  // Clear errors when cart changes or step changes
  useEffect(() => {
    setError(null);
  }, [cart, checkoutStep]);

  // --- Action Handlers ---

  // Start Checkout - MODIFIED: Go directly to payment
  // In pages/visible/cart.js

  // Make the function async
  // In pages/visible/cart.js

  // Make the function async
  const handleStartCheckout = async () => {
    if (!cart || !user) return;

    setError(null);
    setIsProcessing(true);
    setCheckoutResultData(null);

    try {
      // --- Explicitly Update Buyer Identity ---
      console.log(`[Start Checkout] Triggering buyer identity update for cart: ${cart.id}`);

      // Prepare identity using current user and cart info (or fetch fresh if needed)
      // We need *some* identity data, even if address is fetched backend.
      // Use existing cart data if available, otherwise fallback.
      const identityToSend = cart.buyerIdentity || {
        firstName: user.username?.split(' ')[0] || 'Donor',
        lastName: user.username?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        phone: user.phone || null,
        // Address fields will be overridden by backend, but sending something might be required
        address1: cart.buyerIdentity?.address1 || 'N/A',
        city: cart.buyerIdentity?.city || 'N/A',
        provinceCode: cart.buyerIdentity?.provinceCode || 'N/A',
        postalCode: cart.buyerIdentity?.postalCode || 'N/A',
        countryCode: cart.buyerIdentity?.countryCode || 'US',
      };

      // --- MODIFIED FETCH CALL ---
      // Use the absolute API URL from the environment variable
      const response = await fetch(`${apiUrl}/api/cart/buyer-identity`, { // <-- Use apiUrl here
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          buyerIdentity: identityToSend
        }),
        credentials: 'include',
      });
      // --- END MODIFIED FETCH CALL ---

      const updatedCartData = await response.json();

      if (!response.ok) {
        // Handle errors specifically from the identity update
        const errorMsg = updatedCartData.error || `Failed to update shipping address (${response.status})`;
        console.error("[Start Checkout] Buyer Identity update failed:", errorMsg, updatedCartData.details);
        throw new Error(errorMsg); // Throw to be caught below
      }

      console.log("[Start Checkout] Buyer Identity update successful. Updated cart:", updatedCartData);
      // --- IMPORTANT: Update the cart state with the result ---
      setCart(updatedCartData); // Update context/state

      // --- Verification Step (using the *updated* cart data) ---
      const currentCartState = updatedCartData; // Use the freshly returned data
      console.log("[Start Checkout] Checking costs in updated cart:", currentCartState.cost);

      const isCostReady = currentCartState.cost?.total?.value != null ||
        currentCartState.cost?.shipping != null ||
        currentCartState.cost?.isEstimated === true;

      if (!isCostReady) {
        console.error("!!! [Start Checkout] Costs still not available after explicit buyer identity update. Cart Cost:", currentCartState.cost);
        // Attempt one final refetch? Or just show error.
        // await fetchCart(); // Maybe try one more time?
        // const finalCartCheck = cart; // Check state again after potential fetchCart update
        // if (!finalCartCheck?.cost?.total?.value && !finalCartCheck?.cost?.isEstimated) {
        throw new Error("Could not calculate final shipping/tax for your order. Please try again later or contact support.");
        // }
      } else {
        console.log("[Start Checkout] Costs are ready in updated cart. Proceeding to payment.");
      }

      // --- Proceed to Payment ---
      setCheckoutStep('payment');

    } catch (err) {
      console.error("Error during handleStartCheckout:", err);
      setError(err.message || "Failed to proceed to checkout.");
      setCheckoutStep('idle'); // Stay on idle step if error occurs
    } finally {
      setIsProcessing(false);
    }
  };

  // Stripe Payment Succeeded -> Finalize Order (No changes needed here)
  const handleStripePaymentSuccess = async (paymentIntentId) => {
    if (!cart?.id) {
      setError("Cart information is missing.");
      return;
    }
    console.log("Stripe success, finalizing order via backend. PI:", paymentIntentId);
    setIsProcessing(true);
    setError(null);
    try {
      // Call YOUR backend endpoint
      const response = await axios.post(
        `${apiUrl}/api/checkout/place-order-after-stripe`,
        {
          paymentIntentId: paymentIntentId,
          ryeCartId: cart.id,
          hideAmazonPrice: hideAmazonPrice
        },
        { withCredentials: true }
      );
      console.log("Backend order placement response:", response.data);
      handleOrderSuccess(response.data);
    } catch (err) {
      console.error('Error placing order after Stripe:', err.response?.data || err);
      handleOrderError(err.response?.data?.error || 'Order placement failed after payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Order Success/Error (No changes needed here)
  const handleOrderSuccess = (resultData) => {
    setCheckoutResultData(resultData);
    setCart(null); // Clear the cart in the context/state
    setCheckoutStep('complete');
    setError(null);
    setIsProcessing(false);
    toast.success("Order placed successfully!");
  };

  const handleOrderError = (errorMessage) => {
    setError(`Checkout Error: ${errorMessage}`);
    setCheckoutResultData({ error: `Checkout Error: ${errorMessage}` });
    setIsProcessing(false);
    toast.error("There was an issue placing your order.");
  };

  // Cancel Checkout / Go Back - MODIFIED: Go back to 'idle'
  const handleCancelCheckout = () => {
    setError(null);
    setCheckoutResultData(null);
    setCheckoutStep('idle'); // Go back to showing the cart ('idle')
    fetchCart();
  };

  const canProceedInitially = cart &&
    cart.stores?.some(s => s.cartLines?.length > 0) &&
    cart.cost?.subtotal?.value != null;


  // Also ensure `hasBlockingCartErrors` is defined correctly near `canCheckout`
  const hasBlockingCartErrors = cart?.stores?.some(store => {
    const storeErrors = store.errors || [];
    const offerErrors = store.offer?.errors || [];
    const allStoreErrors = [...storeErrors, ...offerErrors];
    // At the 'idle' stage, only non-identity errors are truly blocking checkout
    return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION');
  });


  const isLoading = cartLoading || authLoading || isProcessing;

  // --- Render Logic ---
  return (
    <>
      <Navbar transparent />
      <main className="pt-24 min-h-screen bg-secondary_green text-gray-800">
        <div className="container mx-auto px-4 py-8">

          {/* Loading / Auth Check */}
          {(authLoading || (cartLoading && checkoutStep !== 'complete')) && ( // Adjusted condition
            <div className="text-center py-10">Loading Cart...</div>
          )}

          {/* Not Logged In */}
          {!authLoading && !user && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-semibold mb-4">Please Log In</h2>
              <p className="mb-4">You need to be logged in to view your cart and check out.</p>
              <Link href="/auth/login" className="text-ggreen hover:underline font-medium">
                Go to Login
              </Link>
            </div>
          )}

          {/* Logged In */}
          {!authLoading && user && (
            <>
              {/* Status Display */}
              <StatusDisplay isLoading={isProcessing} error={error} />

              {/* Cart Display */}
              {checkoutStep !== 'complete' && cart && (
                <CartDisplay
                  cart={cart}
                  checkoutStep={checkoutStep}
                  onRemoveItem={removeFromCart}
                  onUpdateItemQuantity={updateCartItemQuantity}
                  isLoading={isProcessing || cartLoading}
                />
              )}
              {checkoutStep !== 'complete' && !cart && !cartLoading && (
                <div className="text-center py-10">
                  <h2 className="text-3xl inter-semi-bold mb-4">Your Cart is Empty</h2>
                  <Link href="/visible/orglist" className="text-ggreen hover:underline">
                    Browse Organizations
                  </Link>
                </div>
              )}

              {/* --- Display Fixed Shipping Address (if cart exists and has buyerIdentity) --- */}
              {checkoutStep !== 'complete' && cart?.buyerIdentity && (
                <ShippingAddressDisplay address={cart.buyerIdentity} />
              )}

              {/* --- Display Shipping Options (if cart exists) --- */}
              {/* Show this earlier if desired, e.g., in 'idle' step too */}
              {checkoutStep !== 'complete' && cart && (
                <div className="mt-6">
                  <ShippingOptions stores={cart.stores} />
                </div>
              )}


              {/* --- Checkout Steps --- */}

              {/* Step 0: Show Checkout Button */}
              {/* MODIFIED Condition: Check canCheckout */}
              {checkoutStep === 'idle' && cart && cart.stores?.some(s => s.cartLines?.length > 0) && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleStartCheckout}
                    // Use the simpler check initially. Also check for blocking errors.
                    disabled={isLoading || !canProceedInitially || hasBlockingCartErrors}
                    className={`bg-ggreen text-white inter-semi-bold px-6 py-3 rounded-full hover:shadow-lg transition-all duration-150 disabled:opacity-50 ${!canProceedInitially || hasBlockingCartErrors ? 'cursor-not-allowed' : ''
                      }`}
                    // Add a more informative title
                    title={
                      !cart
                        ? 'Loading cart...'
                        : !cart.stores?.some((s) => s.cartLines?.length > 0)
                          ? 'Cart is empty'
                          : !cart.cost?.subtotal?.value
                            ? 'Calculating subtotal...'
                            : hasBlockingCartErrors
                              ? 'Please resolve cart issues first'
                              : ''
                    }
                  >
                    {/* Change button text slightly if total is still technically calculating */}
                    {isLoading ? 'Loading...' : (cart?.cost?.total?.value == null ? 'Proceed (Calculating Total...)' : 'Proceed to Payment')}
                  </button>
                </div>
              )}

              {/* REMOVED: Step 1 Identity Form block */}

              {/* Step 2: Payment Form */}
              {checkoutStep === 'payment' && cart && cart.cost?.total?.value != null && (
                <div className="mt-6">
                  <div className="mb-4 p-3 border rounded bg-gray-50 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideAmazonPrice}
                        onChange={(e) => setHideAmazonPrice(e.target.checked)}
                        className="rounded border-gray-300 text-ggreen shadow-sm focus:border-ggreen focus:ring focus:ring-offset-0 focus:ring-ggreen focus:ring-opacity-50"
                      />
                      <span>Hide price on packing slip (Amazon items only)?</span>
                    </label>
                  </div>
                  <StripePaymentForm
                    cartData={cart}
                    onProcessing={setIsProcessing}
                    onSuccess={handleStripePaymentSuccess}
                    onError={handleOrderError}
                  />
                  <div className="mt-4 text-center">
                    {/* MODIFIED: Back button now calls handleCancelCheckout */}
                    <button
                      onClick={handleCancelCheckout}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md shadow-sm disabled:opacity-50"
                    >
                      Back to Cart
                    </button>
                  </div>
                </div>
              )}
              {/* Handle case where payment step is reached but total is missing (Keep this) */}
              {checkoutStep === 'payment' && cart && cart.cost?.total?.value == null && (
                <div className='mt-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-center'>
                  Cannot proceed to payment. Please review your cart or try again later.
                  <button
                    onClick={handleCancelCheckout} // Go back to cart view
                    className="ml-4 px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-md border border-yellow-400 shadow-sm"
                  >
                    Back to Cart
                  </button>
                </div>
              )}

              {/* Step 3: Completion */}
              {checkoutStep === 'complete' && (
                <div className="mt-6">
                  <CheckoutResult result={checkoutResultData} />
                  <div className="text-center mt-6 space-x-4">
                    <button
                      onClick={() => { setCheckoutStep('idle'); fetchCart(); }}
                      className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow"
                    >
                      Shop Again
                    </button>
                    <Link href="/visible/profile" className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md shadow">
                      View Orders
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CartPage;