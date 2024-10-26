import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ItemList = ({ childId }) => {
  const [items, setItems] = useState([]);
  const [defaultItems, setDefaultItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchDefaultItems();
  }, [childId]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/children/${childId}/items`,
        { withCredentials: true }
      );
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchDefaultItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/items`, {
        withCredentials: true,
      });
      setDefaultItems(response.data);
    } catch (error) {
      console.error('Error fetching default items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedItemId) return;

    try {
      await axios.post(
        `${apiUrl}/api/children/${childId}/items`,
        { item_id: selectedItemId },
        { withCredentials: true }
      );
      fetchItems(); // Refresh items list
      setSelectedItemId(null);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteItem = async (childItemId) => {
    try {
      await axios.delete(
        `${apiUrl}/api/children/${childId}/items/${childItemId}`,
        { withCredentials: true }
      );
      fetchItems(); // Refresh items list
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="mt-4">
      <h6 className="text-lg font-semibold mb-2">Items Needed</h6>

      {items.length > 0 ? (
        <ul className="list-disc list-inside space-y-2">
          {items.map((item) => (
            <li key={item.child_item_id} className="flex justify-between items-center">
              <span>
                {item.item_name} - ${Number(item.price).toFixed(2)}
              </span>
              <button
                onClick={() => handleDeleteItem(item.child_item_id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No items added for this child yet.</p>
      )}

      <div className="mt-4 flex space-x-2">
        <select
          value={selectedItemId || ''}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2"
        >
          <option value="" disabled>
            -- Select an Item --
          </option>
          {defaultItems.map((item) => (
            <option key={item.item_id} value={item.item_id}>
              {item.name} - ${Number(item.price).toFixed(2)}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddItem}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>
    </div>
  );
};

// PropTypes Validation
ItemList.propTypes = {
  childId: PropTypes.number.isRequired, // Ensure childId is provided and is a number
};

export default ItemList;