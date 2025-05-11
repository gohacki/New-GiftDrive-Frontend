// components/Cards/DriveItemCard.js

import React from 'react';
import PropTypes from 'prop-types';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';

const DriveItemCard = ({ item, onDeleteItem, onUpdateQuantity, onDriveItemUpdated, driveId }) => {
  const { openModal } = useModal();

  // Extract display properties from item.display, providing fallbacks.
  // This makes the JSX cleaner and handles cases where display might be unexpectedly missing.
  const itemName = item.display?.name || 'Unnamed Item';
  const itemPhoto = item.display?.photo; // Can be null/undefined, handled by conditional rendering
  const itemDescription = item.display?.description || '';
  // Price: display.price is numeric for preset items, null for donor choice items.
  const itemPrice = typeof item.display?.price === 'number' ? item.display.price : null;

  // 'needed' is the quantity of this item needed for the drive.
  // The +/- buttons should update this 'needed' quantity.
  const neededQuantity = item.needed;

  const handleRemove = (e) => {
    e.stopPropagation();
    onDeleteItem(item.drive_item_id);
  };

  // Functions to update the 'needed' quantity
  const incrementNeeded = () => {
    if (onUpdateQuantity) {
      // The onUpdateQuantity function should expect the new 'needed' value
      onUpdateQuantity(item.drive_item_id, neededQuantity + 1);
    }
  };

  const decrementNeeded = () => {
    // Assuming 'needed' quantity cannot go below 1. Adjust if 0 is allowed.
    if (onUpdateQuantity && neededQuantity > 1) {
      onUpdateQuantity(item.drive_item_id, neededQuantity - 1);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    openModal(MODAL_TYPES.ADD_OR_EDIT_DRIVE_ITEM, {
      driveId: driveId,
      existingDriveItem: item, // Pass the original item structure from API
      onSave: () => {
        // onDriveItemUpdated is optional; the list refresh is usually handled by DriveItemList's modal onSave
        if (onDriveItemUpdated) onDriveItemUpdated();
      },
    });
  };

  return (
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded shadow hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        {/* Use extracted itemPhoto */}
        {itemPhoto && (
          <img
            src={itemPhoto}
            alt={itemName} // Use extracted itemName for alt text
            className="w-16 h-16 object-cover rounded"
          />
        )}
        <div>
          {/* Use extracted itemName */}
          <h5 className="text-lg font-semibold">{itemName}</h5>
          {/* Use extracted itemDescription */}
          <p className="text-gray-600 text-sm">{itemDescription}</p>
          {/* Check and display extracted itemPrice */}
          {itemPrice !== null && (
            <p className="text-gray-800 font-bold">${itemPrice.toFixed(2)}</p>
          )}
          {/* Display and manage 'needed' quantity */}
          {/* Show +/- controls only if onUpdateQuantity is provided (meaning it's editable) */}
          {typeof neededQuantity === 'number' && onUpdateQuantity && (
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={decrementNeeded}
                className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                aria-label={`Decrease needed quantity of ${itemName}`}
              >
                -
              </button>
              {/* Display the 'needed' quantity */}
              <span>{neededQuantity}</span>
              <button
                onClick={incrementNeeded}
                className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                aria-label={`Increase needed quantity of ${itemName}`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-2"> {/* Group buttons */}
        <button
          onClick={handleEdit}
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
        >
          Edit
        </button>
        <button
          onClick={handleRemove}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

// Update PropTypes to reflect the actual structure from the API
DriveItemCard.propTypes = {
  item: PropTypes.shape({
    drive_item_id: PropTypes.number.isRequired,
    needed: PropTypes.number, // This is the "quantity" needed for the drive
    // Other top-level properties like 'purchased', 'remaining', 'allow_donor_variant_choice' are also expected
    display: PropTypes.shape({
      name: PropTypes.string,
      photo: PropTypes.string,
      description: PropTypes.string,
      price: PropTypes.number, // Numeric price for preset, null for donor choice
      priceDisplay: PropTypes.string, // e.g., "Select Option" or formatted price string
    }),
    // preset_details could also be part of the item structure if it's a preset item
    preset_details: PropTypes.object,
  }).isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func, // Optional: for updating the 'needed' quantity
  onDriveItemUpdated: PropTypes.func, // Optional: callback after modal save (usually handled by parent list)
  driveId: PropTypes.number.isRequired, // Passed from DriveItemList for modal context
};

export default DriveItemCard;