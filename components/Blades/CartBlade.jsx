// components/Blades/CartBlade.jsx
import React, { useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CartContext } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/utils';
import PropTypes from 'prop-types';

const CartBlade = ({ isOpen, onClose }) => { // onClose is still used by the "Go to Cart" button
    const { cart, removeFromCart, updateCartItemQuantity, loading: cartLoading } = useContext(CartContext);

    if (!isOpen) return null;

    const hasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
    const subtotalAmount = cart?.cost?.subtotal; // Use subtotal for the top display

    const handleUpdateQuantity = (ryeItemId, marketplace, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(ryeItemId, marketplace);
        } else {
            updateCartItemQuantity(ryeItemId, marketplace, newQuantity);
        }
    };

    // Placeholder for free shipping logic - adjust as needed
    const qualifiesForFreeShipping = subtotalAmount?.value > 5000; // Example: free shipping over $50

    return (
        <>
            {/* Blade Content - ADJUSTED WIDTH and REMOVED X BUTTON */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-60 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cart-blade-title" // Keep for accessibility, even if title isn't visible
            >
                {/* Header Section - AMAZON STYLE */}
                <div className="p-3 border-b border-gray-200 flex-shrink-0">
                    {subtotalAmount?.value != null ? (
                        <div className="text-center mb-2">
                            <span className="text-sm text-gray-600">Subtotal</span>
                            <p className="text-xl font-bold text-ggreen">
                                {formatCurrency(subtotalAmount.value, subtotalAmount.currency)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-2">Calculating...</p>
                    )}

                    {/* Placeholder for Free Shipping Message */}
                    {qualifiesForFreeShipping && (
                        <p className="text-xs text-green-600 text-center mb-2">
                            Your order qualifies for FREE Shipping.
                            {/* <a href="#" className="underline ml-1">See details</a> */}
                        </p>
                    )}

                    <Link href="/visible/cart" passHref legacyBehavior>
                        <a
                            onClick={onClose} // Close blade when navigating to full cart page
                            className="block w-full text-center px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-800 hover:bg-gray-50 text-sm font-semibold shadow-sm"
                        >
                            Go to Cart
                        </a>
                    </Link>
                </div>

                {/* Cart Items Area */}
                <div className="flex-grow overflow-y-auto p-3 space-y-3">
                    {cartLoading && !hasItems && <p className="text-gray-500 text-center py-4 text-xs">Loading cart...</p>}
                    {!cartLoading && !hasItems && (
                        <p className="text-gray-500 text-center py-4 text-xs">Your cart is empty.</p>
                    )}

                    {hasItems && cart.stores.map((store, storeIndex) => {
                        const marketplace = store.__typename === 'ShopifyStore' ? 'SHOPIFY' : 'AMAZON';
                        return (
                            <div key={store.store || storeIndex}>
                                {store.cartLines?.map((line, itemIndex) => {
                                    const isShopify = marketplace === 'SHOPIFY';
                                    const itemData = isShopify ? line.variant : line.product;
                                    const ryeItemId = itemData?.id || `item-${storeIndex}-${itemIndex}`;

                                    const baseProductName = line.giftdrive_base_product_name || (isShopify ? line.product?.title : itemData?.title) || 'Unknown Product';
                                    const variantDetailsText = line.giftdrive_variant_details_text || (isShopify ? itemData?.title : null);
                                    let displayTitle = baseProductName;
                                    if (variantDetailsText && variantDetailsText !== baseProductName) {
                                        let specificVariantPart = variantDetailsText.replace(baseProductName, '').trim();
                                        if (specificVariantPart.startsWith('- ')) specificVariantPart = specificVariantPart.substring(2).trim();
                                        if (specificVariantPart) displayTitle += ` - ${specificVariantPart}`;
                                    } else if (isShopify && itemData?.title && itemData.title !== baseProductName) {
                                        displayTitle += ` - ${itemData.title.replace(baseProductName, '').trim()}`;
                                    }

                                    const imageUrl = isShopify ? itemData?.image?.url : itemData?.images?.[0]?.url;
                                    const placeholderImg = '/placeholder-image.png';
                                    const itemPrice = itemData?.priceV2?.value != null ? itemData.priceV2 : (itemData?.price || null);


                                    return (
                                        <div key={ryeItemId} className="bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                                            <div className="w-full h-24 relative mb-2 border bg-white rounded overflow-hidden">
                                                <Image src={imageUrl || placeholderImg} alt={displayTitle} fill style={{ objectFit: 'contain' }} sizes="96px" onError={(e) => e.currentTarget.src = placeholderImg} />
                                            </div>
                                            {/* Title can be here or below price */}
                                            <p className="font-medium text-gray-700 leading-tight truncate mb-1" title={displayTitle}>{displayTitle}</p>

                                            {itemPrice?.value != null && (
                                                <p className="font-semibold text-gray-800 text-center mb-1.5">
                                                    {formatCurrency(itemPrice.value, itemPrice.currency)}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleUpdateQuantity(ryeItemId, marketplace, line.quantity - 1)}
                                                    disabled={cartLoading}
                                                    className="px-2 py-1 text-sm bg-yellow-400 hover:bg-yellow-500 text-black rounded-l-md disabled:opacity-50 font-bold"
                                                    aria-label={`Decrease quantity of ${displayTitle}`}>-</button>
                                                <span className="text-sm font-medium w-6 text-center bg-white border-t border-b border-gray-300 py-1">{line.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(ryeItemId, marketplace, line.quantity + 1)}
                                                    disabled={cartLoading}
                                                    className="px-2 py-1 text-sm bg-yellow-400 hover:bg-yellow-500 text-black rounded-r-md disabled:opacity-50 font-bold"
                                                    aria-label={`Increase quantity of ${displayTitle}`}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer is removed as per Amazon style - "Go to Cart" is in the header */}
            </div>
        </>
    );
};

CartBlade.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default CartBlade;