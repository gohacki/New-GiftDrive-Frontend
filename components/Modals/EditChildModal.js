import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; // Import PropTypes

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditChildModal = ({ child, onClose, onUpdateChild }) => {
  const [childData, setChildData] = useState({
    name: child.child_name || '',
    photo: child.child_photo || null,
    itemIds: child.items?.map((item) => item.item_id) || [],
  });
  const [defaultItems, setDefaultItems] = useState([]);

  useEffect(() => {
    fetchDefaultItems();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChildData({ ...childData, [name]: value });
  };

  const handleFileChange = (e) => {
    setChildData({ ...childData, photo: e.target.files[0] });
  };

  const handleItemSelection = (e) => {
    const itemId = e.target.value;
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

    try {
      const formData = new FormData();
      formData.append('name', childData.name);
      formData.append('child_id', child.child_id);
      if (childData.photo) {
        formData.append('photo', childData.photo);
      }
      formData.append('item_ids', JSON.stringify(childData.itemIds));

      const response = await axios.put(
        `${apiUrl}/api/children/${child.child_id}`,
        formData,
        { withCredentials: true }
      );

      onUpdateChild(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating child:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Child</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-medium mb-1">Name:</label>
            <input
              type="text"
              name="name"
              value={childData.name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded p-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Photo:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
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
            <label className="block font-medium mb-1">Select Items:</label>
            <div className="space-y-2">
              {defaultItems.map((item) => (
                <div key={item.item_id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={item.item_id}
                    checked={childData.itemIds.includes(item.item_id.toString())}
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditChildModal.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    child_photo: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        item_id: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateChild: PropTypes.func.isRequired,
};

export default EditChildModal;