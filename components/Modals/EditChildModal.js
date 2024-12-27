import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Validate apiUrl
if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const EditChildModal = ({ child, onClose, onUpdateChild }) => {
  const [childData, setChildData] = useState({
    name: child.child_name || '',
    photo: child.child_photo || null,
    itemIds: child.items?.map((item) => Number(item.item_id)) || [],
  });
  const [defaultItems, setDefaultItems] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setError('Failed to load items. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChildData({ ...childData, [name]: value });
  };

  const handleFileChange = (e) => {
    setChildData({ ...childData, photo: e.target.files[0] });
  };

  const handleItemSelection = (e) => {
    const itemId = Number(e.target.value);
    const isChecked = e.target.checked;

    if (isChecked) {
      setChildData({ ...childData, itemIds: [...childData.itemIds, itemId] });
    } else {
      setChildData({
        ...childData,
        itemIds: childData.itemIds.filter((id) => id !== itemId),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', childData.name);
      formData.append('child_id', child.child_id);
      if (childData.photo instanceof File) {
        formData.append('photo', childData.photo);
      }
      formData.append('item_ids', JSON.stringify(childData.itemIds));

      const response = await axios.put(
        `${apiUrl}/api/children/${child.child_id}`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onUpdateChild(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating child:', error);
      setError('Failed to update child. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-child-modal-title"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full"
        role="document"
      >
        <h2 id="edit-child-modal-title" className="text-xl font-semibold mb-4">
          Edit Child
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-red-500" role="alert">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="name" className="block font-medium mb-1">
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={childData.name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="photo" className="block font-medium mb-1">
              Photo:
            </label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handleFileChange}
              aria-describedby="photo-description"
            />
            <p id="photo-description" className="text-sm text-gray-500">
              Upload a new photo to replace the existing one.
            </p>
            {child.child_photo && !childData.photo && (
              <div className="mt-2">
                <img
                  src={child.child_photo}
                  alt={child.child_name}
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <fieldset>
              <legend className="block font-medium mb-1">
                Select Items:
              </legend>
              <div className="space-y-2">
                {defaultItems.map((item) => (
                  <div key={item.item_id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`item-${item.item_id}`}
                      value={item.item_id}
                      checked={childData.itemIds.includes(item.item_id)}
                      onChange={handleItemSelection}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`item-${item.item_id}`}>
                      {item.name} - ${Number(item.price).toFixed(2)}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
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
        rye_item_id: PropTypes.string,
        item_name: PropTypes.string,
        description: PropTypes.string,
        price: PropTypes.number,
        item_photo: PropTypes.string,
        users_with_item_in_cart: PropTypes.number,
      })
    ),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired,
};

export default EditChildModal;