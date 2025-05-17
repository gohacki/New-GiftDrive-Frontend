// File: components/Blades/AddItemBlade.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/solid';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AddItemBlade = ({ isOpen, driveId, existingDriveItem, onSave, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedItems, setSearchedItems] = useState([]);
    const [selectedBaseItem, setSelectedBaseItem] = useState(null);
    const [ryeVariantsInfo, setRyeVariantsInfo] = useState({ baseProductName: '', baseProductImage: '', variants: [] });
    const [selectedRyeVariantId, setSelectedRyeVariantId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);

    const initialOpenRef = useRef(true);

    const resetFormState = useCallback(() => {
        setSearchQuery('');
        setSearchedItems([]);
        setSelectedBaseItem(null);
        setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] });
        setSelectedRyeVariantId('');
        setQuantity(1);
        setIsLoading(false);
        setIsLoadingVariants(false);
    }, []);

    const fetchAndSetRyeVariants = useCallback(async (ryeProductId, marketplace, preselectVariantId = null) => {
        console.log(`[AddItemBlade] fetchAndSetRyeVariants: Fetching for Rye Product ID: ${ryeProductId}, Marketplace: ${marketplace}`);
        if (!ryeProductId || !marketplace) {
            console.warn("[AddItemBlade] fetchAndSetRyeVariants: Missing ryeProductId or marketplace.");
            setIsLoadingVariants(false);
            return;
        }
        setIsLoadingVariants(true);
        setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] });
        setSelectedRyeVariantId('');

        try {
            // UPDATED to relative path
            const response = await axios.post(`/api/items/fetch-rye-variants-for-product`, {
                rye_product_id: ryeProductId,
                marketplace: marketplace,
            }, { withCredentials: true });

            const variantsData = response.data?.variants || [];
            const baseName = response.data?.baseProductName || selectedBaseItem?.name || 'Product';
            const baseImage = response.data?.baseProductImage || selectedBaseItem?.image_url;

            setRyeVariantsInfo({
                baseProductName: baseName,
                baseProductImage: baseImage,
                variants: variantsData
            });

            const availableVariants = variantsData.filter(v => v.isAvailable);

            if (preselectVariantId && availableVariants.some(v => v.id === preselectVariantId)) {
                setSelectedRyeVariantId(preselectVariantId);
            } else if (availableVariants.length === 0 && variantsData.length > 0 && marketplace.toUpperCase() === 'SHOPIFY') {
                toast.info("All variants for this Shopify product are currently unavailable.");
            }

        } catch (error) {
            toast.error(`Failed to fetch product options. ${error.response?.data?.error || error.message}`);
            setRyeVariantsInfo({ baseProductName: selectedBaseItem?.name || 'Product', baseProductImage: selectedBaseItem?.image_url, variants: [] });
        } finally {
            setIsLoadingVariants(false);
        }
    }, [selectedBaseItem?.name, selectedBaseItem?.image_url]); // Dependencies remain the same

    useEffect(() => {
        if (!isOpen) {
            resetFormState();
            initialOpenRef.current = true;
            return;
        }

        if (existingDriveItem) {
            console.log("[AddItemBlade] Editing existing drive item:", existingDriveItem);
            setSelectedBaseItem({
                item_id: existingDriveItem.item_id,
                name: existingDriveItem.base_item_name,
                image_url: existingDriveItem.base_item_photo,
                rye_product_id: existingDriveItem.base_rye_product_id,
                marketplace: existingDriveItem.base_marketplace,
                price: existingDriveItem.base_item_price
            });
            setSearchQuery(existingDriveItem.base_item_name || '');
            setQuantity(existingDriveItem.needed || 1);
            setSelectedRyeVariantId(existingDriveItem.selected_rye_variant_id || '');

            if (existingDriveItem.base_rye_product_id && existingDriveItem.base_marketplace) {
                fetchAndSetRyeVariants(
                    existingDriveItem.base_rye_product_id,
                    existingDriveItem.base_marketplace,
                    existingDriveItem.selected_rye_variant_id
                );
            }
            initialOpenRef.current = true;
        } else {
            if (initialOpenRef.current) {
                resetFormState();
                initialOpenRef.current = false;
            }
        }
    }, [isOpen, existingDriveItem, fetchAndSetRyeVariants, resetFormState]);

    const handleSearchItems = async (e) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) { setSearchedItems([]); return; }
        setIsLoading(true);
        try {
            // UPDATED to relative path
            const response = await axios.get(`/api/items?search=${encodeURIComponent(trimmedQuery)}`, { withCredentials: true });
            setSearchedItems(response.data || []);
            if (response.data.length === 0) toast.info("No products found in catalog.");
        } catch {
            toast.error("Failed to search items.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBaseItem = (itemFromSearch) => {
        setSelectedBaseItem(itemFromSearch);
        setSearchedItems([]);
        setSearchQuery(itemFromSearch.name);
        setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] });
        setSelectedRyeVariantId('');

        if (itemFromSearch.rye_product_id && itemFromSearch.marketplace) {
            fetchAndSetRyeVariants(itemFromSearch.rye_product_id, itemFromSearch.marketplace);
        } else {
            if (itemFromSearch.marketplace?.toUpperCase() === "SHOPIFY") {
                toast.warn("This Shopify product may not be fully synced for variant selection via Rye.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaseItem || !selectedBaseItem.item_id) {
            toast.error("Please search and select a valid catalog product first.");
            return;
        }
        setIsLoading(true);

        const isShopify = selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY';
        let itemPayload = {
            quantity: parseInt(quantity, 10),
            base_catalog_item_id: selectedBaseItem.item_id,
            selected_rye_variant_id: null,
            selected_rye_marketplace: selectedBaseItem.marketplace,
            variant_display_name: selectedBaseItem.name,
            variant_display_price: selectedBaseItem.price !== null && selectedBaseItem.price !== undefined ? parseFloat(selectedBaseItem.price) : null,
            variant_display_photo: selectedBaseItem.image_url
        };

        if (isShopify) {
            const hasAnyVariantsListedByRye = ryeVariantsInfo.variants && ryeVariantsInfo.variants.length > 0;
            const availableShopifyVariants = ryeVariantsInfo.variants.filter(v => v.isAvailable);

            if (hasAnyVariantsListedByRye) {
                if (availableShopifyVariants.length === 0) {
                    toast.error("This Shopify product has variants, but none are currently available. Cannot add to drive.");
                    setIsLoading(false); return;
                }
                if (!selectedRyeVariantId) {
                    toast.error("Please select a specific variant for this Shopify product.");
                    setIsLoading(false); return;
                }
                itemPayload.selected_rye_variant_id = selectedRyeVariantId;
                const chosenVariant = availableShopifyVariants.find(v => v.id === selectedRyeVariantId);
                if (chosenVariant) {
                    itemPayload.variant_display_name = chosenVariant.title || itemPayload.variant_display_name;
                    itemPayload.variant_display_price = chosenVariant.priceV2?.value != null ? (chosenVariant.priceV2.value / 100) : itemPayload.variant_display_price;
                    itemPayload.variant_display_photo = chosenVariant.image?.url || itemPayload.variant_display_photo;
                }
            } else {
                itemPayload.selected_rye_variant_id = selectedBaseItem.rye_product_id;
                toast.info("No specific variants were reported by Rye; main product ID will be used for this Shopify item.");
            }
        } else {
            itemPayload.selected_rye_variant_id = selectedBaseItem.rye_product_id;
        }

        if (!itemPayload.selected_rye_variant_id) {
            toast.error("Could not determine the specific Rye ID for the item/variant to be purchased.");
            setIsLoading(false); return;
        }

        // UPDATED to relative paths
        const targetUrl = existingDriveItem?.drive_item_id
            ? `/api/drives/${driveId}/items/${existingDriveItem.drive_item_id}`
            : `/api/drives/${driveId}/items`;
        const method = existingDriveItem?.drive_item_id ? 'put' : 'post';

        console.log(`[AddItemBlade] Submitting to ${method.toUpperCase()} ${targetUrl} with payload:`, itemPayload);

        try {
            await axios[method](targetUrl, itemPayload, { withCredentials: true });
            toast.success(`Drive item ${existingDriveItem ? 'updated' : 'added'} successfully!`);
            onSave();
            onClose();
        } catch (error) {
            console.error("[AddItemBlade] Error saving drive item:", error);
            const errorMsg = error.response?.data?.errors?.map(e => e.msg).join(', ') || error.response?.data?.error || error.message;
            toast.error(`Failed to save drive item: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const isShopifyAndRequiresVariantSelectionButNoneSelected =
        selectedBaseItem?.marketplace?.toUpperCase() === 'SHOPIFY' &&
        ryeVariantsInfo.variants?.some(v => v.isAvailable) &&
        !selectedRyeVariantId;

    const isSubmitDisabled = isLoading || isLoadingVariants ||
        !selectedBaseItem ||
        isShopifyAndRequiresVariantSelectionButNoneSelected;

    if (!isOpen) return null;

    return (
        <>
            {/* ... (JSX for the blade remains the same) ... */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-item-blade-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 id="add-item-blade-title" className="text-xl font-semibold text-gray-800">
                        {existingDriveItem ? 'Edit' : 'Add'} Item to Drive
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                        aria-label="Close panel"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="mb-4">
                        <label htmlFor="searchQueryBlade" className="block text-sm font-medium text-gray-700 mb-1">
                            Search for Product (from catalog)
                        </label>
                        <div className="flex">
                            <input
                                type="text"
                                id="searchQueryBlade"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter product name..."
                                className="flex-grow border-gray-300 shadow-sm rounded-l-md p-2 focus:ring-ggreen focus:border-ggreen"
                                disabled={!!selectedBaseItem}
                            />
                            <button
                                type="button"
                                onClick={handleSearchItems}
                                disabled={isLoading || !!selectedBaseItem}
                                className="bg-ggreen text-white px-4 py-2 rounded-r-md hover:bg-teal-700 disabled:opacity-50"
                            >
                                {isLoading && !searchedItems.length ? '...' : 'Search'}
                            </button>
                        </div>
                        {isLoading && !searchedItems.length && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
                        {searchedItems.length > 0 && (
                            <ul className="border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                                {searchedItems.map(item => (
                                    <li
                                        key={item.item_id}
                                        onClick={() => handleSelectBaseItem(item)}
                                        className="p-3 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-3"
                                    >
                                        {item.image_url && (
                                            <img src={item.image_url} alt={item.name || ''} className="w-12 h-12 object-contain rounded flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                                        )}
                                        {!item.image_url && (<div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">No Img</div>)}
                                        <div className="flex-grow">
                                            <span className="block font-medium">{item.name} ({item.marketplace})</span>
                                            <span className="text-xs text-gray-500 block">Catalog DB ID: {item.item_id}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {selectedBaseItem && (
                        <div className="mb-4 p-3 border rounded-md bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-700">Selected: {selectedBaseItem.name}</h3>
                                    <p className="text-xs text-gray-500">Marketplace: {selectedBaseItem.marketplace}</p>
                                    <p className="text-xs text-gray-500">Base Catalog Rye Product ID: {selectedBaseItem.rye_product_id}</p>
                                    <p className="text-xs text-gray-500">Base Catalog Item DB ID: {selectedBaseItem.item_id}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetFormState}
                                    className="text-xs text-red-500 hover:underline"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedBaseItem && (
                        <>
                            {selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY' && (
                                <ShopifyVariantSelector
                                    baseProductName={ryeVariantsInfo.baseProductName || selectedBaseItem.name}
                                    isLoadingVariants={isLoadingVariants}
                                    variants={ryeVariantsInfo.variants}
                                    selectedRyeVariantId={selectedRyeVariantId}
                                    setSelectedRyeVariantId={setSelectedRyeVariantId}
                                />
                            )}
                            {selectedBaseItem.marketplace?.toUpperCase() === 'AMAZON' && (
                                <div className="mb-4 p-2 border rounded-md bg-gray-50 text-sm text-gray-700">
                                    The selected Amazon product &quot;{selectedBaseItem.name}&quot; will be added.
                                    {isLoadingVariants && <span className="ml-2 italic text-xs">(Confirming details...)</span>}
                                </div>
                            )}

                            <div className="mb-6">
                                <label htmlFor="quantityBlade" className="block text-sm font-medium text-gray-700 mb-1">Quantity Needed</label>
                                <input type="number" id="quantityBlade" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="block w-full border-gray-300 shadow-sm rounded-md p-2 focus:ring-ggreen focus:border-ggreen sm:text-sm" />
                            </div>
                        </>
                    )}
                </form>

                <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="px-4 py-2 text-sm bg-ggreen text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                    >
                        {isLoading || isLoadingVariants ? 'Processing...' : (existingDriveItem ? 'Update Item' : 'Add Item')}
                    </button>
                </div>
            </div>
        </>
    );
};

// ShopifyVariantSelector component remains the same
const ShopifyVariantSelector = ({ baseProductName, isLoadingVariants, variants, selectedRyeVariantId, setSelectedRyeVariantId }) => {
    // ... (this component does not make API calls, so it's unchanged) ...
    const availableVariants = variants.filter(v => v.isAvailable);

    if (isLoadingVariants) {
        return <p className="text-xs text-gray-500 mt-1 text-center p-3">Loading variants...</p>;
    }

    if (variants.length > 0 && availableVariants.length === 0) {
        return (
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 border border-yellow-300 rounded-md mt-1">
                All variants for &quot;{baseProductName}&quot; are currently unavailable. Please check back later or select a different product.
            </p>
        );
    }

    if (availableVariants.length > 0) {
        return (
            <div className="mb-4">
                <label htmlFor="ryeVariantSelectBlade" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Variant for &quot;{baseProductName}&quot;<span className="text-red-500">*</span>
                </label>
                <select
                    id="ryeVariantSelectBlade"
                    value={selectedRyeVariantId}
                    onChange={(e) => setSelectedRyeVariantId(e.target.value)}
                    className="block w-full border-gray-300 shadow-sm rounded-md p-2 focus:ring-ggreen focus:border-ggreen sm:text-sm"
                    required
                >
                    <option value="">-- Select Variant --</option>
                    {availableVariants.map(variant => (
                        <option key={variant.id} value={variant.id}>
                            {variant.title}
                            {variant.priceV2?.value != null && variant.priceV2?.currency &&
                                ` (${formatCurrency(variant.priceV2.value, variant.priceV2.currency)})`}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <p className="text-sm text-gray-500 p-3 border rounded-md bg-gray-50 mt-1">
            No selectable variants currently available for this Shopify product. The main product details will be used.
        </p>
    );
};

ShopifyVariantSelector.propTypes = {
    baseProductName: PropTypes.string,
    isLoadingVariants: PropTypes.bool.isRequired,
    variants: PropTypes.array.isRequired,
    selectedRyeVariantId: PropTypes.string.isRequired,
    setSelectedRyeVariantId: PropTypes.func.isRequired,
};

AddItemBlade.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    driveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    existingDriveItem: PropTypes.shape({
        drive_item_id: PropTypes.number,
        item_id: PropTypes.number.isRequired,
        needed: PropTypes.number,
        base_item_name: PropTypes.string,
        base_item_photo: PropTypes.string,
        base_rye_product_id: PropTypes.string,
        base_marketplace: PropTypes.string,
        base_item_price: PropTypes.number,
        selected_rye_variant_id: PropTypes.string,
    }),
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default AddItemBlade;