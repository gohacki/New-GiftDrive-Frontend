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
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full border border-slate-200"> {/* Updated container */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4"> {/* Updated header */}
          <h2 className="text-xl font-semibold text-slate-800">Add Child to Drive</h2> {/* Updated title */}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">×</button> {/* Updated close button */}
        </div>

        {isLoading && !defaultChildren.length && !defaultItems.length && (
          <p className="text-center py-4 text-slate-600">Loading available children and items...</p> {/* Updated loading text */}
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {error}
          </div>
        )}

        {!isLoading && (defaultChildren.length > 0 || defaultItems.length > 0) && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="select-child" className="block text-sm font-medium text-slate-700 mb-1">Select Child:</label> {/* Updated label */}
              <select
                id="select-child"
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm shadow-sm focus:outline-none focus:border-ggreen focus:ring-1 focus:ring-ggreen" /* Updated select */
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Items Needed (Optional):</label> {/* Updated label */}
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-300 p-2 rounded"> {/* Updated checkbox area border */}
                  {defaultItems.map((item) => (
                    <div key={item.item_id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`item-${item.item_id}`}
                        value={item.item_id.toString()} // Value as string for consistent comparison
                        checked={selectedItemIds.includes(item.item_id.toString())}
                        onChange={handleItemSelection}
                        className="w-4 h-4 text-ggreen focus:ring-ggreen border-slate-300 rounded" /* Updated checkbox border */
                      />
                      <label htmlFor={`item-${item.item_id}`} className="text-slate-700 text-sm"> {/* Updated checkbox label text */}
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
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm font-medium" /* Updated cancel button */
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 text-sm font-medium shadow-sm disabled:opacity-60 cursor-not-allowed" /* Updated submit button */
                disabled={isLoading || !selectedChildId}
              >
                {isLoading ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </form>
        )}
        {!isLoading && defaultChildren.length === 0 && defaultItems.length === 0 && !error && (
          <p className="text-center text-slate-500 py-4">No default children or items available to select.</p> {/* Updated empty state text */}
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