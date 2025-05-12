// components/Cards/DriveItemList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';
import AddItemBlade from '../Blades/AddItemBlade'; // IMPORT THE NEW BLADE

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DriveItemList = ({ driveId }) => {
  const [driveItems, setDriveItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // REMOVE: const { openModal } = useModal();

  // NEW STATE for blade visibility and item being edited
  const [isAddItemBladeOpen, setIsAddItemBladeOpen] = useState(false);
  const [editingDriveItem, setEditingDriveItem] = useState(null);


  useEffect(() => {
    fetchDriveItems();
  }, [driveId]);

  const fetchDriveItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/api/drives/${driveId}/items`, {
        withCredentials: true,
      });
      setDriveItems(response.data);
    } catch (err) {
      console.error('Error fetching drive items:', err);
      setError('Failed to load drive items.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (driveItemId) => {
    // ... (keep existing logic)
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

  const handleUpdateQuantity = async (driveItemId, newQuantity) => {
    // ... (keep existing logic)
    try {
      await axios.put(`${apiUrl}/api/drives/${driveId}/items/${driveItemId}`, { quantity: newQuantity });
      fetchDriveItems(); // Or update local state for faster UI response
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  // MODIFIED: Handler to open the blade for ADDING a new item
  const handleOpenAddBlade = (e) => {
    if (e) e.stopPropagation(); // Good practice if called from a click event
    setEditingDriveItem(null); // Ensure we're adding, not editing
    setIsAddItemBladeOpen(true);
  };

  // NEW: Handler to open the blade for EDITING an existing item
  // This would be called from DriveItemCard's edit button (passed as a prop)
  const handleOpenEditBlade = (itemToEdit, eventObject) => {
    if (eventObject && typeof eventObject.stopPropagation === 'function') {
      eventObject.stopPropagation(); // Now eventObject should be the actual event
    }
    setEditingDriveItem(itemToEdit); // Use the item that was clicked
    setIsAddItemBladeOpen(true);
  };


  const handleBladeSave = () => {
    fetchDriveItems(); // Refresh list after save
    setIsAddItemBladeOpen(false); // Close blade
    setEditingDriveItem(null); // Clear editing state
  };

  const handleBladeClose = () => {
    setIsAddItemBladeOpen(false);
    setEditingDriveItem(null);
  };

  if (loading) return <p>Loading items...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4"> {/* Added items-center for alignment */}
        <h4 className="text-md font-semibold">Manage Items for this Drive</h4> {/* Optional title */}
        <button
          onClick={handleOpenAddBlade} // Use the new handler
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>
      {driveItems.length === 0 ? (
        <p className="text-gray-600">No items in this drive yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {driveItems.map((itemInMap) => ( // Renamed for clarity during explanation
            <DriveItemCard
              key={itemInMap.drive_item_id}
              item={itemInMap} // Pass the current item from the map to the card
              driveId={driveId}
              onDeleteItem={handleDeleteItem}
              onUpdateQuantity={handleUpdateQuantity}
              // CORRECTED:
              // When DriveItemCard calls onEditItem(itemFromCard, eventFromCard),
              // these arguments are directly passed to handleOpenEditBlade.
              onEditItem={handleOpenEditBlade}
            // Alternatively, if you need to wrap it for some reason (though not needed here):
            // onEditItem={(itemFromCard, eventFromCard) => handleOpenEditBlade(itemFromCard, eventFromCard)}
            />
          ))}
        </div>
      )}

      {/* Render the Blade */}
      <AddItemBlade
        isOpen={isAddItemBladeOpen}
        driveId={driveId}
        existingDriveItem={editingDriveItem} // Pass the item to edit, or null for new
        onSave={handleBladeSave}
        onClose={handleBladeClose}
      />
    </div>
  );
};

DriveItemList.propTypes = {
  driveId: PropTypes.number.isRequired,
};

export default DriveItemList;