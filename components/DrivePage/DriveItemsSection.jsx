// components/DrivePage/DriveItemsSection.jsx
import React from 'react';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';

const DriveItemsSection = ({
    items,
    cart,
    cartLoading,
    itemKeyType,
    selectedRyeVariants,
    availableRyeVariantsInfo,
    isLoadingVariants,
    itemQuantities,
    isAddingToCart,
    isRemovingFromCart,
    onAddToCart,
    onRemoveFromCart,
    onFetchVariants,
    onVariantSelect,
    onQuantityChange,
    isThisSpecificNeedInCart, // Pass the helper function
}) => {
    if (!items || items.length === 0) {
        return null; // Or a message like "No specific drive items listed."
    }

    return (
        <section>
            <h2 className="text-2xl font-semibold text-ggreen mb-4">
                Items Needed for the Drive
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((itemNeed) => (
                    <DriveItemCard
                        key={itemNeed[itemKeyType]}
                        itemNeed={itemNeed}
                        itemKeyType={itemKeyType}
                        isInCart={isThisSpecificNeedInCart(itemNeed, cart, itemKeyType)}
                        currentQuantity={itemQuantities[itemNeed[itemKeyType]] || 1}
                        isLoadingVariantsForItem={isLoadingVariants[itemNeed[itemKeyType]]}
                        isAddingToCartForItem={isAddingToCart[itemNeed[itemKeyType]]}
                        isRemovingFromCartForItem={isRemovingFromCart[itemNeed[itemKeyType]]}
                        cartLoading={cartLoading}
                        availableVariantInfoForItem={availableRyeVariantsInfo[itemNeed[itemKeyType]]}
                        selectedVariantForItem={selectedRyeVariants[itemNeed[itemKeyType]]}
                        onAddToCart={onAddToCart}
                        onRemoveFromCart={onRemoveFromCart}
                        onFetchVariants={onFetchVariants}
                        onVariantSelect={onVariantSelect}
                        onQuantityChange={onQuantityChange}
                    />
                ))}
            </div>
        </section>
    );
};

DriveItemsSection.propTypes = {
    items: PropTypes.array.isRequired,
    cart: PropTypes.object,
    cartLoading: PropTypes.bool,
    itemKeyType: PropTypes.string.isRequired,
    selectedRyeVariants: PropTypes.object.isRequired,
    availableRyeVariantsInfo: PropTypes.object.isRequired,
    isLoadingVariants: PropTypes.object.isRequired,
    itemQuantities: PropTypes.object.isRequired,
    isAddingToCart: PropTypes.object.isRequired,
    isRemovingFromCart: PropTypes.object.isRequired,
    onAddToCart: PropTypes.func.isRequired,
    onRemoveFromCart: PropTypes.func.isRequired,
    onFetchVariants: PropTypes.func.isRequired,
    onVariantSelect: PropTypes.func.isRequired,
    onQuantityChange: PropTypes.func.isRequired,
    isThisSpecificNeedInCart: PropTypes.func.isRequired,
};

export default DriveItemsSection;