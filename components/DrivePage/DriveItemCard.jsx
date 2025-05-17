// File: components/DrivePage/DriveItemCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-toastify';

const DriveItemCard = ({
    itemNeed,
    itemKeyType,
    isInCart,
    isAddingToCartForItem,
    cartLoading,
    onAddToCart,
    // Removed onQuantityChange as it's not in the new design
}) => {
    const isCompletelyFulfilled = itemNeed.remaining <= 0;

    const displayName = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";
    const displayPhoto = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';
    const displayPrice = itemNeed.variant_display_price !== null ? itemNeed.variant_display_price : itemNeed.base_item_price;

    const canAddToCartOnline = !isCompletelyFulfilled && !isInCart && itemNeed.is_rye_linked;
    const actionButtonLoading = isAddingToCartForItem || cartLoading;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full border border-gray-200">
            <div className="relative w-full h-48 bg-slate-100"> {/* Changed background for better contrast if image is transparent */}
                <Image
                    src={displayPhoto}
                    alt={displayName}
                    fill
                    style={{ objectFit: "contain" }}
                    className="p-2" // Added padding around image within its container
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 30vw"
                    onError={(e) => { e.currentTarget.src = '/img/default-item.png'; e.currentTarget.alt = 'Image load error'; }}
                />
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-slate-900 font-semibold text-base mb-1 line-clamp-2" title={displayName}>
                    {displayName}
                </h3>

                {displayPrice !== null && (
                    <p className="text-xl font-bold text-slate-800 mb-4"> {/* Price styled to be prominent */}
                        {formatCurrency(displayPrice * 100, 'USD')}
                    </p>
                )}

                <div className="mt-auto pt-2 space-y-2.5"> {/* Added space-y for button and link */}
                    {itemNeed.is_rye_linked ? (
                        <button
                            onClick={() => {
                                onAddToCart(itemNeed, itemKeyType);
                            }}
                            disabled={!canAddToCartOnline || actionButtonLoading || isCompletelyFulfilled}
                            className={`w-full px-3 py-2.5 text-sm font-semibold rounded-md shadow-sm transition-colors
                                ${(!canAddToCartOnline || actionButtonLoading || isCompletelyFulfilled)
                                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                    : 'bg-white text-ggreen border-2 border-ggreen hover:bg-ggreen hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500'
                                }
                                ${actionButtonLoading ? 'animate-pulse' : ''}
                            `}
                        >
                            {actionButtonLoading ? 'Processing...' : (isInCart ? 'In Cart' : (isCompletelyFulfilled ? 'Fulfilled' : 'Add to Cart'))}
                        </button>
                    ) : (
                        <button
                            disabled={true}
                            className="w-full px-3 py-2.5 text-sm font-semibold rounded-md shadow-sm bg-slate-300 text-slate-600 cursor-not-allowed"
                        >
                            {isCompletelyFulfilled ? 'Fulfilled' : 'Unavailable Online'}
                        </button>
                    )}

                    <button
                        onClick={() => toast.info("Please contact the organization for in-person purchase options.")}
                        className="w-full text-center text-ggreen hover:text-teal-700 hover:underline text-xs font-medium"
                    >
                        Purchase in person
                    </button>
                </div>
            </div>
        </div>
    );
};

DriveItemCard.propTypes = {
    itemNeed: PropTypes.shape({
        drive_item_id: PropTypes.number,
        child_item_id: PropTypes.number,
        base_item_name: PropTypes.string,
        variant_display_name: PropTypes.string,
        base_item_photo: PropTypes.string,
        variant_display_photo: PropTypes.string,
        base_item_price: PropTypes.number,
        variant_display_price: PropTypes.number,
        is_rye_linked: PropTypes.bool,
        remaining: PropTypes.number,
        selected_rye_variant_id: PropTypes.string,
        selected_rye_marketplace: PropTypes.string,
    }).isRequired,
    itemKeyType: PropTypes.string.isRequired,
    isInCart: PropTypes.bool.isRequired,
    isAddingToCartForItem: PropTypes.bool,
    cartLoading: PropTypes.bool,
    onAddToCart: PropTypes.func.isRequired,
};

export default DriveItemCard;