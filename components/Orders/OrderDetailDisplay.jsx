// src/components/Orders/OrderDetailDisplay.jsx
import React, { useState } from 'react';
import Image from 'next/image';
import PropTypes from 'prop-types';

// Helper function to format date/time nicely
const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return 'Invalid Date';
    }
};

// Helper to get status color (Tailwind classes)
const getStatusColor = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('succeeded') || lowerStatus.includes('completed') || lowerStatus.includes('delivered')) {
        return 'text-green-600 bg-green-100';
    }
    if (lowerStatus.includes('failed') || lowerStatus.includes('cancelled') || lowerStatus.includes('error') || lowerStatus.includes('denied')) {
        return 'text-red-600 bg-red-100';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('submitted') || lowerStatus.includes('requested')) {
        return 'text-yellow-700 bg-yellow-100';
    }
    if (lowerStatus.includes('shipped') || lowerStatus.includes('approved') || lowerStatus.includes('accepted')) {
        return 'text-blue-600 bg-blue-100';
    }
    return 'text-gray-600 bg-gray-100'; // Default
};

export default function OrderDetailDisplay({ orderDetails, onClose, isLoading, onReturnRequest }) {
    const [selectedItemsForReturn, setSelectedItemsForReturn] = useState(new Set());

    if (isLoading) {
        return (
            <div className="mt-6 p-4 border rounded-md shadow bg-white text-center text-gray-500">
                Loading order details...
            </div>
        );
    }

    if (!orderDetails) return (
        <div className="mt-6 p-4 border rounded-md shadow bg-white text-center text-gray-500">
            Order details not available.
        </div>
    );

    const {
        id, status, createdAt, marketplace, marketplaceOrderIds = [],
        total, subtotal, tax, shipping,
        cart,
        shipments = [], events = [], returns = []
    } = orderDetails;

    // --- FIX: Derive lineItems from the cart structure ---
    const lineItems = [];
    if (cart && cart.stores) {
        cart.stores.forEach(store => {
            if (store.cartLines) {
                store.cartLines.forEach(cartLine => {
                    const isShopify = store.__typename === 'ShopifyStore';
                    // For Amazon, cartLine.product is the item. For Shopify, cartLine.variant is the specific item, and cartLine.product is its parent.
                    const baseProductDetails = isShopify ? cartLine.product : cartLine.product;
                    const variantDetails = isShopify ? cartLine.variant : null;

                    let itemForList = {
                        quantity: cartLine.quantity,
                        // Use variant ID for Shopify, product ID for Amazon as primary key for selection
                        productId: isShopify ? baseProductDetails?.id : baseProductDetails?.id, // Amazon: ASIN, Shopify: Product ID
                        variantId: isShopify ? variantDetails?.id : null, // Shopify: Variant ID
                        // Include other potentially useful info, mirroring display logic structure
                        title: isShopify ? (variantDetails?.title || baseProductDetails?.title) : baseProductDetails?.title,
                        imageUrl: isShopify ? (variantDetails?.image?.url || baseProductDetails?.images?.[0]?.url) : baseProductDetails?.images?.[0]?.url,
                        price: isShopify ? variantDetails?.priceV2 : baseProductDetails?.price, // Original price object
                        // Store type might be useful for onReturnRequest logic if it needs marketplace context per item
                        marketplace: store.store, // 'amazon' or Shopify store domain
                        storeType: store.__typename, // 'AmazonStore' or 'ShopifyStore'
                    };
                    lineItems.push(itemForList);
                });
            }
        });
    }
    // --- END FIX ---

    const isItemPotentiallyEligible = (itemId) => {
        const isInExistingReturn = returns.some(ret =>
            ret.lineItems?.some(li => (li.productId || li.variantId) === itemId)
        );
        return !isInExistingReturn;
    };

    const anyItemEligibleForReturn = lineItems.some(item => isItemPotentiallyEligible(item.productId || item.variantId));

    const handleCheckboxChange = (itemId) => {
        setSelectedItemsForReturn(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            console.log("Selected items for return:", newSet);
            return newSet;
        });
    };

    return (
        <div className="mt-4 p-4 border rounded-md shadow-lg bg-white transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-2 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold" aria-label="Close">×</button>
            </div>

            <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                <p className="text-xs text-gray-500 mb-1">Rye Order ID: <span className="font-mono">{id}</span></p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-2 bg-gray-50 p-3 rounded border">
                    <div>
                        <p><strong>Status:</strong>
                            <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                                {status || 'N/A'}
                            </span>
                        </p>
                        <p><strong>Date:</strong> {formatDateTime(createdAt)}</p>
                    </div>
                    <div className="sm:text-right">
                        <p><strong>Marketplace:</strong> {marketplace || 'N/A'}</p>
                        {marketplaceOrderIds.length > 0 && (
                            <p><strong>Ref ID(s):</strong> {marketplaceOrderIds.join(', ')}</p>
                        )}
                    </div>
                    <div className="col-span-1 sm:col-span-2 border-t pt-2 mt-2 flex flex-wrap justify-end items-center gap-x-4 gap-y-1">
                        <span>Subtotal: {subtotal?.displayValue || 'N/A'}</span>
                        <span>Shipping: {shipping?.displayValue || 'N/A'}</span>
                        <span>Tax: {tax?.displayValue || 'N/A'}</span>
                        <strong className="text-base">Total: {total?.displayValue || 'N/A'}</strong>
                    </div>
                </div>

                <div className="mb-2">
                    <h4 className="font-semibold text-base mb-2 text-gray-700">Items Ordered</h4>
                    {cart && cart.stores && cart.stores.length > 0 ? (
                        cart.stores.map((store, storeIndex) => (
                            <div key={store.store || storeIndex} className="mb-3">
                                <h5 className="text-sm font-medium text-gray-600 mb-1">
                                    From: {store.store === 'amazon' ? 'Amazon' : store.store}
                                </h5>
                                {store.cartLines && store.cartLines.length > 0 ? (
                                    <div className="space-y-2">
                                        {store.cartLines.map((cartLine, lineIndex) => {
                                            let itemId, itemTitle, itemImageUrl, itemPriceDisplay;
                                            const quantity = cartLine.quantity;

                                            if (store.__typename === 'AmazonStore' && cartLine.product) {
                                                itemId = cartLine.product.id;
                                                itemTitle = cartLine.product.title;
                                                itemImageUrl = cartLine.product.images?.[0]?.url;
                                                itemPriceDisplay = cartLine.product.price?.displayValue;
                                            } else if (store.__typename === 'ShopifyStore' && cartLine.variant) {
                                                itemId = cartLine.variant.id;
                                                itemTitle = cartLine.variant.title || cartLine.product?.title;
                                                itemImageUrl = cartLine.variant.image?.url || cartLine.product?.images?.[0]?.url;
                                                itemPriceDisplay = cartLine.variant.priceV2?.displayValue;
                                            } else {
                                                itemId = `unknown-${storeIndex}-${lineIndex}`;
                                                itemTitle = 'Unknown Item';
                                                itemImageUrl = null;
                                                itemPriceDisplay = 'N/A';
                                            }

                                            const isEligibleForReturn = isItemPotentiallyEligible(itemId);

                                            return (
                                                <div key={`${itemId}-${lineIndex}`} className="flex items-center gap-3 text-sm border rounded p-2 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                    <div className='flex-shrink-0 w-5 flex justify-center items-center'>
                                                        {isEligibleForReturn ? (
                                                            <input
                                                                type="checkbox"
                                                                id={`return-item-${itemId}`}
                                                                checked={selectedItemsForReturn.has(itemId)}
                                                                onChange={() => handleCheckboxChange(itemId)}
                                                                className="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded border-gray-300 focus:ring-indigo-500"
                                                            />
                                                        ) : (
                                                            <span title="Item not eligible for return" className="text-gray-400 text-lg">✓</span>
                                                        )}
                                                    </div>
                                                    <div className='w-12 h-12 relative flex-shrink-0 border rounded bg-white'>
                                                        {itemImageUrl ? (
                                                            <Image src={itemImageUrl} alt={itemTitle.substring(0, 20)} fill style={{ objectFit: 'contain' }} sizes="48px" onError={(e) => e.currentTarget.src = '/placeholder-image.png'} />
                                                        ) : <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Img</div>}
                                                    </div>
                                                    <div className='flex-grow'>
                                                        <p className="font-medium text-gray-800 leading-tight">{itemTitle || 'Item details missing'}</p>
                                                        <p className="text-xs text-gray-500">Qty: {quantity}</p>
                                                    </div>
                                                    {itemPriceDisplay && (
                                                        <p className="font-medium text-gray-700 flex-shrink-0">{itemPriceDisplay}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic ml-2">No items from this store in the order.</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 italic">No item details available in the cart data.</p>
                    )}
                </div>

                {shipments.length > 0 && (
                    <div className="mb-2">
                        <h4 className="font-semibold text-base mb-1 text-gray-700 border-t pt-3">Shipments</h4>
                        {shipments.map((shipment, index) => (
                            <div key={index} className="text-sm border rounded p-2 bg-gray-50 mb-1 shadow-sm">
                                <p><strong>Carrier:</strong> {shipment.carrierName || 'N/A'}</p>
                                <p><strong>Tracking:</strong> {shipment.carrierTrackingNumber || 'N/A'}</p>
                                {shipment.carrierTrackingUrl && <a href={shipment.carrierTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block my-0.5 text-xs">Track Package →</a>}
                                <p>Status: {shipment.status || 'N/A'}</p>
                                <p>Est. Delivery: {shipment.expectedDeliveryDate ? new Date(shipment.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                )}

                {returns.length > 0 && (
                    <div className="mb-2">
                        <h4 className="font-semibold text-base mb-1 text-gray-700 border-t pt-3">Returns</h4>
                        {returns.map((ret, index) => (
                            <div key={ret.id || index} className="text-sm border rounded p-2 bg-yellow-50 mb-1 shadow-sm">
                                <p><strong>Return ID:</strong> <span className="font-mono text-xs">{ret.id}</span></p>
                                <p><strong>Status:</strong>
                                    <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ret.status)}`}>
                                        {ret.status || 'N/A'}
                                    </span>
                                </p>
                                {ret.shippingLabelUrl && <a href={ret.shippingLabelUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block my-0.5 text-xs">View Shipping Label</a>}
                                <p className="mt-1 font-medium text-gray-600 text-xs">Items in Return:</p>
                                <ul className="list-disc list-inside ml-4 text-xs text-gray-500">
                                    {ret.lineItems?.map((item, itemIndex) => (
                                        <li key={itemIndex}>
                                            ID: {item.productId || item.variantId}, Qty: {item.quantity}, Status: {item.status || 'N/A'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {events.length > 0 && (
                    <details className="group text-xs mt-2 border-t pt-2">
                        <summary className="font-medium text-gray-600 cursor-pointer group-open:mb-1 list-none">
                            <span className="group-open:hidden">▶ Order History</span>
                            <span className="hidden group-open:inline">▼ Order History</span>
                        </summary>
                        <ul className="space-y-1 text-gray-500 max-h-32 overflow-y-auto pr-1 mt-1 border rounded p-1 bg-gray-50">
                            {events.slice().reverse().map(event => (
                                <li key={event.id} className="border-b pb-0.5 last:border-b-0">
                                    <span className='block font-mono text-gray-400 text-[10px]'>{formatDateTime(event.createdAt)}</span>
                                    <span className='font-medium text-gray-700'>{event.__typename.replace('OrderEvent', '')}</span>
                                    {event.reason && <span className='block text-red-500 italic text-[11px]'>Reason: {event.reason}</span>}
                                    {event.amount && <span className='block text-green-600 text-[11px]'>Amount: {event.amount.displayValue}</span>}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>

            {anyItemEligibleForReturn && (
                <div className="mt-4 pt-3 border-t flex-shrink-0">
                    <button
                        onClick={() => {
                            const itemsToSubmit = lineItems
                                .filter(item => selectedItemsForReturn.has(item.productId || item.variantId))
                                .map(item => ({
                                    id: item.productId || item.variantId,
                                    quantity: item.quantity
                                }));

                            if (itemsToSubmit.length > 0 && onReturnRequest) {
                                onReturnRequest(id, marketplace, itemsToSubmit);
                            } else if (!onReturnRequest) {
                                console.error("onReturnRequest prop is missing from OrderDetailDisplay");
                            }
                        }}
                        disabled={isLoading || selectedItemsForReturn.size === 0}
                        className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Request Return for Selected Items ({selectedItemsForReturn.size})
                    </button>
                </div>
            )}
        </div>
    );
}

const moneyType = PropTypes.shape({
    value: PropTypes.number,
    currency: PropTypes.string,
    displayValue: PropTypes.string,
});

const baseItemDetailsType = PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
    price: moneyType,
    priceV2: moneyType,
    image: PropTypes.shape({ url: PropTypes.string }),
});

const cartLineItemType = PropTypes.shape({
    quantity: PropTypes.number.isRequired,
    product: baseItemDetailsType,
    variant: baseItemDetailsType,
});

OrderDetailDisplay.propTypes = {
    orderDetails: PropTypes.shape({
        id: PropTypes.string,
        status: PropTypes.string,
        createdAt: PropTypes.string,
        marketplace: PropTypes.string,
        marketplaceOrderIds: PropTypes.arrayOf(PropTypes.string),
        total: moneyType,
        subtotal: moneyType,
        tax: moneyType,
        shipping: moneyType,
        cart: PropTypes.shape({
            stores: PropTypes.arrayOf(PropTypes.shape({
                store: PropTypes.string,
                __typename: PropTypes.string,
                cartLines: PropTypes.arrayOf(cartLineItemType),
            })),
        }),
        shipments: PropTypes.arrayOf(PropTypes.shape({
            carrierName: PropTypes.string,
            carrierTrackingNumber: PropTypes.string,
            carrierTrackingUrl: PropTypes.string,
            status: PropTypes.string,
            expectedDeliveryDate: PropTypes.string,
        })),
        events: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            __typename: PropTypes.string,
            createdAt: PropTypes.string,
            reason: PropTypes.string,
            amount: moneyType,
        })),
        returns: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            status: PropTypes.string,
            shippingLabelUrl: PropTypes.string,
            lineItems: PropTypes.arrayOf(PropTypes.shape({
                productId: PropTypes.string,
                variantId: PropTypes.string,
                quantity: PropTypes.number,
                status: PropTypes.string,
            })),
        })),
    }),
    onClose: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    onReturnRequest: PropTypes.func,
};

OrderDetailDisplay.defaultProps = {
    isLoading: false,
    onReturnRequest: null,
    orderDetails: null,
};
