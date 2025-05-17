// components/Modals/ChildModal.js
import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import axios from 'axios';
import { CartContext } from '../../contexts/CartContext';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/lib/utils';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper (same as in drive page)
function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemNeedKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemNeedKeyType];
  const sourceFieldInCart = itemNeedKeyType === 'child_item_id' ? 'giftdrive_source_child_item_id' : 'giftdrive_source_drive_item_id';

  return cartFromContext.stores.some(store =>
    store.cartLines?.some(line => line[sourceFieldInCart] != null && line[sourceFieldInCart] === sourceIdToCheck)
  );
}

export default function ChildModal({ isOpen, onClose, childId: childIdFromProp }) {
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { cart, setCart, loading: cartLoading } = useContext(CartContext);

  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});
  // isLoadingVariants, selectedRyeVariants, availableRyeVariantsInfo are removed

  const fetchChildWithItems = async (currentChildId) => {
    if (!currentChildId) return;
    setLoading(true);
    setError(null);
    try {
      const childResponse = await axios.get(`${apiUrl}/api/children/${currentChildId}`);
      const itemsResponse = await axios.get(`${apiUrl}/api/children/${currentChildId}/items`);
      const fetchedChild = childResponse.data;

      // Ensure child items have the necessary fields for direct purchase
      const fetchedItems = (itemsResponse.data || []).map(item => ({
        ...item,
        // These should come from backend if the item is purchasable
        selected_rye_variant_id: item.selected_rye_variant_id || null,
        selected_rye_marketplace: item.selected_rye_marketplace || null,
      }));

      setChildData({ ...fetchedChild, items: fetchedItems });

      const initialQuantities = {};
      fetchedItems.forEach(item => { initialQuantities[item.child_item_id] = 1; });
      setItemQuantities(initialQuantities);

    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('Failed to load child data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && childIdFromProp) {
      fetchChildWithItems(childIdFromProp);
    } else if (!isOpen) {
      setChildData(null);
      setItemQuantities({});
      setIsAddingToCart({});
    }
  }, [isOpen, childIdFromProp]);

  useEffect(() => {
    if (isOpen && childIdFromProp && cart) {
      fetchChildWithItems(childIdFromProp);
    }
  }, [cart, isOpen, childIdFromProp]);

  const handleClose = () => {
    onClose();
  };

  const handleQuantityChange = (childItemId, value, maxRemaining) => {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    setItemQuantities(prev => ({ ...prev, [childItemId]: Math.max(1, Math.min(numVal, maxRemaining > 0 ? maxRemaining : 1)) }));
  };

  const handleAddToCart = async (itemNeed) => {
    setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: true }));

    // Directly use pre-defined IDs from itemNeed
    const ryeIdForCartApi = itemNeed.selected_rye_variant_id;
    const marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    const itemNameForToast = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Missing ID or marketplace.`);
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false })); return;
    }
    // is_rye_linked should come from the itemNeed object (from backend)
    if (!itemNeed.is_rye_linked) {
      toast.warn("This item cannot be purchased online at this time.");
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false })); return;
    }

    const quantity = itemQuantities[itemNeed.child_item_id] || 1;
    const payload = {
      ryeIdToAdd: ryeIdForCartApi, marketplaceForItem: marketplaceForCartApi, quantity,
      originalNeedRefId: itemNeed.child_item_id, originalNeedRefType: 'child_item'
    };
    try {
      const response = await axios.post(`${apiUrl}/api/cart/add`, payload, { withCredentials: true });
      setCart(response.data);
      toast.success(`${itemNameForToast} (Qty: ${quantity}) added to cart!`);
    } catch (err) {
      console.error('Error adding to cart from child modal:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || `Failed to add ${itemNameForToast} to cart.`);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 overflow-auto max-h-[90vh]">
        <button onClick={handleClose} className="absolute top-3 right-3 text-gray-600 hover:text-gray-800" aria-label="Close modal"><XMarkIcon className="h-6 w-6" /></button>
        {loading ? (<p className="text-center">Loading child details...</p>)
          : error ? (<p className="text-center text-red-500">{error}</p>)
            : childData ? (
              <>
                <div className="flex items-center mb-4">
                  {childData.photo && (<div className="mr-4"><Image src={childData.photo || '/img/default-child.png'} alt={childData.child_name} width={80} height={80} className="object-cover rounded-full" /></div>)}
                  <div><h2 className="text-2xl font-semibold text-ggreen">{childData.child_name}</h2>{childData.age && <p>Age: {childData.age}</p>}{childData.gender && <p>Gender: {childData.gender}</p>}</div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-ggreen">Items Needed</h3>
                  {childData.items && childData.items.length > 0 ? (
                    <ul className="space-y-3">
                      {childData.items.map((itemNeed) => {
                        const itemKey = itemNeed.child_item_id;
                        const thisSpecificNeedIsInCart = isThisSpecificNeedInCart(itemNeed, cart, 'child_item_id');
                        const currentQuantity = itemQuantities[itemKey] || 1;
                        const isCompletelyFulfilled = itemNeed.remaining <= 0;
                        const isItemActionLoading = isAddingToCart[itemKey] || cartLoading;
                        const canBePurchasedOnline = itemNeed.is_rye_linked; // Based on pre-defined link
                        const cardIsVisuallyDisabled = isCompletelyFulfilled || !canBePurchasedOnline;

                        let buttonText;
                        let effectiveDisabledState;
                        if (isAddingToCart[itemKey]) { buttonText = "Adding..."; effectiveDisabledState = true; }
                        else if (isCompletelyFulfilled) { buttonText = "Fulfilled"; effectiveDisabledState = true; }
                        else if (thisSpecificNeedIsInCart) { buttonText = "In Cart"; effectiveDisabledState = true; }
                        else {
                          buttonText = "Add to Cart";
                          effectiveDisabledState = cardIsVisuallyDisabled || isItemActionLoading || currentQuantity > (itemNeed.remaining || 0);
                        }
                        if (cardIsVisuallyDisabled && buttonText !== "Fulfilled") effectiveDisabledState = true;

                        const baseItemName = itemNeed.base_item_name || 'Item';
                        const variantDisplayName = itemNeed.variant_display_name;
                        const showVariantSubline = variantDisplayName && variantDisplayName !== baseItemName;

                        const itemPhoto = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';
                        const itemPrice = itemNeed.variant_display_price ?? itemNeed.base_item_price;

                        return (
                          <li key={itemKey} className={`bg-gray-50 p-3 rounded border mb-2 flex flex-col gap-3 ${cardIsVisuallyDisabled && !thisSpecificNeedIsInCart ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 relative flex-shrink-0 border bg-white rounded overflow-hidden">
                                <Image src={itemPhoto} alt={baseItemName.substring(0, 30)} fill style={{ objectFit: 'contain' }} sizes="64px" onError={(e) => e.currentTarget.src = '/img/default-item.png'} />
                              </div>
                              <div className="flex-grow">
                                <p className="font-semibold text-gray-800 leading-tight">{baseItemName}</p>
                                {showVariantSubline && <p className="text-sm text-gray-600">{variantDisplayName}</p>}
                                {itemPrice !== null && <p className="text-sm font-bold text-gray-700">{formatCurrency(itemPrice * 100, 'USD')}</p>}
                                <p className="text-xs text-gray-500">Needed: {itemNeed.needed} | Remaining: {itemNeed.remaining}</p>
                              </div>
                            </div>

                            {!canBePurchasedOnline && !isCompletelyFulfilled && (<p className="text-xs text-orange-500 font-medium mt-1">Item not available for online purchase.</p>)}

                            {canBePurchasedOnline && (
                              <div className="mt-2 flex items-center gap-3">
                                {itemNeed.needed > 1 && !isCompletelyFulfilled && !thisSpecificNeedIsInCart && (
                                  <div className="flex items-center">
                                    <label htmlFor={`qty-child-${itemKey}`} className="mr-1.5 text-xs text-gray-700">Qty:</label>
                                    <input type="number" id={`qty-child-${itemKey}`} min="1" max={itemNeed.remaining > 0 ? itemNeed.remaining : 1} value={currentQuantity} onChange={(e) => handleQuantityChange(itemKey, e.target.value, itemNeed.remaining)} className="w-14 px-2 py-1 text-xs border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-200" disabled={cardIsVisuallyDisabled || isItemActionLoading} />
                                  </div>
                                )}
                                <button onClick={() => handleAddToCart(itemNeed)} disabled={effectiveDisabledState} className={`flex-grow px-3 py-1.5 text-xs text-white rounded shadow-sm transition-colors font-medium ${effectiveDisabledState ? 'bg-gray-400 cursor-not-allowed' : 'bg-ggreen hover:bg-teal-700'} ${isAddingToCart[itemKey] ? 'animate-pulse' : ''}`}>
                                  {buttonText}
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (<p className="text-gray-600 italic">No items listed for this child.</p>)}
                </div>
              </>
            ) : (<p className="text-center text-gray-500">No child data available.</p>)}
      </div>
    </div>
  );
}

ChildModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  childId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};