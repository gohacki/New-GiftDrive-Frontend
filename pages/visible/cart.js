// File: pages/visible/cart.js
import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import Link from 'next/link';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';
import axios from 'axios'; // Kept for potential direct calls, though fetch is used below
import { toast } from 'react-toastify';

// --- Import Checkout Components ---
import CartDisplay from '../../components/Cards/CartDisplay';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import RyePayForm from '../../components/checkout/RyePayForm'; // Updated Import
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

const CartPage = () => {
  const { cart, setCart, removeFromCart, updateCartItemQuantity, loading: cartLoading, fetchCart } = useContext(CartContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const [checkoutStep, setCheckoutStep] = useState('idle'); // 'idle', 'payment', 'complete'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutResultData, setCheckoutResultData] = useState(null);
  const [hideAmazonPrice, setHideAmazonPrice] = useState(true); // Keep for RyePay submit if applicable

  useEffect(() => {
    setError(null);
  }, [cart, checkoutStep]);

  const handleStartCheckout = async () => {
    if (!cart || !user) return;

    setError(null);
    setIsProcessing(true);
    setCheckoutResultData(null);

    try {
      console.log(`[Start Checkout] Triggering buyer identity update for cart: ${cart.id}`);
      const identityToSend = cart.buyerIdentity || {
        firstName: user.username?.split(' ')[0] || 'Donor',
        lastName: user.username?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        phone: user.phone || null,
        address1: cart.buyerIdentity?.address1 || 'N/A', // Will be overridden by backend
        city: cart.buyerIdentity?.city || 'N/A',
        provinceCode: cart.buyerIdentity?.provinceCode || 'N/A',
        postalCode: cart.buyerIdentity?.postalCode || 'N/A',
        countryCode: cart.buyerIdentity?.countryCode || 'US',
      };

      const response = await fetch(`${apiUrl}/api/cart/buyer-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          buyerIdentity: identityToSend
        }),
        credentials: 'include',
      });

      const updatedCartData = await response.json();

      if (!response.ok) {
        const errorMsg = updatedCartData.error || `Failed to update shipping address (${response.status})`;
        console.error("[Start Checkout] Buyer Identity update failed:", errorMsg, updatedCartData.details);
        throw new Error(errorMsg);
      }

      console.log("[Start Checkout] Buyer Identity update successful. Updated cart:", updatedCartData);
      setCart(updatedCartData);

      const isCostReady = updatedCartData.cost?.total?.value != null ||
        updatedCartData.cost?.shipping != null ||
        updatedCartData.cost?.isEstimated === true;

      if (!isCostReady) {
        console.error("!!! [Start Checkout] Costs still not available after explicit buyer identity update. Cart Cost:", updatedCartData.cost);
        throw new Error("Could not calculate final shipping/tax for your order. Please try again later or contact support.");
      }

      console.log("[Start Checkout] Costs are ready in updated cart. Proceeding to payment.");
      setCheckoutStep('payment');

    } catch (err) {
      console.error("Error during handleStartCheckout:", err);
      setError(err.message || "Failed to proceed to checkout.");
      setCheckoutStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrderSuccess = (resultData) => {
    setCheckoutResultData({
      message: resultData.message,
      dbOrderId: resultData.orderId, // Changed from result.dbOrderId
      ryeOrderId: resultData.ryeOrderId
    });
    setCart(null);
    setCheckoutStep('complete');
    setError(null);
    setIsProcessing(false);
    toast.success(resultData.message || "Order placed successfully!");
  };

  const handleOrderError = (errorMessage) => {
    setError(`Checkout Error: ${errorMessage}`);
    setCheckoutResultData({ error: `Checkout Error: ${errorMessage}` });
    setIsProcessing(false);
    toast.error(errorMessage || "There was an issue placing your order.");
    // Optionally, move back to 'payment' or 'idle'
    // setCheckoutStep('payment'); 
  };

  const handleRyePaySuccess = async (ryeSubmitCartResult) => {
    console.log("RyePay submitCart result received in handleRyePaySuccess:", JSON.stringify(ryeSubmitCartResult, null, 2));
    setIsProcessing(true);
    setError(null);

    try {
      if (!cartData?.id || !cartData?.cost?.total) {
        throw new Error("Essential cart data (ID or total cost) missing for finalization.");
      }

      // Check top-level errors from Rye submitCart
      if (ryeSubmitCartResult.errors && ryeSubmitCartResult.errors.length > 0) {
        const ryeError = ryeSubmitCartResult.errors[0];
        throw new Error(`Rye order submission failed: ${ryeError.message} (${ryeError.code || 'RYE_SUBMIT_ERROR'})`);
      }
      if (!ryeSubmitCartResult.cart || !ryeSubmitCartResult.cart.stores) {
        throw new Error("Invalid response structure from Rye after cart submission.");
      }

      const successfulRyeOrders = ryeSubmitCartResult.cart.stores
        .filter(s => s.status === 'COMPLETED' || s.status === 'SUBMITTED')
        .map(s => ({
          storeName: s.store?.store || 'UnknownStore', // Handle if s.store is undefined
          ryeOrderId: s.orderId || s.requestId // Fallback to requestId if orderId isn't present
        }))
        .filter(s => s.ryeOrderId); // Ensure we only include those with an ID

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
          ryeCartId: cartData.id,
          successfulRyeOrders: successfulRyeOrders,
          amountInCents: cartData.cost.total.value,
          currency: cartData.cost.total.currency,
        }),
        credentials: 'include',
      });

      const resultData = await response.json();
      if (!response.ok) {
        throw new Error(resultData.error || `Order finalization failed (${response.status})`);
      }

      handleOrderSuccess(resultData);

    } catch (err) {
      console.error("Error in handleRyePaySuccess:", err);
      handleOrderError(`Payment may have succeeded, but order finalization failed: ${err.message}. Please contact support.`);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCancelCheckout = () => {
    setError(null);
    setCheckoutResultData(null);
    setCheckoutStep('idle');
    fetchCart();
  };

  const canProceedInitially = cart &&
    cart.stores?.some(s => s.cartLines?.length > 0) &&
    cart.cost?.subtotal?.value != null;

  const hasBlockingCartErrors = cart?.stores?.some(store => {
    const storeErrors = store.errors || [];
    const offerErrors = store.offer?.errors || [];
    const allStoreErrors = [...storeErrors, ...offerErrors];
    if (checkoutStep === 'idle' || checkoutStep === 'payment') { // Before payment, identity errors are blocking
      return allStoreErrors.some(err => err.code === 'INVALID_BUYER_IDENTITY_INFORMATION');
    }
    // For payment step, any error is blocking.
    return allStoreErrors.length > 0;
  });

  const isLoading = cartLoading || authLoading || isProcessing;

  return (
    <>
      <Navbar transparent />
      <main className="pt-24 min-h-screen bg-secondary_green text-gray-800">
        <div className="container mx-auto px-4 py-8">

          {(authLoading || (cartLoading && checkoutStep !== 'complete')) && (
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
              <StatusDisplay isLoading={isProcessing} error={error} />

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
                    disabled={isLoading || !canProceedInitially || hasBlockingCartErrors}
                    className={`bg-ggreen text-white inter-semi-bold px-6 py-3 rounded-full hover:shadow-lg transition-all duration-150 disabled:opacity-50 ${!canProceedInitially || hasBlockingCartErrors ? 'cursor-not-allowed' : ''}`}
                    title={
                      !cart ? 'Loading cart...'
                        : !cart.stores?.some((s) => s.cartLines?.length > 0) ? 'Cart is empty'
                          : !cart.cost?.subtotal?.value ? 'Calculating subtotal...'
                            : hasBlockingCartErrors ? 'Please resolve cart issues first'
                              : ''
                    }
                  >
                    {isLoading ? 'Loading...' : (cart?.cost?.total?.value == null ? 'Proceed (Calculating Total...)' : 'Proceed to Payment')}
                  </button>
                </div>
              )}

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
                  <RyePayForm
                    cartData={cart} // Pass the full cart object
                    onProcessing={setIsProcessing}
                    onSuccess={handleRyePaySuccess} // New handler for RyePay success
                    onError={handleOrderError}      // General error handler
                  // hideAmazonPrice={hideAmazonPrice} // Pass this if RyePayForm accepts it for submitCart
                  />
                  <div className="mt-4 text-center">
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
              {checkoutStep === 'payment' && cart && cart.cost?.total?.value == null && (
                <div className='mt-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-center'>
                  Cannot proceed to payment. Please review your cart or try again later.
                  <button
                    onClick={handleCancelCheckout}
                    className="ml-4 px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-md border border-yellow-400 shadow-sm"
                  >
                    Back to Cart
                  </button>
                </div>
              )}

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