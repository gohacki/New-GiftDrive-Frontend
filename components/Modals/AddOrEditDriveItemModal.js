// components/Modals/AddOrEditDriveItemModal.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/lib/utils'; // Assuming you have this frontend util

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AddOrEditDriveItemModal = ({ driveId, existingDriveItem, onSave, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedItems, setSearchedItems] = useState([]);
    const [selectedBaseItem, setSelectedBaseItem] = useState(null); // Info from your 'items' table

    const [configurationType, setConfigurationType] = useState('donorChoice'); // 'donorChoice' or 'presetVariant'

    const [ryeVariantsInfo, setRyeVariantsInfo] = useState({ baseProductName: '', baseProductImage: '', variants: [] });
    const [selectedRyeVariantId, setSelectedRyeVariantId] = useState('');

    const [quantity, setQuantity] = useState(1);
    const [isLoading, setIsLoading] = useState(false); // General loading for search/save
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);

    // Initialize form if editing
    useEffect(() => {
        if (existingDriveItem) {
            setQuantity(existingDriveItem.needed || 1);
            if (existingDriveItem.base_rye_product_id_for_donor_choice) {
                setConfigurationType('donorChoice');
                setSelectedBaseItem({
                    // These details should ideally be part of existingDriveItem when fetched by the parent
                    name: existingDriveItem.base_product_name_for_donor_choice || 'Product for Donor Choice',
                    image_url: existingDriveItem.base_product_image_for_donor_choice,
                    rye_product_id: existingDriveItem.base_rye_product_id_for_donor_choice,
                    marketplace: existingDriveItem.base_marketplace_for_donor_choice,
                    // item_id here would be the placeholder/generic item_id if you use one, or null
                    item_id: existingDriveItem.preset_db_item_id, // if you store a placeholder item_id
                });
                setSearchQuery(existingDriveItem.base_product_name_for_donor_choice || '');
            } else if (existingDriveItem.preset_details?.internal_item_id) {
                setConfigurationType('presetVariant');
                setSelectedBaseItem({
                    name: existingDriveItem.preset_details.name?.split(' - ')[0] || existingDriveItem.preset_details.name || 'Preset Product',
                    image_url: existingDriveItem.preset_details.photo, // Assuming photo is base image
                    rye_product_id: existingDriveItem.preset_details.base_rye_product_id, // Parent Rye Product ID
                    marketplace: existingDriveItem.preset_details.marketplace,
                    item_id: null, // Not the preset one, but the conceptual base
                });
                setSearchQuery(existingDriveItem.preset_details.name?.split(' - ')[0] || existingDriveItem.preset_details.name || '');
                setSelectedRyeVariantId(existingDriveItem.preset_details.rye_id_to_add_directly); // This is the RYE variant ID
                // Fetch variants to populate dropdown and show the selected one
                if (existingDriveItem.preset_details.base_rye_product_id && existingDriveItem.preset_details.marketplace) {
                    fetchAndSetRyeVariants(
                        existingDriveItem.preset_details.base_rye_product_id,
                        existingDriveItem.preset_details.marketplace,
                        existingDriveItem.preset_details.rye_id_to_add_directly // Pass the already selected variant ID
                    );
                }
            }
        } else {
            // Reset for new item
            setSearchQuery(''); setSearchedItems([]); setSelectedBaseItem(null);
            setConfigurationType('donorChoice'); setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] });
            setSelectedRyeVariantId(''); setQuantity(1);
        }
    }, [existingDriveItem]);

    const handleSearchItems = async (e) => {
        e.preventDefault(); // Prevent form submission if it's part of a form
        if (!searchQuery.trim()) {
            setSearchedItems([]);
            return;
        }
        setIsLoading(true);
        try {
            // This GET /api/items endpoint in your backend should return items from your local DB.
            // It's crucial that items returned here have `rye_product_id` and `marketplace`
            // if they are base products for which variants can be fetched.
            const response = await axios.get(`${apiUrl}/api/items?search=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
            setSearchedItems(response.data || []);
            if (response.data.length === 0) toast.info("No products found matching your search in the local catalog.");
        } catch (error) {
            toast.error("Failed to search items.");
            console.error("Search error:", error);
        }
        setIsLoading(false);
    };

    const fetchAndSetRyeVariants = async (ryeProductId, marketplace, preselectVariantId = null) => {
        if (!ryeProductId || !marketplace) return;
        setIsLoadingVariants(true);
        setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] }); // Clear previous
        setSelectedRyeVariantId('');
        try {
            const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
                rye_product_id: ryeProductId,
                marketplace: marketplace,
            }, { withCredentials: true });
            setRyeVariantsInfo({
                baseProductName: response.data?.baseProductName || selectedBaseItem?.name || 'Product',
                baseProductImage: response.data?.baseProductImage || selectedBaseItem?.image_url,
                variants: response.data?.variants || []
            });
            if (preselectVariantId && response.data?.variants?.some(v => v.id === preselectVariantId)) {
                setSelectedRyeVariantId(preselectVariantId);
            } else if (response.data?.variants?.length > 0) {
                const firstAvailable = response.data.variants.find(v => v.isAvailable);
                // if (firstAvailable) setSelectedRyeVariantId(firstAvailable.id); // Let admin explicitly pick
            }
            if (response.data?.variants?.length === 0 && marketplace.toUpperCase() === 'SHOPIFY') {
                toast.warn("No variants found for this Shopify product on Rye. It might not have variants or there could be a sync issue.");
            }
        } catch (error) {
            toast.error(`Failed to fetch variants. ${error.response?.data?.error || ''}`);
            console.error("Fetch variants error:", error);
        }
        setIsLoadingVariants(false);
    };

    const handleSelectBaseItem = (itemFromSearch) => {
        // itemFromSearch is an object from your `items` table.
        // It should contain at least: item_id, name, image_url, rye_product_id, marketplace
        setSelectedBaseItem(itemFromSearch);
        setSearchedItems([]);
        setSearchQuery(itemFromSearch.name);
        setConfigurationType('donorChoice'); // Default when a new base item is selected
        setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] }); // Clear variants from previous selection
        setSelectedRyeVariantId(''); // Clear selected variant
    };

    useEffect(() => {
        if (configurationType === 'presetVariant' && selectedBaseItem && selectedBaseItem.rye_product_id && selectedBaseItem.marketplace) {
            if (ryeVariantsInfo.variants.length === 0 ||
                (ryeVariantsInfo.baseProductName !== selectedBaseItem.name && ryeVariantsInfo.baseProductImage !== selectedBaseItem.image_url)) { // Re-fetch if base item changed concept
                fetchAndSetRyeVariants(selectedBaseItem.rye_product_id, selectedBaseItem.marketplace);
            }
        } else if (configurationType === 'donorChoice') {
            setSelectedRyeVariantId(''); // Clear preset variant if switching to donor choice
        }
    }, [configurationType, selectedBaseItem]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaseItem) {
            toast.error("Please search and select a product first.");
            return;
        }
        setIsLoading(true);

        let payload = {
            quantity: parseInt(quantity, 10),
        };

        if (configurationType === 'donorChoice') {
            if (!selectedBaseItem.rye_product_id || !selectedBaseItem.marketplace) {
                toast.error("Selected base product is missing Rye linking information.");
                setIsLoading(false);
                return;
            }
            payload.base_rye_product_id_for_donor_choice = selectedBaseItem.rye_product_id;
            payload.base_marketplace_for_donor_choice = selectedBaseItem.marketplace;
            payload.base_product_name_for_donor_choice = selectedBaseItem.name;
            payload.base_product_image_for_donor_choice = selectedBaseItem.image_url;
        } else { // presetVariant
            if (!selectedRyeVariantId && selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY') { // Amazon might not need a sub-selection if base item IS the variant
                toast.error("Please select a specific variant to preset for Shopify product.");
                setIsLoading(false);
                return;
            }
            if (!selectedBaseItem.rye_product_id || !selectedBaseItem.marketplace) {
                toast.error("Selected base product for preset is missing Rye linking information.");
                setIsLoading(false);
                return;
            }

            // For Amazon, if selectedBaseItem is already the specific ASIN to buy, selectedRyeVariantId might be empty or same as base_rye_product_id
            const actualRyeVariantIdToUse = selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY' ? selectedRyeVariantId : selectedBaseItem.rye_product_id;
            if (!actualRyeVariantIdToUse) {
                toast.error("Could not determine specific item to preset.");
                setIsLoading(false);
                return;
            }

            try {
                const variantDetails = ryeVariantsInfo.variants.find(v => v.id === actualRyeVariantIdToUse) || {};
                const findOrCreateResponse = await axios.post(`${apiUrl}/api/items/find-or-create-specific-variant`, {
                    base_rye_product_id: selectedBaseItem.rye_product_id,
                    rye_variant_id: actualRyeVariantIdToUse, // This is the key
                    marketplace: selectedBaseItem.marketplace,
                    base_product_name_hint: selectedBaseItem.name, // Name of the parent product
                    variant_title_hint: variantDetails?.title, // Title of the specific variant
                    variant_price_hint: variantDetails?.price?.value ? (variantDetails.price.value / 100) : null,
                    variant_image_url_hint: variantDetails?.image
                }, { withCredentials: true });

                payload.preset_internal_item_id = findOrCreateResponse.data.internal_item_id;
                if (!payload.preset_internal_item_id) {
                    throw new Error("Backend did not return an internal item ID for the preset variant.");
                }

            } catch (error) {
                toast.error("Error setting up preset variant: " + (error.response?.data?.error || error.message));
                setIsLoading(false);
                return;
            }
        }

        const targetUrl = existingDriveItem?.drive_item_id
            ? `${apiUrl}/api/drives/${driveId}/items/${existingDriveItem.drive_item_id}` // PUT to update
            : `${apiUrl}/api/drives/${driveId}/items`; // POST to add new
        const method = existingDriveItem?.drive_item_id ? 'put' : 'post';

        try {
            await axios[method](targetUrl, payload, { withCredentials: true });
            toast.success(`Drive item ${existingDriveItem ? 'updated' : 'added'} successfully!`);
            onSave();
            onClose();
        } catch (error) {
            toast.error("Failed to save drive item. " + (error.response?.data?.error || error.message));
            console.error("Save drive item error:", error);
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-semibold">
                        {existingDriveItem ? 'Edit' : 'Add'} Item to Drive: {driveId}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
                    {/* Step 1: Search and Select Base Item (if new or not yet selected for edit) */}
                    {(!selectedBaseItem || !searchQuery) && (
                        <div className="mb-4">
                            <label htmlFor="searchQueryModal" className="block text-sm font-medium text-gray-700 mb-1">
                                Search for Product (from your catalog)
                            </label>
                            <div className="flex">
                                <input
                                    type="text"
                                    id="searchQueryModal"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter product name..."
                                    className="flex-grow border-gray-300 shadow-sm rounded-l-md p-2 focus:ring-ggreen focus:border-ggreen"
                                />
                                <button
                                    type="button" // Important: type="button" to not submit form
                                    onClick={handleSearchItems}
                                    disabled={isLoading}
                                    className="bg-ggreen text-white px-4 py-2 rounded-r-md hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {isLoading ? '...' : 'Search'}
                                </button>
                            </div>
                            {isLoading && !searchedItems.length && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
                            {searchedItems.length > 0 && (
                                <ul className="border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {searchedItems.map(item => (
                                        <li
                                            key={item.item_id}
                                            onClick={() => handleSelectBaseItem(item)}
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between items-center"
                                        >
                                            <span>{item.name} ({item.marketplace})</span>
                                            <span className="text-xs text-gray-500">ID: {item.item_id}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {selectedBaseItem && (
                        <div className="mb-4 p-3 border rounded-md bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-700">Selected: {selectedBaseItem.name}</h3>
                                    <p className="text-xs text-gray-500">Marketplace: {selectedBaseItem.marketplace}</p>
                                    <p className="text-xs text-gray-500">Rye Product ID: {selectedBaseItem.rye_product_id}</p>
                                </div>
                                <button type="button" onClick={() => { setSelectedBaseItem(null); setSearchQuery(''); setRyeVariantsInfo({ baseProductName: '', baseProductImage: '', variants: [] }); setSelectedRyeVariantId(''); setConfigurationType('donorChoice'); }} className="text-xs text-red-500 hover:underline">Clear Selection</button>
                            </div>
                        </div>
                    )}

                    {selectedBaseItem && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Configuration for Donors:</label>
                                <div className="space-y-2">
                                    <div>
                                        <input type="radio" id="donorChoice" name="configurationType" value="donorChoice" checked={configurationType === 'donorChoice'} onChange={(e) => setConfigurationType(e.target.value)} className="mr-2 focus:ring-ggreen h-4 w-4 text-ggreen border-gray-300" />
                                        <label htmlFor="donorChoice" className="text-sm text-gray-700">Allow donor to choose variant (e.g., size, color)</label>
                                    </div>
                                    <div>
                                        <input type="radio" id="presetVariant" name="configurationType" value="presetVariant" checked={configurationType === 'presetVariant'} onChange={(e) => setConfigurationType(e.target.value)} className="mr-2 focus:ring-ggreen h-4 w-4 text-ggreen border-gray-300" />
                                        <label htmlFor="presetVariant" className="text-sm text-gray-700">I will preset a specific variant</label>
                                    </div>
                                </div>
                            </div>

                            {configurationType === 'presetVariant' && (
                                <div className="mb-4">
                                    <label htmlFor="ryeVariantSelect" className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Specific Variant for "{ryeVariantsInfo.baseProductName || selectedBaseItem.name}"
                                    </label>
                                    {isLoadingVariants && <p className="text-sm text-gray-500">Loading variants...</p>}
                                    {!isLoadingVariants && ryeVariantsInfo.variants.length === 0 && selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY' && (
                                        <p className="text-sm text-red-500">No variants found for this Shopify product. Ensure it's synced correctly with Rye or select "Allow donor to choose".</p>
                                    )}
                                    {!isLoadingVariants && (selectedBaseItem.marketplace?.toUpperCase() === 'AMAZON' || ryeVariantsInfo.variants.length > 0) && (
                                        <select
                                            id="ryeVariantSelect"
                                            value={selectedRyeVariantId}
                                            onChange={(e) => setSelectedRyeVariantId(e.target.value)}
                                            className="block w-full border-gray-300 shadow-sm rounded-md p-2 focus:ring-ggreen focus:border-ggreen sm:text-sm"
                                            disabled={isLoadingVariants || (selectedBaseItem.marketplace?.toUpperCase() === 'AMAZON' && !ryeVariantsInfo.variants.length)} // Amazon might not have "variants" if base item is already specific
                                        >
                                            <option value="">
                                                {selectedBaseItem.marketplace?.toUpperCase() === 'AMAZON' ? "Using selected Amazon product" : "-- Select Variant --"}
                                            </option>
                                            {ryeVariantsInfo.variants
                                                .filter(v => v.isAvailable) // Only show available variants
                                                .map(variant => (
                                                    <option key={variant.id} value={variant.id}>
                                                        {variant.title} ({formatCurrency(variant.price?.value, variant.price?.currency)})
                                                    </option>
                                                ))}
                                            {ryeVariantsInfo.variants.filter(v => v.isAvailable).length === 0 && selectedBaseItem.marketplace?.toUpperCase() === 'SHOPIFY' && (
                                                <option value="" disabled>No available variants to preset</option>
                                            )}
                                        </select>
                                    )}
                                </div>
                            )}

                            <div className="mb-6">
                                <label htmlFor="quantityModal" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity Needed
                                </label>
                                <input type="number" id="quantityModal" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="block w-full border-gray-300 shadow-sm rounded-md p-2 focus:ring-ggreen focus:border-ggreen sm:text-sm" />
                            </div>
                        </>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !selectedBaseItem || (configurationType === 'presetVariant' && !selectedRyeVariantId && selectedBaseItem?.marketplace?.toUpperCase() === 'SHOPIFY')}
                            className="px-4 py-2 text-sm bg-ggreen text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : (existingDriveItem ? 'Update Item' : 'Add Item to Drive')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddOrEditDriveItemModal.propTypes = {
    driveId: PropTypes.number.isRequired,
    existingDriveItem: PropTypes.object, // If editing, pass the drive_item object
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default AddOrEditDriveItemModal;