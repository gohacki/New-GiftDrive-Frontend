// components/Cards/ItemList.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ItemList = ({ childId }) => {
  const [items, setItems] = useState([]);
  const { openModal } = useModal();

  useEffect(() => {
    fetchItems();
  }, [childId]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/children/${childId}/items`, {
        withCredentials: true,
      });
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleDeleteItem = async (childItemId) => {
    try {
      await axios.delete(`${apiUrl}/api/children/${childId}/items/${childItemId}`, {
        withCredentials: true,
      });
      fetchItems(); // Refresh items list
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const triggerItemSelectionModal = () => {
    openModal(MODAL_TYPES.ITEM_SELECTION, {
      childId,
      onItemAdded: fetchItems,
    });
  };

  return (
    <div className="mt-4">
      <h6 className="text-lg font-semibold mb-2">Items Needed</h6>

      {items.length > 0 ? (
        <ul className="list-disc list-inside space-y-2">
          {items.map((item) => (
            <li key={item.child_item_id} className="flex justify-between items-center">
              <span className="truncate max-w-[75%]">
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

      <div className="mt-4">
        <button
          onClick={triggerItemSelectionModal}
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