// src/components/CartDisplay.jsx
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';
import PropTypes from 'prop-types';

export default function CartDisplay({ cart, checkoutStep, onRemoveItem, onUpdateItemQuantity, isLoading }) {

    const renderCartErrors = (stores, currentCheckoutStep) => { /* ... existing error rendering ... */
        let allErrors = [];
        let unavailableItemsMessages = [];

        stores?.forEach(store => {
            if (store.errors?.length) allErrors = allErrors.concat(store.errors.map(e => ({ ...e, storeName: store.store })));
            if (store.offer?.errors?.length) allErrors = allErrors.concat(store.offer.errors.map(e => ({ ...e, storeName: store.store })));
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
        const filteredErrors = allErrors.filter(err => {
            if ((currentCheckoutStep === 'idle' || currentCheckoutStep === 'identity') && err.code === 'INVALID_BUYER_IDENTITY_INFORMATION') {
                return false;
            }
            return true;
        });
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
    const renderCartSummary = (cost) => { /* ... existing summary rendering ... */
        if (!cost) {
            return (
                <div className="mt-4 pt-3 border-t text-right text-sm text-gray-500 italic">
                    Enter address for shipping & tax calculation.
                </div>
            );
        }
        const { subtotal, shipping, tax, total, isEstimated } = cost;
        return (
            <div className="mt-4 pt-3 border-t text-right space-y-1 text-sm">
                {subtotal?.value != null && (
                    <div>
                        <span>Subtotal:</span>
                        <span className="font-medium ml-2">{formatCurrency(subtotal?.value, subtotal?.currency)}</span>
                    </div>
                )}
                {(shipping?.value != null) && (
                    <div>
                        <span>Shipping:</span>
                        <span className="font-medium ml-2">{formatCurrency(shipping.value, shipping.currency)}</span>
                    </div>
                )}
                {(tax?.value != null) && (
                    <div>
                        <span>Tax:</span>
                        <span className="font-medium ml-2">{formatCurrency(tax.value, tax.currency)}</span>
                    </div>
                )}
                {(shipping?.value != null || tax?.value != null) && total?.value != null && (
                    <div className="w-full h-px bg-gray-200 my-1"></div>
                )}
                {total?.value != null ? (
                    <div className="text-base font-bold text-gray-800">
                        <span>Total{isEstimated ? ' (Est.)' : ''}:</span>
                        <span className="ml-2">{formatCurrency(total.value, total.currency)}</span>
                    </div>
                ) : (
                    <div className="text-base font-medium text-gray-600 italic">
                        Calculating Total...
                    </div>
                )}
                {isEstimated && total?.value == null && (
                    <p className="text-xs text-gray-500 mt-1">Final shipping & tax calculated after address entry.</p>
                )}
            </div>
        );
    };

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
                                    {store.cartLines?.map((line, itemIndex) => {
                                        const isShopify = marketplace === 'SHOPIFY';
                                        // For Shopify, line.variant contains the specific variant details.
                                        // For Amazon, line.product contains the product details.
                                        const itemData = isShopify ? line.variant : line.product;

                                        const ryeItemId = itemData?.id || 'N/A'; // This is the Rye Variant ID (Shopify) or Product ID (Amazon)

                                        // Attempt to get base product name from augmented data if available
                                        // This requires your /api/cart GET route to augment cart lines
                                        // with giftdrive_base_product_name and giftdrive_variant_details_text
                                        const baseProductName = line.giftdrive_base_product_name || (isShopify ? line.product?.title : itemData?.title) || 'Unknown Base Product';
                                        const variantDetailsText = line.giftdrive_variant_details_text || (isShopify ? itemData?.title : null); // This might be "Base Name - Variant" or just "Variant"

                                        // Final display logic for name
                                        let displayTitle = baseProductName;
                                        let displaySubline = null;

                                        if (variantDetailsText && variantDetailsText !== baseProductName) {
                                            // If variantDetailsText is the full "Base Name - Variant Detail", extract just variant part
                                            let specificVariantPart = variantDetailsText.replace(baseProductName, '').trim();
                                            if (specificVariantPart.startsWith('- ')) {
                                                specificVariantPart = specificVariantPart.substring(2).trim();
                                            }
                                            displaySubline = specificVariantPart || variantDetailsText; // Fallback to full if replacement empty
                                        } else if (isShopify && itemData?.title && itemData.title !== baseProductName) {
                                            // Fallback if augmented data isn't there, but variant title differs from base
                                            displaySubline = itemData.title;
                                        }


                                        const imageUrl = isShopify ? itemData?.image?.url : itemData?.images?.[0]?.url;
                                        const placeholderImg = '/placeholder-image.png';

                                        const handleQuantityChange = (newQuantity) => {
                                            const quantityToUpdate = Math.max(0, newQuantity);
                                            if (quantityToUpdate === line.quantity) return;
                                            if (quantityToUpdate === 0) { onRemoveItem(ryeItemId, marketplace); }
                                            else { onUpdateItemQuantity(ryeItemId, marketplace, quantityToUpdate); }
                                        };

                                        return (
                                            <div key={`${ryeItemId}-${itemIndex}`} className="bg-gray-50 p-3 rounded border border-gray-200 mb-2 flex items-center gap-3">
                                                <div className="w-16 h-16 relative flex-shrink-0 border bg-white rounded overflow-hidden">
                                                    <Image src={imageUrl || placeholderImg} alt={displayTitle} fill style={{ objectFit: 'contain' }} sizes="64px" onError={(e) => e.currentTarget.src = placeholderImg} />
                                                </div>
                                                <div className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <div className="min-w-0"> {/* For truncation */}
                                                        <p className="font-medium text-sm leading-tight truncate" title={displayTitle}>{displayTitle}</p>
                                                        {displaySubline && (
                                                            <p className="text-xs text-gray-500 truncate" title={displaySubline}>{displaySubline}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400">ID: {ryeItemId}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button onClick={() => handleQuantityChange(line.quantity - 1)} disabled={isLoading} className="px-2 py-0.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Decrease quantity of ${displayTitle}`}>-</button>
                                                        <span className="text-sm font-semibold w-6 text-center">{line.quantity}</span>
                                                        <button onClick={() => handleQuantityChange(line.quantity + 1)} disabled={isLoading} className="px-2 py-0.5 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Increase quantity of ${displayTitle}`}>+</button>
                                                    </div>
                                                </div>
                                                <button onClick={() => onRemoveItem(ryeItemId, marketplace)} disabled={isLoading} className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow-sm disabled:opacity-50 flex-shrink-0" aria-label={`Remove ${displayTitle} from cart`}>Remove</button>
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
const cartLineItemShape = PropTypes.shape({
    giftdrive_base_product_name: PropTypes.string,
    giftdrive_variant_details_text: PropTypes.string,
    quantity: PropTypes.number,
    variant: PropTypes.shape({ // For Shopify variant
        id: PropTypes.string,
        title: PropTypes.string,
        image: PropTypes.shape({ url: PropTypes.string }),
        priceV2: PropTypes.shape({ value: PropTypes.number, currency: PropTypes.string }),
    }),
    product: PropTypes.shape({ // For Amazon product or Shopify parent product
        id: PropTypes.string,
        title: PropTypes.string,
        images: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
        price: PropTypes.shape({ value: PropTypes.number, currency: PropTypes.string }),
    }),
});

CartDisplay.propTypes = {
    cart: PropTypes.shape({
        stores: PropTypes.arrayOf(PropTypes.shape({
            __typename: PropTypes.string,
            store: PropTypes.string,
            cartLines: PropTypes.arrayOf(cartLineItemShape),
            errors: PropTypes.array,
            offer: PropTypes.shape({
                errors: PropTypes.array,
                notAvailableIds: PropTypes.array,
            }),
        })),
        cost: PropTypes.shape({
            subtotal: PropTypes.object, // Assuming formatCurrency handles its structure
            shipping: PropTypes.object,
            tax: PropTypes.object,
            total: PropTypes.object,
            isEstimated: PropTypes.bool,
        }),
    }),
    checkoutStep: PropTypes.string,
    onRemoveItem: PropTypes.func.isRequired,
    onUpdateItemQuantity: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};