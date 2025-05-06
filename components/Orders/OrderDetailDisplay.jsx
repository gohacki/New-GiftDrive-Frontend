// src/components/OrderDetailDisplay.jsx
import React, { useState } from 'react'; // Import useState
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import PropTypes from 'prop-types'; // Import PropTypes

// Helper function to format date/time nicely
const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
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

// Export the component
export default function OrderDetailDisplay({ orderDetails, onClose, isLoading, onReturnRequest }) {
    // State to track selected items for return
    const [selectedItemsForReturn, setSelectedItemsForReturn] = useState(new Set());

    // Handler for checkbox changes
    const handleCheckboxChange = (itemId) => {
        setSelectedItemsForReturn(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            console.log("Selected items for return:", newSet); // Log selection
            return newSet;
        });
    };

    // Loading state display
    if (isLoading) {
        return (
            <div className="mt-6 p-4 border rounded-md shadow bg-white text-center text-gray-500">
                Loading order details...
            </div>
        );
    }

    // No details display
    if (!orderDetails) return (
        <div className="mt-6 p-4 border rounded-md shadow bg-white text-center text-gray-500">
            Order details not available.
        </div>
    );

    // Destructure safely after confirming orderDetails exists
    const {
        id, status, createdAt, marketplace, marketplaceOrderIds = [],
        total, subtotal, tax, shipping,
        lineItems = [], shipments = [], events = [], returns = []
    } = orderDetails;

    // Determine which items are potentially eligible for return
    const isItemPotentiallyEligible = (itemId) => {
        // Basic check: Not already part of an existing return request (regardless of status)
        const isInExistingReturn = returns.some(ret =>
            ret.lineItems?.some(li => (li.productId || li.variantId) === itemId)
        );
        // Add other conditions here if needed (e.g., return window check based on createdAt/shippedAt)
        return !isInExistingReturn;
    };

    // Check if *any* item is potentially eligible for return
    const anyItemEligibleForReturn = lineItems.some(item => isItemPotentiallyEligible(item.productId || item.variantId));


    return (
        <div className="mt-4 p-4 border rounded-md shadow-lg bg-white transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col"> {/* Added max-height and flex */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b flex-shrink-0"> {/* Header */}
                <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold" aria-label="Close">×</button>
            </div>

            <div className="overflow-y-auto flex-grow pr-2 space-y-4"> {/* Scrollable Content Area */}
                <p className="text-xs text-gray-500 mb-1">Rye Order ID: <span className="font-mono">{id}</span></p>

                {/* Summary Section */}
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
                        <span>Subtotal: {formatCurrency(subtotal?.value, subtotal?.currency)}</span>
                        <span>Shipping: {formatCurrency(shipping?.value, shipping?.currency)}</span>
                        <span>Tax: {formatCurrency(tax?.value, tax?.currency)}</span>
                        <strong className="text-base">Total: {formatCurrency(total?.value, total?.currency)}</strong>
                    </div>
                </div>

                {/* Items Section */}
                <div className="mb-2">
                    <h4 className="font-semibold text-base mb-2 text-gray-700">Items Ordered</h4>
                    {lineItems.length > 0 ? (
                        <div className="space-y-2">
                            {lineItems.map((item, index) => {
                                const isShopifyItem = !!item.variantId;
                                const itemId = isShopifyItem ? item.variantId : item.productId;
                                const itemTitle = isShopifyItem ? item.variant?.title : (item.product?.title || `Item ID: ${itemId}`);
                                const itemImageUrl = isShopifyItem ? item.variant?.image?.url : item.product?.images?.[0]?.url;
                                const isEligible = isItemPotentiallyEligible(itemId);

                                return (
                                    <div key={`${itemId}-${index}`} className="flex items-center gap-3 text-sm border rounded p-2 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        {/* Checkbox (only if eligible) */}
                                        <div className='flex-shrink-0 w-5 flex justify-center items-center'>
                                            {isEligible ? (
                                                <input
                                                    type="checkbox"
                                                    id={`return-item-${itemId}`}
                                                    checked={selectedItemsForReturn.has(itemId)}
                                                    onChange={() => handleCheckboxChange(itemId)}
                                                    className="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded border-gray-300 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <span title="Item not eligible for return (e.g., already returned)" className="text-gray-400 text-lg">✓</span> // Indicate already returned/ineligible
                                            )}
                                        </div>
                                        {/* Image */}
                                        <div className='w-12 h-12 relative flex-shrink-0 border rounded bg-white'>
                                            {itemImageUrl ? (
                                                <Image src={itemImageUrl} alt={itemTitle.substring(0, 20)} fill style={{ objectFit: 'contain' }} sizes="48px" onError={(e) => e.currentTarget.src = '/placeholder-image.png'} />
                                            ) : <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Img</div>}
                                        </div>
                                        {/* Details */}
                                        <div className='flex-grow'>
                                            <p className="font-medium text-gray-800 leading-tight">{itemTitle}</p>
                                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        {/* Price */}
                                        <p className="font-medium text-gray-700 flex-shrink-0">{item.price?.displayValue}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-gray-500 italic">No item details available.</p>}
                </div>

                {/* Shipments Section */}
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

                {/* Returns Section */}
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

                {/* Event History (Collapsible) */}
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
            </div> {/* End Scrollable Area */}


            {/* --- Return Request Button --- */}
            {anyItemEligibleForReturn && (
                <div className="mt-4 pt-3 border-t flex-shrink-0"> {/* Footer Area */}
                    <button
                        onClick={() => {
                            // Find the full item details for selected IDs
                            const itemsToSubmit = lineItems
                                .filter(item => selectedItemsForReturn.has(item.productId || item.variantId))
                                .map(item => ({
                                    id: item.productId || item.variantId, // Use the correct ID based on type
                                    quantity: item.quantity // Assuming full quantity return for now
                                    // Future: Could add a quantity input per item for partial returns
                                }));

                            if (itemsToSubmit.length > 0 && onReturnRequest) {
                                onReturnRequest(id, marketplace, itemsToSubmit); // Pass orderId, marketplace, and selected items
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
            {/* --- End Return Request Button --- */}

        </div>
    );
}

// --- Add PropTypes ---
const moneyType = PropTypes.shape({
    value: PropTypes.number,
    currency: PropTypes.string,
    displayValue: PropTypes.string, // Add if used directly
});

const lineItemType = PropTypes.shape({
    productId: PropTypes.string, // For Amazon
    variantId: PropTypes.string, // For Shopify
    quantity: PropTypes.number,
    price: moneyType,
    // Include nested product/variant details if accessed directly
    product: PropTypes.shape({
        title: PropTypes.string,
        images: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
    }),
    variant: PropTypes.shape({
        title: PropTypes.string,
        image: PropTypes.shape({ url: PropTypes.string }),
    }),
});

OrderDetailDisplay.propTypes = {
    orderDetails: PropTypes.shape({
        id: PropTypes.string.isRequired,
        status: PropTypes.string,
        createdAt: PropTypes.string,
        marketplace: PropTypes.string,
        marketplaceOrderIds: PropTypes.arrayOf(PropTypes.string),
        total: moneyType,
        subtotal: moneyType,
        tax: moneyType,
        shipping: moneyType,
        lineItems: PropTypes.arrayOf(lineItemType),
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
            // Define other event properties if needed
        })),
        returns: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            status: PropTypes.string,
            shippingLabelUrl: PropTypes.string,
            lineItems: PropTypes.arrayOf(PropTypes.shape({ // Nested line items for returns
                productId: PropTypes.string,
                variantId: PropTypes.string,
                quantity: PropTypes.number,
                status: PropTypes.string,
            })),
        })),
    }),
    onClose: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    onReturnRequest: PropTypes.func, // Optional depending on if return feature is always enabled
};

OrderDetailDisplay.defaultProps = {
    isLoading: false,
    onReturnRequest: null,
    orderDetails: null,
};