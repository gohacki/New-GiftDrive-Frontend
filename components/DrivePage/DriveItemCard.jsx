// File: components/DrivePage/DriveItemCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

const DriveItemCard = ({
    itemNeed,
    itemKeyType,
    isInCart,
    isAddingToCartForItem,
    cartLoading,
    onAddToCart,
    // Removed onQuantityChange if not used for direct quantity input on this card
}) => {
    const isCompletelyFulfilled = itemNeed.remaining <= 0;

    // --- Display Logic ---
    // Prioritize base_item_name from `items` table for consistency and freshness
    const baseName = itemNeed.base_item_name || "Item";
    // Variant display name from drive_items/child_items (snapshot/override)
    const variantSpecificName = itemNeed.variant_display_name;

    // Final display name: Show base name. If variant name is different, show it as a sub-line.
    const displayName = baseName;
    const variantSubline = (variantSpecificName && variantSpecificName !== baseName) ? variantSpecificName : null;

    // Photo: Prioritize variant_display_photo (snapshot/override), then base_item_photo (fresher from `items`), then placeholder
    const displayPhoto = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';

    // Price: Prioritize variant_display_price (snapshot/override), then base_item_price (fresher from `items`)
    // This handles sales: if variant_display_price was set when item added, it's used.
    // If not, or if you want freshest, then base_item_price from `items` (updated by webhook) is used.
    const displayPrice = itemNeed.variant_display_price !== null && itemNeed.variant_display_price !== undefined
        ? itemNeed.variant_display_price
        : (itemNeed.base_item_price !== null && itemNeed.base_item_price !== undefined
            ? itemNeed.base_item_price
            : null);
    // --- End Display Logic ---


    const canAddToCartOnline = !isCompletelyFulfilled && !isInCart && itemNeed.is_rye_linked; // is_rye_linked comes from items table
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
                    <div className="h-4"> {/* Placeholder for consistent height if no subline */}
                    </div>
                )}
            </div>
            <div className="relative w-full h-48">
                <Image
                    src={displayPhoto}
                    alt={displayName}
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
                        {formatCurrency(displayPrice * 100, 'USD')} {/* Assuming price is in main unit */}
                    </p>
                )}
                <div className="mt-auto pt-2 space-y-2.5">
                    {itemNeed.is_rye_linked ? ( // This comes from items.is_rye_linked via the service functions
                        <button
                            onClick={() => onAddToCart(itemNeed, itemKeyType)}
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
        drive_item_id: PropTypes.number, // For drive-specific items
        child_item_id: PropTypes.number, // For child-specific items
        base_item_name: PropTypes.string, // From joined items table
        variant_display_name: PropTypes.string, // From drive_items/child_items (admin's snapshot)
        base_item_photo: PropTypes.string, // From joined items table
        variant_display_photo: PropTypes.string, // From drive_items/child_items (admin's snapshot)
        base_item_price: PropTypes.number, // From joined items table (webhook updatable)
        variant_display_price: PropTypes.number, // From drive_items/child_items (admin's snapshot)
        is_rye_linked: PropTypes.bool, // From joined items table (webhook updatable)
        remaining: PropTypes.number, // Calculated (needed - purchased)
        // These are crucial for adding to cart
        selected_rye_variant_id: PropTypes.string.isRequired,
        selected_rye_marketplace: PropTypes.string.isRequired,
        base_rye_product_id: PropTypes.string, // For context, from items table
    }).isRequired,
    itemKeyType: PropTypes.string.isRequired,
    isInCart: PropTypes.bool.isRequired,
    isAddingToCartForItem: PropTypes.bool,
    cartLoading: PropTypes.bool,
    onAddToCart: PropTypes.func.isRequired,
};

export default DriveItemCard;