// src/components/checkout/RyePayForm.jsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RyePay } from '@rye-api/rye-pay'; // Ensure this path is correct
import { formatCurrency } from '../../lib/utils'; // Adjust path if needed

const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Ensure apiUrl is defined

export default function RyePayForm({ cartData, onProcessing, onSuccess, onError }) {
    const [message, setMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRyePayReady, setIsRyePayReady] = useState(false);
    const ryePayInstanceRef = useRef(null);
    const formRef = useRef(null);
    const targetCartIdRef = useRef(null); // Tracks the cart ID this component *intends* to be for
    const instanceCartIdRef = useRef(null); // Tracks the cart ID an instance was *actually* initialized with

    // --- Refs for callback props from parent ---
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onProcessingRef = useRef(onProcessing);

    // Update refs if callback props change (this pattern makes them stable for the main useEffect)
    useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => { onProcessingRef.current = onProcessing; }, [onProcessing]);

    // --- Billing Details State ---
    const sanitizeInitialData = (data = {}) => {
        const sanitized = { ...data };
        sanitized.phone = sanitized.phone ?? '';
        sanitized.address2 = sanitized.address2 ?? '';
        return sanitized;
    };

    const [billingDetails, setBillingDetails] = useState(() => {
        const initialShipping = cartData?.buyerIdentity ? {
            first_name: cartData.buyerIdentity.firstName,
            last_name: cartData.buyerIdentity.lastName,
            phone: cartData.buyerIdentity.phone,
            address1: cartData.buyerIdentity.address1,
            address2: cartData.buyerIdentity.address2,
            city: cartData.buyerIdentity.city,
            state: cartData.buyerIdentity.provinceCode,
            zip: cartData.buyerIdentity.postalCode,
            country: cartData.buyerIdentity.countryCode?.toUpperCase() || 'US',
        } : {};

        return {
            first_name: '',
            last_name: '',
            phone: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            zip: '',
            country: 'US',
            month: '',
            year: '',
            ...sanitizeInitialData(initialShipping),
        };
    });

    const handleBillingChange = (e) => {
        setBillingDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    useEffect(() => {
        if (cartData?.buyerIdentity) {
            const sanitizedShipping = sanitizeInitialData({
                first_name: cartData.buyerIdentity.firstName,
                last_name: cartData.buyerIdentity.lastName,
                phone: cartData.buyerIdentity.phone,
                address1: cartData.buyerIdentity.address1,
                address2: cartData.buyerIdentity.address2,
                city: cartData.buyerIdentity.city,
                state: cartData.buyerIdentity.provinceCode,
                zip: cartData.buyerIdentity.postalCode,
                country: cartData.buyerIdentity.countryCode?.toUpperCase() || 'US',
            });
            setBillingDetails(prev => ({
                ...prev,
                first_name: sanitizedShipping.first_name || prev.first_name,
                last_name: sanitizedShipping.last_name || prev.last_name,
                phone: sanitizedShipping.phone || prev.phone,
                address1: sanitizedShipping.address1 || prev.address1,
                address2: sanitizedShipping.address2 || prev.address2,
                city: sanitizedShipping.city || prev.city,
                state: sanitizedShipping.state || prev.state,
                zip: sanitizedShipping.zip || prev.zip,
                country: sanitizedShipping.country || prev.country,
            }));
        }
    }, [cartData?.buyerIdentity]);

    // --- Memoized generateJWT function ---
    const generateJWTCallback = useCallback(async (mountedRef, componentCartId) => {
        if (!mountedRef.current) {
            console.warn("RyePayForm: generateJWT called after component unmount. Aborting fetch.");
            throw new Error("Component unmounted");
        }
        console.log(`RyePayForm: generateJWT callback invoked for cart: ${componentCartId}`);
        try {
            const response = await fetch(`${apiUrl}/api/rye/generate-jwt`, { method: 'POST' });
            if (!response.ok) {
                let errorBody;
                try { errorBody = await response.json(); } catch { errorBody = { error: `JWT fetch failed: ${response.status}` }; }
                console.error("RyePayForm: JWT fetch failed!", response.status, errorBody);
                throw new Error(errorBody?.error || 'Failed to generate JWT.');
            }
            const data = await response.json();
            if (!data || typeof data.token !== 'string' || data.token.length === 0) {
                console.error("RyePayForm: Invalid JWT response structure:", data);
                throw new Error('Invalid or missing JWT token in response from backend.');
            }
            console.log(`RyePayForm: JWT successfully generated and fetched for cart: ${componentCartId}. Token: ${data.token.substring(0, 10)}...`);
            return data.token;
        } catch (jwtError) {
            console.error("RyePayForm: Error during JWT fetch:", jwtError);
            throw jwtError;
        }
    }, []); // apiUrl is module-scoped, so it's stable

    // --- Initialization and Cleanup Effect ---
    useEffect(() => {
        const effectCartId = cartData?.id;
        targetCartIdRef.current = effectCartId; // Update the target cart ID for this effect run
        const isMountedRef = { current: true };

        console.log(`RyePayForm Effect START for cart: ${effectCartId}. Current Instance Cart: ${instanceCartIdRef.current}, isRyePayReady: ${isRyePayReady}`);

        const cleanupInstance = () => {
            isMountedRef.current = false; // Mark as unmounted for async operations
            const currentInstance = ryePayInstanceRef.current;
            const currentInstanceCartActual = instanceCartIdRef.current; // The cart this instance was for

            console.log(`RyePayForm Cleanup for effect (triggered by cart: ${effectCartId}). Instance exists? ${!!currentInstance}. Instance was for cart: ${currentInstanceCartActual}. Current target cart: ${targetCartIdRef.current}`);

            // Only clean up if the instance exists AND it was initialized for the cart ID this effect run is targeting
            if (currentInstance && currentInstanceCartActual === effectCartId) {
                console.log(`RyePayForm Cleanup: Actively cleaning up instance and DOM for cart ${effectCartId}.`);
                try {
                    const numberEl = document.getElementById('rye-card-number');
                    const cvvEl = document.getElementById('rye-cvv');
                    if (numberEl) numberEl.innerHTML = '';
                    if (cvvEl) cvvEl.innerHTML = '';
                    console.log(`RyePayForm Cleanup: Manually cleared iframe host elements for cart ${effectCartId}.`);
                } catch (domError) {
                    console.error(`Error during manual DOM cleanup for cart ${effectCartId}:`, domError);
                }
                ryePayInstanceRef.current = null;
                instanceCartIdRef.current = null;
                setIsRyePayReady(false);
                console.log(`RyePayForm Cleanup: Instance for ${effectCartId} destroyed. isRyePayReady set to false.`);
            } else {
                console.log(`RyePayForm Cleanup: No active DOM/instance cleanup needed for cart ${effectCartId} (Instance not for this cart or no instance).`);
            }
            console.log(`RyePayForm Cleanup END for effect cart ${effectCartId}.`);
        };

        const initRyePay = async () => {
            if (!effectCartId) {
                console.log("RyePayForm Init: No cart ID. Ensuring cleanup of any existing instance.");
                if (ryePayInstanceRef.current) cleanupInstance(); // Full cleanup if no cart ID
                return;
            }

            // If an instance exists for the *same cart ID* and is *already ready*, skip re-init.
            if (ryePayInstanceRef.current && instanceCartIdRef.current === effectCartId && isRyePayReady) {
                console.log(`RyePayForm Init: Instance ALREADY READY for cart ${effectCartId}. Skipping init.`);
                onProcessingRef.current(false);
                setMessage(null);
                return;
            }

            // If an instance exists but is for a DIFFERENT cart, clean it up.
            // This is important if cartData.id changes.
            if (ryePayInstanceRef.current && instanceCartIdRef.current !== effectCartId) {
                console.log(`RyePayForm Init: Cleaning up OLD instance (for cart ${instanceCartIdRef.current}) before initializing for new cart ${effectCartId}.`);
                // Simulate a targeted cleanup for the old instance's cart ID
                // This is a bit manual but ensures the old one is properly cleaned.
                const oldCartIdToClean = instanceCartIdRef.current;
                try {
                    const numberEl = document.getElementById('rye-card-number');
                    const cvvEl = document.getElementById('rye-cvv');
                    if (numberEl) numberEl.innerHTML = '';
                    if (cvvEl) cvvEl.innerHTML = '';
                    console.log(`RyePayForm Init: Manually cleared iframes for OLD cart ${oldCartIdToClean}.`);
                } catch (domError) { console.error(`Error clearing DOM for OLD cart ${oldCartIdToClean}:`, domError); }
                ryePayInstanceRef.current = null;
                instanceCartIdRef.current = null;
                setIsRyePayReady(false); // Since we are about to init a new one
                console.log(`RyePayForm Init: Old instance for ${oldCartIdToClean} cleared.`);
            }


            console.log(`RyePayForm Init: Proceeding with initialization for cart ${effectCartId}`);
            const newInstance = new RyePay();
            ryePayInstanceRef.current = newInstance;
            // instanceCartIdRef.current will be set in onReady for this new instance

            setIsRyePayReady(false); // Explicitly set to false before new init
            setMessage("Initializing payment fields...");
            onProcessingRef.current(true);

            const ryeEnvironment = process.env.NEXT_PUBLIC_RYE_ENVIRONMENT || 'stage';
            console.log(`RyePayForm Init: Calling ryePayInstance.init for cart ${effectCartId}, env: ${ryeEnvironment}`);

            try {
                await newInstance.init({
                    generateJWT: () => generateJWTCallback(isMountedRef, effectCartId),
                    numberEl: 'rye-card-number',
                    cvvEl: 'rye-cvv',
                    environment: ryeEnvironment,
                    onReady: () => {
                        // Critical: Check if this onReady is for the current target cart
                        if (!isMountedRef.current || targetCartIdRef.current !== effectCartId) {
                            console.warn(`RyePayForm: onReady triggered for outdated/unmounted instance. Expected: ${effectCartId}, Current Target: ${targetCartIdRef.current}. Ignoring.`);
                            // If it's for an old instance, don't update state for the new one.
                            return;
                        }
                        console.log(`RyePayForm: onReady callback successfully executed for cart ${effectCartId}.`);
                        try {
                            const baseStyle = 'border: 1px solid #cbd5e1; padding: 0.5rem; border-radius: 0.375rem; height: 40px; box-sizing: border-box; width: 100%;';
                            newInstance.setStyle('number', baseStyle);
                            newInstance.setStyle('cvv', baseStyle);
                        } catch (styleError) {
                            console.error("RyePayForm: Error applying styles:", styleError);
                        }

                        instanceCartIdRef.current = effectCartId; // Mark this instance as initialized for this cart
                        setIsRyePayReady(true);
                        setMessage(null);
                        onProcessingRef.current(false);
                        console.log(`RyePayForm: RyePay is fully ready for cart ${effectCartId}.`);
                    },
                    onErrors: (errors) => {
                        if (!isMountedRef.current || targetCartIdRef.current !== effectCartId) return;
                        console.error("RyePayForm: Spreedly iframe validation errors:", errors);
                        const errorMsg = errors.map(e => `${e.attribute || 'Field'}: ${e.message}`).join('; ');
                        setMessage(`Card validation error: ${errorMsg}`);
                        onErrorRef.current(`Card validation error: ${errorMsg}`);
                        setIsSubmitting(false);
                        onProcessingRef.current(false);
                    },
                    onIFrameError: (err) => {
                        if (!isMountedRef.current || targetCartIdRef.current !== effectCartId) return;
                        console.error("RyePayForm: IFrame loading/communication error:", err);
                        const errorText = `Payment field error: ${err.message || 'Failed to load.'}. Refresh might be needed.`;
                        setMessage(errorText);
                        onErrorRef.current(errorText);
                        setIsRyePayReady(false);
                        onProcessingRef.current(false);
                        ryePayInstanceRef.current = null; // Critical error, allow re-init
                        instanceCartIdRef.current = null;
                    },
                    onCartSubmitted: (result, submitErrors, paymentType) => {
                        if (!isMountedRef.current || targetCartIdRef.current !== effectCartId) {
                            console.warn(`RyePayForm: onCartSubmitted ignored for cart ${effectCartId}. Mismatched target cart ID (${targetCartIdRef.current}) or unmounted.`); return;
                        }
                        setIsSubmitting(false);
                        onProcessingRef.current(false);
                        console.log(`RyePayForm: onCartSubmitted for cart ${effectCartId} - PaymentType: ${paymentType}`);

                        if (submitErrors && submitErrors.length > 0) {
                            const errorMsg = `Order submission failed: ${submitErrors[0].message || JSON.stringify(submitErrors)}`;
                            setMessage(errorMsg);
                            onErrorRef.current(errorMsg);
                        } else if (result?.errors?.length) {
                            const ryeError = result.errors[0];
                            const errorMsg = `Order submission issue: ${ryeError.message} (${ryeError.code})`;
                            setMessage(errorMsg);
                            onErrorRef.current(errorMsg);
                        } else if (result?.cart?.stores?.some(s => s.errors?.length > 0 || s.status === 'FAILED')) {
                            const firstStoreErrorContainer = result.cart.stores.find(s => s.errors?.length > 0 || s.status === 'FAILED');
                            const errorDetail = firstStoreErrorContainer?.errors?.[0] || { message: `Store ${firstStoreErrorContainer?.store?.store || ''} status: ${firstStoreErrorContainer?.status}` };
                            const errorMsg = `Partial order failure: ${errorDetail.message}. Check order history.`;
                            setMessage(errorMsg);
                            onErrorRef.current(errorMsg);
                        } else if (result?.cart?.id && result.cart.stores?.every(s => s.status === 'COMPLETED' || s.status === 'SUBMITTED' || !s.status)) {
                            setMessage("Payment successful! Finalizing your order...");
                            onSuccessRef.current(result);
                        } else {
                            let specificErrorMsg = "Order submission did not complete as expected.";
                            const failedStore = result?.cart?.stores?.find(s => s.status === 'FAILED');
                            if (failedStore) specificErrorMsg = `Order failed for store ${failedStore.store?.store}. Status: ${failedStore.status}`;
                            else if (result?.cart?.stores) specificErrorMsg = `Unexpected store statuses: ${result.cart.stores.map(s => s.status || 'UNKNOWN').join(', ')}`;
                            console.error("RyePayForm: Unhandled onCartSubmitted scenario", result);
                            setMessage(specificErrorMsg + " Please check order history or contact support.");
                            onErrorRef.current(specificErrorMsg);
                        }
                    },
                    enableLogging: process.env.NODE_ENV === 'development',
                });
            } catch (initError) {
                if (!isMountedRef.current || targetCartIdRef.current !== effectCartId) return;
                console.error(`RyePayForm Init Error for cart ${effectCartId}:`, initError);
                if (targetCartIdRef.current === effectCartId) { // Only update state if this error is for the current target
                    const errorText = `Payment system setup failed: ${initError.message}. Please refresh.`;
                    setMessage(errorText);
                    onErrorRef.current(errorText);
                    setIsRyePayReady(false);
                    onProcessingRef.current(false);
                    ryePayInstanceRef.current = null;
                    instanceCartIdRef.current = null;
                } else {
                    console.warn(`RyePayForm Init Error caught for an outdated cart init (${effectCartId}). Current target cart: ${targetCartIdRef.current}. Ignoring state updates.`);
                }
            }
        };

        initRyePay();

        return cleanupInstance; // Return the cleanup function
    }, [cartData?.id, generateJWTCallback]); // Only re-run if cartId or generateJWT changes


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        const activeCartId = cartData?.id;
        const currentInstance = ryePayInstanceRef.current;
        const currentInstanceCart = instanceCartIdRef.current;

        // --- Submission Guards ---
        if (!activeCartId) {
            setMessage("Error: No active cart to submit.");
            onErrorRef.current("Submit failed: No active cart."); // Use ref
            return;
        }
        if (!currentInstance || !isRyePayReady || currentInstanceCart !== activeCartId) {
            console.warn(`Submit prevented: Instance Ready: ${isRyePayReady}, Instance Exists: ${!!currentInstance}, Instance Cart: ${currentInstanceCart}, Active Cart: ${activeCartId}`);
            setMessage("Payment system is not ready or is for a different cart. Please wait.");
            onErrorRef.current("Payment system not ready or mismatched for submission."); // Use ref
            return;
        }

        // --- Billing Details Client-Side Validation ---
        const requiredBillingFields = ['first_name', 'last_name', 'month', 'year', 'address1', 'city', 'state', 'zip', 'country', 'phone'];
        for (const field of requiredBillingFields) {
            const value = billingDetails[field];
            if (value == null || String(value).trim() === '') {
                const friendlyFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                setMessage(`Billing field '${friendlyFieldName}' is required.`);
                onProcessingRef.current(false); // Use ref
                return;
            }
        }
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(billingDetails.phone.trim())) {
            setMessage("Billing Phone must be in international E.164 format (e.g., +14155552671).");
            onProcessingRef.current(false); // Use ref
            return;
        }
        const currentYearFull = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const expiryYearFull = parseInt(billingDetails.year, 10);
        const expiryMonth = parseInt(billingDetails.month, 10);
        if (!/^\d{2}$/.test(billingDetails.month) || !/^\d{4}$/.test(billingDetails.year) || expiryMonth < 1 || expiryMonth > 12) {
            setMessage("Invalid expiry month (MM) or year (YYYY).");
            onProcessingRef.current(false); // Use ref
            return;
        }
        if (expiryYearFull < currentYearFull || (expiryYearFull === currentYearFull && expiryMonth < currentMonth)) {
            setMessage("Card has expired.");
            onProcessingRef.current(false); // Use ref
            return;
        }
        // --- End Validations ---

        setIsSubmitting(true);
        onProcessingRef.current(true); // Use ref

        // --- Shipping Options Derivation & Check ---
        let derivedShippingOptions = []; // Use this variable name
        let shippingSelectionError = null;

        if (!cartData?.stores || cartData.stores.length === 0) {
            shippingSelectionError = "No stores found in cart.";
        } else {
            for (const store of cartData.stores) {
                let shippingIdToUse = store.offer?.selectedShippingMethod?.id;

                if (!shippingIdToUse && store.offer?.shippingMethods?.length > 0) {
                    shippingIdToUse = store.offer.shippingMethods[0].id;
                    console.log(`RyePayForm: Auto-selecting first shipping method '${shippingIdToUse}' for store '${store.store}'`);
                }

                if (shippingIdToUse) {
                    derivedShippingOptions.push({ // Populate derivedShippingOptions
                        store: store.store,
                        shippingId: shippingIdToUse,
                    });
                } else {
                    shippingSelectionError = `No shipping method available or selectable for store: ${store.store}.`;
                    break;
                }
            }
        }

        if (shippingSelectionError || derivedShippingOptions.length !== cartData.stores.length) {
            const finalErrorMessage = shippingSelectionError || "Shipping selection is incomplete or missing for one or more stores.";
            setMessage(finalErrorMessage + " Please go back or refresh.");
            setIsSubmitting(false);
            onProcessingRef.current(false); // Use ref
            onErrorRef.current(finalErrorMessage); // Use ref
            return;
        }
        // --- End Shipping Options ---

        console.log(`RyePayForm: Calling ryePayInstance.submit for cart: ${activeCartId} with shipping:`, derivedShippingOptions);
        try {
            currentInstance.submit({
                cartId: activeCartId,
                selectedShippingOptions: derivedShippingOptions, // ***** CORRECTED VARIABLE NAME HERE *****
                first_name: billingDetails.first_name.trim(),
                last_name: billingDetails.last_name.trim(),
                phone_number: billingDetails.phone.trim(),
                month: billingDetails.month,
                year: billingDetails.year,
                address1: billingDetails.address1.trim(),
                address2: billingDetails.address2?.trim() || '',
                city: billingDetails.city.trim(),
                state: billingDetails.state.trim(),
                zip: billingDetails.zip.trim(),
                country: billingDetails.country,
            });
            // Result handled by onCartSubmitted callback
        } catch (submitError) {
            console.error("RyePayForm: Error calling ryePay.submit:", submitError);
            setMessage(`Error submitting payment: ${submitError.message}`);
            onErrorRef.current(`Error submitting payment: ${submitError.message}`); // Use ref
            setIsSubmitting(false);
            onProcessingRef.current(false); // Use ref
        }
    };

    const totalAmount = cartData?.cost?.total;
    const showLoadingMessage = !isRyePayReady && message === "Initializing payment fields...";

    return (
        <fieldset className="border p-4 rounded-md shadow mt-4 bg-white">
            <legend className="text-lg font-semibold px-2 text-gray-700">5. Payment Information (Rye Pay)</legend>
            <form id="rye-payment-form" onSubmit={handleSubmit} ref={formRef} className="space-y-4">

                {totalAmount ? (
                    <p className="text-xl font-bold mb-4 text-gray-800 text-center">
                        Total: {formatCurrency(totalAmount.value, totalAmount.currency)}
                    </p>
                ) : (
                    <p className="text-lg font-medium mb-4 text-gray-600 text-center italic">
                        {cartData?.buyerIdentity ? 'Calculating total...' : 'Total requires shipping address'}
                    </p>
                )}

                <div>
                    <label htmlFor="rye-card-number" className="block text-sm font-medium text-gray-700">Card Number <span className="text-red-500">*</span></label>
                    <div id="rye-card-number" className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm min-h-[40px] p-0 bg-gray-50"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="billing-month" className="block text-sm font-medium text-gray-700">Expiry Month <span className="text-red-500">*</span></label>
                        <input type="text" name="month" id="billing-month" value={billingDetails.month} onChange={handleBillingChange} placeholder="MM" maxLength="2" pattern="\d{2}" title="Enter month as MM" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-[40px]" />
                    </div>
                    <div>
                        <label htmlFor="billing-year" className="block text-sm font-medium text-gray-700">Expiry Year <span className="text-red-500">*</span></label>
                        <input type="text" name="year" id="billing-year" value={billingDetails.year} onChange={handleBillingChange} placeholder="YYYY" maxLength="4" pattern="\d{4}" title="Enter year as YYYY" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-[40px]" />
                    </div>
                    <div>
                        <label htmlFor="rye-cvv" className="block text-sm font-medium text-gray-700">CVV <span className="text-red-500">*</span></label>
                        <div id="rye-cvv" className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm min-h-[40px] p-0 bg-gray-50"></div>
                    </div>
                </div>

                <h4 className="text-md font-semibold pt-3 border-t text-gray-700">Billing Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="billing-first_name" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                        <input type="text" name="first_name" id="billing-first_name" value={billingDetails.first_name} onChange={handleBillingChange} required autoComplete="billing given-name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="billing-last_name" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                        <input type="text" name="last_name" id="billing-last_name" value={billingDetails.last_name} onChange={handleBillingChange} required autoComplete="billing family-name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                </div>
                <div>
                    <label htmlFor="billing-phone" className="block text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                    <input type="tel" name="phone" id="billing-phone" value={billingDetails.phone} onChange={handleBillingChange} required placeholder="+14155552671" autoComplete="billing tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" title="Enter phone number in international E.164 format, e.g., +14155552671" />
                </div>
                <div>
                    <label htmlFor="billing-address1" className="block text-sm font-medium text-gray-700">Address 1 <span className="text-red-500">*</span></label>
                    <input type="text" name="address1" id="billing-address1" value={billingDetails.address1} onChange={handleBillingChange} required autoComplete="billing address-line1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="billing-address2" className="block text-sm font-medium text-gray-700">Address 2 (Optional)</label>
                    <input type="text" name="address2" id="billing-address2" value={billingDetails.address2 || ''} onChange={handleBillingChange} autoComplete="billing address-line2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="billing-city" className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                        <input type="text" name="city" id="billing-city" value={billingDetails.city} onChange={handleBillingChange} required autoComplete="billing address-level2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="billing-state" className="block text-sm font-medium text-gray-700">State/Province Code <span className="text-red-500">*</span></label>
                        <input type="text" name="state" id="billing-state" value={billingDetails.state} onChange={handleBillingChange} required placeholder="e.g. CA, NY" maxLength="3" autoComplete="billing address-level1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="billing-zip" className="block text-sm font-medium text-gray-700">ZIP/Postal Code <span className="text-red-500">*</span></label>
                        <input type="text" name="zip" id="billing-zip" value={billingDetails.zip} onChange={handleBillingChange} required autoComplete="billing postal-code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                    </div>
                </div>
                <div>
                    <label htmlFor="billing-country" className="block text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                    <select name="country" id="billing-country" value={billingDetails.country} onChange={handleBillingChange} required autoComplete="billing country" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white">
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !isRyePayReady || !totalAmount || instanceCartIdRef.current !== cartData?.id}
                    id="submit-rye-pay"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                    {isSubmitting ? 'Processing...' : (isRyePayReady && totalAmount ? `Pay ${formatCurrency(totalAmount.value, totalAmount.currency)}` : 'Initializing...')}
                </button>

                {showLoadingMessage ? (
                    <div className="text-center text-sm p-2 mt-2 rounded text-yellow-700 bg-yellow-100">
                        Initializing payment fields...
                    </div>
                ) : message && (
                    <div id="rye-payment-message" className={`text-center text-sm p-2 mt-2 rounded ${message.toLowerCase().includes('success') ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                        {message}
                    </div>
                )}
            </form>
        </fieldset>
    );
}