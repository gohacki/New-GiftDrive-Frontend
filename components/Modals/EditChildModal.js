// File: components/Modals/EditChildModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { EyeIcon, EyeSlashIcon, TrashIcon, PencilSquareIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

const EditChildModal = ({ child, onClose }) => {
  const [currentItems, setCurrentItems] = useState(
    child.items?.map((item) => ({
      child_item_id: Number(item.child_item_id),
      item_id: Number(item.item_id),
      item_name: item.variant_display_name || item.base_item_name, // Prefer variant name for display
      price: Number(item.variant_display_price ?? item.base_item_price),
      quantity: Number(item.quantity) || 1,
      item_photo: item.variant_display_photo || item.base_item_photo,
      purchased: Number(item.purchased) || 0,
      is_hidden_from_public: Boolean(item.is_hidden_from_public),
    })) || []
  );

  const [allItems, setAllItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null); // For inline quantity edit

  const fetchChildItems = async () => {
    if (!child || !child.child_id) return;
    try {
      const response = await axios.get(`/api/children/${child.child_id}/items`, { withCredentials: true });
      setCurrentItems(
        response.data.map((item) => ({
          child_item_id: Number(item.child_item_id),
          item_id: Number(item.item_id),
          item_name: item.variant_display_name || item.base_item_name,
          price: Number(item.variant_display_price ?? item.base_item_price),
          quantity: Number(item.needed) || 1, // 'needed' from service matches 'quantity' here
          item_photo: item.variant_display_photo || item.base_item_photo,
          purchased: Number(item.purchased) || 0,
          is_hidden_from_public: Boolean(item.is_hidden_from_public),
        }))
      );
    } catch (fetchError) {
      console.error('Error fetching current items:', fetchError);
      setError('Failed to load current items for child.');
      toast.error('Failed to load current items for child.');
    }
  };

  const fetchAllCatalogItems = async () => {
    try {
      const response = await axios.get(`/api/items/`, { withCredentials: true });
      setAllItems(response.data);
    } catch (error) {
      console.error('Error fetching all items:', error);
      setError('Failed to load catalog items. Please try again.');
      toast.error('Failed to load catalog items.');
    }
  };

  useEffect(() => {
    fetchAllCatalogItems();
    fetchChildItems(); // Initial fetch
  }, [child.child_id]);

  const availableItems = allItems.filter(
    (item) => !currentItems.some((ci) => ci.item_id === item.item_id) // Simplistic check, might need variant awareness
  );

  const handleQuantityChange = (childItemId, newQuantity) => {
    const itemToUpdate = currentItems.find(item => item.child_item_id === childItemId);
    if (!itemToUpdate) return;

    const minQuantity = itemToUpdate.purchased > 0 ? itemToUpdate.purchased : 1;
    const validatedQuantity = Math.max(minQuantity, newQuantity);

    setCurrentItems((prevItems) =>
      prevItems.map((item) =>
        item.child_item_id === childItemId
          ? { ...item, quantity: validatedQuantity }
          : item
      )
    );
  };

  const handleSaveQuantity = async (childItemId) => {
    const itemToUpdate = currentItems.find(item => item.child_item_id === childItemId);
    if (!itemToUpdate || itemToUpdate.is_hidden_from_public) {
      if (itemToUpdate.is_hidden_from_public) toast.warn("Cannot update quantity for a hidden item.");
      setEditingItemId(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.put(
        `/api/children/${child.child_id}/items/${childItemId}`,
        { quantity: itemToUpdate.quantity }, // Only send quantity for this specific update
        { withCredentials: true }
      );
      toast.success(`Quantity for "${itemToUpdate.item_name}" updated.`);
      setEditingItemId(null); // Exit edit mode
      // fetchChildItems(); // Refetch for consistency if needed, or trust local state update
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to update quantity for "${itemToUpdate.item_name}".`);
      fetchChildItems(); // Revert to server state on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApiAction = async (method, url, data, successMessage, itemToUpdateName = "Item") => {
    setIsSubmitting(true);
    try {
      await axios[method](url, data, { withCredentials: true });
      toast.success(successMessage);
      fetchChildItems(); // Refresh items list
    } catch (error) {
      console.error(`API action ${method} to ${url} failed:`, error);
      toast.error(error.response?.data?.error || `Failed to ${method} ${itemToUpdateName}.`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleRemoveItem = async (itemToRemove) => {
    const { child_item_id, item_name } = itemToRemove;
    try {
      await axios.delete(`/api/children/${child.child_id}/items/${child_item_id}`, { withCredentials: true });
      toast.success(`"${item_name}" permanently removed.`);
      fetchChildItems();
    } catch (err) {
      if (err.response && err.response.status === 409 && err.response.data?.type === "confirm_action_on_purchased_item") {
        const details = err.response.data.details;
        let confirmMsg = `"${item_name}" has ${details.purchased_qty} purchase(s). It cannot be fully deleted.\n\n`;
        const options = [];
        if (details.can_hide) options.push({ label: "Hide Item from Public Page", action: () => handleApiAction('patch', `/api/children/${child.child_id}/items/${child_item_id}`, { action: 'hide' }, `"${item_name}" hidden.`, item_name) });
        if (details.can_reduce_needed) options.push({ label: `Reduce Needed to ${details.purchased_qty} (and Hide)`, action: () => handleApiAction('patch', `/api/children/${child.child_id}/items/${child_item_id}`, { action: 'reduce_needed_to_purchased' }, `"${item_name}" needed quantity reduced and hidden.`, item_name) });

        if (options.length > 0) {
          let actionChoice;
          if (options.length === 1) {
            if (window.confirm(confirmMsg + `Do you want to: ${options[0].label}?`)) actionChoice = options[0].action;
          } else {
            const choiceMsg = options.map((opt, i) => `${i + 1}. ${opt.label}`).join("\n");
            const userChoice = window.prompt(confirmMsg + "Choose an action:\n" + choiceMsg + "\n\nEnter number or cancel:");
            const choiceIndex = parseInt(userChoice, 10) - 1;
            if (choiceIndex >= 0 && choiceIndex < options.length) actionChoice = options[choiceIndex].action;
          }
          if (actionChoice) actionChoice();
        } else {
          toast.info(confirmMsg + "No further actions available at this time.");
        }
      } else {
        toast.error(err.response?.data?.error || `Failed to remove "${item_name}".`);
      }
    }
  };

  const handleAddItem = async (itemFromCatalog) => {
    // Similar to AddItemBlade, need to handle variant selection or use base product.
    // This simplified version assumes direct add using catalog item details.
    // You might need a more sophisticated item selection process here.
    const payload = {
      quantity: 1,
      base_catalog_item_id: itemFromCatalog.item_id,
      selected_rye_variant_id: itemFromCatalog.rye_variant_id || itemFromCatalog.rye_product_id,
      selected_rye_marketplace: itemFromCatalog.marketplace,
      variant_display_name: itemFromCatalog.name,
      variant_display_price: itemFromCatalog.price,
      variant_display_photo: itemFromCatalog.image_url,
    };
    await handleApiAction('post', `/api/children/${child.child_id}/items`, payload, `"${itemFromCatalog.name}" added.`, itemFromCatalog.name);
  };

  const toggleHideItem = async (item) => {
    const action = item.is_hidden_from_public ? 'unhide' : 'hide';
    await handleApiAction('patch', `/api/children/${child.child_id}/items/${item.child_item_id}`,
      { action },
      `"${item.item_name}" ${action === 'hide' ? 'hidden' : 'unhidden'}.`,
      item.item_name
    );
  };


  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const filteredAvailableItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmitForm = (e) => {
    e.preventDefault();
    // The form submit is primarily for adding new items or global child updates.
    // Individual item quantity changes are now handled by their own save buttons.
    // For now, this can just close the modal if no other global save action is defined.
    // If you had child-level properties to save (name, photo), this would handle it.
    toast.info("Changes to item quantities are saved individually.");
    onClose();
  };


  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="edit-child-modal-title"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-auto my-8">
        <h2 id="edit-child-modal-title" className="text-2xl font-semibold mb-6 text-gray-800">
          Manage Items for {child.child_name}
        </h2>
        <form onSubmit={handleSubmitForm}>
          {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded" role="alert">{error}</div>}

          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3 text-gray-700">Current Items</h3>
            {currentItems.length === 0 ? (
              <p className="text-gray-600 italic">No items currently associated with this child.</p>
            ) : (
              <ul className="space-y-3">
                {currentItems.map((item) => (
                  <li key={item.child_item_id} className={`border p-3 rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${item.is_hidden_from_public ? 'bg-gray-200 opacity-80' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3 flex-grow">
                      {item.item_photo && <Image src={item.item_photo} alt={item.item_name} width={56} height={56} className="w-14 h-14 object-contain rounded border bg-white" />}
                      <div className="flex-grow min-w-0">
                        <h4 className={`font-semibold truncate ${item.is_hidden_from_public ? 'text-gray-600' : 'text-gray-800'}`} title={item.item_name}>{item.item_name}</h4>
                        <p className="text-xs text-gray-500">Price: ${Number(item.price).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Purchased: {item.purchased}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                      {editingItemId === item.child_item_id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.child_item_id, parseInt(e.target.value, 10))}
                            min={item.purchased > 0 ? item.purchased : 1}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            disabled={isSubmitting || item.is_hidden_from_public} />
                          <button type="button" onClick={() => handleSaveQuantity(item.child_item_id)} disabled={isSubmitting} className="p-1.5 text-green-600 hover:text-green-700"><CheckIcon className="h-5 w-5" /></button>
                          <button type="button" onClick={() => { setEditingItemId(null); fetchChildItems(); }} disabled={isSubmitting} className="p-1.5 text-gray-500 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-sm mr-1">Needed: {item.quantity}</span>
                          {!item.is_hidden_from_public && <button type="button" onClick={() => setEditingItemId(item.child_item_id)} className="p-1.5 text-blue-600 hover:text-blue-700" title="Edit Quantity"><PencilSquareIcon className="h-5 w-5" /></button>}
                        </div>
                      )}
                      <button type="button" onClick={() => toggleHideItem(item)} className="p-1.5 text-yellow-600 hover:text-yellow-700" title={item.is_hidden_from_public ? "Unhide Item" : "Hide Item"}>
                        {item.is_hidden_from_public ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                      </button>
                      <button type="button" onClick={() => handleRemoveItem(item)} className="p-1.5 text-red-600 hover:text-red-700" title="Remove Item"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3 text-gray-700">Available Items to Add</h3>
            <input type="text" placeholder="Search catalog items..." value={searchTerm} onChange={handleSearchChange} className="w-full border border-gray-300 rounded p-2 mb-3 text-sm" />
            {filteredAvailableItems.length === 0 ? (
              <p className="text-gray-600 italic">No available items match your search or all catalog items are already added.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                {filteredAvailableItems.map((item) => (
                  <li key={item.item_id} className="flex items-center justify-between bg-gray-50 p-2 rounded hover:bg-gray-100">
                    <div className="flex items-center gap-2">
                      {item.image_url && <Image src={item.image_url} alt={item.name} width={40} height={40} className="w-10 h-10 object-contain rounded border bg-white" />}
                      <div>
                        <h4 className="text-sm font-medium text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-500">${Number(item.price).toFixed(2)} ({item.marketplace})</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleAddItem(item)} className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors disabled:opacity-50" disabled={isSubmitting}>
                      <PlusCircleIcon className="h-5 w-5 inline mr-1" />Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Close & Finish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper icons (can be defined outside or imported if you prefer separate icon components)
const CheckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
// XMarkIcon is already imported from heroicons

CheckIcon.propTypes = {
  className: PropTypes.string,
};

EditChildModal.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    child_photo: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number,
        item_id: PropTypes.number,
        base_item_name: PropTypes.string, // Added from service
        variant_display_name: PropTypes.string,
        base_item_price: PropTypes.number, // Added from service
        variant_display_price: PropTypes.number,
        base_item_photo: PropTypes.string, // Added from service
        variant_display_photo: PropTypes.string,
        quantity: PropTypes.number, // This is 'needed'
        purchased: PropTypes.number, // Added
        is_hidden_from_public: PropTypes.bool, // Added
      })
    ),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EditChildModal;