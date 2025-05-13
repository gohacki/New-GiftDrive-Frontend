// components/DrivePage/DriveItemCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const DriveItemCard = ({
    itemNeed,
    itemKeyType,
    isInCart,
    currentQuantity,
    isLoadingVariantsForItem,
    isAddingToCartForItem,
    isRemovingFromCartForItem,
    cartLoading,
    availableVariantInfoForItem,
    selectedVariantForItem,
    onAddToCart,
    onRemoveFromCart,
    onFetchVariants,
    onVariantSelect,
    onQuantityChange,
}) => {
    const itemKey = itemNeed[itemKeyType];
    const isCompletelyFulfilled = itemNeed.remaining <= 0;
    const isItemActionLoading = isLoadingVariantsForItem || isAddingToCartForItem || isRemovingFromCartForItem || cartLoading;

    const isNotPurchaseableOnline = !itemNeed.is_rye_linked || (itemNeed.allow_donor_variant_choice && !selectedVariantForItem && availableVariantInfoForItem?.variants?.some(v => v.isAvailable));
    const cardIsVisuallyDisabledForAdding = isCompletelyFulfilled || isNotPurchaseableOnline;

    let actionButtons;

    if (isCompletelyFulfilled) {
        actionButtons = (
            <button
                disabled={true}
                className="w-full px-3 py-2 text-white rounded-md shadow-sm inter-medium text-xs font-semibold bg-green-500 cursor-not-allowed"
            >
                Fulfilled
            </button>
        );
    } else if (isInCart) {
        actionButtons = (
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Link href="/visible/cart" passHref legacyBehavior>
                    <a className="flex-1 text-center px-3 py-1.5 text-ggreen border-2 border-ggreen rounded-md shadow-sm transition-colors inter-medium text-xs font-semibold hover:bg-ggreen hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500">
                        View Cart
                    </a>
                </Link>
                <button
                    onClick={() => onRemoveFromCart(itemNeed, itemKeyType)}
                    disabled={isItemActionLoading}
                    className={`flex-1 px-3 py-1.5 text-white rounded-md shadow-sm transition-colors inter-medium text-xs font-semibold 
                      focus:outline-none focus:ring-2 focus:ring-offset-1
                      ${isItemActionLoading ? 'bg-gray-400 cursor-wait' : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'}`}
                >
                    {isRemovingFromCartForItem ? 'Removing...' : 'Remove'}
                </button>
            </div>
        );
    } else {
        const effectiveDisabledStateForAdd = cardIsVisuallyDisabledForAdding || isItemActionLoading || currentQuantity > (itemNeed.remaining || 0);
        actionButtons = (
            <>
                {itemNeed.needed > 1 && (
                    <div className="flex items-center justify-center mb-2">
                        <label htmlFor={`quantity-${itemKeyType}-${itemKey}`} className="mr-2 text-xs text-gray-700">Qty:</label>
                        <input
                            type="number"
                            id={`quantity-${itemKeyType}-${itemKey}`}
                            min="1"
                            max={itemNeed.remaining > 0 ? itemNeed.remaining : 1}
                            value={currentQuantity}
                            onChange={(e) => onQuantityChange(itemKey, e.target.value, itemNeed.remaining)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen text-xs disabled:bg-gray-200"
                            disabled={cardIsVisuallyDisabledForAdding || isItemActionLoading}
                        />
                    </div>
                )}
                <button
                    onClick={() => onAddToCart(itemNeed, itemKeyType)}
                    disabled={effectiveDisabledStateForAdd}
                    className={`w-full px-3 py-2 text-white rounded-md shadow-sm transition-colors inter-medium text-xs font-semibold
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${effectiveDisabledStateForAdd ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-ggreen hover:bg-teal-700 focus:ring-teal-600'}
                      ${isAddingToCartForItem ? 'animate-pulse cursor-wait' : ''}`}
                >
                    {isAddingToCartForItem ? 'Adding...' : 'Add to Cart'}
                </button>
            </>
        );
    }

    const baseName = itemNeed.base_item_name || 'Item';
    const variantName = itemNeed.variant_display_name;
    const showVariantSubline = variantName && variantName !== baseName;
    const photoToDisplay = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';
    const priceToDisplay = itemNeed.variant_display_price !== null ? itemNeed.variant_display_price : itemNeed.base_item_price;
    const cardContentVisuallyDisabled = cardIsVisuallyDisabledForAdding && !isCompletelyFulfilled;

    return (
        <div
            className={`border-2 p-4 rounded-lg shadow-sm flex flex-col justify-between transition-shadow
                  ${cardContentVisuallyDisabled && !isInCart ? 'bg-gray-100 opacity-70 border-gray-300 pointer-events-none'
                    : isCompletelyFulfilled ? 'bg-green-50 border-green-300 opacity-80 pointer-events-none'
                        : 'border-ggreen bg-white hover:shadow-md'
                }`}
        >
            <div className="flex-grow" aria-disabled={cardContentVisuallyDisabled && !isInCart}>
                {photoToDisplay && (
                    <div className="flex justify-center mb-4 h-32 relative">
                        <Image src={photoToDisplay} alt={baseName} fill style={{ objectFit: "contain" }} className="rounded-md" onError={(e) => e.currentTarget.src = '/img/default-item.png'} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 30vw" />
                    </div>
                )}
                <h3 className="text-lg text-ggreen font-medium mb-1 line-clamp-2 h-12" title={baseName}>{baseName}</h3>
                {showVariantSubline && (
                    <p className="text-sm text-gray-500 mb-1 line-clamp-1" title={variantName}>{variantName}</p>
                )}
                {itemNeed.allow_donor_variant_choice && !isCompletelyFulfilled && !isInCart && (
                    <>
                        <button
                            onClick={() => onFetchVariants(itemNeed, itemKey)}
                            className="text-xs text-blue-600 hover:underline mb-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isLoadingVariantsForItem || cardContentVisuallyDisabled || isItemActionLoading}
                        >
                            {isLoadingVariantsForItem ? 'Loading Options...' : (availableVariantInfoForItem ? 'Change Options' : 'Select Options')}
                        </button>
                        {availableVariantInfoForItem?.variants && (
                            <select
                                value={selectedVariantForItem || ''}
                                onChange={(e) => onVariantSelect(itemKey, e.target.value)}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-ggreen sm:text-xs mb-2 disabled:bg-gray-200"
                                disabled={cardContentVisuallyDisabled || isLoadingVariantsForItem || isItemActionLoading}
                            >
                                <option value="" disabled>Choose an option...</option>
                                {availableVariantInfoForItem.variants.filter(v => v.isAvailable).map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.title} ({formatCurrency(variant.priceV2?.value, variant.priceV2?.currency)})
                                    </option>
                                ))}
                                {availableVariantInfoForItem.variants.filter(v => v.isAvailable).length === 0 && (
                                    <option value="" disabled>No options currently available</option>
                                )}
                            </select>
                        )}
                    </>
                )}
                {priceToDisplay !== null && !itemNeed.allow_donor_variant_choice && (
                    <p className="text-gray-800 font-bold mb-1">{formatCurrency(priceToDisplay * 100, 'USD')}</p>
                )}
                <p className="text-gray-600 text-sm mb-2 line-clamp-3">{itemNeed.base_item_description || ''}</p>
                <p className="text-xs text-gray-500 mb-2">Needed: {itemNeed.needed} | Remaining: {itemNeed.remaining}</p>
                {isNotPurchaseableOnline && !isCompletelyFulfilled && !isInCart && (
                    <p className="text-xs text-orange-600 font-semibold mt-1">Item not available for online purchase.</p>
                )}
            </div>
            {(itemNeed.is_rye_linked || isInCart) && (
                <div className="mt-auto pt-2">
                    {actionButtons}
                </div>
            )}
        </div>
    );
};

DriveItemCard.propTypes = {
    itemNeed: PropTypes.object.isRequired,
    itemKeyType: PropTypes.string.isRequired,
    isInCart: PropTypes.bool.isRequired,
    currentQuantity: PropTypes.number.isRequired,
    isLoadingVariantsForItem: PropTypes.bool,
    isAddingToCartForItem: PropTypes.bool,
    isRemovingFromCartForItem: PropTypes.bool,
    cartLoading: PropTypes.bool,
    availableVariantInfoForItem: PropTypes.object,
    selectedVariantForItem: PropTypes.string,
    onAddToCart: PropTypes.func.isRequired,
    onRemoveFromCart: PropTypes.func.isRequired,
    onFetchVariants: PropTypes.func.isRequired,
    onVariantSelect: PropTypes.func.isRequired,
    onQuantityChange: PropTypes.func.isRequired,
};

export default DriveItemCard;