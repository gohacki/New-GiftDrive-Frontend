import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ItemSelectionModal = ({ childId, onClose, onItemAdded }) => {
  const [defaultItems, setDefaultItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  useEffect(() => {
    fetchDefaultItems();
  }, []);

  const fetchDefaultItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/items/`, {
        withCredentials: true,
      });
      setDefaultItems(response.data);
    } catch (error) {
      console.error('Error fetching default items:', error);
    }
  };

  const handleAddItem = async (itemId) => {
    setLoading(true); // Start loading
    try {
      const response = await axios.post(
        `${apiUrl}/api/children/${childId}/items`,
        { rye_item_id: itemId },
        { withCredentials: true }
      );
      console.log('Item added successfully:', response.data); // Log success

      onItemAdded(); // Refresh the item list
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error adding item:', error); // Log error for debugging
      alert('Failed to add item. Please try again.'); // Show alert to the user
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const filteredItems = defaultItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start">
      {/* Side Modal Container */}
      <div className="bg-white w-80 max-w-full h-full p-6 overflow-y-auto z-50 shadow-lg">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Select an Item</h2>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-600 font-bold"
          >
            Close
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search for an item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 mb-4"
        />

        {/* Items List */}
        <div className="grid gap-4">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.rye_item_id}
                className="p-4 border border-gray-200 rounded-lg shadow-sm flex justify-between items-center"
              >
                <span>{item.name}</span>
                <button
                  onClick={() => handleAddItem(item.rye_item_id)}
                  className={`${
                    loading
                      ? 'bg-gray-400'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white px-3 py-1 rounded`}
                  disabled={loading} // Disable button while loading
                >
                  {loading ? 'Adding...' : 'Add'}
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
  childId: PropTypes.number.isRequired,  // Ensure childId is provided as a number
  onClose: PropTypes.func.isRequired,    // Ensure onClose is a function
  onItemAdded: PropTypes.func.isRequired, // Ensure onItemAdded is a function
};

export default ItemSelectionModal;