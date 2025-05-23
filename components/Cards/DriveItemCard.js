// components/Cards/DriveItemCard.js
import React from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image'; // Import Next.js Image
import { formatCurrency } from '@/lib/utils'; // Assuming you have this utility
import { EyeSlashIcon } from '@heroicons/react/24/outline'; // For hidden icon

const DriveItemCard = ({ item, onDeleteItem, onUpdateQuantity, onEditItem, onHideItem }) => {

  const baseName = item.base_item_name || 'Unnamed Product';
  const basePhoto = item.base_item_photo || '/img/default-item.png';
  const basePrice = typeof item.base_item_price === 'number' ? item.base_item_price : null;
  const baseDescription = item.base_item_description || '';

  const variantName = item.variant_display_name;
  const variantPhoto = item.variant_display_photo;
  const variantPrice = typeof item.variant_display_price === 'number' ? item.variant_display_price : null;

  const displayItemName = baseName;
  const displayItemPhoto = variantPhoto || basePhoto;
  const displayItemPrice = variantPrice !== null ? variantPrice : basePrice;

  const showVariantSubline = variantName && variantName !== baseName;

  const triggerEdit = (e) => {
    if (e) e.stopPropagation();
    onEditItem(item, e);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    // Pass the full item to onDeleteItem so it can access purchased, needed, etc.
    onDeleteItem(item);
  };

  const incrementNeeded = (e) => {
    e.stopPropagation();
    if (onUpdateQuantity && !item.is_hidden_from_public) { // Prevent quantity update if hidden
      onUpdateQuantity(item.drive_item_id, (item.needed || 0) + 1);
    }
  };

  const decrementNeeded = (e) => {
    e.stopPropagation();
    // Prevent needed quantity from going below purchased quantity or 1
    const newNeeded = Math.max(item.purchased || 0, (item.needed || 0) - 1);
    if (newNeeded === 0 && (item.purchased || 0) > 0) { // If only purchased left, can't reduce to 0
      // Do nothing or toast a message
      return;
    }
    if (onUpdateQuantity && (item.needed || 0) > 1 && !item.is_hidden_from_public) { // Prevent quantity update if hidden
      if ((item.needed || 0) - 1 >= (item.purchased || 0)) {
        onUpdateQuantity(item.drive_item_id, (item.needed || 0) - 1);
      }
    }
  };

  return (
    <div
      className={`flex justify-between items-center p-4 rounded shadow hover:shadow-md transition-shadow ${item.is_hidden_from_public ? 'bg-gray-200 opacity-70' : 'bg-gray-50 cursor-pointer'}`}
      onClick={!item.is_hidden_from_public ? triggerEdit : undefined} // Disable click to edit if hidden
      role={!item.is_hidden_from_public ? "button" : undefined}
      tabIndex={!item.is_hidden_from_public ? 0 : undefined}
      onKeyDown={!item.is_hidden_from_public ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerEdit(e);
        }
      } : undefined}
    >
      <div className="flex items-center space-x-4 flex-grow min-w-0">
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
        <div className="flex-grow min-w-0">
          <h5 className="text-lg font-semibold truncate" title={displayItemName}>{displayItemName}</h5>
          {showVariantSubline && (
            <p className="text-sm text-gray-600 truncate" title={variantName}>{variantName}</p>
          )}
          <p className="text-xs text-gray-500 truncate">{baseDescription}</p>

          {displayItemPrice !== null && (
            <p className="text-gray-700 font-medium">{formatCurrency(displayItemPrice * 100, 'USD')}</p>
          )}

          {typeof item.needed === 'number' && onUpdateQuantity && !item.is_hidden_from_public && (
            <div className="mt-2 flex items-center space-x-2">
              <button onClick={decrementNeeded} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm" aria-label={`Decrease needed quantity of ${displayItemName}`}>-</button>
              <span className="text-sm">{item.needed} needed</span>
              <button onClick={incrementNeeded} className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm" aria-label={`Increase needed quantity of ${displayItemName}`}>+</button>
            </div>
          )}
          {item.is_hidden_from_public && (
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <EyeSlashIcon className="h-4 w-4 mr-1" /> Hidden (Needed: {item.needed})
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Purchased: {item.purchased || 0}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 ml-4">
        {!item.is_hidden_from_public && (
          <button
            onClick={triggerEdit}
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
          >
            Edit
          </button>
        )}
        {item.is_hidden_from_public && ( // Option to unhide could be an "Edit" or specific "Unhide" button
          <button
            onClick={() => onHideItem(item.drive_item_id, false)} // Assuming onHideItem handles unhiding
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs"
          >
            Unhide
          </button>
        )}
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
    item_id: PropTypes.number,
    base_item_name: PropTypes.string,
    base_item_photo: PropTypes.string,
    base_item_price: PropTypes.number,
    base_item_description: PropTypes.string,
    variant_display_name: PropTypes.string,
    variant_display_photo: PropTypes.string,
    variant_display_price: PropTypes.number,
    needed: PropTypes.number,
    purchased: PropTypes.number,
    is_hidden_from_public: PropTypes.bool, // Added hidden_from_public
  }).isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func,
  onEditItem: PropTypes.func.isRequired,
  onHideItem: PropTypes.func.isRequired, // New prop for hiding/unhiding
  onReduceNeeded: PropTypes.func.isRequired, // New prop for reducing needed qty
};

export default DriveItemCard;