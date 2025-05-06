// src/components/CartDisplay.jsx
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';

// Add onUpdateItemQuantity prop
export default function CartDisplay({ cart, checkoutStep, onRemoveItem, onUpdateItemQuantity, isLoading }) {

    const renderCartErrors = (stores, currentCheckoutStep) => {
        let allErrors = [];
        let unavailableItemsMessages = []; // Store messages about unavailable items

        stores?.forEach(store => {
            // Combine store-level and offer-level errors
            if (store.errors?.length) allErrors = allErrors.concat(store.errors.map(e => ({ ...e, storeName: store.store })));
            if (store.offer?.errors?.length) allErrors = allErrors.concat(store.offer.errors.map(e => ({ ...e, storeName: store.store })));

            // Check for notAvailableIds (keep this logic)
            if (store.offer?.notAvailableIds?.length > 0) {
                const marketplace = store.__typename === 'ShopifyStore' ? 'SHOPIFY' : 'AMAZON';
                const idType = marketplace === 'SHOPIFY' ? 'Variant ID' : 'Product ID';
                const unavailableTitles = store.cartLines
                    ?.filter(line => {
                        const itemId = (marketplace === 'SHOPIFY' ? line.variant?.id : line.product?.id);
                        return store.offer.notAvailableIds.includes(itemId);
                    })
                    .map(line => (marketplace === 'SHOPIFY' ? line.variant?.title : line.product?.title) || 'Unknown Item') || [];

                if (unavailableTitles.length > 0) {
                    unavailableItemsMessages.push(
                        `Some items became unavailable from ${store.store}: ${unavailableTitles.join(', ')}. Please remove them.`
                    );
                } else {
                    unavailableItemsMessages.push(
                        `Some items (${idType}s: ${store.offer.notAvailableIds.join(', ')}) became unavailable from ${store.store}. Please remove them.`
                    );
                }
            }
        });

        // --- MODIFIED FILTERING LOGIC ---
        // Filter out buyer identity errors ONLY if the checkout step is 'idle' OR 'identity'
        const filteredErrors = allErrors.filter(err => {
            // HIDE identity errors during BOTH idle and identity steps
            if ((currentCheckoutStep === 'idle' || currentCheckoutStep === 'identity') && err.code === 'INVALID_BUYER_IDENTITY_INFORMATION') {
                return false;
            }
            // Keep all other errors, or identity errors ONLY in the payment step
            return true;
        });
        // --- END MODIFIED FILTERING LOGIC ---

        // Combine specific unavailable messages with general filtered errors
        const finalErrorMessages = [
            ...unavailableItemsMessages.map((msg, idx) => <li key={`unavail-${idx}`} className="font-semibold">{msg}</li>),
            ...filteredErrors.map((e, index) => (
                <li key={index}><span className="font-medium">{e.storeName} - {e.code}:</span> {e.message}</li>
            ))
        ];

        if (finalErrorMessages.length === 0) return null;

        return (
            <div className="border border-red-300 bg-red-50 p-3 rounded mt-3">
                <h4 className="font-semibold text-red-700 mb-1">Cart Issues:</h4>
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {finalErrorMessages}
                </ul>
            </div>
        );
    };

    const renderCartSummary = (cost) => {
        if (!cost) {
            // Display placeholders or a message if cost data isn't available yet
            return (
                <div className="mt-4 pt-3 border-t text-right text-sm text-gray-500 italic">
                    Enter address for shipping & tax calculation.
                </div>
            );
        }

        const { subtotal, shipping, tax, total, isEstimated } = cost;

        return (
            <div className="mt-4 pt-3 border-t text-right space-y-1 text-sm">
                {/* Subtotal is usually always present */}
                <div>
                    <span>Subtotal:</span>
                    <span className="font-medium ml-2">{formatCurrency(subtotal?.value, subtotal?.currency)}</span>
                </div>

                {/* Shipping - show if value exists or if explicitly zero */}
                {(shipping?.value != null) && (
                    <div>
                        <span>Shipping:</span>
                        <span className="font-medium ml-2">{formatCurrency(shipping.value, shipping.currency)}</span>
                    </div>
                )}

                {/* Tax - show if value exists or if explicitly zero */}
                {(tax?.value != null) && (
                    <div>
                        <span>Tax:</span>
                        <span className="font-medium ml-2">{formatCurrency(tax.value, tax.currency)}</span>
                    </div>
                )}

                {/* Separator */}
                {(shipping?.value != null || tax?.value != null) && total?.value != null && (
                    <div className="w-full h-px bg-gray-200 my-1"></div>
                )}

                {/* Total */}
                {total?.value != null ? (
                    <div className="text-base font-bold text-gray-800">
                        <span>Total{isEstimated ? ' (Estimated)' : ''}:</span>
                        <span className="ml-2">{formatCurrency(total.value, total.currency)}</span>
                    </div>
                ) : (
                    // Show calculating message if total isn't ready yet
                    <div className="text-base font-medium text-gray-600 italic">
                        Calculating Total...
                    </div>
                )}

                {/* Informational message if estimated */}
                {isEstimated && total?.value == null && (
                    <p className="text-xs text-gray-500 mt-1">Final shipping & tax calculated after address entry.</p>
                )}
            </div>
        );
    };
    // --- End Cart Summary Function ---

    const hasItems = cart?.stores?.some(store => store.cartLines?.length > 0);

    return (
        <fieldset className="border p-4 rounded-md shadow bg-white">
            <legend className="text-lg font-semibold px-2">Your Cart</legend>
            <div className="space-y-3">
                {!cart || !hasItems ? (
                    <p className="text-gray-500 italic py-4 text-center">Your cart is empty.</p>
                ) : (
                    <>
                        {cart.stores.map((store, storeIndex) => {
                            const marketplace = store.__typename === 'ShopifyStore' ? 'SHOPIFY' : 'AMAZON';
                            return (
                                <div key={store.store || storeIndex} className="pt-2">
                                    <h4 className="font-semibold text-sm text-gray-600 mb-2 border-b pb-1">
                                        {store.store === 'amazon' ? 'Amazon' : `Store: ${store.store}`}
                                    </h4>
                                    {store.cartLines?.map((item, itemIndex) => {
                                        /* ... item rendering logic unchanged ... */
                                        const isShopify = marketplace === 'SHOPIFY';
                                        const itemData = isShopify ? item.variant : item.product;
                                        const itemTitle = itemData?.title || 'Unknown Item';
                                        const itemId = itemData?.id || 'N/A';
                                        const imageUrl = isShopify ? itemData?.image?.url : itemData?.images?.[0]?.url;
                                        const placeholderImg = '/placeholder-image.png';
                                        const handleQuantityChange = (newQuantity) => {
                                            const quantityToUpdate = Math.max(0, newQuantity);
                                            if (quantityToUpdate === item.quantity) return;
                                            if (quantityToUpdate === 0) { onRemoveItem(itemId, marketplace); }
                                            else { onUpdateItemQuantity(itemId, marketplace, quantityToUpdate); }
                                        };
                                        return (
                                            <div key={`${itemId}-${itemIndex}`} className="bg-gray-50 p-3 rounded border border-gray-200 mb-2 flex items-center gap-3">
                                                {/* Image */}
                                                <div className="w-16 h-16 relative flex-shrink-0 border bg-white rounded overflow-hidden"> <Image src={imageUrl || placeholderImg} alt={itemTitle.substring(0, 30)} fill style={{ objectFit: 'contain' }} sizes="64px" onError={(e) => e.currentTarget.src = placeholderImg} /> </div>
                                                {/* Details & Quantity Controls */}
                                                <div className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <div> <p className="font-medium text-sm leading-tight">{itemTitle}</p> <p className="text-xs text-gray-500">ID: {itemId}</p> </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0"> <button onClick={() => handleQuantityChange(item.quantity - 1)} disabled={isLoading} className="px-2 py-0.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Decrease quantity of ${itemTitle}`}> - </button> <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span> <button onClick={() => handleQuantityChange(item.quantity + 1)} disabled={isLoading} className="px-2 py-0.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Increase quantity of ${itemTitle}`}> + </button> </div>
                                                </div>
                                                {/* Remove Button */}
                                                <button onClick={() => onRemoveItem(itemId, marketplace)} disabled={isLoading} className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow-sm disabled:opacity-50 flex-shrink-0" aria-label={`Remove ${itemTitle} from cart`} > Remove </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {renderCartErrors(cart.stores, checkoutStep)}
                        {renderCartSummary(cart.cost)}
                    </>
                )}
            </div>
        </fieldset>
    );
}