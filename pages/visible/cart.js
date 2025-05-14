// File: pages/visible/cart.js
import React, { useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
// import axios from 'axios'; // Not strictly needed if using fetch
import PropTypes from 'prop-types'; // Added for prop validation

import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';

// --- Import Checkout Components ---
import CartDisplay from '../../components/Cards/CartDisplay';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import RyePayForm from '../../components/checkout/RyePayForm';
import CheckoutResult from '../../components/checkout/CheckoutResult';
import StatusDisplay from '../../components/Cards/StatusDisplay';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ShippingAddressDisplay = ({ address }) => {
  if (!address) return null;
  return (
    <fieldset className="border p-4 rounded-md shadow bg-gray-50 mt-6">
      <legend className="text-lg font-semibold px-2">Shipping To</legend>
      <div className="text-sm text-gray-700 space-y-1 pl-2">
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

// Added PropTypes for ShippingAddressDisplay
ShippingAddressDisplay.propTypes = {
  address: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    address1: PropTypes.string,
    address2: PropTypes.string,
    city: PropTypes.string,
    provinceCode: PropTypes.string,
    postalCode: PropTypes.string,
    countryCode: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
  }),
};

const CartPage = () => {
  const { cart, setCart, removeFromCart, updateCartItemQuantity, loading: cartLoading, fetchCart } = useContext(CartContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const [checkoutStep, setCheckoutStep] = useState('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutResultData, setCheckoutResultData] = useState(null);
  const [hideAmazonPrice, setHideAmazonPrice] = useState(true);

  useEffect(() => {
    setError(null);
  }, [cart, checkoutStep]);

  const handleStartCheckout = async () => {
    if (!cart || !user) {
      setError("Cannot proceed: Cart or user not available.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setCheckoutResultData(null);

    try {
      // --- 1. Pre-Checkout Validation ---
      console.log("[Start Checkout] Validating cart contents before payment...");
      const validationResponse = await fetch(`${apiUrl}/api/cart/validate-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for auth context to be sent
      });

      if (!validationResponse.ok) {
        const validationError = await validationResponse.json().catch(() => ({ error: 'Failed to validate cart.' }));
        console.error("[Start Checkout] Cart validation failed (HTTP):", validationError);
        const errorMessage = validationError?.error || 'Cart validation failed. Please review your cart.';
        setError(errorMessage);
        setIsProcessing(false);
        return; // Stop execution if validation fails
      }

      const validationResult = await validationResponse.json();

      if (!validationResult.isValid) {
        console.error("[Start Checkout] Cart validation failed:", validationResult.issues);
        const errorMessages = validationResult.issues.map(issue => issue.itemName ? `${issue.itemName}: ${issue.error}` : issue.error);
        const combinedErrorMessage = `Cart issues: ${errorMessages.join('; ')}`;
        setError(combinedErrorMessage);
        setIsProcessing(false);
        return; // Stop execution if validation fails
      }
      console.log("[Start Checkout] Cart validated successfully. Proceeding to payment.");
      // --- 2. Buyer Identity Update (if needed - keep existing code) ---
      console.log(`[Start Checkout] Current cart before buyer-identity update:`, JSON.stringify(cart?.cost, null, 2));
      console.log(`[Start Checkout] Triggering buyer identity update for cart: ${cart.id}`);

      const identityToSend = cart.buyerIdentity || {
        firstName: user.username?.split(' ')[0] || 'Donor',
        lastName: user.username?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        phone: user.phone || null, // Backend will use org phone
        address1: 'N/A', // Backend overrides with org address
        city: 'N/A',
        provinceCode: 'N/A',
        postalCode: 'N/A',
        countryCode: 'US',
      };

      const response = await fetch(`${apiUrl}/api/cart/buyer-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id, buyerIdentity: identityToSend }),
        credentials: 'include',
      });

      const updatedCartDataFromAPI = await response.json();

      if (!response.ok) {
        const errorMsg = updatedCartDataFromAPI.error || `Failed to update shipping address (${response.status})`;
        console.error("[Start Checkout] Buyer Identity update failed:", errorMsg, updatedCartDataFromAPI.details);
        throw new Error(errorMsg);
      }

      console.log("[Start Checkout] Buyer Identity update successful. API returned cart with cost:", JSON.stringify(updatedCartDataFromAPI?.cost, null, 2));

      // Update the cart in context immediately with the full data from the API
      setCart(updatedCartDataFromAPI);

      // Now check if the *updated* cart (now in context and in updatedCartDataFromAPI) has necessary cost info
      const costObject = updatedCartDataFromAPI.cost;
      const isCostReady = costObject?.total?.value != null || costObject?.isEstimated === true;

      if (isCostReady) {
        console.log("[Start Checkout] Costs are ready in the updated cart. Proceeding to payment step.");
        setCheckoutStep('payment');
      } else {
        console.warn("[Start Checkout] Costs are NOT ready even after buyer identity update. Cart Cost:", costObject);
        setError("Could not calculate final shipping/tax. Please review your cart or try again.");
        setCheckoutStep('idle');
      }
    } catch (err) {
      console.error("Error during handleStartCheckout:", err);
      setError(err.message || "Failed to proceed to checkout.");
      setCheckoutStep('idle'); // Revert to idle on error
    } finally {
      setIsProcessing(false);
    }
  };


  const handleOrderError = useCallback((errorMessage) => {
    setError(`Checkout Error: ${errorMessage}`);
    setCheckoutResultData({ error: `Checkout Error: ${errorMessage}` });
    setIsProcessing(false);
    toast.error(errorMessage || "There was an issue placing your order.");
  }, [setError, setCheckoutResultData, setIsProcessing]);

  const handleRyePaySuccess = useCallback(async (ryeSubmitCartResult) => {
    console.log("RyePay submitCart result received in handleRyePaySuccess:", JSON.stringify(ryeSubmitCartResult, null, 2));
    setIsProcessing(true);
    setError(null);

    try {
      if (!cart || !cart.id || !cart.cost?.total?.value) {
        throw new Error("Essential cart data (ID or total cost) missing for finalization.");
      }
      if (!ryeSubmitCartResult.cart || !ryeSubmitCartResult.cart.stores) {
        throw new Error("Invalid response structure from Rye after cart submission.");
      }
      const successfulRyeOrders = ryeSubmitCartResult.cart.stores
        .filter(s => s.status === 'COMPLETED' || s.status === 'SUBMITTED')
        .map(s => ({
          storeName: s.store?.store || 'UnknownStore',
          ryeOrderId: s.orderId || s.requestId
        }))
        .filter(s => s.ryeOrderId);
      if (successfulRyeOrders.length === 0) {
        let failureMessage = "Order submission did not result in any successful store orders.";
        const failedStore = ryeSubmitCartResult.cart.stores.find(s => (s.errors && s.errors.length > 0) || s.status === 'FAILED');
        if (failedStore) {
          const storeName = failedStore.store?.store || 'Unknown Store';
          const storeError = failedStore.errors?.[0]?.message || `Status: ${failedStore.status}`;
          failureMessage = `Order submission failed for store ${storeName}: ${storeError}`;
        }
        throw new Error(failureMessage);
      }
      console.log(`Finalizing order with backend. Successful Rye orders:`, successfulRyeOrders);
      const response = await fetch(`${apiUrl}/api/orders/finalize-rye-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ryeCartId: cart.id,
          successfulRyeOrders: successfulRyeOrders,
          amountInCents: cart.cost.total.value,
          currency: cart.cost.total.currency,
        }),
        credentials: 'include',
      });
      const resultData = await response.json();
      if (!response.ok) {
        throw new Error(resultData.error || `Order finalization failed (${response.status})`);
      }
      setCheckoutResultData({
        message: resultData.message,
        dbOrderId: resultData.orderId,
        ryeOrderId: resultData.ryeOrderId
      });
      setCart(null);
      setCheckoutStep('complete');
      setError(null);
      toast.success(resultData.message || "Order placed successfully!");
    } catch (err) {
      console.error("Error in handleRyePaySuccess:", err);
      handleOrderError(`Payment may have succeeded, but order finalization failed: ${err.message}. Please contact support.`);
    } finally {
      setIsProcessing(false);
    }
  }, [cart, setCart, setCheckoutStep, setCheckoutResultData, handleOrderError, apiUrl, setIsProcessing, setError]);

  const handleCancelCheckout = () => {
    setError(null);
    setCheckoutResultData(null);
    setCheckoutStep('idle');
    fetchCart();
  };

  const isLoadingGlobal = cartLoading || authLoading || isProcessing;

  // Condition to enable the initial "Enter Address & View Options" button
  const canInitiateCheckout = cart &&
    cart.stores?.some(s => s.cartLines?.length > 0) &&
    cart.cost?.subtotal?.value != null; // We need at least a subtotal to start

  const hasBlockingCartErrors = cart?.stores?.some(store => {
    const storeErrors = store.errors || [];
    const offerErrors = store.offer?.errors || [];
    const allStoreErrors = [...storeErrors, ...offerErrors];
    if (checkoutStep === 'idle') { // Looser check for 'idle' step
      // Only block if items are explicitly unavailable, or other truly critical errors.
      // Buyer identity errors are expected at this stage and shouldn't block proceeding to address entry.
      return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION' && err.code !== 'SHIPPING_ADDRESS_INVALID' && store.offer?.notAvailableIds?.length > 0);
    }
    // For payment step, any significant error (excluding perhaps informational ones) could be blocking.
    // This might need adjustment based on Rye's error codes.
    if (checkoutStep === 'payment') {
      return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION' && err.code !== 'SHIPPING_ADDRESS_INVALID');
    }
    return false;
  });


  // Determine the text for the main action button in 'idle' state
  let idleButtonText = 'Enter Address & View Options';
  let idleButtonTitle = '';
  if (isLoadingGlobal) {
    idleButtonText = 'Loading...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.isEstimated === true) {
    // If total is null BUT isEstimated is true, Rye is calculating.
    idleButtonText = 'Proceed (Calculating Total...)';
    idleButtonTitle = 'Final costs are being calculated...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.subtotal?.value != null && !cart.cost.isEstimated) {
    // Subtotal exists, total doesn't, not estimated yet.
    idleButtonText = 'Proceed (Calculating Shipping/Tax...)';
    idleButtonTitle = 'Enter address to calculate shipping and tax.';
  } else if (!canInitiateCheckout && cart) {
    idleButtonTitle = !cart.stores?.some(s => s.cartLines?.length > 0) ? 'Cart is empty'
      : !cart.cost?.subtotal?.value ? 'Waiting for initial cart calculation...'
        : '';
  }


  return (
    <>
      <Navbar transparent />
      <main className="pt-24 min-h-screen bg-secondary_green text-gray-800">
        <div className="container mx-auto px-4 py-8">

          {(authLoading || (cartLoading && checkoutStep !== 'complete' && !cart)) && ( // Show loading if cart is null and cartLoading
            <div className="text-center py-10">Loading Cart...</div>
          )}

          {!authLoading && !user && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-semibold mb-4">Please Log In</h2>
              <p className="mb-4">You need to be logged in to view your cart and check out.</p>
              <Link href="/auth/login" className="text-ggreen hover:underline font-medium">
                Go to Login
              </Link>
            </div>
          )}

          {!authLoading && user && (
            <>
              <StatusDisplay isLoading={isProcessing && checkoutStep !== 'payment'} error={error} />

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

              {checkoutStep !== 'complete' && cart?.buyerIdentity && (
                <ShippingAddressDisplay address={cart.buyerIdentity} />
              )}

              {checkoutStep !== 'complete' && cart && (
                <div className="mt-6">
                  <ShippingOptions stores={cart.stores} />
                </div>
              )}

              {checkoutStep === 'idle' && cart && cart.stores?.some(s => s.cartLines?.length > 0) && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleStartCheckout}
                    disabled={isLoadingGlobal || !canInitiateCheckout || hasBlockingCartErrors}
                    className={`bg-ggreen text-white inter-semi-bold px-6 py-3 rounded-full hover:shadow-lg transition-all duration-150 disabled:opacity-50 ${!canInitiateCheckout || hasBlockingCartErrors ? 'cursor-not-allowed' : ''}`}
                    title={idleButtonTitle || (hasBlockingCartErrors ? 'Please resolve cart issues first' : '')}
                  >
                    {idleButtonText}
                  </button>
                </div>
              )}

              {checkoutStep === 'payment' && cart && (
                <div className="mt-6">
                  {cart.cost?.total?.value != null ? (
                    <>
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
                      <RyePayForm
                        cartData={cart}
                        onProcessing={setIsProcessing}
                        onSuccess={handleRyePaySuccess}
                        onError={handleOrderError}
                      />
                    </>
                  ) : (
                    <div className='mt-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-center'>
                      Final total is still calculating. The payment form will appear once ready.
                      If this persists, please try refreshing or contacting support.
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleCancelCheckout}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md shadow-sm disabled:opacity-50"
                    >
                      Back to Cart Summary
                    </button>
                  </div>
                </div>
              )}


              {checkoutStep === 'complete' && (
                <div className="mt-6">
                  <CheckoutResult result={checkoutResultData} />
                  <div className="text-center mt-6 space-x-4">
                    <button
                      onClick={() => { setCheckoutStep('idle'); setCheckoutResultData(null); fetchCart(); }}
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