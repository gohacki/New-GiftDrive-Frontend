// components/Cards/DriveItemCard.js
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image'; // Import Next.js Image
import { formatCurrency } from '@/lib/utils'; // Assuming you have this utility

const DriveItemCard = ({ item, onDeleteItem, onUpdateQuantity, onEditItem }) => {

  // Base product details (fallbacks if not present)
  const baseName = item.base_item_name || 'Unnamed Product';
  const basePhoto = item.base_item_photo || '/img/default-item.png'; // Default placeholder
  const basePrice = typeof item.base_item_price === 'number' ? item.base_item_price : null;
  const baseDescription = item.base_item_description || '';

  // Variant-specific details (if they exist and are different from base)
  const variantName = item.variant_display_name;
  const variantPhoto = item.variant_display_photo;
  const variantPrice = typeof item.variant_display_price === 'number' ? item.variant_display_price : null;

  // Determine final display values, prioritizing variant-specific ones
  const displayItemName = baseName; // Always show base name as main title
  const displayItemPhoto = variantPhoto || basePhoto;
  const displayItemPrice = variantPrice !== null ? variantPrice : basePrice;

  // Show variant name as a sub-line if it's distinct and not just repeating the base name
  const showVariantSubline = variantName && variantName !== baseName;

  const triggerEdit = (e) => {
    if (e) e.stopPropagation();
    onEditItem(item, e);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onDeleteItem(item.drive_item_id);
  };

  const incrementNeeded = (e) => {
    e.stopPropagation();
    if (onUpdateQuantity) {
      onUpdateQuantity(item.drive_item_id, (item.needed || 0) + 1);
    }
  };

  const decrementNeeded = (e) => {
    e.stopPropagation();
    if (onUpdateQuantity && (item.needed || 0) > 1) {
      onUpdateQuantity(item.drive_item_id, (item.needed || 0) - 1);
    }
  };

  return (
    <div
      className="flex justify-between items-center bg-gray-50 p-4 rounded shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={triggerEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerEdit(e);
        }
      }}
    >
      <div className="flex items-center space-x-4 flex-grow min-w-0"> {/* Added flex-grow and min-w-0 for truncation */}
        {displayItemPhoto && (
          <div className="w-16 h-16 relative flex-shrink-0 rounded overflow-hidden border bg-white">
            <Image
              src={displayItemPhoto}
              alt={displayItemName}
              fill
              style={{ objectFit: 'contain' }}
              sizes="64px"
              onError={(e) => { e.currentTarget.src = '/img/default-item.png'; }}
            />
          </div>
        )}
        <div className="flex-grow min-w-0"> {/* Added min-w-0 for truncation context */}
          <h5 className="text-lg font-semibold truncate" title={displayItemName}>{displayItemName}</h5>
          {showVariantSubline && (
            <p className="text-sm text-gray-600 truncate" title={variantName}>{variantName}</p>
          )}
          <p className="text-xs text-gray-500 truncate">{baseDescription}</p> {/* Base description */}

          {displayItemPrice !== null && (
            <p className="text-gray-700 font-medium">{formatCurrency(displayItemPrice * 100, 'USD')}</p> // Assuming price is in main unit
          )}

          {typeof item.needed === 'number' && onUpdateQuantity && (
            <div className="mt-2 flex items-center space-x-2">
              <button onClick={decrementNeeded} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm" aria-label={`Decrease needed quantity of ${displayItemName}`}>-</button>
              <span className="text-sm">{item.needed} needed</span>
              <button onClick={incrementNeeded} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm" aria-label={`Increase needed quantity of ${displayItemName}`}>+</button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Purchased: {item.purchased || 0}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 ml-4">
        <button
          onClick={triggerEdit}
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
        >
          Edit
        </button>
        <button
          onClick={handleRemove}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

DriveItemCard.propTypes = {
  item: PropTypes.shape({
    drive_item_id: PropTypes.number.isRequired,
    item_id: PropTypes.number, // FK to base item in your items table
    base_item_name: PropTypes.string,
    base_item_photo: PropTypes.string,
    base_item_price: PropTypes.number,
    base_item_description: PropTypes.string,
    variant_display_name: PropTypes.string,
    variant_display_photo: PropTypes.string,
    variant_display_price: PropTypes.number,
    needed: PropTypes.number,
    purchased: PropTypes.number,
    // ... other fields like selected_rye_variant_id if needed by onEditItem
  }).isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func,
  onEditItem: PropTypes.func.isRequired,
  // driveId: PropTypes.number.isRequired, // Not directly used by card, but often passed to list
};

export default DriveItemCard;