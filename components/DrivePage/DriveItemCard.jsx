// File: components/DrivePage/DriveItemCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

const DriveItemCard = ({
    itemNeed,
    itemKeyType, // Used to uniquely identify the item source (drive_item_id or child_item_id)
    isInCart,
    isAddingToCartForItem,
    cartLoading,
    onAddToCart,
}) => {
    const isCompletelyFulfilled = itemNeed.remaining <= 0;

    // --- MODIFIED: Logic for display name and photo ---
    const baseName = itemNeed.base_item_name || "Item";
    const variantName = itemNeed.variant_display_name;

    // Main display name is always the base product name
    const displayName = baseName;

    // Variant subline is shown only if variantName exists and is different from baseName
    const variantSubline = (variantName && variantName !== baseName) ? variantName : null;

    // Photo: Prioritize variant-specific, then base, then placeholder
    const displayPhoto = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';

    // Price: Prioritize variant-specific, then base
    const displayPrice = itemNeed.variant_display_price !== null ? itemNeed.variant_display_price : itemNeed.base_item_price;
    // --- END MODIFIED ---

    const canAddToCartOnline = !isCompletelyFulfilled && !isInCart && itemNeed.is_rye_linked;
    const actionButtonLoading = isAddingToCartForItem || cartLoading;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full border border-ggreen">
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-slate-900 text-center font-semibold text-base mb-0.5 line-clamp-2" title={displayName}>
                    {displayName}
                </h3>
                {variantSubline ? (
                    <p className="text-slate-600 text-center text-xs mb-1 line-clamp-1" title={variantSubline}>
                        {variantSubline}
                    </p>
                ) : (
                    <div className="h-4">
                    </div>
                )}
            </div>
            <div className="relative w-full h-48">
                <Image
                    src={displayPhoto}
                    alt={displayName} // Use base name for alt text
                    fill
                    style={{ objectFit: "contain" }}
                    className="p-2"
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 30vw"
                    onError={(e) => { e.currentTarget.src = '/img/default-item.png'; e.currentTarget.alt = 'Image load error'; }}
                />
            </div>

            <div className="p-4 flex flex-col flex-grow">

                {displayPrice !== null && (
                    <p className="text-xl text-center font-bold text-slate-800 mb-2">
                        {formatCurrency(displayPrice * 100, 'USD')}
                    </p>
                )}

                <div className="mt-auto pt-2 space-y-2.5">
                    {itemNeed.is_rye_linked ? (
                        <button
                            onClick={() => {
                                // Ensure itemKeyType is correctly passed and used by onAddToCart
                                onAddToCart(itemNeed, itemKeyType);
                            }}
                            disabled={!canAddToCartOnline || actionButtonLoading || isCompletelyFulfilled}
                            className={`w-full px-3 py-2.5 text-sm font-semibold rounded-full shadow-sm transition-colors
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
    itemKeyType: PropTypes.string.isRequired, // e.g., 'drive_item_id' or 'child_item_id'
    isInCart: PropTypes.bool.isRequired,
    isAddingToCartForItem: PropTypes.bool,
    cartLoading: PropTypes.bool,
    onAddToCart: PropTypes.func.isRequired,
};

export default DriveItemCard;