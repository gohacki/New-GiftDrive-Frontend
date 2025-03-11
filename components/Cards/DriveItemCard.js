// components/Cards/DriveItemCard.js

import React from 'react';
import PropTypes from 'prop-types';

const DriveItemCard = ({ item, onDeleteItem, onUpdateQuantity }) => {
  const handleRemove = (e) => {
    e.stopPropagation();
    onDeleteItem(item.drive_item_id);
  };

  // Example for updating quantity (if you store quantity on drive_items):
  const increment = () => {
    if (onUpdateQuantity) {
      onUpdateQuantity(item.drive_item_id, item.quantity + 1);
    }
  };
  const decrement = () => {
    if (onUpdateQuantity && item.quantity > 1) {
      onUpdateQuantity(item.drive_item_id, item.quantity - 1);
    }
  };

  return (
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded shadow hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        {item.item_photo && (
          <img
            src={item.item_photo}
            alt={item.item_name}
            className="w-16 h-16 object-cover rounded"
          />
        )}
        <div>
          <h5 className="text-lg font-semibold">{item.item_name}</h5>
          <p className="text-gray-600 text-sm">{item.description}</p>
          {typeof item.price === 'number' && (
            <p className="text-gray-800 font-bold">${item.price.toFixed(2)}</p>
          )}
          {/* If quantity is relevant */}
          {item.quantity !== undefined && (
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={decrement}
                className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={increment}
                className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleRemove}
        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
      >
        Remove
      </button>
    </div>
  );
};

DriveItemCard.propTypes = {
  item: PropTypes.shape({
    drive_item_id: PropTypes.number.isRequired,
    item_id: PropTypes.number.isRequired,
    item_name: PropTypes.string.isRequired,
    item_photo: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    quantity: PropTypes.number, // if storing quantity in drive_items
  }).isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func, // optional
};

export default DriveItemCard;
