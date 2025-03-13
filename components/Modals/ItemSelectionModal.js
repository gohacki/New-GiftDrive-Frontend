// components/Modals/ItemSelectionModal.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ItemSelectionModal = ({ driveId, onItemSelected, onClose }) => {
  const [defaultItems, setDefaultItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDefaultItems();
  }, []);

  const fetchDefaultItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/api/items/`, {
        withCredentials: true,
      });
      setDefaultItems(response.data);
    } catch (err) {
      console.error('Error fetching default items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredItems = defaultItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = async (item) => {
    try {
      // POST to add the selected item to the drive.
      // For simplicity, we use quantity = 1 and assume no configuration.
      await axios.post(
        `${apiUrl}/api/drives/${driveId}/items`,
        {
          item_id: item.item_id,
          config_id: null,
          quantity: 1,
        },
        { withCredentials: true }
      );
      // Notify parent (e.g., to refresh the drive items list)
      if (onItemSelected) onItemSelected();
      onClose(); // Close the modal
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full overflow-auto">
        <h2 className="text-xl font-semibold mb-4">Select an Item to Add</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full border border-gray-300 rounded p-2 mb-4"
        />
        {loading ? (
          <p>Loading items...</p>
        ) : (
          <ul className="space-y-4 max-h-64 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <p>No items match your search.</p>
            ) : (
              filteredItems.map((item) => (
                <li
                  key={item.item_id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded"
                >
                  <div className="flex items-center space-x-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h4 className="text-lg font-semibold">{item.name}</h4>
                      <p className="text-gray-600">${Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    aria-label={`Add ${item.name} to drive`}
                  >
                    Add
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

ItemSelectionModal.propTypes = {
  driveId: PropTypes.number.isRequired,
  onItemSelected: PropTypes.func, // Callback to refresh the drive items list
  onClose: PropTypes.func.isRequired,
};

export default ItemSelectionModal;
