import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Validate apiUrl
if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const EditChildModal = ({ child, onClose, onUpdateChild }) => {
  // State to manage current items with quantities
  const [currentItems, setCurrentItems] = useState(
    child.items?.map((item) => ({
      child_item_id: Number(item.child_item_id),
      item_id: Number(item.item_id),
      item_name: item.item_name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      item_photo: item.item_photo,
    })) || []
  );

  // State to manage all items fetched from the backend
  const [allItems, setAllItems] = useState([]);
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllItems();
    fetchCurrentItems(); 
  }, []);

  const fetchAllItems = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/items/`, {
        withCredentials: true,
      });
      setAllItems(response.data);
    } catch (error) {
      console.error('Error fetching all items:', error);
      setError('Failed to load items. Please try again.');
    }
  };

  // Compute available items by excluding current items
  const availableItems = allItems.filter(
    (item) => !currentItems.some((ci) => ci.item_id === item.item_id)
  );

  // Handler to adjust quantity
  const handleQuantityChange = (childItemId, delta) => {
    setCurrentItems((prevItems) =>
      prevItems.map((item) =>
        item.child_item_id === childItemId
          ? {
              ...item,
              quantity: Math.max(item.quantity + delta, 1),
            }
          : item
      )
    );
  };

  // Handler to remove an item
  // Handler to remove an item
const handleRemoveItem = async (childItemId) => {
    try {
      const response = await axios.delete(
        `${apiUrl}/api/children/${child.child_id}/items/${childItemId}`,
        {
          withCredentials: true,
        }
      );

      console.log('Item removed successfully:', response.data);

      // Fetch the updated list of child items
      await fetchCurrentItems();
    } catch (error) {
      console.error('Error removing item from child:', error);
      setError(
        error.response?.data?.error ||
          'Failed to remove item. Please try again.'
      );
    }
};


  // Handler to add an item
  // Handler to add an item
  const handleAddItem = async (item) => {
    try {
      // Send POST request to add the item
      const response = await axios.post(
        `${apiUrl}/api/children/${child.child_id}/items`,
        {
          item_id: item.item_id,
          config_id: item.config_id || null, // Include config_id if applicable
          quantity: 1, // Default quantity
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      console.log('Item added successfully:', response.data);

      // Fetch the updated list of child items
      await fetchCurrentItems();
    } catch (error) {
      console.error('Error adding item to child:', error);
      setError(
        error.response?.data?.error ||
          'Failed to add item to child. Please try again.'
      );
    }
  };

  // Function to fetch current items for the child
  const fetchCurrentItems = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/children/${child.child_id}/items`,
        {
          withCredentials: true,
        }
      );

      // Update the currentItems state with fetched data
      setCurrentItems(
        response.data.map((item) => ({
          child_item_id: Number(item.child_item_id),
          item_id: Number(item.item_id),
          item_name: item.item_name,
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          item_photo: item.item_photo,
        }))
      );
    } catch (error) {
      console.error('Error fetching current items:', error);
      setError('Failed to load current items. Please try again.');
    }
  };



  // Handler for search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  

  // Filtered available items based on search term
  const filteredAvailableItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
  
    try {
      const payload = {
        child_item_ids: currentItems.map((item) => item.child_item_id),
        quantities: currentItems.reduce((acc, item) => {
          acc[item.child_item_id] = item.quantity;
          return acc;
        }, {}),
      };
  
      const response = await axios.put(
        `${apiUrl}/api/children/${child.child_id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
  
      console.log('Child updated successfully:', response.data);
  
      onUpdateChild(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating child:', error);
      setError(
        error.response?.data?.error ||
          'Failed to update child. Please check your inputs and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-child-modal-title"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4 my-8"
        role="document"
      >
        <h2 id="edit-child-modal-title" className="text-2xl font-semibold mb-6">
          Manage Child&apos;s Items
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-red-500" role="alert">
              {error}
            </div>
          )}

          {/* Current Items Section */}
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3">Current Items</h3>
            {currentItems.length === 0 ? (
              <p className="text-gray-600">No items currently associated with this child.</p>
            ) : (
              <ul className="space-y-4">
                {currentItems.map((item) => (
                  <li
                    key={item.child_item_id}
                    className="flex items-center justify-between bg-gray-100 p-4 rounded"
                  >
                    <div className="flex items-center space-x-4">
                      {item.item_photo && (
                        <img
                          src={item.item_photo}
                          alt={item.item_name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h4 className="text-lg font-semibold">{item.item_name}</h4>
                        <p className="text-gray-600">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.child_item_id, -1)}
                          className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                          aria-label={`Decrease quantity of ${item.item_name}`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.child_item_id, 1)}
                          className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
                          aria-label={`Increase quantity of ${item.item_name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.child_item_id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        aria-label={`Remove ${item.item_name} from child`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}

              </ul>
            )}
          </div>

          {/* Available Items Section */}
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3">Available Items</h3>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full border border-gray-300 rounded p-2"
                aria-label="Search available items"
              />
            </div>
            {filteredAvailableItems.length === 0 ? (
              <p className="text-gray-600">No available items match your search.</p>
            ) : (
              <ul className="space-y-4 max-h-64 overflow-y-auto">
                {filteredAvailableItems.map((item) => (
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
                      aria-label={`Add ${item.name} to child`}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit and Cancel Buttons */}
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
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Enhanced PropTypes Validation
EditChildModal.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    child_photo: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number,
        child_id: PropTypes.number,
        item_id: PropTypes.number,
        item_name: PropTypes.string,
        description: PropTypes.string,
        price: PropTypes.number,
        item_photo: PropTypes.string,
        quantity: PropTypes.number,
        users_with_item_in_cart: PropTypes.number,
      })
    ),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired,
};

export default EditChildModal;
