// components/Cards/DriveItemList.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DriveItemList = ({ driveId }) => {
  const [driveItems, setDriveItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { openModal } = useModal();

  useEffect(() => {
    fetchDriveItems();
  }, [driveId]);

  const fetchDriveItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/drives/:driveId/items
      const response = await axios.get(`${apiUrl}/api/drives/${driveId}/items`, {
        withCredentials: true,
      });
      setDriveItems(response.data);
    } catch (err) {
      console.error('Error fetching drive items:', err);
      setError('Failed to load drive items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (driveItemId) => {
    if (confirm('Remove this item from the drive?')) {
      try {
        await axios.delete(`${apiUrl}/api/drives/${driveId}/items/${driveItemId}`, {
          withCredentials: true,
        });
        setDriveItems((prev) =>
          prev.filter((item) => item.drive_item_id !== driveItemId)
        );
      } catch (err) {
        console.error('Error deleting drive item:', err);
        alert('Could not delete drive item. Please try again.');
      }
    }
  };

  // Optionally handle updating quantity if you store per-item needed amounts
  const handleUpdateQuantity = async (driveItemId, newQuantity) => {
    try {
      await axios.put(`${apiUrl}/api/drives/${driveId}/items/${driveItemId}`, { quantity: newQuantity });
      fetchDriveItems();
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const handleAddItem = (e) => {
    e.stopPropagation(); // Prevent the click from bubbling up
    openModal(MODAL_TYPES.ITEM_SELECTION, {
      driveId,
      onItemSelected: () => {
        fetchDriveItems();
      },
    });
  };
  

  if (loading) return <p>Loading items...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <button
            onClick={handleAddItem}
            className="bg-blue-500 ml-auto text-white px-4 py-2 rounded hover:bg-blue-600"
            >
            Add Item
        </button>
      </div>
      {driveItems.length === 0 ? (
        <p className="text-gray-600">No items in this drive yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {driveItems.map((item) => (
            <DriveItemCard
              key={item.drive_item_id}
              item={item}
              onDeleteItem={handleDeleteItem}
              onUpdateQuantity={handleUpdateQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );
};

DriveItemList.propTypes = {
  driveId: PropTypes.number.isRequired,
};

export default DriveItemList;
