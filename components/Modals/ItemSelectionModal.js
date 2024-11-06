import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ItemSelectionModal = ({ childId, onClose, onItemAdded }) => {
  const [defaultItems, setDefaultItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItemId, setLoadingItemId] = useState(null); // Track loading state per item
  const modalRef = useRef(null);

  // Focus management for accessibility
  useEffect(() => {
    if (modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, button');
      if (firstInput) firstInput.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchDefaultItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/items/`, {
        withCredentials: true,
      });
      setDefaultItems(response.data);
    } catch (error) {
      console.error('Error fetching default items:', error);
      // Optionally, set a global error message here
    }
  };

  useEffect(() => {
    fetchDefaultItems();
  }, []);

  const handleAddItem = async (itemId) => {
    setLoadingItemId(itemId); // Start loading for this specific item
    try {
      const response = await axios.post(
        `${apiUrl}/api/children/${childId}/items`,
        { rye_item_id: itemId },
        { withCredentials: true }
      );
      console.log('Item added successfully:', response.data);

      onItemAdded(); // Refresh the item list or perform other actions
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setLoadingItemId(null); // Reset loading state
    }
  };

  const filteredItems = defaultItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-selection-modal-title"
      ref={modalRef}
    >
      {/* Side Modal Container */}
      <div className="bg-white w-80 max-w-full h-full p-6 overflow-y-auto shadow-lg relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 id="item-selection-modal-title" className="text-xl font-semibold">
            Select an Item
          </h2>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search for an item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search items"
        />

        {/* Items List */}
        <div className="space-y-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.rye_item_id}
                className="flex justify-between items-center p-2 border border-gray-200 rounded hover:bg-gray-100"
              >
                <span>{item.name} - ${Number(item.price).toFixed(2)}</span>
                <button
                  onClick={() => handleAddItem(item.rye_item_id)}
                  className={`px-3 py-1 rounded text-white ${
                    loadingItemId === item.rye_item_id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                  disabled={loadingItemId === item.rye_item_id}
                  aria-label={`Add ${item.name}`}
                >
                  {loadingItemId === item.rye_item_id ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No items found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// PropTypes Validation
ItemSelectionModal.propTypes = {
  childId: PropTypes.number.isRequired, // Ensure childId is provided as a number
  onClose: PropTypes.func.isRequired, // Ensure onClose is a function
  onItemAdded: PropTypes.func.isRequired, // Ensure onItemAdded is a function
};

export default ItemSelectionModal;