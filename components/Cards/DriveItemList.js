// File: components/Cards/DriveItemList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';
import AddItemBlade from '../Blades/AddItemBlade';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DriveItemList = ({ driveId }) => {
  const [driveItems, setDriveItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddItemBladeOpen, setIsAddItemBladeOpen] = useState(false);
  const [editingDriveItem, setEditingDriveItem] = useState(null);

  const fetchDriveItems = async () => {
    if (!driveId) {
      setLoading(false);
      setError("Drive ID is missing, cannot fetch items.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // UPDATED to relative path
      const response = await axios.get(`/api/drives/${driveId}/items`, {
        withCredentials: true,
      });
      setDriveItems(response.data);
    } catch (err) {
      console.error(`Error fetching drive items for drive ${driveId}:`, err);
      setError('Failed to load drive items.');
      setDriveItems([]); // Clear items on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveItems();
  }, [driveId]); // Re-fetch if driveId changes

  const handleDeleteItem = async (driveItemId) => {
    if (!driveId || !driveItemId) return;
    if (confirm('Remove this item from the drive?')) {
      try {
        // UPDATED to relative path
        await axios.delete(`/api/drives/${driveId}/items/${driveItemId}`, {
          withCredentials: true,
        });
        setDriveItems((prev) =>
          prev.filter((item) => item.drive_item_id !== driveItemId)
        );
        // Or refetch for absolute consistency: fetchDriveItems();
      } catch (err) {
        console.error(`Error deleting drive item ${driveItemId}:`, err);
        alert('Could not delete drive item. Please try again.'); // Or use toast
      }
    }
  };

  const handleUpdateQuantity = async (driveItemId, newQuantity) => {
    if (!driveId || !driveItemId || newQuantity < 1) return; // Basic validation
    try {
      // UPDATED to relative path
      // Assuming your API expects a PUT request with a quantity in the body
      await axios.put(
        `/api/drives/${driveId}/items/${driveItemId}`,
        { quantity: newQuantity }, // Payload
        { withCredentials: true }
      );
      // For faster UI, update local state, then optionally refetch or trust optimistic update
      setDriveItems(prevItems =>
        prevItems.map(item =>
          item.drive_item_id === driveItemId ? { ...item, needed: newQuantity } : item
        )
      );
      // Or for full consistency: fetchDriveItems();
    } catch (err) {
      console.error(`Error updating quantity for drive item ${driveItemId}:`, err);
      alert('Could not update quantity. Please try again.'); // Or use toast
    }
  };

  const handleOpenAddBlade = (e) => {
    if (e) e.stopPropagation();
    setEditingDriveItem(null);
    setIsAddItemBladeOpen(true);
  };

  const handleOpenEditBlade = (itemToEdit, eventObject) => {
    if (eventObject && typeof eventObject.stopPropagation === 'function') {
      eventObject.stopPropagation();
    }
    setEditingDriveItem(itemToEdit);
    setIsAddItemBladeOpen(true);
  };

  const handleBladeSave = () => {
    fetchDriveItems();
    setIsAddItemBladeOpen(false);
    setEditingDriveItem(null);
  };

  const handleBladeClose = () => {
    setIsAddItemBladeOpen(false);
    setEditingDriveItem(null);
  };

  if (loading) return <p className="text-center py-4">Loading items...</p>;
  if (error) return <p className="text-red-500 text-center py-4">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-semibold">Manage Items for this Drive</h4>
        <button
          onClick={handleOpenAddBlade}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>
      {driveItems.length === 0 ? (
        <p className="text-gray-600 text-center py-4">No items in this drive yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {driveItems.map((itemInMap) => (
            <DriveItemCard
              key={itemInMap.drive_item_id}
              item={itemInMap}
              // driveId={driveId} // Not directly used by DriveItemCard but good to keep if its internals might change
              onDeleteItem={handleDeleteItem}
              onUpdateQuantity={handleUpdateQuantity} // Pass the updated handler
              onEditItem={handleOpenEditBlade}
            />
          ))}
        </div>
      )}

      <AddItemBlade
        isOpen={isAddItemBladeOpen}
        driveId={driveId}
        existingDriveItem={editingDriveItem}
        onSave={handleBladeSave}
        onClose={handleBladeClose}
      />
    </div>
  );
};

DriveItemList.propTypes = {
  driveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default DriveItemList;