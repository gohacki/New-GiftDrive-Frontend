// File: pages/visible/cart.js
import React, { useEffect, useState, useCallback, useContext } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { useSession } from 'next-auth/react';

import { CartContext } from '../../contexts/CartContext';
import Navbar from 'components/Navbars/AuthNavbar';
import Footer from 'components/Footers/Footer';

import CartDisplay from '../../components/Cards/CartDisplay';
import ShippingOptions from '../../components/checkout/ShippingOptions';
import RyePayForm from '../../components/checkout/RyePayForm';
import CheckoutResult from '../../components/checkout/CheckoutResult';
import StatusDisplay from '../../components/Cards/StatusDisplay';

// Component to display shipping address
const ShippingAddressDisplay = ({ address }) => {
  if (!address) return null;
  return (
    <fieldset className="border p-4 rounded-md shadow bg-gray-50 mt-6">
      <legend className="text-lg font-semibold px-2 text-gray-700">Shipping To</legend>
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
        {address.countryCode && <p>{address.countryCode.toUpperCase()}</p>}
        {address.email && <p>Attn: {address.email}</p>}
        {address.phone && <p>Tel: {address.phone}</p>}
        <p className="text-xs italic text-gray-500 pt-2">Items will be shipped directly to the organization.</p>
      </div>
    </fieldset>
  );
};

ShippingAddressDisplay.propTypes = {
  address: PropTypes.shape({
    firstName: PropTypes.string, lastName: PropTypes.string, address1: PropTypes.string,
    address2: PropTypes.string, city: PropTypes.string, provinceCode: PropTypes.string,
    postalCode: PropTypes.string, countryCode: PropTypes.string, email: PropTypes.string, phone: PropTypes.string,
  }),
};


const CartPage = () => {
  const { cart, setCart, removeFromCart, updateCartItemQuantity, loading: cartContextLoading, fetchCart } = useContext(CartContext);
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle, payment, complete
  const [isProcessingPageAction, setIsProcessingPageAction] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [checkoutResultData, setCheckoutResultData] = useState(null);
  const [hideAmazonPrice, setHideAmazonPrice] = useState(true); // Default to true for privacy

  const [guestInfo, setGuestInfo] = useState({ firstName: '', lastName: '', email: '' });
  const isGuestSession = authStatus === "unauthenticated" || (authStatus === "authenticated" && !user);


  useEffect(() => {
    setPageError(null); // Clear page-specific errors when cart or step changes
  }, [cart, checkoutStep]);



  useEffect(() => {
    // This effect now mainly serves to ensure cart is fetched if context didn't already.
    // Redirection logic for fully unauthenticated users without a cart is less aggressive,
    // relying more on UI guidance.
    if (authStatus !== "loading" && !cart && !cartContextLoading) {
      // If auth is resolved, cart isn't loading, and cart is null,
      // it implies no guest cart cookie or an empty/invalid one.
      // fetchCart will be called by CartContext usually, but can be an explicit call here if needed.
      // console.log("CartPage: Auth resolved, no cart and not loading, ensuring fetchCart runs.");
      // fetchCart(); // Could be redundant if CartContext's useEffect handles this well.
    }
  }, [authStatus, cart, cartContextLoading, fetchCart]);


  const handleGuestInfoChange = (e) => {
    setGuestInfo(prev => {
      const newState = { ...prev, [e.target.name]: e.target.value };
      return newState;
    });
    setPageError(null);
  };

  const handleStartCheckout = async () => {
    if (!cart) {
      setPageError("Your cart is empty or not available.");
      toast.error("Your cart is empty.");
      return;
    }
    if (isGuestSession) {
      if (!guestInfo.email.trim() || !guestInfo.firstName.trim() || !guestInfo.lastName.trim()) {
        setPageError("Please provide your name and email to proceed as a guest.");
        toast.error("Please provide your name and email.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email.trim())) {
        setPageError("Please enter a valid email address.");
        toast.error("Please enter a valid email address.");
        return;
      }
    }

    setPageError(null);
    setIsProcessingPageAction(true);
    setCheckoutResultData(null);

    try {
      console.log("[Start Checkout] Validating cart contents...");
      const validationResponse = await fetch(`/api/cart/validate-checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      });
      const validationData = await validationResponse.json();

      if (!validationResponse.ok || (validationData && !validationData.isValid)) {
        const errorMessage = validationData?.error || (validationData?.issues?.map(i => i.itemName ? `${i.itemName}: ${i.error}` : i.error).join('; ') || 'Cart validation failed.');
        console.error("[Start Checkout] Cart validation failed:", validationData);
        throw new Error(errorMessage);
      }
      console.log("[Start Checkout] Cart validated successfully.");

      console.log(`[Start Checkout] Triggering buyer identity update for cart: ${cart.id}`);
      const identityPayload = isGuestSession ? guestInfo : {
        email: user?.email,
        firstName: user?.name?.split(' ')[0] || "GiftDrive",
        lastName: user?.name?.split(' ').slice(1).join(' ') || "User",
      };

      const response = await fetch(`/api/cart/buyer-identity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id, buyerIdentity: identityPayload }),
        credentials: 'include',
      });
      const updatedCartDataFromAPI = await response.json();

      if (!response.ok) {
        throw new Error(updatedCartDataFromAPI.error || `Failed to set shipping address (${response.status})`);
      }
      setCart(updatedCartDataFromAPI);
      const costObject = updatedCartDataFromAPI.cost;
      const isCostReady = costObject?.total?.value != null || (costObject?.isEstimated === true && costObject?.subtotal?.value != null);


      if (isCostReady) {
        setCheckoutStep('payment');
      } else {
        setPageError("Could not calculate final shipping/tax. Please review your cart or try again. This may happen if the organization's address is incomplete.");
        setCheckoutStep('idle');
      }
    } catch (err) {
      console.error("Error during handleStartCheckout:", err);
      setPageError(err.message || "Failed to proceed to checkout.");
      toast.error(err.message || "Failed to proceed.");
      setCheckoutStep('idle');
    } finally {
      setIsProcessingPageAction(false);
    }
  };

  const handleOrderError = useCallback((errorMessage) => {
    setPageError(`Checkout Error: ${errorMessage}`);
    setCheckoutResultData({ error: `Checkout Error: ${errorMessage}` });
    setIsProcessingPageAction(false);
    toast.error(errorMessage || "There was an issue placing your order.");
    setCheckoutStep('payment'); // Stay on payment step for retry or user action
  }, []);

  const handleRyePaySuccess = useCallback(async (ryeSubmitCartResult) => {
    setIsProcessingPageAction(true);
    setPageError(null);
    try {
      if (!cart || !cart.id || !cart.cost?.total?.value) {
        throw new Error("Essential cart data missing for finalization.");
      }
      const successfulRyeOrders = ryeSubmitCartResult.cart.stores
        .filter(s => (s.status === 'COMPLETED' || s.status === 'SUBMITTED') && (s.orderId || s.requestId))
        .map(s => ({
          storeName: s.store?.store || 'UnknownStore',
          ryeOrderId: s.orderId || s.requestId // Use orderId if available, fallback to requestId
        }));

      if (successfulRyeOrders.length === 0) {
        let failureMessage = "Order submission did not result in any successful store orders from Rye.";
        const failedStore = ryeSubmitCartResult.cart.stores.find(s => (s.errors && s.errors.length > 0) || s.status === 'FAILED');
        if (failedStore) {
          const storeName = failedStore.store?.store || 'Unknown Store';
          const storeError = failedStore.errors?.[0]?.message || `Status: ${failedStore.status}`;
          failureMessage = `Order submission failed for store ${storeName}: ${storeError}`;
        }
        throw new Error(failureMessage);
      }

      const finalizationPayload = {
        ryeCartId: cart.id, // This is Rye's cart ID
        successfulRyeOrders: successfulRyeOrders,
        amountInCents: cart.cost.total.value,
        currency: cart.cost.total.currency,
      };
      if (isGuestSession) {
        finalizationPayload.guestFirstName = guestInfo.firstName;
        finalizationPayload.guestLastName = guestInfo.lastName;
        finalizationPayload.guestEmail = guestInfo.email;
      }

      const response = await fetch(`/api/orders/finalize-rye-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizationPayload),
        credentials: 'include',
      });
      const resultData = await response.json();
      if (!response.ok) {
        // If inventory issue from backend, resultData might contain specific item details
        if (response.status === 409 && resultData.itemId) {
          toast.error(`Order failed: Item "${resultData.itemName || 'ID: ' + resultData.itemId}" (Requested: ${resultData.requested}) exceeds available stock (${resultData.available}). Your cart has been updated.`);
          await fetchCart(); // Refresh cart to show updated availability/removals
          setCheckoutStep('idle'); // Revert to cart summary
          throw new Error(resultData.error); // Propagate for local error display
        }
        throw new Error(resultData.error || `Order finalization failed (${response.status})`);
      }
      setCheckoutResultData({
        message: resultData.message, dbOrderId: resultData.orderId, ryeOrderId: resultData.ryeOrderId
      });
      setCart(null); // Reset cart in context (local state)
      setCheckoutStep('complete');
      setPageError(null);
      toast.success(resultData.message || "Order placed successfully!");
    } catch (err) {
      console.error("Error in handleRyePaySuccess:", err);
      // If it's an inventory error from the catch block above
      if (err.message.includes("exceeds available stock")) {
        handleOrderError(err.message); // Show specific inventory error
        // setCheckoutStep('idle'); // Already set by the error handler
      } else {
        handleOrderError(`Payment may have succeeded, but order finalization failed: ${err.message}.`);
      }
    } finally {
      setIsProcessingPageAction(false);
    }
  }, [cart, setCart, handleOrderError, isGuestSession, guestInfo, fetchCart]); // Added fetchCart to dependencies

  const handleCancelCheckout = () => {
    setPageError(null);
    setCheckoutResultData(null);
    setCheckoutStep('idle');
    fetchCart(); // Refresh cart from server
  };

  const isLoadingPage = authStatus === "loading" || (cartContextLoading && checkoutStep !== 'complete' && !cart);


  const canInitiateCheckout = cart && cart.stores?.some(s => s.cartLines?.length > 0) && cart.cost?.subtotal?.value != null;

  const hasBlockingCartErrors = cart?.stores?.some(store => {
    const allStoreErrors = [...(store.errors || []), ...(store.offer?.errors || [])];
    const hasUnavailable = store.offer?.notAvailableIds?.length > 0;
    // During idle/identity, some errors (like missing buyer info) are expected and not blocking yet.
    // Unavailable items are always blocking.
    if (checkoutStep === 'idle') {
      return allStoreErrors.some(err => err.code !== 'INVALID_BUYER_IDENTITY_INFORMATION' && err.code !== 'SHIPPING_ADDRESS_INVALID') || hasUnavailable;
    }
    // By payment step, most errors are blocking.
    return allStoreErrors.length > 0 || hasUnavailable;
  });

  let idleButtonText = isGuestSession ? 'Proceed to Payment' : 'Enter Address & View Options';
  let idleButtonTitle = '';
  if (isProcessingPageAction || cartContextLoading) {
    idleButtonText = 'Loading...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.isEstimated === true) {
    idleButtonText = 'Proceed (Calculating Total...)';
    idleButtonTitle = 'Final costs are being calculated...';
  } else if (cart && cart.cost && cart.cost.total?.value == null && cart.cost.subtotal?.value != null && !cart.cost.isEstimated) {
    idleButtonText = 'Proceed (Calculating Shipping/Tax...)';
    idleButtonTitle = 'Enter address to calculate shipping and tax.';
  } else if (!canInitiateCheckout && cart) {
    idleButtonTitle = !cart.stores?.some(s => s.cartLines?.length > 0) ? 'Your cart is empty'
      : !cart.cost?.subtotal?.value ? 'Waiting for initial cart calculation...'
        : '';
  }

  if (isLoadingPage) {
    return (
      <>
        <Navbar transparent />
        <main className="pt-24 min-h-screen bg-secondary_green text-gray-800 flex justify-center items-center">
          <p className="text-lg text-gray-600">Loading Your Cart...</p>
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
          <h1 className="text-3xl font-semibold mb-6 text-ggreen">Your Shopping Cart</h1>
          <StatusDisplay isLoading={isProcessingPageAction && checkoutStep !== 'payment' && checkoutStep !== 'complete'} error={pageError} />

          {checkoutStep !== 'complete' && cart && (
            <CartDisplay
              cart={cart} checkoutStep={checkoutStep}
              onRemoveItem={removeFromCart} onUpdateItemQuantity={updateCartItemQuantity}
              isLoading={isProcessingPageAction || cartContextLoading}
            />
          )}
          {checkoutStep !== 'complete' && !cart && !cartContextLoading && (
            <div className="text-center py-10 bg-white shadow rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Your Cart is Empty</h2>
              <Link href="/visible/search" className="text-ggreen hover:underline font-medium">
                Discover drives and organizations to support
              </Link>
            </div>
          )}
          {isGuestSession && checkoutStep === 'idle' && (
            <fieldset className="border p-4 rounded-md shadow mt-6 bg-white">
              <legend className="text-lg font-semibold px-2 text-gray-700">Your Information (for Receipt & Billing)</legend>
              <div className="space-y-3 p-2">
                <div>
                  <label htmlFor="guestFirstName" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="firstName" id="guestFirstName" value={guestInfo.firstName} onChange={handleGuestInfoChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-ggreen focus:border-ggreen" />
                </div>
                <div>
                  <label htmlFor="guestLastName" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="lastName" id="guestLastName" value={guestInfo.lastName} onChange={handleGuestInfoChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-ggreen focus:border-ggreen" />
                </div>
                <div>
                  <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" name="email" id="guestEmail" value={guestInfo.email} onChange={handleGuestInfoChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-ggreen focus:border-ggreen" />
                </div>
                <p className="text-xs text-gray-500">This information is for your receipt and billing purposes. Items ship to the organization.</p>
              </div>
            </fieldset>
          )}

          {checkoutStep !== 'complete' && cart?.buyerIdentity && (
            <ShippingAddressDisplay address={cart.buyerIdentity} />
          )}
          {checkoutStep !== 'complete' && cart && (
            <div className="mt-6"><ShippingOptions stores={cart.stores} /></div>
          )}

          {checkoutStep === 'idle' && cart && canInitiateCheckout && (
            <div className="flex justify-end mt-8">
              <button
                onClick={handleStartCheckout}
                disabled={isProcessingPageAction || cartContextLoading || hasBlockingCartErrors || (isGuestSession && (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)))}
                className={`bg-ggreen text-white font-semibold px-8 py-3 rounded-full shadow-md hover:bg-teal-700 hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed`}
                title={idleButtonTitle || (hasBlockingCartErrors ? 'Please resolve cart issues (see above)' : (isGuestSession && (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email) ? 'Please enter your details' : ''))}
              >
                {isProcessingPageAction ? 'Processing...' : idleButtonText}
              </button>
            </div>
          )}

          {checkoutStep === 'payment' && cart && (
            <div className="mt-6">
              {cart.cost?.total?.value != null ? (
                <>
                  <div className="mb-4 p-3 border rounded bg-gray-50 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hideAmazonPrice} onChange={(e) => setHideAmazonPrice(e.target.checked)}
                        className="rounded border-gray-300 text-ggreen shadow-sm focus:ring-ggreen" />
                      <span>Hide price on packing slip (Amazon items only)?</span>
                    </label>
                  </div>
                  <RyePayForm
                    cartData={cart} onProcessing={setIsProcessingPageAction}
                    onSuccess={handleRyePaySuccess} onError={handleOrderError}
                  />
                </>
              ) : (
                <div className='mt-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded text-center'>
                  The final total is still calculating. The payment form will appear once ready.
                  If this persists, please ensure the recipient organization has a complete address on file, or try refreshing.
                </div>
              )}
              <div className="mt-6 text-center">
                <button onClick={handleCancelCheckout} disabled={isProcessingPageAction}
                  className="px-6 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md shadow-sm disabled:opacity-50">
                  Back to Cart Summary
                </button>
              </div>
            </div>
          )}

          {checkoutStep === 'complete' && checkoutResultData && (
            <div className="mt-10">
              <CheckoutResult result={checkoutResultData} />
              <div className="text-center mt-8 space-x-4">
                <Link href="/visible/orglist" className="px-6 py-3 bg-ggreen hover:bg-teal-600 text-white font-medium rounded-full shadow-md transition">
                  Discover More Drives
                </Link>
                {!isGuestSession && (
                  <Link href="/visible/profile" className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-full shadow-md transition">
                    View Your Orders
                  </Link>
                )}
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