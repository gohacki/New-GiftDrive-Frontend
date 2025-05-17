// File: pages/visible/cart.js
import React, { useEffect, useState, useCallback, useContext } from 'react'; // Removed useContext
import Link from 'next/link';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { useSession } from 'next-auth/react'; // ADD THIS LINE
import { useRouter } from 'next/router'; // ADD THIS LINE

import { CartContext } from '../../contexts/CartContext'; // CartContext is still used
// import { AuthContext } from '../../contexts/AuthContext'; // REMOVE THIS LINE
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';

// --- Import Checkout Components ---
import CartDisplay from '../../components/Cards/CartDisplay';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import RyePayForm from '../../components/checkout/RyePayForm';
import CheckoutResult from '../../components/checkout/CheckoutResult';
import StatusDisplay from '../../components/Cards/StatusDisplay';

// const apiUrl = process.env.NEXT_PUBLIC_API_URL; // REMOVE or only use for external APIs

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
  const { data: session, status: authStatus } = useSession(); // USE useSession hook
  const user = session?.user; // User object from NextAuth session
  const router = useRouter(); // Initialize useRouter

  const [checkoutStep, setCheckoutStep] = useState('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutResultData, setCheckoutResultData] = useState(null);
  const [hideAmazonPrice, setHideAmazonPrice] = useState(true);

  useEffect(() => {
    setError(null);
  }, [cart, checkoutStep]);

  useEffect(() => {
    // If user is not authenticated and not loading, redirect to login
    if (authStatus === "unauthenticated") {
      console.log("Cart page: User not authenticated, redirecting to login.");
      router.push('/auth/login');
    }
    // If user is authenticated, fetchCart will be called by CartContext
  }, [authStatus, router]);


  const handleStartCheckout = async () => {
    if (!cart || !user) {
      setError("Cannot proceed: Cart or user not available.");
      toast.error("Please log in to proceed.");
      if (!user) router.push('/auth/login');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setCheckoutResultData(null);

    try {
      console.log("[Start Checkout] Validating cart contents before payment...");
      const validationResponse = await fetch(`/api/cart/validate-checkout`, { // Relative path
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!validationResponse.ok) {
        const validationError = await validationResponse.json().catch(() => ({ error: 'Failed to validate cart.' }));
        const errorMessage = validationError?.error || (validationError?.issues ? validationError.issues.map(i => i.error).join('; ') : 'Cart validation failed.');
        console.error("[Start Checkout] Cart validation failed (HTTP):", validationError);
        setError(errorMessage);
        setIsProcessing(false);
        return;
      }

      const validationResult = await validationResponse.json();
      if (!validationResult.isValid) {
        console.error("[Start Checkout] Cart validation failed (Data):", validationResult.issues);
        const errorMessages = validationResult.issues.map(issue => issue.itemName ? `${issue.itemName}: ${issue.error}` : issue.error);
        const combinedErrorMessage = `Cart issues: ${errorMessages.join('; ')}`;
        setError(combinedErrorMessage);
        setIsProcessing(false);
        return;
      }
      console.log("[Start Checkout] Cart validated successfully.");

      console.log(`[Start Checkout] Triggering buyer identity update for cart: ${cart.id}`);
      const identityToSend = cart.buyerIdentity || {
        firstName: user.name?.split(' ')[0] || 'Donor', // Use user.name from NextAuth
        lastName: user.name?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        phone: user.phone || null, // user.phone might not be in session, backend uses org phone
        // Other fields are placeholders for API structure, backend overrides with org address
      };

      const response = await fetch(`/api/cart/buyer-identity`, { // Relative path
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id, buyerIdentity: identityToSend }),
        credentials: 'include',
      });
      const updatedCartDataFromAPI = await response.json();

      if (!response.ok) {
        const errorMsg = updatedCartDataFromAPI.error || `Failed to update shipping address (${response.status})`;
        throw new Error(errorMsg);
      }
      setCart(updatedCartDataFromAPI);
      const costObject = updatedCartDataFromAPI.cost;
      const isCostReady = costObject?.total?.value != null || costObject?.isEstimated === true;

      if (isCostReady) {
        setCheckoutStep('payment');
      } else {
        setError("Could not calculate final shipping/tax. Please review your cart or try again.");
        setCheckoutStep('idle');
      }
    } catch (err) {
      console.error("Error during handleStartCheckout:", err);
      setError(err.message || "Failed to proceed to checkout.");
      setCheckoutStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleOrderError = useCallback((errorMessage) => {
    setError(`Checkout Error: ${errorMessage}`);
    setCheckoutResultData({ error: `Checkout Error: ${errorMessage}` });
    setIsProcessing(false);
    toast.error(errorMessage || "There was an issue placing your order.");
  }, []); // Removed dependencies as they are component-level states or not changing

  const handleRyePaySuccess = useCallback(async (ryeSubmitCartResult) => {
    setIsProcessing(true);
    setError(null);
    try {
      if (!cart || !cart.id || !cart.cost?.total?.value) {
        throw new Error("Essential cart data missing for finalization.");
      }
      // ... (rest of successfulRyeOrders logic remains the same)
      const successfulRyeOrders = ryeSubmitCartResult.cart.stores
        .filter(s => s.status === 'COMPLETED' || s.status === 'SUBMITTED')
        .map(s => ({
          storeName: s.store?.store || 'UnknownStore',
          ryeOrderId: s.orderId || s.requestId
        }))
        .filter(s => s.ryeOrderId);
      if (successfulRyeOrders.length === 0) {
        // ... (error handling for no successful store orders remains same)
        let failureMessage = "Order submission did not result in any successful store orders.";
        const failedStore = ryeSubmitCartResult.cart.stores.find(s => (s.errors && s.errors.length > 0) || s.status === 'FAILED');
        if (failedStore) {
          const storeName = failedStore.store?.store || 'Unknown Store';
          const storeError = failedStore.errors?.[0]?.message || `Status: ${failedStore.status}`;
          failureMessage = `Order submission failed for store ${storeName}: ${storeError}`;
        }
        throw new Error(failureMessage);
      }

      const response = await fetch(`/api/orders/finalize-rye-order`, { // Relative path
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
      setCart(null); // Reset cart in context
      setCheckoutStep('complete');
      setError(null);
      toast.success(resultData.message || "Order placed successfully!");
    } catch (err) {
      console.error("Error in handleRyePaySuccess:", err);
      handleOrderError(`Payment may have succeeded, but order finalization failed: ${err.message}. Please contact support.`);
    } finally {
      setIsProcessing(false);
    }
  }, [cart, setCart, handleOrderError]); // Dependencies for useCallback

  const handleCancelCheckout = () => {
    setError(null);
    setCheckoutResultData(null);
    setCheckoutStep('idle');
    fetchCart(); // Refetch cart from CartContext
  };

  const isLoadingGlobal = cartLoading || authStatus === "loading" || isProcessing;

  const canInitiateCheckout = cart &&
    cart.stores?.some(s => s.cartLines?.length > 0) &&
    cart.cost?.subtotal?.value != null;

  const hasBlockingCartErrors = cart?.stores?.some(store => {
    // ... (hasBlockingCartErrors logic remains the same) ...
    const storeErrors = store.errors || [];
    const offerErrors = store.offer?.errors || [];
    const allStoreErrors = [...storeErrors, ...offerErrors];
    if (checkoutStep === 'idle') {
      return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION' && err.code !== 'SHIPPING_ADDRESS_INVALID' && store.offer?.notAvailableIds?.length > 0);
    }
    if (checkoutStep === 'payment') {
      return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION' && err.code !== 'SHIPPING_ADDRESS_INVALID');
    }
    return false;
  });

  let idleButtonText = 'Enter Address & View Options';
  let idleButtonTitle = '';
  // ... (idleButtonText logic remains the same) ...
  if (isLoadingGlobal) {
    idleButtonText = 'Loading...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.isEstimated === true) {
    idleButtonText = 'Proceed (Calculating Total...)';
    idleButtonTitle = 'Final costs are being calculated...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.subtotal?.value != null && !cart.cost.isEstimated) {
    idleButtonText = 'Proceed (Calculating Shipping/Tax...)';
    idleButtonTitle = 'Enter address to calculate shipping and tax.';
  } else if (!canInitiateCheckout && cart) {
    idleButtonTitle = !cart.stores?.some(s => s.cartLines?.length > 0) ? 'Cart is empty'
      : !cart.cost?.subtotal?.value ? 'Waiting for initial cart calculation...'
        : '';
  }

  // Loading state for the entire page if auth or initial cart is loading
  if (authStatus === "loading" || (cartLoading && !cart && checkoutStep !== 'complete')) {
    return (
      <>
        <Navbar transparent />
        <main className="pt-24 min-h-screen bg-secondary_green text-gray-800 flex justify-center items-center">
          <p>Loading Cart Page...</p>
        </main>
        <Footer />
      </>
    );
  }

  // User not authenticated (after loading state) - handled by useEffect redirect
  if (authStatus === "unauthenticated") {
    return (
      <>
        <Navbar transparent />
        <main className="pt-24 min-h-screen bg-secondary_green text-gray-800 flex justify-center items-center">
          <p>Redirecting to login...</p> {/* Or a more user-friendly message */}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar transparent />
      <main className="pt-24 min-h-screen bg-secondary_green text-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* StatusDisplay for processing and errors - This is good */}
          <StatusDisplay isLoading={isProcessing && checkoutStep !== 'payment'} error={error} />

          {/* Cart Display or Empty Cart Message */}
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

          {/* Shipping Address Display */}
          {checkoutStep !== 'complete' && cart?.buyerIdentity && (
            <ShippingAddressDisplay address={cart.buyerIdentity} />
          )}

          {/* Shipping Options */}
          {checkoutStep !== 'complete' && cart && (
            <div className="mt-6">
              <ShippingOptions stores={cart.stores} />
            </div>
          )}

          {/* Checkout Step: Idle */}
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

          {/* Checkout Step: Payment */}
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
                    cartData={cart} // Pass the cart object from CartContext
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

          {/* Checkout Step: Complete */}
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

        </div>
      </main>
      <Footer />
    </>
  );
};

export default CartPage;