// File: components/Modals/AddChildModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AddChildModal = ({ onClose, onAddChild, driveId }) => {
  const [defaultChildren, setDefaultChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [defaultItems, setDefaultItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [error, setError] = useState(null); // Added for error display
  const [isLoading, setIsLoading] = useState(false); // Added for loading state

  useEffect(() => {
    // Reset states when modal opens with a new driveId or on first open
    setSelectedChildId(null);
    setSelectedItemIds([]);
    setError(null);
    setIsLoading(true); // Start loading when fetching defaults

    const fetchInitialData = async () => {
      try {
        // UPDATED to relative paths
        const childrenPromise = axios.get(`/api/children/default`, { withCredentials: true });
        const itemsPromise = axios.get(`/api/items/`, { withCredentials: true }); // Assuming this fetches linkable/default items

        const [childrenResponse, itemsResponse] = await Promise.all([childrenPromise, itemsPromise]);

        setDefaultChildren(childrenResponse.data || []);
        setDefaultItems(itemsResponse.data || []);
      } catch (fetchError) {
        console.error('Error fetching default children or items:', fetchError);
        setError('Failed to load initial data. Please try again.');
        setDefaultChildren([]);
        setDefaultItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [driveId]); // Re-fetch if driveId changes (though less likely for this modal type, good practice)

  const handleItemSelection = (e) => {
    const itemId = e.target.value; // item_id is usually a number, but input value is string
    const isChecked = e.target.checked;
    if (isChecked) {
      setSelectedItemIds([...selectedItemIds, itemId]);
    } else {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setIsLoading(true);

    if (!selectedChildId) {
      setError("Please select a child.");
      setIsLoading(false);
      return;
    }
    // Item selection can be optional, so no explicit check unless required.

    try {
      // UPDATED to relative path
      await axios.post(
        `/api/children`, // Endpoint for adding a new unique_child linking to a default_child and drive
        {
          default_child_id: parseInt(selectedChildId, 10),
          item_ids: selectedItemIds.map(Number), // Ensure item_ids are numbers if backend expects
          drive_id: parseInt(driveId, 10),
        },
        { withCredentials: true }
      );

      if (onAddChild) onAddChild(); // Refresh the child list in the parent component
      onClose(); // Close the modal
    } catch (err) {
      console.error('Error adding child:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to add child. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Child to Drive</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {isLoading && !defaultChildren.length && !defaultItems.length && (
          <p className="text-center py-4">Loading available children and items...</p>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {error}
          </div>
        )}

        {!isLoading && (defaultChildren.length > 0 || defaultItems.length > 0) && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="select-child" className="block font-medium mb-1">Select Child:</label>
              <select
                id="select-child"
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 focus:ring-ggreen focus:border-ggreen"
                required
                disabled={defaultChildren.length === 0}
              >
                <option value="" disabled>
                  {defaultChildren.length === 0 ? "No default children available" : "-- Select a Child --"}
                </option>
                {defaultChildren.map((child) => (
                  <option key={child.default_child_id} value={child.default_child_id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {defaultItems.length > 0 && (
              <div className="mb-4">
                <label className="block font-medium mb-1">Select Items Needed (Optional):</label>
                <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded">
                  {defaultItems.map((item) => (
                    <div key={item.item_id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`item-${item.item_id}`}
                        value={item.item_id.toString()} // Value as string for consistent comparison
                        checked={selectedItemIds.includes(item.item_id.toString())}
                        onChange={handleItemSelection}
                        className="w-4 h-4 text-ggreen focus:ring-ggreen border-gray-300 rounded"
                      />
                      <label htmlFor={`item-${item.item_id}`}>
                        {item.name} - ${Number(item.price).toFixed(2)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={isLoading || !selectedChildId}
              >
                {isLoading ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </form>
        )}
        {!isLoading && defaultChildren.length === 0 && defaultItems.length === 0 && !error && (
          <p className="text-center text-gray-500 py-4">No default children or items available to select.</p>
        )}
      </div>
    </div>
  );
};

AddChildModal.propTypes = {
  driveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  onAddChild: PropTypes.func.isRequired,
};

export default AddChildModal;