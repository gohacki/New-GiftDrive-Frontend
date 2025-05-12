// File: pages/visible/drive/[id].js
import axios from 'axios';
import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import ChildModal from 'components/Modals/ChildModal'; // Assuming this is for child specific needs
import { CartContext } from 'contexts/CartContext';
import { AuthContext } from 'contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import ShareButton from '@/components/Share/ShareButton'; // Assuming you have a ShareButton

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper: Checks if this specific need is represented in the augmented cart
function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemNeedKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemNeedKeyType];
  const sourceFieldInCart = itemNeedKeyType === 'drive_item_id' ? 'giftdrive_source_drive_item_id' : 'giftdrive_source_child_item_id';
  return cartFromContext.stores.some(store =>
    store.cartLines?.some(line => line[sourceFieldInCart] != null && line[sourceFieldInCart] === sourceIdToCheck)
  );
}

const DrivePage = ({ drive: initialDriveData }) => {
  const router = useRouter();
  const { cart, setCart, loading: cartLoading } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [drive, setDrive] = useState(initialDriveData);
  const [selectedRyeVariants, setSelectedRyeVariants] = useState({});
  const [availableRyeVariantsInfo, setAvailableRyeVariantsInfo] = useState({});
  const [isLoadingVariants, setIsLoadingVariants] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});

  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, [router.asPath]);


  useEffect(() => {
    // Initialize quantities for drive items
    const initialDriveItemQuantities = {};
    drive?.items?.forEach(itemNeed => {
      initialDriveItemQuantities[itemNeed.drive_item_id] = 1;
    });
    setItemQuantities(prev => ({ ...prev, ...initialDriveItemQuantities }));

    // Initialize quantities for child items (if structure is similar)
    // This might need adjustment if child items are fetched/structured differently
    drive?.children?.forEach(child => {
      child.items?.forEach(itemNeed => {
        // Assuming child_item_id is the key for child items
        setItemQuantities(prev => ({ ...prev, [itemNeed.child_item_id]: 1 }));
      });
    });

  }, [drive?.items, drive?.children]);

  const fetchVariantsForNeed = async (itemNeed, itemKey) => { // itemKey is drive_item_id or child_item_id
    // Base Rye Product ID and Marketplace should come from the base catalog item info
    // now stored with the drive_item or child_item.
    if (!itemNeed.allow_donor_variant_choice || !itemNeed.base_rye_product_id || availableRyeVariantsInfo[itemKey]) {
      return;
    }
    setIsLoadingVariants(prev => ({ ...prev, [itemKey]: true }));
    try {
      const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
        rye_product_id: itemNeed.base_rye_product_id, // Use base_rye_product_id from the item need
        marketplace: itemNeed.base_marketplace,     // Use base_marketplace from the item need
      });
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemKey]: response.data }));
      if (response.data?.variants?.length > 0) {
        const firstAvailable = response.data.variants.find(v => v.isAvailable);
        if (firstAvailable) {
          setSelectedRyeVariants(prev => ({ ...prev, [itemKey]: firstAvailable.id }));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch variants for item key ${itemKey}:`, error);
      toast.error(`Could not load options.`);
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemKey]: { variants: [] } }));
    } finally {
      setIsLoadingVariants(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleVariantSelectionChange = (itemKey, ryeVariantId) => {
    setSelectedRyeVariants(prev => ({ ...prev, [itemKey]: ryeVariantId }));
  };

  const handleQuantityChange = (itemKey, value, maxRemaining) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, maxRemaining > 0 ? maxRemaining : 1));
    setItemQuantities(prev => ({ ...prev, [itemKey]: newQuantity }));
  };

  const handleAddToCart = async (itemNeed, itemKeyType) => { // itemKeyType is 'drive_item_id' or 'child_item_id'
    if (!user) {
      toast.error("Please log in to add items.");
      router.push('/auth/login'); return;
    }
    const itemKey = itemNeed[itemKeyType];
    setIsAddingToCart(prev => ({ ...prev, [itemKey]: true }));

    let ryeIdForCartApi = itemNeed.selected_rye_variant_id; // This should now be populated correctly
    let marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    let itemNameForToast = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";

    // If donor choice is allowed AND a variant was selected from dropdown, override with that selection
    if (itemNeed.allow_donor_variant_choice && selectedRyeVariants[itemKey]) {
      ryeIdForCartApi = selectedRyeVariants[itemKey];
      marketplaceForCartApi = itemNeed.base_marketplace; // Marketplace of the base product
      const variantInfo = availableRyeVariantsInfo[itemKey]?.variants?.find(v => v.id === ryeIdForCartApi);
      if (variantInfo) itemNameForToast = variantInfo.title;
    }

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }
    // Check if the item is generally linkable (from base item properties)
    if (!itemNeed.is_rye_linked) {
      toast.warn('This item variation cannot be purchased online at this time.');
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }

    const quantity = itemQuantities[itemKey] || 1;
    const payload = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemKey,
      originalNeedRefType: itemKeyType === 'drive_item_id' ? 'drive_item' : 'child_item'
    };

    try {
      const response = await axios.post(`${apiUrl}/api/cart/add`, payload, { withCredentials: true });
      setCart(response.data);
      toast.success(`${itemNameForToast} (Qty: ${quantity}) added to cart!`);

      // Refetch drive data to update remaining counts
      const updatedDriveResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}`);
      const updatedItemsResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}/items`);
      const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}/aggregate`);
      setDrive({
        ...updatedDriveResponse.data,
        items: updatedItemsResponse.data,
        children: updatedDriveResponse.data.children || [], // ensure children array exists
        totalNeeded: Number(aggregateResponse.data.totalNeeded) || 0,
        totalPurchased: Number(aggregateResponse.data.totalPurchased) || 0,
      });
    } catch (err) {
      console.error('Error adding to cart:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || `Failed to add ${itemNameForToast} to cart.`);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const openChildModal = (childId) => {
    setSelectedChildIdForModal(childId);
    setIsChildModalOpen(true);
  };
  const closeChildModal = () => {
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
    // Optionally refetch drive data if modal actions could change item counts
    // fetchDriveData(); // You'd need to extract this or pass a refresh function
  };

  if (!drive) return (<><Navbar /><main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800"><p className="text-gray-600 text-lg">Drive not found.</p></main><Footer /></>);

  const totalNeeded = Number(drive.totalNeeded) || 0;
  const totalPurchased = Number(drive.totalPurchased) || 0;
  const totalRemaining = Math.max(0, totalNeeded - totalPurchased);
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;

  // Function to render item cards (reusable for drive items and child items in modal if needed)
  const renderItemCard = (itemNeed, itemKeyType) => {
    const itemKey = itemNeed[itemKeyType];
    const thisSpecificNeedIsInCart = isThisSpecificNeedInCart(itemNeed, cart, itemKeyType);

    const currentQuantity = itemQuantities[itemKey] || 1;
    const isCompletelyFulfilled = itemNeed.remaining <= 0;
    const isItemActionLoading = isLoadingVariants[itemKey] || isAddingToCart[itemKey] || cartLoading;

    // An item is not purchaseable if its base catalog item isn't Rye-linked OR if donor choice is allowed but no variant is selected yet.
    const isNotPurchaseableOnline = !itemNeed.is_rye_linked || (itemNeed.allow_donor_variant_choice && !selectedRyeVariants[itemKey]);
    const cardIsVisuallyDisabled = isCompletelyFulfilled || isNotPurchaseableOnline;

    let buttonText;
    let effectiveDisabledState;

    if (isAddingToCart[itemKey]) {
      buttonText = "Adding...";
      effectiveDisabledState = true;
    } else if (isCompletelyFulfilled) {
      buttonText = "Fulfilled";
      effectiveDisabledState = true;
    } else if (thisSpecificNeedIsInCart) {
      buttonText = "In Cart";
      effectiveDisabledState = true;
    } else {
      buttonText = "Add to Cart";
      effectiveDisabledState = cardIsVisuallyDisabled || isItemActionLoading || currentQuantity > (itemNeed.remaining || 0);
    }
    if (cardIsVisuallyDisabled && buttonText !== "Fulfilled") {
      effectiveDisabledState = true;
    }


    const baseName = itemNeed.base_item_name || 'Item';
    const variantName = itemNeed.variant_display_name;
    const showVariantSubline = variantName && variantName !== baseName;

    const photoToDisplay = itemNeed.variant_display_photo || itemNeed.base_item_photo || '/img/default-item.png';
    const priceToDisplay = itemNeed.variant_display_price !== null ? itemNeed.variant_display_price : itemNeed.base_item_price;

    return (
      <div
        key={itemKey}
        className={`border-2 p-4 rounded-lg shadow-sm flex flex-col justify-between transition-shadow
                    ${(cardIsVisuallyDisabled && !isCompletelyFulfilled) // Dim if not purchaseable but not yet fulfilled
            ? 'bg-gray-100 opacity-70 border-gray-300 pointer-events-none'
            : isCompletelyFulfilled
              ? 'bg-green-50 border-green-300 opacity-80 pointer-events-none' // Fulfilled style
              : 'border-ggreen bg-white hover:shadow-md'
          }`}
      >
        <div className="flex-grow">
          {photoToDisplay && (
            <div className="flex justify-center mb-4 h-32 relative">
              <Image src={photoToDisplay} alt={baseName} fill style={{ objectFit: "contain" }} className="rounded-md" onError={(e) => e.currentTarget.src = '/img/default-item.png'} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 30vw" />
            </div>
          )}
          <h3 className="text-lg text-ggreen font-medium mb-1 line-clamp-2 h-12" title={baseName}>{baseName}</h3>
          {showVariantSubline && (
            <p className="text-sm text-gray-500 mb-1 line-clamp-1" title={variantName}>{variantName}</p>
          )}

          {itemNeed.allow_donor_variant_choice && !isCompletelyFulfilled && !thisSpecificNeedIsInCart && (
            <>
              <button
                onClick={() => fetchVariantsForNeed(itemNeed, itemKey)}
                className="text-xs text-blue-600 hover:underline mb-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={isLoadingVariants[itemKey] || cardIsVisuallyDisabled || isCompletelyFulfilled || thisSpecificNeedIsInCart}
              >
                {isLoadingVariants[itemKey] ? 'Loading Options...' : (availableRyeVariantsInfo[itemKey] ? 'Change Options' : 'Select Options')}
              </button>
              {availableRyeVariantsInfo[itemKey]?.variants && (
                <select
                  value={selectedRyeVariants[itemKey] || ''}
                  onChange={(e) => handleVariantSelectionChange(itemKey, e.target.value)}
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-ggreen sm:text-xs mb-2 disabled:bg-gray-200"
                  disabled={cardIsVisuallyDisabled || isLoadingVariants[itemKey] || thisSpecificNeedIsInCart || isCompletelyFulfilled}
                >
                  <option value="" disabled>Choose an option...</option>
                  {availableRyeVariantsInfo[itemKey].variants.filter(v => v.isAvailable).map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} ({formatCurrency(variant.priceV2?.value, variant.priceV2?.currency)})
                    </option>
                  ))}
                  {availableRyeVariantsInfo[itemKey].variants.filter(v => v.isAvailable).length === 0 && (
                    <option value="" disabled>No options currently available</option>
                  )}
                </select>
              )}
            </>
          )}

          {priceToDisplay !== null && !itemNeed.allow_donor_variant_choice && ( // Only show price if not donor choice (handled in select)
            <p className="text-gray-800 font-bold mb-1">{formatCurrency(priceToDisplay * 100, 'USD')}</p>
          )}
          <p className="text-gray-600 text-sm mb-2 line-clamp-3">{itemNeed.base_item_description || ''}</p>
          <p className="text-xs text-gray-500 mb-2">Needed: {itemNeed.needed} | Remaining: {itemNeed.remaining}</p>

          {isNotPurchaseableOnline && !isCompletelyFulfilled && (
            <p className="text-xs text-orange-600 font-semibold mt-1">Item not available for online purchase.</p>
          )}
        </div>

        {!isCompletelyFulfilled && itemNeed.is_rye_linked && ( // Only show add to cart if linkable
          <div className="mt-4">
            {itemNeed.needed > 1 && !thisSpecificNeedIsInCart && (
              <div className="flex items-center justify-center mb-2">
                <label htmlFor={`quantity-${itemKeyType}-${itemKey}`} className="mr-2 text-xs text-gray-700">Qty:</label>
                <input
                  type="number"
                  id={`quantity-${itemKeyType}-${itemKey}`}
                  min="1"
                  max={itemNeed.remaining > 0 ? itemNeed.remaining : 1}
                  value={currentQuantity}
                  onChange={(e) => handleQuantityChange(itemKey, e.target.value, itemNeed.remaining)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen text-xs disabled:bg-gray-200"
                  disabled={cardIsVisuallyDisabled || isItemActionLoading || thisSpecificNeedIsInCart}
                />
              </div>
            )}
            <button
              onClick={() => handleAddToCart(itemNeed, itemKeyType)}
              disabled={effectiveDisabledState}
              className={`w-full px-3 py-2 text-white rounded-md shadow-sm transition-colors inter-medium text-xs font-semibold
                          focus:outline-none focus:ring-2 focus:ring-offset-2
                          ${effectiveDisabledState
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-ggreen hover:bg-teal-700 focus:ring-teal-600'
                }
                          ${isAddingToCart[itemKey] ? 'animate-pulse cursor-wait' : ''}
                        `}
            >
              {buttonText}
            </button>
          </div>
        )}
      </div>
    );
  };


  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/visible/organization/${drive.org_id || 'org'}`, label: drive.organization_name || 'Organization' },
              { href: `/visible/drive/${drive.drive_id}`, label: drive.name },
            ]}
          />
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
              aria-label="Go back to previous page"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            {pageUrl && drive && <ShareButton pageType="drive" pageData={drive} pageUrl={pageUrl} />}
          </div>


          {drive.photo}
          <div className="mb-6"> {/* ... Drive Name, Description, Stats JSX ... */}
            <h1 className="text-3xl font-semibold text-ggreen mb-2">{drive.name}</h1>
            <p className="text-gray-700 mb-4">{drive.description}</p>
            <div className="text-gray-600 flex flex-wrap gap-x-4 gap-y-1 items-center">
              <p className="font-medium">{totalNeeded} Item(s) Needed</p>
              {drive.org_city && drive.org_state && <p className="font-medium">{drive.org_city}, {drive.org_state}</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3 space-y-8">
              <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Drive Progress</h2>
                <div className="bg-gray-200 w-full h-4 rounded-full mb-2 overflow-hidden">
                  <div className="bg-ggreen h-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-sm text-gray-700 mb-1">Donated: <strong>{totalPurchased}</strong> of {totalNeeded}</p>
                <p className="text-sm text-gray-700">Remaining: <strong>{totalRemaining}</strong></p>
              </div>

              {drive.items && drive.items.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Items Needed for the Drive
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.items.map((itemNeed) => renderItemCard(itemNeed, 'drive_item_id'))}
                  </div>
                </section>
              )}

              {drive.children && drive.children.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Children Supported by {drive.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.children.map((child) => (
                      <div
                        key={child.child_id}
                        onClick={() => openChildModal(child.child_id)}
                        className="cursor-pointer block border-2 border-ggreen bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {child.child_photo && (
                          <div className="flex justify-center mt-4 h-24 relative">
                            <Image src={child.child_photo || '/img/default-child.png'} alt={child.child_name} fill style={{ objectFit: "contain" }} className="rounded-full" sizes="96px" />
                          </div>
                        )}
                        <div className="p-4 text-center">
                          <h3 className="text-lg font-semibold text-ggreen mb-2">
                            {child.child_name}
                          </h3>
                          <p className="text-xs text-gray-500">{child.items_needed_count || 0} items needed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* ... No items/children message ... */}
            </div>
            <aside className="md:w-1/3 space-y-6"> {/* ... Aside for Org info ... */}
              <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Organization</h2>
                <Link href={`/visible/organization/${drive.org_id}`} className="text-ggreen hover:underline block mb-2">
                  <strong>{drive.organization_name}</strong>
                </Link>
                {drive.organization_photo && (
                  <div className="my-3 flex justify-center">
                    <Image src={drive.organization_photo} alt={drive.organization_name} width={100} height={100} className="rounded-md object-contain" />
                  </div>
                )}
                <p className="text-gray-700 mb-4 text-sm">
                  {drive.donorsCount != null && `Supported by ${drive.donorsCount} donor(s)`}
                </p>
                {pageUrl && <ShareButton pageType="drive" pageData={drive} pageUrl={pageUrl} />}

              </div>
            </aside>
          </div>
        </div>
      </main>
      <ChildModal isOpen={isChildModalOpen} onClose={closeChildModal} childId={selectedChildIdForModal} />
      <Footer />
    </>
  );
};

export async function getServerSideProps(context) { /* ... getServerSideProps remains the same ... */
  const { id } = context.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const driveData = driveResponse.data;

    if (!driveData || !driveData.drive_id) {
      return { notFound: true };
    }

    // Fetch drive-specific items
    const driveItemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
    const driveSpecificItems = driveItemsResponse.data || [];

    // Fetch children and their item counts
    const childrenWithItemCounts = await Promise.all(
      (driveData.children || []).map(async (child) => {
        const childItemsResp = await axios.get(`${apiUrl}/api/children/${child.child_id}/items`);
        return {
          ...child,
          items_needed_count: childItemsResp.data?.filter(item => item.remaining > 0).length || 0,
          // If you need full child items here, fetch and attach them. For now, just count.
          // items: childItemsResp.data || [] 
        };
      })
    );


    const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data;

    const finalDriveData = {
      ...driveData,
      items: driveSpecificItems, // Items directly associated with the drive
      children: childrenWithItemCounts, // Children, now with item counts
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      id: driveData.drive_id.toString(), // Ensure ID is string for pageData in ShareButton
      organization_photo: driveData.organization_photo || null, // Make sure this is fetched if needed
    };

    return {
      props: { drive: finalDriveData },
    };
  } catch (error) {
    console.error(`Error fetching data for drive ${id}:`, error.response?.data || error.message);
    return { props: { drive: null } };
  }
}

DrivePage.propTypes = { /* ... PropTypes remain largely the same, ensure item structures match backend ... */
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired, // for ShareButton
    org_id: PropTypes.number,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    organization_name: PropTypes.string,
    organization_photo: PropTypes.string,
    org_city: PropTypes.string,
    org_state: PropTypes.string,
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
    donorsCount: PropTypes.number,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        child_id: PropTypes.number.isRequired,
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
        items_needed_count: PropTypes.number, // Added this
      })
    ),
    items: PropTypes.arrayOf(
      PropTypes.shape({
        drive_item_id: PropTypes.number.isRequired,
        item_id: PropTypes.number, // base_catalog_item_id
        base_item_name: PropTypes.string,
        base_item_photo: PropTypes.string,
        base_item_price: PropTypes.number,
        base_item_description: PropTypes.string,
        base_rye_product_id: PropTypes.string,
        base_marketplace: PropTypes.string,
        is_rye_linked: PropTypes.bool,
        needed: PropTypes.number,
        purchased: PropTypes.number,
        remaining: PropTypes.number,
        allow_donor_variant_choice: PropTypes.bool,
        selected_rye_variant_id: PropTypes.string,
        selected_rye_marketplace: PropTypes.string,
        variant_display_name: PropTypes.string,
        variant_display_photo: PropTypes.string,
        variant_display_price: PropTypes.number,
      })
    ),
  }),
};


export default DrivePage;