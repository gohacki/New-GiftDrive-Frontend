// pages/visible/drive/[id].js
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
import ChildModal from 'components/Modals/ChildModal'; // Keep if you still use it for children listed on drive page
import { CartContext } from 'contexts/CartContext';
import { AuthContext } from 'contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DrivePage = ({ drive: initialDriveData }) => {
  const router = useRouter();
  const { setCart, loading: cartLoading } = useContext(CartContext); // Get setCart for updating after add
  const { user } = useContext(AuthContext);

  const [drive, setDrive] = useState(initialDriveData); // Use state for drive data to update dynamically if needed

  // State for variant selection
  // Key: drive_item_id (the ID of the "need" record)
  // Value: chosen RYE Variant ID
  const [selectedRyeVariants, setSelectedRyeVariants] = useState({});

  // State for available variants fetched from Rye
  // Key: drive_item_id
  // Value: { baseProductName: '...', baseProductImage: '...', variants: [...] }
  const [availableRyeVariantsInfo, setAvailableRyeVariantsInfo] = useState({});

  // State for loading variants for a specific item need
  // Key: drive_item_id, Value: boolean
  const [isLoadingVariants, setIsLoadingVariants] = useState({});

  // State for selected quantities for each item need (drive_item_id)
  const [itemQuantities, setItemQuantities] = useState({});

  // Initialize quantities when drive data (and its items) load
  useEffect(() => {
    if (drive?.items) {
      const initialQuantities = {};
      drive.items.forEach(itemNeed => {
        initialQuantities[itemNeed.drive_item_id] = 1; // Default quantity to 1 for each "need"
      });
      setItemQuantities(initialQuantities);
    }
  }, [drive?.items]);


  // Fetch variants if an item allows donor choice and variants haven't been fetched
  const fetchVariantsForNeed = async (itemNeed) => {
    if (!itemNeed.allow_donor_variant_choice || !itemNeed.base_rye_product_id_for_donor_choice || availableRyeVariantsInfo[itemNeed.drive_item_id]) {
      return; // Already fetched or not applicable
    }

    setIsLoadingVariants(prev => ({ ...prev, [itemNeed.drive_item_id]: true }));
    try {
      const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
        rye_product_id: itemNeed.base_rye_product_id_for_donor_choice,
        marketplace: itemNeed.base_marketplace_for_donor_choice,
      });
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemNeed.drive_item_id]: response.data }));
      // Auto-select first available variant if any
      if (response.data?.variants?.length > 0) {
        const firstAvailable = response.data.variants.find(v => v.isAvailable);
        if (firstAvailable) {
          setSelectedRyeVariants(prev => ({ ...prev, [itemNeed.drive_item_id]: firstAvailable.id }));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch variants for base product ${itemNeed.base_rye_product_id_for_donor_choice}:`, error);
      toast.error(`Could not load options for item.`);
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemNeed.drive_item_id]: { variants: [] } })); // Mark as fetched with no variants
    } finally {
      setIsLoadingVariants(prev => ({ ...prev, [itemNeed.drive_item_id]: false }));
    }
  };


  const handleVariantSelectionChange = (driveItemId, ryeVariantId) => {
    setSelectedRyeVariants(prev => ({ ...prev, [driveItemId]: ryeVariantId }));
  };

  const handleQuantityChange = (driveItemId, value, maxRemaining) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, maxRemaining > 0 ? maxRemaining : 1));
    setItemQuantities(prev => ({ ...prev, [driveItemId]: newQuantity }));
  };

  const handleAddToCart = async (itemNeed) => { // itemNeed is an object from drive.items
    if (!user) {
      toast.error("Please log in to add items.");
      router.push('/auth/login'); // Redirect to login
      return;
    }

    let ryeIdForCartApi;
    let marketplaceForCartApi;
    let itemNameForToast = itemNeed.display?.name || "Item"; // Default name

    if (itemNeed.allow_donor_variant_choice) {
      ryeIdForCartApi = selectedRyeVariants[itemNeed.drive_item_id];
      if (!ryeIdForCartApi) {
        toast.error(`Please select an option for "${itemNeed.display?.name || 'the item'}".`);
        return;
      }
      marketplaceForCartApi = itemNeed.base_marketplace_for_donor_choice;
      // Find selected variant to get its name for toast
      const variantInfo = availableRyeVariantsInfo[itemNeed.drive_item_id]?.variants?.find(v => v.id === ryeIdForCartApi);
      if (variantInfo) itemNameForToast = variantInfo.title;

    } else if (itemNeed.preset_details) {
      ryeIdForCartApi = itemNeed.preset_details.rye_id_to_add_directly;
      marketplaceForCartApi = itemNeed.preset_details.marketplace;
      itemNameForToast = itemNeed.preset_details.name;
      if (!itemNeed.preset_details.is_rye_linked) {
        toast.warn('This specific item variation cannot be purchased online yet.');
        return;
      }
    } else {
      toast.error("Item configuration error. Cannot add to cart.");
      return;
    }

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      return;
    }

    const quantity = itemQuantities[itemNeed.drive_item_id] || 1;

    const payload = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemNeed.drive_item_id, // This is drive_items.drive_item_id
      originalNeedRefType: 'drive_item'
    };

    try {
      const response = await axios.post(`${apiUrl}/api/cart/add`, payload, { withCredentials: true });
      setCart(response.data); // Update cart context with the new Rye cart state
      toast.success(`${itemNameForToast} (Qty: ${quantity}) added to cart!`);
      // Optionally, refetch drive data to update "purchased" counts if backend doesn't push updates
      // fetchDriveDetails(drive.drive_id); 
    } catch (err) {
      console.error('Error adding to cart:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || `Failed to add ${itemNameForToast} to cart.`);
    }
  };


  // State for Child Modal (if you list children on the drive page)
  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const openChildModal = (childId) => {
    setSelectedChildIdForModal(childId);
    setIsChildModalOpen(true);
  };
  const closeChildModal = () => {
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
  };


  if (!drive) {
    // This will be handled by getServerSideProps notFound, but as a fallback
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800">
          <p className="text-gray-600 text-lg">Drive not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  // Calculate progress (ensure drive has these properties from getServerSideProps)
  const totalNeeded = Number(drive.totalNeeded) || 0;
  const totalPurchased = Number(drive.totalPurchased) || 0;
  const totalRemaining = totalNeeded > 0 ? Math.max(0, totalNeeded - totalPurchased) : 0;
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;


  return (
    <>
      <Navbar /> {/* Ensure Navbar is appropriate for this page */}
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
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          {drive.photo && (
            <div className="mb-8 flex justify-left ">
              <div className="relative w-full max-w-2xl h-64 md:h-80 rounded-lg overflow-hidden shadow-lg border-4 border-ggreen">
                <Image src={drive.photo} alt={`${drive.name} cover photo`} fill style={{ objectFit: "cover" }} priority sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 640px" />
              </div>
            </div>
          )}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-ggreen mb-2">{drive.name}</h1>
            <p className="text-gray-700 mb-4">{drive.description}</p>
            <div className="text-gray-600 flex flex-wrap gap-x-4 gap-y-1 items-center">
              <p className="font-medium">{totalNeeded} Item(s) Needed</p>
              {drive.org_city && drive.org_state && <p className="font-medium">{drive.org_city}, {drive.org_state}</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3 space-y-8">
              {/* Drive Progress */}
              <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Drive Progress</h2>
                <div className="bg-gray-200 w-full h-4 rounded-full mb-2 overflow-hidden">
                  <div className="bg-ggreen h-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-sm text-gray-700 mb-1">Donated: <strong>{totalPurchased}</strong> of {totalNeeded}</p>
                <p className="text-sm text-gray-700">Remaining: <strong>{totalRemaining}</strong></p>
              </div>

              {/* Drive-Level Items Section */}
              {drive.items && drive.items.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Items Needed for the Drive
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.items.map((itemNeed) => {
                      const currentQuantity = itemQuantities[itemNeed.drive_item_id] || 1;
                      const isOutOfStock = itemNeed.remaining <= 0;
                      const maxQtyForInput = isOutOfStock ? 1 : (itemNeed.remaining || 1);

                      return (
                        <div
                          key={itemNeed.drive_item_id}
                          className={`border-2 p-4 rounded-lg shadow-sm flex flex-col justify-between ${(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked)
                              ? 'border-ggreen bg-white hover:shadow-md'
                              : 'bg-gray-100 opacity-70 border-gray-300'
                            } transition-shadow`}
                        >
                          <div className="flex-grow">
                            {itemNeed.display?.photo && (
                              <div className="flex justify-center mb-4 h-32 relative">
                                <Image src={itemNeed.display.photo} alt={itemNeed.display.name} fill style={{ objectFit: "contain" }} className="rounded-md" onError={(e) => e.currentTarget.src = '/img/default-item.png'} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40vw, 30vw" />
                              </div>
                            )}
                            <h3 className="text-lg text-ggreen font-medium mb-1 line-clamp-2 h-12">{itemNeed.display?.name || 'Item'}</h3>
                            {itemNeed.allow_donor_variant_choice && (
                              <button
                                onClick={() => fetchVariantsForNeed(itemNeed)}
                                className="text-sm text-blue-600 hover:underline mb-2 disabled:text-gray-400"
                                disabled={isLoadingVariants[itemNeed.drive_item_id] || !!availableRyeVariantsInfo[itemNeed.drive_item_id]}
                              >
                                {isLoadingVariants[itemNeed.drive_item_id]
                                  ? 'Loading Options...'
                                  : availableRyeVariantsInfo[itemNeed.drive_item_id]
                                    ? 'Change Options'
                                    : 'Select Options'}
                              </button>
                            )}
                            {itemNeed.allow_donor_variant_choice && availableRyeVariantsInfo[itemNeed.drive_item_id]?.variants && (
                              <select
                                value={selectedRyeVariants[itemNeed.drive_item_id] || ''}
                                onChange={(e) => handleVariantSelectionChange(itemNeed.drive_item_id, e.target.value)}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ggreen sm:text-sm mb-2"
                              >
                                <option value="" disabled>Choose an option...</option>
                                {availableRyeVariantsInfo[itemNeed.drive_item_id].variants
                                  .filter(v => v.isAvailable)
                                  .map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                      {variant.title} ({formatCurrency(variant.price?.value, variant.price?.currency)})
                                    </option>
                                  ))}
                                {availableRyeVariantsInfo[itemNeed.drive_item_id].variants.filter(v => v.isAvailable).length === 0 && (
                                  <option value="" disabled>No options currently available</option>
                                )}
                              </select>
                            )}
                            {!itemNeed.allow_donor_variant_choice && itemNeed.preset_details?.price && (
                              <p className="text-gray-800 font-bold mb-1">{formatCurrency(itemNeed.preset_details.price * 100, 'USD')}</p>
                            )}
                            <p className="text-gray-600 text-sm mb-2 line-clamp-3">{itemNeed.display?.description}</p>
                            <p className="text-sm text-gray-500 mb-2">Needed: {itemNeed.needed} | Remaining: {itemNeed.remaining}</p>
                            {!(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked) && (
                              <p className="text-xs text-orange-600 font-semibold mt-1">Item not available for online purchase.</p>
                            )}
                          </div>

                          {(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked) && (
                            <div className="mt-4">
                              {itemNeed.needed > 1 && (
                                <div className="flex items-center justify-center mb-2">
                                  <label htmlFor={`quantity-drive-${itemNeed.drive_item_id}`} className="mr-2 text-sm text-gray-700">Qty:</label>
                                  <input
                                    type="number"
                                    id={`quantity-drive-${itemNeed.drive_item_id}`}
                                    min="1"
                                    max={maxQtyForInput}
                                    value={currentQuantity}
                                    onChange={(e) => handleQuantityChange(itemNeed.drive_item_id, e.target.value, itemNeed.remaining)}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-100"
                                    disabled={isOutOfStock}
                                  />
                                </div>
                              )}
                              <button
                                onClick={() => handleAddToCart(itemNeed)}
                                className={`w-full py-2 rounded-lg text-white transition-colors font-medium ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' :
                                    itemNeed.allow_donor_variant_choice && !selectedRyeVariants[itemNeed.drive_item_id] ? 'bg-gray-400 cursor-not-allowed' :
                                      'bg-ggreen hover:bg-ggreen-dark'
                                  }`}
                                disabled={isOutOfStock || (itemNeed.allow_donor_variant_choice && !selectedRyeVariants[itemNeed.drive_item_id])}
                              >
                                {isOutOfStock ? 'Fulfilled' : 'Add to Cart'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Children Section */}
              {drive.children && drive.children.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Children Supported by {drive.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.children.map((child) => (
                      <div
                        key={child.child_id}
                        onClick={() => openChildModal(child.child_id)} // child.child_id is unique_children.child_id
                        className="cursor-pointer block border-2 border-ggreen shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
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
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(!drive.children || drive.children.length === 0) && (!drive.items || drive.items.length === 0) && (
                <p className="text-center text-gray-600 mt-6 italic">This drive currently has no specific items or children listed.</p>
              )}
            </div>

            {/* Right Column: Organization / Share Info */}
            <aside className="md:w-1/3 space-y-6">
              <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Organization</h2>
                <Link href={`/visible/organization/${drive.org_id}`} className="text-ggreen hover:underline block mb-2">
                  <strong>{drive.organization_name}</strong>
                </Link>
                <p className="text-gray-700 mb-4 text-sm">
                  {drive.donorsCount != null && `Supported by ${drive.donorsCount} donor(s)`}
                </p>
                <button className="w-full px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark">
                  Share Drive
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <ChildModal
        isOpen={isChildModalOpen}
        onClose={closeChildModal}
        childId={selectedChildIdForModal} // Pass unique_children.child_id to modal
      />
      <Footer />
    </>
  );
};


// Updated getServerSideProps for DrivePage
export async function getServerSideProps(context) {
  const { id } = context.params; // Drive ID
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    // 1. Fetch base drive details (includes org info and children list)
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const driveData = driveResponse.data;

    if (!driveData || !driveData.drive_id) {
      return { notFound: true };
    }

    // 2. Fetch drive-level items separately (this endpoint needs to be updated)
    // This endpoint now returns `allow_donor_variant_choice`, `base_rye_product_id_for_donor_choice`, etc.
    const driveItemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
    const driveSpecificItems = driveItemsResponse.data || [];

    // 3. Fetch aggregate totals (remains the same)
    const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data;

    // 4. Combine data
    const finalDriveData = {
      ...driveData,
      items: driveSpecificItems, // Use the detailed items from /api/drives/:id/items
      children: driveData.children || [],
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      id: driveData.drive_id.toString(), // For consistency if Link components expect string IDs
      // org_city and org_state should come from the initial driveResponse if backend joins correctly
    };

    return {
      props: { drive: finalDriveData },
    };
  } catch (error) {
    console.error(`Error fetching data for drive ${id}:`, error.response?.data || error.message);
    return { props: { drive: null } }; // Or return notFound: true
  }
}

// PropTypes remain largely the same, but the `items` array structure will change
// based on what your updated `/api/drives/:id/items` endpoint returns.
DrivePage.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired,
    org_id: PropTypes.number,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    organization_name: PropTypes.string,
    org_city: PropTypes.string,
    org_state: PropTypes.string,
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
    donorsCount: PropTypes.number,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        child_id: PropTypes.number.isRequired, // This is unique_children.child_id
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
      })
    ),
    items: PropTypes.arrayOf(
      PropTypes.shape({
        drive_item_id: PropTypes.number.isRequired, // ID of the link entry in drive_items
        needed: PropTypes.number,
        purchased: PropTypes.number,
        remaining: PropTypes.number,
        allow_donor_variant_choice: PropTypes.bool.isRequired,
        base_rye_product_id_for_donor_choice: PropTypes.string, // Rye Product ID for base
        base_marketplace_for_donor_choice: PropTypes.string,
        display: PropTypes.shape({ // General display info (could be base product or preset variant)
          name: PropTypes.string,
          photo: PropTypes.string,
          description: PropTypes.string,
          price: PropTypes.number, // For preset variant
          priceDisplay: PropTypes.string, // For donor choice or preset
        }),
        // Details for a preset variant
        preset_details: PropTypes.shape({
          internal_item_id: PropTypes.number, // Your DB's item_id for this specific variant
          name: PropTypes.string,
          photo: PropTypes.string,
          price: PropTypes.number,
          is_rye_linked: PropTypes.bool,
          rye_id_to_add_directly: PropTypes.string, // Specific Rye ID (variant or product)
          marketplace: PropTypes.string,
          base_rye_product_id: PropTypes.string, // Parent product ID
        }),
        // Your internal item_id if it's a preset variant from `items` table
        internal_item_id: PropTypes.number,
      })
    ),
  }),
};

export default DrivePage;