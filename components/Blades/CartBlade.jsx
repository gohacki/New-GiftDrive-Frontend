// components/Blades/CartBlade.jsx
import React, { useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/solid';
import { CartContext } from '@/contexts/CartContext'; // Adjust path if needed
import { formatCurrency } from '@/lib/utils'; // Adjust path if needed

const CartBlade = ({ isOpen, onClose }) => {
    const { cart, removeFromCart, updateCartItemQuantity, loading: cartLoading } = useContext(CartContext);

    if (!isOpen) return null;

    const hasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
    const totalAmount = cart?.cost?.total;

    const handleUpdateQuantity = (ryeItemId, marketplace, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(ryeItemId, marketplace);
        } else {
            updateCartItemQuantity(ryeItemId, marketplace, newQuantity);
        }
    };

    return (
        <>
            {/* Blade Content */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-xs md:max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cart-blade-title"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="cart-blade-title" className="text-xl font-semibold text-gray-800 flex items-center">
                        <ShoppingCartIcon className="h-6 w-6 mr-2 text-ggreen" />
                        Your Cart
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                        aria-label="Close cart panel"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {cartLoading && !cart && <p className="text-gray-500 text-center py-4">Loading cart...</p>}
                    {!cartLoading && !hasItems && (
                        <p className="text-gray-500 text-center py-4">Your cart is empty.</p>
                    )}
                    {hasItems && cart.stores.map((store, storeIndex) => {
                        const marketplace = store.__typename === 'ShopifyStore' ? 'SHOPIFY' : 'AMAZON';
                        return (
                            <div key={store.store || storeIndex} className="pt-1">
                                {/* Optional: Store Name if you want to differentiate
                <h4 className="font-medium text-xs text-gray-500 mb-1 border-b pb-0.5 uppercase">
                  {store.store === 'amazon' ? 'Amazon' : `Store: ${store.store}`}
                </h4> */}
                                {store.cartLines?.map((line, itemIndex) => {
                                    const isShopify = marketplace === 'SHOPIFY';
                                    const itemData = isShopify ? line.variant : line.product;
                                    const ryeItemId = itemData?.id || `item-${storeIndex}-${itemIndex}`;
                                    const baseProductName = line.giftdrive_base_product_name || (isShopify ? line.product?.title : itemData?.title) || 'Unknown Product';
                                    const variantDetailsText = line.giftdrive_variant_details_text || (isShopify ? itemData?.title : null);
                                    let displayTitle = baseProductName;
                                    let displaySubline = null;
                                    if (variantDetailsText && variantDetailsText !== baseProductName) {
                                        let specificVariantPart = variantDetailsText.replace(baseProductName, '').trim();
                                        if (specificVariantPart.startsWith('- ')) specificVariantPart = specificVariantPart.substring(2).trim();
                                        displaySubline = specificVariantPart || variantDetailsText;
                                    } else if (isShopify && itemData?.title && itemData.title !== baseProductName) {
                                        displaySubline = itemData.title;
                                    }
                                    const imageUrl = isShopify ? itemData?.image?.url : itemData?.images?.[0]?.url;
                                    const placeholderImg = '/placeholder-image.png';

                                    return (
                                        <div key={ryeItemId} className="bg-gray-50 p-2.5 rounded border border-gray-200 mb-2 flex items-start gap-3 text-sm">
                                            <div className="w-16 h-16 relative flex-shrink-0 border bg-white rounded overflow-hidden">
                                                <Image src={imageUrl || placeholderImg} alt={displayTitle} fill style={{ objectFit: 'contain' }} sizes="64px" onError={(e) => e.currentTarget.src = placeholderImg} />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium text-gray-800 leading-tight truncate text-xs" title={displayTitle}>{displayTitle}</p>
                                                {displaySubline && <p className="text-xs text-gray-500 truncate" title={displaySubline}>{displaySubline}</p>}
                                                {itemData?.priceV2?.value != null && <p className="text-xs font-semibold text-gray-700">{formatCurrency(itemData.priceV2.value, itemData.priceV2.currency)}</p>}
                                                {itemData?.price?.value != null && !itemData.priceV2 && <p className="text-xs font-semibold text-gray-700">{formatCurrency(itemData.price.value, itemData.price.currency)}</p>}
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <button onClick={() => handleUpdateQuantity(ryeItemId, marketplace, line.quantity - 1)} disabled={cartLoading} className="px-1.5 py-0.5 text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Decrease quantity of ${displayTitle}`}>-</button>
                                                    <span className="text-xs font-medium w-5 text-center">{line.quantity}</span>
                                                    <button onClick={() => handleUpdateQuantity(ryeItemId, marketplace, line.quantity + 1)} disabled={cartLoading} className="px-1.5 py-0.5 text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50" aria-label={`Increase quantity of ${displayTitle}`}>+</button>
                                                    <button onClick={() => removeFromCart(ryeItemId, marketplace)} disabled={cartLoading} className="ml-auto text-red-500 hover:text-red-700 text-xs disabled:opacity-50" aria-label={`Remove ${displayTitle} from cart`}>Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                {hasItems && (
                    <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
                        {totalAmount?.value != null && (
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(cart.cost.subtotal?.value || totalAmount.value, totalAmount.currency)}</span>
                                {/* Showing subtotal for blade as shipping/tax might not be calculated yet */}
                            </div>
                        )}
                        <Link href="/visible/cart" passHref legacyBehavior>
                            <a
                                onClick={onClose} // Close blade when navigating to full cart page
                                className="block w-full text-center px-6 py-3 bg-ggreen text-white font-semibold rounded-md hover:bg-teal-700 transition-colors"
                            >
                                View Full Cart & Checkout
                            </a>
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartBlade;