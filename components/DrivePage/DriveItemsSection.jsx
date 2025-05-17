// components/DrivePage/DriveItemsSection.jsx
import React from 'react';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';

const DriveItemsSection = ({
    items,
    cart,
    cartLoading,
    itemKeyType,
    // Removed variant-related props
    isAddingToCart,
    onAddToCart,
    isThisSpecificNeedInCart,
}) => {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <section>
            {/* Title can be removed if not needed, as per screenshot it's implicitly "Items" */}
            {/* <h2 className="text-2xl font-semibold text-ggreen mb-4">
                Items Needed for the Drive
            </h2> */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6"> {/* Adjusted gap for potentially more items */}
                {items.map((itemNeed) => (
                    <DriveItemCard
                        key={itemNeed[itemKeyType]}
                        itemNeed={itemNeed}
                        itemKeyType={itemKeyType}
                        isInCart={isThisSpecificNeedInCart(itemNeed, cart, itemKeyType)}
                        // currentQuantity might not be needed if no qty input on card
                        // currentQuantity={itemQuantities[itemNeed[itemKeyType]] || 1} 
                        isAddingToCartForItem={isAddingToCart[itemNeed[itemKeyType]]}
                        // isRemovingFromCartForItem={isRemovingFromCart[itemNeed[itemKeyType]]} // Not used by simplified card
                        cartLoading={cartLoading}
                        onAddToCart={onAddToCart}
                    // onRemoveFromCart is not directly callable from the simplified card
                    // onQuantityChange is not used by simplified card
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
    itemQuantities: PropTypes.object.isRequired, // If quantity input remains on card
    isAddingToCart: PropTypes.object.isRequired,
    isRemovingFromCart: PropTypes.object.isRequired, // Still needed if removal is managed centrally
    onAddToCart: PropTypes.func.isRequired,
    onRemoveFromCart: PropTypes.func.isRequired, // Still needed if removal is managed centrally
    onQuantityChange: PropTypes.func.isRequired, // If quantity input remains on card
    isThisSpecificNeedInCart: PropTypes.func.isRequired,
};

export default DriveItemsSection;