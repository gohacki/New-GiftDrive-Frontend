// src/components/StripePaymentForm.jsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { formatCurrency } from '@/lib/utils';
import PropTypes from 'prop-types'; // Import PropTypes
const apiUrl = process.env.NEXT_PUBLIC_API_URL;


// Load Stripe outside of component render to improve performance.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const checkoutFormPropTypes = {
    cartData: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Cart ID
        cost: PropTypes.shape({
            total: PropTypes.shape({
                value: PropTypes.number, // Amount in cents/smallest unit
                currency: PropTypes.string, // e.g., 'USD'
            }),
            // Define subtotal, tax, shipping if needed by this specific component
        }),
        // Add other cartData properties if needed by CheckoutForm
    }).isRequired,
    clientSecret: PropTypes.string.isRequired,
    onProcessing: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
};

function CheckoutForm({ cartData, clientSecret, onProcessing, onSuccess, onError }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Use a ref to track whether the PaymentElement is ready.
    const isElementReady = useRef(false);
    const [internalReadyState, setInternalReadyState] = useState(false);

    // Handler to mark the PaymentElement as ready
    const handleReady = () => {
        console.log("CheckoutForm: PaymentElement is ready.");
        isElementReady.current = true;
        setInternalReadyState(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Enhanced Guard Checks:
        if (!stripe) {
            setMessage("Payment system (Stripe) not loaded. Please wait or refresh.");
            console.warn("handleSubmit blocked: !stripe");
            onError("Payment system (Stripe) not loaded.");
            return;
        }
        if (!elements) {
            setMessage("Payment form elements not loaded. Please wait or refresh.");
            console.warn("handleSubmit blocked: !elements");
            onError("Payment form elements not loaded.");
            return;
        }

        const paymentElement = elements.getElement(PaymentElement);
        if (!paymentElement) {
            setMessage("Payment form element is not available. Please wait or refresh.");
            console.warn("handleSubmit blocked: PaymentElement not found.");
            onError("Payment form element is not available.");
            return;
        }

        if (!isElementReady.current) {
            setMessage("Payment form is not ready yet. Please wait.");
            console.warn("handleSubmit blocked: PaymentElement not ready.");
            return;
        }

        setIsSubmitting(true);
        onProcessing(true);

        console.log(`Attempting stripe.confirmPayment with clientSecret: ${clientSecret}`);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements, // Use the Elements instance that already wraps PaymentElement
            confirmParams: {
                // You can add a return_url here if needed (for redirect flow).
            },
            redirect: 'if_required', // Handles result inline if no redirect is required.
        });

        setIsSubmitting(false);
        onProcessing(false);

        if (error) {
            console.error("Stripe confirmPayment error:", error);
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || "Please check your card details.");
            } else {
                setMessage("An unexpected payment error occurred. Please try again.");
            }
            onError(error.message || "Payment failed.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('Stripe Payment Intent Succeeded:', paymentIntent);
            setMessage("Payment successful! Placing your order...");
            onSuccess(paymentIntent.id);
        } else if (paymentIntent) {
            console.log('Stripe Payment Intent Status:', paymentIntent.status);
            setMessage(`Payment status: ${paymentIntent.status}. Please follow any instructions.`);
            onError(`Payment status: ${paymentIntent.status}`);
        } else {
            setMessage("Payment processing did not complete as expected.");
            onError("Payment processing did not complete as expected.");
        }
    };

    const totalAmount = cartData?.cost?.total;

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
            {totalAmount ? (
                <p className="text-xl font-bold mb-4 text-gray-800 text-center">
                    Total: {formatCurrency(totalAmount.value, totalAmount.currency)}
                </p>
            ) : (
                <p className="text-lg font-medium mb-4 text-gray-600 text-center italic">Calculating total...</p>
            )}

            <PaymentElement
                id="payment-element"
                options={{ layout: 'tabs' }}
                onReady={handleReady}
            />

            <button
                disabled={isSubmitting || !stripe || !elements || !internalReadyState}
                id="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
                <span id="button-text">
                    {isSubmitting ? 'Processing...' : `Pay ${formatCurrency(totalAmount?.value, totalAmount?.currency) || ''}`}
                </span>
            </button>

            {message && (
                <div id="payment-message" className={`text-center text-sm p-2 mt-2 rounded ${message.includes('successful') ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    {message}
                </div>
            )}
        </form>
    );
}

CheckoutForm.propTypes = checkoutFormPropTypes;

const stripePaymentFormPropTypes = {
    cartData: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Cart ID
        cost: PropTypes.shape({
            total: PropTypes.shape({
                value: PropTypes.number, // Amount in cents/smallest unit
                currency: PropTypes.string, // e.g., 'USD'
            }),
            // Define subtotal, tax, shipping if needed by StripePaymentForm
        }),
        // Add other cartData properties if needed by StripePaymentForm
    }).isRequired,
    onProcessing: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
};

export default function StripePaymentForm({ cartData, onProcessing, onSuccess, onError }) {
    const [clientSecret, setClientSecret] = useState('');
    const [loadingSecret, setLoadingSecret] = useState(true);
    const [errorSecret, setErrorSecret] = useState(null);

    // Extract stable dependency values from cartData.
    const cartId = cartData?.id;
    const totalValue = cartData?.cost?.total?.value;
    const currency = cartData?.cost?.total?.currency;

    useEffect(() => {
        // Guard: if a client secret is already available, do not re-fetch.
        if (clientSecret) return;

        setClientSecret('');
        setLoadingSecret(true);
        setErrorSecret(null);
        console.log("StripePaymentForm useEffect triggered. Dependencies:", { cartId, totalValue, currency });

        if (cartId && totalValue != null && currency) {
            if (totalValue <= 0) {
                const errMsg = "Cannot initialize payment: Cart total is zero or invalid.";
                setErrorSecret(errMsg);
                setLoadingSecret(false);
                onError(errMsg);
                return;
            }

            console.log(`StripePaymentForm: Fetching client secret for cart ${cartId}, Amount: ${totalValue} ${currency}`);

            // --- MODIFIED FETCH CALL ---
            fetch(`${apiUrl}/api/checkout/create-stripe-intent`, { // <-- Use apiUrl
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // cartId is not strictly needed by this specific backend endpoint,
                    // but amount and currency are. Sending cartId doesn't hurt.
                    cartId: cartId,
                    amount: totalValue,
                    currency: currency.toLowerCase()
                }),
                credentials: 'include', // <-- ADD THIS LINE (needed for isAuthenticated)
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const errorBody = await res.json().catch(() => ({ error: `HTTP error ${res.status}` }));
                        throw new Error(errorBody.error || `Failed to fetch payment secret (${res.status})`);
                    }
                    return res.json();
                })
                .then((data) => {
                    if (!data.clientSecret) throw new Error('Client secret not received from backend.');
                    console.log("StripePaymentForm: Client secret received.");
                    setClientSecret(data.clientSecret);
                })
                .catch((err) => {
                    console.error("StripePaymentForm: Error fetching client secret:", err);
                    const userMessage = `Failed to initialize payment system: ${err.message}`;
                    setErrorSecret(userMessage);
                    onError(userMessage);
                })
                .finally(() => {
                    setLoadingSecret(false);
                    console.log("StripePaymentForm: Finished fetching client secret.");
                });
        } else {
            let reason = "required cart data is missing";
            if (!cartId) reason = "Cart ID missing.";
            else if (totalValue == null) reason = "Cart total amount missing.";
            else if (!currency) reason = "Cart currency missing.";
            else if (totalValue <= 0) reason = "Cart total is zero or negative.";

            console.warn(`StripePaymentForm: Cannot fetch client secret - ${reason}.`, { cartData });
            setErrorSecret(`Cannot initialize payment: ${reason}.`);
            setLoadingSecret(false);
        }
    }, [cartId, totalValue, currency, onError, clientSecret]);

    const appearance = {
        theme: 'stripe',
    };

    const options = clientSecret ? {
        clientSecret,
        appearance,
    } : null;

    return (
        <fieldset className="border p-4 rounded-md shadow mt-4">
            <legend className="text-lg font-semibold px-2">4c. Payment Information</legend>
            {loadingSecret && (
                <div className="text-center py-4 text-gray-600 animate-pulse">
                    Initializing payment...
                </div>
            )}
            {!loadingSecret && errorSecret && (
                <div className="text-center py-4 text-red-600 font-medium">
                    {errorSecret}
                </div>
            )}
            {/* Render the Elements provider only when options are available */}
            {!loadingSecret && !errorSecret && options && (
                <Elements options={options} stripe={stripePromise}>
                    <CheckoutForm
                        cartData={cartData}
                        clientSecret={clientSecret}
                        onProcessing={onProcessing}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Elements>
            )}
            {!loadingSecret && !errorSecret && !options && totalValue != null && totalValue <= 0 && (
                <div className="text-center py-4 text-orange-600 font-medium">
                    Cannot proceed with payment: Cart total is not positive.
                </div>
            )}
        </fieldset>
    );
}

StripePaymentForm.propTypes = stripePaymentFormPropTypes;