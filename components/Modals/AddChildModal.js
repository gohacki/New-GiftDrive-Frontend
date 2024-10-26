import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; // Import PropTypes

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AddChildModal = ({ driveId, onClose, onAddChild }) => {
  const [defaultChildren, setDefaultChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [defaultItems, setDefaultItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  useEffect(() => {
    fetchDefaultChildren();
    fetchDefaultItems();
  }, []);

  const fetchDefaultChildren = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/children/default`, {
        withCredentials: true,
      });
      setDefaultChildren(response.data);
    } catch (error) {
      console.error('Error fetching default children:', error);
    }
  };

  const fetchDefaultItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/items/default`, {
        withCredentials: true,
      });
      setDefaultItems(response.data);
    } catch (error) {
      console.error('Error fetching default items:', error);
    }
  };

  const handleItemSelection = (e) => {
    const itemId = e.target.value;
    const isChecked = e.target.checked;
    if (isChecked) {
      setSelectedItemIds([...selectedItemIds, itemId]);
    } else {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${apiUrl}/api/children`,
        {
          child_id: selectedChildId,
          item_ids: selectedItemIds,
          drive_id: driveId,
        },
        { withCredentials: true }
      );

      onAddChild(); // Refresh the child list
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error adding child:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Add Child to Drive</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-medium mb-1">Select Child:</label>
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              required
            >
              <option value="" disabled>
                -- Select a Child --
              </option>
              {defaultChildren.map((child) => (
                <option key={child.child_id} value={child.child_id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Select Items Needed:</label>
            <div className="space-y-2">
              {defaultItems.map((item) => (
                <div key={item.item_id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={item.item_id}
                    checked={selectedItemIds.includes(item.item_id.toString())}
                    onChange={handleItemSelection}
                    className="w-4 h-4"
                  />
                  <label>
                    {item.name} - ${Number(item.price).toFixed(2)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Child
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PropTypes Validation
AddChildModal.propTypes = {
  driveId: PropTypes.string.isRequired,  // Validate driveId as a string
  onClose: PropTypes.func.isRequired,    // Ensure onClose is a function
  onAddChild: PropTypes.func.isRequired, // Ensure onAddChild is a function
};

export default AddChildModal;