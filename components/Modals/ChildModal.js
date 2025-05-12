import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import axios from 'axios';
import { CartContext } from '../../contexts/CartContext';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/lib/utils'; // Ensure correct path

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper (same as in drive page)
function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemNeedKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemNeedKeyType];
  const sourceFieldInCart = itemNeedKeyType === 'child_item_id' ? 'giftdrive_source_child_item_id' : 'giftdrive_source_drive_item_id';
  for (const store of cartFromContext.stores) {
    if (store.cartLines) {
      for (const line of store.cartLines) {
        if (line[sourceFieldInCart] != null && line[sourceFieldInCart] === sourceIdToCheck) return true;
      }
    }
  }
  return false;
}


export default function ChildModal({ isOpen, onClose, childId: childIdFromProp }) { // Renamed prop to avoid conflict
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { cart, setCart, loading: cartLoading } = useContext(CartContext); // Use cartLoading from context
  // No direct use of AuthContext's user here, but CartContext add will handle it

  const [selectedRyeVariants, setSelectedRyeVariants] = useState({});
  const [availableRyeVariantsInfo, setAvailableRyeVariantsInfo] = useState({});
  const [isLoadingVariants, setIsLoadingVariants] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});

  const fetchChildWithItems = async (currentChildId) => {
    if (!currentChildId) return;
    setLoading(true);
    setError(null);
    try {
      const childResponse = await axios.get(`${apiUrl}/api/children/${currentChildId}`);
      // The /api/children/:childId/items route should now return structured items
      const itemsResponse = await axios.get(`${apiUrl}/api/children/${currentChildId}/items`);
      const fetchedChild = childResponse.data;
      const fetchedItems = itemsResponse.data || [];
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
      setChildData(null); // Reset when modal closes
      setSelectedRyeVariants({});
      setAvailableRyeVariantsInfo({});
      setItemQuantities({});
    }
  }, [isOpen, childIdFromProp]);

  // Refresh child data if cart changes (to update remaining counts)
  useEffect(() => {
    if (isOpen && childIdFromProp && cart) { // Check cart to avoid loop on initial load
      //   console.log(`ChildModal: Refreshing child data for child ID: ${childIdFromProp} due to cart change.`);
      fetchChildWithItems(childIdFromProp);
    }
  }, [cart, isOpen, childIdFromProp]);


  const handleClose = () => {
    onClose(); // This will set isOpen to false, triggering the useEffect cleanup
  };

  // Variant fetching and selection (similar to DrivePage)
  const fetchVariantsForNeed = async (itemNeed) => {
    if (!itemNeed.preset_details?.base_rye_product_id || availableRyeVariantsInfo[itemNeed.child_item_id]) return;
    setIsLoadingVariants(prev => ({ ...prev, [itemNeed.child_item_id]: true }));
    try {
      const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
        rye_product_id: itemNeed.preset_details.base_rye_product_id,
        marketplace: itemNeed.preset_details.marketplace,
      });
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemNeed.child_item_id]: response.data }));
      const firstAvailable = response.data?.variants?.find(v => v.isAvailable);
      if (firstAvailable) setSelectedRyeVariants(prev => ({ ...prev, [itemNeed.child_item_id]: firstAvailable.id }));
    } catch (err) { console.error("Failed to fetch variants:", err); toast.error(`Could not load options.`); }
    finally { setIsLoadingVariants(prev => ({ ...prev, [itemNeed.child_item_id]: false })); }
  };

  const handleVariantSelectionChange = (childItemId, ryeVariantId) => {
    setSelectedRyeVariants(prev => ({ ...prev, [childItemId]: ryeVariantId }));
  };

  const handleQuantityChange = (childItemId, value, maxRemaining) => {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    setItemQuantities(prev => ({ ...prev, [childItemId]: Math.max(1, Math.min(numVal, maxRemaining > 0 ? maxRemaining : 1)) }));
  };

  const handleAddToCart = async (itemNeed) => {
    // Auth check is handled by CartContext's addToCart
    setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: true }));

    let ryeIdForCartApi = itemNeed.selected_rye_variant_id;
    let marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    let itemNameForToast = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";

    const isDonorChoiceShopify = itemNeed.base_marketplace === 'SHOPIFY' && itemNeed.base_rye_product_id && !itemNeed.selected_rye_variant_id;
    if (isDonorChoiceShopify && availableRyeVariantsInfo[itemNeed.child_item_id]?.variants?.some(v => v.isAvailable)) {
      ryeIdForCartApi = selectedRyeVariants[itemNeed.child_item_id];
      if (!ryeIdForCartApi) {
        toast.error(`Please select an option for "${itemNameForToast}".`);
        setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false })); return;
      }
      marketplaceForCartApi = itemNeed.base_marketplace;
      const variantInfo = availableRyeVariantsInfo[itemNeed.child_item_id]?.variants?.find(v => v.id === ryeIdForCartApi);
      if (variantInfo) itemNameForToast = variantInfo.title;
    }

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Missing ID or marketplace.`);
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false })); return;
    }
    const quantity = itemQuantities[itemNeed.child_item_id] || 1;
    const payload = {
      ryeIdToAdd: ryeIdForCartApi, marketplaceForItem: marketplaceForCartApi, quantity,
      originalNeedRefId: itemNeed.child_item_id, originalNeedRefType: 'child_item'
    };
    try {
      const response = await axios.post(`${apiUrl}/api/cart/add`, payload, { withCredentials: true });
      setCart(response.data); // This triggers useEffect to refresh child data
      toast.success(`${itemNameForToast} (Qty: ${quantity}) added to cart!`);
    } catch (err) {
      console.error('Error adding to cart:', err.response?.data || err.message);
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
                        const isItemActionLoading = isLoadingVariants[itemKey] || isAddingToCart[itemKey] || cartLoading;
                        const canBePurchasedOnline = itemNeed.is_rye_linked;
                        const cardIsVisuallyDisabled = isCompletelyFulfilled || !canBePurchasedOnline;

                        let buttonText;
                        let effectiveDisabledState;
                        if (isAddingToCart[itemKey]) { buttonText = "Adding..."; effectiveDisabledState = true; }
                        else if (isCompletelyFulfilled) { buttonText = "Fulfilled"; effectiveDisabledState = true; }
                        else if (thisSpecificNeedIsInCart) { buttonText = "In Cart"; effectiveDisabledState = true; }
                        else {
                          buttonText = "Add to Cart";
                          effectiveDisabledState = cardIsVisuallyDisabled || isItemActionLoading ||
                            (itemNeed.base_marketplace === 'SHOPIFY' && itemNeed.base_rye_product_id && !itemNeed.selected_rye_variant_id && availableRyeVariantsInfo[itemKey]?.variants?.some(v => v.isAvailable) && !selectedRyeVariants[itemKey]) ||
                            currentQuantity > (itemNeed.remaining || 0);
                        }
                        if (cardIsVisuallyDisabled && buttonText !== "Fulfilled") effectiveDisabledState = true;

                        const baseItemName = itemNeed.base_item_name || 'Item';
                        const variantDisplayName = itemNeed.variant_display_name;
                        const showVariantSubline = variantDisplayName && variantDisplayName !== baseItemName;

                        const itemPhoto = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';
                        const itemPrice = itemNeed.variant_display_price ?? itemNeed.base_item_price;


                        return (
                          <li key={itemKey} className={`bg-gray-50 p-3 rounded border mb-2 flex flex-col gap-3 ${cardIsVisuallyDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
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

                            {canBePurchasedOnline && itemNeed.base_marketplace === 'SHOPIFY' && itemNeed.base_rye_product_id && !itemNeed.selected_rye_variant_id && (
                              <div className="mt-2">
                                <button onClick={() => fetchVariantsForNeed(itemNeed)} className="text-xs text-blue-600 hover:underline disabled:text-gray-400" disabled={isLoadingVariants[itemKey] || cardIsVisuallyDisabled || thisSpecificNeedIsInCart}>
                                  {isLoadingVariants[itemKey] ? 'Loading Options...' : (availableRyeVariantsInfo[itemKey] ? 'Change Options' : 'Select Options')}
                                </button>
                                {availableRyeVariantsInfo[itemKey]?.variants && (
                                  <select value={selectedRyeVariants[itemKey] || ''} onChange={(e) => handleVariantSelectionChange(itemKey, e.target.value)} className="block w-full mt-1 text-xs border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-200" disabled={cardIsVisuallyDisabled || isLoadingVariants[itemKey] || thisSpecificNeedIsInCart}>
                                    <option value="" disabled>Choose an option...</option>
                                    {availableRyeVariantsInfo[itemKey].variants.filter(v => v.isAvailable).map(variant => (
                                      <option key={variant.id} value={variant.id}>{variant.title} ({formatCurrency(variant.priceV2?.value, variant.priceV2?.currency)})</option>
                                    ))}
                                    {availableRyeVariantsInfo[itemKey].variants.filter(v => v.isAvailable).length === 0 && (<option value="" disabled>No options</option>)}
                                  </select>
                                )}
                              </div>
                            )}
                            {!canBePurchasedOnline && !cardIsVisuallyDisabled && (<p className="text-xs text-orange-500 font-medium">Item not available for online purchase.</p>)}

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
  childId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Renamed to childIdFromProp internally
};