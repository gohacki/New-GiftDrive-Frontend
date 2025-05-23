// File: components/Cards/DriveItemList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import DriveItemCard from './DriveItemCard';
import AddItemBlade from '../Blades/AddItemBlade';
import { toast } from 'react-toastify';
import ConfirmActionModal from '../Modals/ConfirmActionModal'; // Import the new modal

const DriveItemList = ({ driveId }) => {
  const [driveItems, setDriveItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddItemBladeOpen, setIsAddItemBladeOpen] = useState(false);
  const [editingDriveItem, setEditingDriveItem] = useState(null);

  // State for the confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    message: '',
    options: [],
    itemName: '',
  });

  const fetchDriveItems = async () => {
    // ... (fetchDriveItems logic remains the same) ...
    if (!driveId) {
      setLoading(false);
      setError("Drive ID is missing, cannot fetch items.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/drives/${driveId}/items`, {
        withCredentials: true,
      });
      setDriveItems(response.data.map(item => ({
        ...item,
        is_hidden_from_public: Boolean(item.is_hidden_from_public)
      })));
    } catch (err) {
      console.error(`Error fetching drive items for drive ${driveId}:`, err);
      setError('Failed to load drive items.');
      setDriveItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveItems();
  }, [driveId]);

  const handleApiAction = async (method, url, data, successMessage, itemName = "Item") => {
    // ... (handleApiAction logic remains the same) ...
    try {
      await axios[method](url, data, { withCredentials: true });
      toast.success(successMessage);
      fetchDriveItems();
    } catch (err) {
      console.error(`Error with ${method} ${url} for item "${itemName}":`, err.response?.data || err.message || err);
      toast.error(err.response?.data?.error || `Operation failed for "${itemName}": ${err.message}`);
    }
  };

  const handleDeleteItem = async (itemToDelete) => {
    if (!driveId || !itemToDelete?.drive_item_id) {
      toast.error("Cannot delete item: Missing drive or item ID.");
      return;
    }

    const itemName = itemToDelete.base_item_name || 'Item';
    console.log("[DriveItemList] Attempting to delete item:", itemToDelete);

    try {
      await axios.delete(`/api/drives/${driveId}/items/${itemToDelete.drive_item_id}`, {
        withCredentials: true,
      });
      toast.success(`"${itemName}" removed successfully.`);
      fetchDriveItems();
    } catch (err) {
      console.error(`Error deleting drive item ${itemToDelete.drive_item_id} ("${itemName}"): `, err.response?.data || err.message || err);

      if (err.response && err.response.status === 409 && err.response.data?.type === "confirm_action_on_purchased_item") {
        const details = err.response.data.details;
        const purchasedQty = Number(details?.purchased_qty || 0);
        const neededQty = Number(details?.needed_qty || 0);

        let modalMessage = `A donor has already purchased ${purchasedQty} of "${itemName}", so it cannot be fully removed.`;
        const modalOptions = [];

        if (details?.can_hide === true) {
          modalOptions.push({
            label: "Hide Item",
            action: () => handleHideItem(itemToDelete.drive_item_id, true, itemName),
            style: 'secondary',
          });
        }
        if (details?.can_reduce_needed === true && purchasedQty < neededQty) {
          modalMessage += `\n\nThe remaining ${neededQty - purchasedQty} unpurchased item(s) can be removed from the 'needed' quantity.`;
          modalOptions.push({
            label: `Set Needed to ${purchasedQty} & Hide`,
            action: () => handleReduceNeeded(itemToDelete.drive_item_id, itemName),
            style: 'primary',
          });
        }

        if (modalOptions.length > 0) {
          setConfirmModalProps({
            title: `Action Required for "${itemName}"`,
            message: modalMessage,
            options: modalOptions,
            itemName: itemName,
          });
          setIsConfirmModalOpen(true);
        } else {
          toast.info(modalMessage + "\nNo further actions available for this item currently.");
        }

      } else {
        toast.error(err.response?.data?.error || `Could not delete "${itemName}".`);
      }
    }
  };

  const handleHideItem = async (driveItemId, hide = true, itemName = "Item") => {
    const action = hide ? 'hide' : 'unhide';
    await handleApiAction('patch', `/api/drives/${driveId}/items/${driveItemId}`,
      { action },
      `${itemName} ${hide ? 'hidden' : 'unhidden'} successfully.`,
      itemName
    );
  };

  const handleReduceNeeded = async (driveItemId, itemName = "Item") => {
    await handleApiAction('patch', `/api/drives/${driveId}/items/${driveItemId}`,
      { action: 'reduce_needed_to_purchased' },
      `Needed quantity for ${itemName} reduced. The item has also been hidden.`,
      itemName
    );
  };

  const handleUpdateQuantity = async (driveItemId, newQuantity) => {
    // ... (handleUpdateQuantity logic remains the same) ...
    if (!driveId || !driveItemId || newQuantity < 0) return;

    const itemToUpdate = driveItems.find(item => item.drive_item_id === driveItemId);
    const itemName = itemToUpdate?.base_item_name || "Item";

    if (itemToUpdate && newQuantity < itemToUpdate.purchased) {
      toast.error(`Cannot set needed quantity (${newQuantity}) for "${itemName}" below the already purchased quantity (${itemToUpdate.purchased}).`);
      return;
    }
    if (itemToUpdate && itemToUpdate.is_hidden_from_public) {
      toast.warn(`Quantity for "${itemName}" cannot be updated as it is hidden. Please unhide it first.`);
      return;
    }

    await handleApiAction('put', `/api/drives/${driveId}/items/${driveItemId}`,
      { quantity: newQuantity },
      `Quantity for "${itemName}" updated successfully.`,
      itemName
    );
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
    if (itemToEdit.is_hidden_from_public) {
      toast.info("This item is hidden. Please unhide it to make further edits to its details (except unhiding or removing).");
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
              onDeleteItem={handleDeleteItem} // Still passes the item object
              onUpdateQuantity={handleUpdateQuantity}
              onEditItem={handleOpenEditBlade}
              onHideItem={handleHideItem}
              onReduceNeeded={handleReduceNeeded} // For explicit "reduce needed" if you add a button
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

      <ConfirmActionModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        options={confirmModalProps.options}
        itemName={confirmModalProps.itemName}
      />
    </div>
  );
};

DriveItemList.propTypes = {
  driveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default DriveItemList;