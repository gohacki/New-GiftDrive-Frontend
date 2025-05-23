// File: pages/visible/drive/[id].js
import React, { useContext, useState, useEffect } from 'react';
// ... other imports remain the same
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { MapPinIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import ChildModal from 'components/Modals/ChildModal';
import CartBlade from '@/components/Blades/CartBlade';
import { CartContext } from 'contexts/CartContext';
import DriveItemsSection from '@/components/DrivePage/DriveItemsSection';
import ShareButton from '@/components/Share/ShareButton';

// --- IMPORT NEW SERVICE FUNCTIONS ---
import {
  getCoreDriveDetails,
  getDriveAggregates,
  getDriveSpecificItems,
  getDriveTopDonors,
  getDriveRecentDonations
} from '../../../lib/services/driveService'; // Adjust path as needed
import { getChildItems } from '../../../lib/services/childService'; // Adjust path as needed
// --- END IMPORTS ---


// Helper function to check if an item is in the cart (remains the same)
function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemKeyType];
  const sourceFieldInCart = itemKeyType === 'drive_item_id' ? 'giftdrive_source_drive_item_id' : 'giftdrive_source_child_item_id';
  return cartFromContext.stores.some(store =>
    store.cartLines?.some(line => line[sourceFieldInCart] != null && line[sourceFieldInCart] == sourceIdToCheck)
  );
}

// Helper function to calculate days remaining (remains the same)
const calculateDaysRemaining = (endDateString) => {
  if (!endDateString) return 0;
  const now = new Date();
  const end = new Date(endDateString);
  if (isNaN(end.getTime())) return 0;
  const diffTime = Math.max(0, end.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};


const DrivePage = ({ drive: initialDriveData, error: initialError }) => {
  const router = useRouter();
  const { cart, loading: cartLoading, addToCart } = useContext(CartContext);
  const { status: authStatus } = useSession(); // No change here
  const [drive, setDrive] = useState(initialDriveData);
  const [pageUrl, setPageUrl] = useState('');
  const [pageError, setPageError] = useState(initialError || null);

  const [isBladeDismissed, setIsBladeDismissed] = useState(false);
  const cartHasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
  const isCartBladeEffectivelyOpen = cartHasItems && !isBladeDismissed;

  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});

  // Top donors and recent donations are now part of initialDriveData from GSSP
  // So, direct useState for them is not needed if GSSP provides them correctly.
  // const [topDonors, setTopDonors] = useState(initialDriveData?.topDonors || []);
  // const [recentDonations, setRecentDonations] = useState(initialDriveData?.recentDonations || []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, [router.asPath]);

  useEffect(() => {
    if (cartHasItems) setIsBladeDismissed(false);
  }, [cartHasItems]);

  useEffect(() => {
    const initialQuantities = {};
    const processItems = (items, keyPrefix) => {
      (items || []).forEach(itemNeed => {
        const itemKey = itemNeed[`${keyPrefix}_item_id`];
        if (itemKey) initialQuantities[itemKey] = 1;
      });
    };
    if (drive) {
      processItems(drive.items, 'drive'); // These are drive-specific items
      (drive.children || []).forEach(child => {
        processItems(child.items, 'child'); // These are child-specific items
      });
      // Ensure topDonors and recentDonations are correctly set from the drive prop
      // This might be redundant if they are always present in `drive` from GSSP
      // setTopDonors(drive.topDonors || []);
      // setRecentDonations(drive.recentDonations || []);
    }
    setItemQuantities(initialQuantities);
  }, [drive]);


  // Refetch function now calls the direct service functions for GSSP-like full refresh
  const fetchDriveDataAfterCartAction = async () => {
    if (!drive || !drive.drive_id) return;
    setIsAddingToCart(prev => { // Indicate loading state for the whole data refresh
      const newAddingState = {};
      Object.keys(prev).forEach(key => newAddingState[key] = true); // Set all to true or manage more granularly
      return newAddingState;
    });
    try {
      const driveId = drive.drive_id;

      // Mimic GSSP data fetching
      const coreDriveData = await getCoreDriveDetails(driveId);
      if (!coreDriveData) throw new Error("Drive not found after action.");

      const aggregateData = await getDriveAggregates(driveId);
      const driveSpecificItems = await getDriveSpecificItems(driveId);
      const topDonorsData = await getDriveTopDonors(driveId);
      const recentDonationsData = await getDriveRecentDonations(driveId);

      const childrenWithItemsData = await Promise.all(
        (coreDriveData.children || []).map(async (child) => {
          const childSpecificItems = await getChildItems(child.child_id);
          return {
            ...child,
            items: childSpecificItems,
            items_needed_count: childSpecificItems.filter(item => item.remaining > 0).length || 0,
          };
        })
      );

      setDrive({
        ...coreDriveData,
        items: driveSpecificItems,
        children: childrenWithItemsData,
        totalNeeded: Number(aggregateData.totalNeeded) || 0,
        totalPurchased: Number(aggregateData.totalPurchased) || 0,
        donorsCount: Number(aggregateData.donorsCount) || 0,
        topDonors: topDonorsData,
        recentDonations: recentDonationsData
      });
      setPageError(null);
    } catch (error) {
      console.error("Failed to refetch drive data:", error.message);
      toast.error("Could not refresh drive details.");
      setPageError("Could not refresh drive details after action.");
    } finally {
      setIsAddingToCart({}); // Reset all loading states
    }
  };

  // handleQuantityChange, handleAddToCart, openChildModal, closeChildModal, handleBladeClose
  // remain largely the same in their logic, as they interact with CartContext and local state.
  // The key change is that after an action (like addToCart or closing child modal),
  // fetchDriveDataAfterCartAction is called, which now directly uses service functions.

  const handleQuantityChange = (itemKey, value, maxRemaining) => { /* ... (remains the same) ... */
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, maxRemaining > 0 ? maxRemaining : 1));
    setItemQuantities(prev => ({ ...prev, [itemKey]: newQuantity }));
  };

  const handleAddToCart = async (itemNeed, itemKeyType) => { /* ... (remains the same) ... */
    const itemKey = itemNeed[itemKeyType];
    if (!itemKey) {
      toast.error("Item identifier is missing.");
      return;
    }

    setIsAddingToCart(prev => ({ ...prev, [itemKey]: true }));

    const ryeIdForCartApi = itemNeed.selected_rye_variant_id;
    const marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    const itemNameForToast = itemNeed.base_item_name || "Item";

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }

    if (!itemNeed.is_rye_linked) {
      toast.warn('This item cannot be purchased online at this time.');
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }

    const quantity = itemQuantities[itemKey] || 1;
    let backendRefType = '';
    if (itemKeyType === 'drive_item_id') backendRefType = 'drive_item';
    else if (itemKeyType === 'child_item_id') backendRefType = 'child_item';
    else {
      toast.error("Internal error: Unknown item key type for cart.");
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }
    const itemDisplayInfo = {
      name: itemNeed.variant_display_name || itemNeed.base_item_name || "Item",
      image: itemNeed.variant_display_photo || itemNeed.base_item_photo,
      priceInCents: Math.round((itemNeed.variant_display_price ?? itemNeed.base_item_price ?? 0) * 100),
      currency: 'USD',
      base_item_name: itemNeed.base_item_name,
      variant_display_name: itemNeed.variant_display_name,
      base_item_photo: itemNeed.base_item_photo,
      variant_display_photo: itemNeed.variant_display_photo,
      base_item_price: itemNeed.base_item_price,
      variant_display_price: itemNeed.variant_display_price,
      base_rye_product_id: itemNeed.base_rye_product_id,
      base_marketplace_store_domain: itemNeed.base_marketplace_store_domain || (itemNeed.base_marketplace === 'SHOPIFY' ? 'unknown-shopify.myshopify.com' : null),
    };
    const apiPayloadForContext = {
      ryeIdToAdd: ryeIdForCartApi, marketplaceForItem: marketplaceForCartApi,
      quantity: quantity, originalNeedRefId: itemKey, originalNeedRefType: backendRefType
    };
    try {
      await addToCart(itemDisplayInfo, apiPayloadForContext);
      await fetchDriveDataAfterCartAction();
    } catch (err) {
      console.error('Error in DrivePage during cart operation:', err);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const openChildModal = (childId) => { /* ... (remains the same) ... */
    setSelectedChildIdForModal(childId);
    setIsChildModalOpen(true);
  };
  const closeChildModal = () => { /* ... (remains the same) ... */
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
    fetchDriveDataAfterCartAction();
  };
  const handleBladeClose = () => setIsBladeDismissed(true); /* ... (remains the same) ... */

  // Conditional rendering based on router.isFallback, pageError, drive (remains the same)
  if (router.isFallback || (!drive && !pageError && authStatus === "loading")) { /* ... */ }
  if (pageError) { /* ... */ }
  if (!drive) { /* ... */ }

  // Destructuring drive data (remains the same)
  const {
    name, totalNeeded = 0, org_city, org_state, totalPurchased = 0, organization_name,
    org_id, description, photo: drivePhoto, end_date,
    items: driveItemsOnly = [], // drive-specific items
    children: driveChildren = [],
  } = drive || {};

  // Calculations (remains the same)
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;
  const daysRemaining = calculateDaysRemaining(end_date);
  const donationsToGo = Math.max(0, totalNeeded - totalPurchased);
  const displayProgressPercentage = (totalNeeded > 0 && totalPurchased === 0 && donationsToGo > 0) ? 2 : progressPercentage; // Min 2% to show something small


  // SharePageData (remains the same)
  const sharePageData = { /* ... */
    id: drive.drive_id, name: name, description: description, photo: drivePhoto, organization_name: organization_name,
  };

  // JSX Return (remains the same structure, but benefits from directly populated drive prop)
  return (
    <>
      {/* ... (Navbar, main content structure, DriveHeaderDetails, DriveOrganizationAside, etc.) ... */}
      {/* ... (DriveItemsSection and SupportedChildrenSection for drive.items and drive.children) ... */}
      {/* ... (ChildModal, CartBlade, Footer) ... */}
      <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
      <main className={`min-h-screen bg-white text-slate-800 relative pt-24 pb-16 ${isCartBladeEffectivelyOpen ? 'mr-[15rem]' : 'mr-0'} transition-all duration-300 ease-in-out`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-ggreen mb-3 mt-6 text-center md:text-left">{name}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-8 justify-center md:justify-start">
            <div className="flex items-center">
              <Image src="/img/brand/favicon.svg" alt="Items Needed" width={20} height={20} className="mr-2 ml-1" />
              <span>{totalNeeded} Item{totalNeeded !== 1 ? 's' : ''} Needed</span>
            </div>
            {(org_city && org_state) && (
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-1.5 text-ggreen" />
                <span>{org_city}, {org_state}</span>
              </div>
            )}
            {organization_name && (
              <Link href={`/visible/organization/${org_id}`} className="flex items-center text-ggreen hover:underline">
                <BuildingLibraryIcon className="h-5 w-5 mr-1.5" />
                <span>{organization_name}</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-lg border border-ggreen">
                <h2 className="text-xl font-semibold text-ggreen">Drive Progress</h2>
                {daysRemaining > 0 ? (
                  <p className="text-sm text-slate-500 mb-3 italic">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>
                ) : (
                  <p className="text-sm text-red-500 mb-3 font-medium">This drive has ended.</p>
                )}
                <div className="relative w-full" style={{ marginBottom: '0.5rem', height: '4rem' }}>
                  <div className="absolute bottom-0 w-full rounded-full h-7 shadow-inner ring-1 ring-ggreen">
                    <div
                      className="bg-gradient-to-b from-teal-400 to-ggreen h-7 rounded-full shadow-lg transition-all duration-500 ease-out"
                      style={{ width: `${displayProgressPercentage}%` }}
                    ></div>
                  </div>
                  <div
                    className="absolute transform -translate-x-1/2"
                    style={{ left: `${Math.max(2, displayProgressPercentage) - 1}%`, bottom: 'calc(2rem + 2px)' }} // Ensure marker doesn't go too far left
                  >
                    <div className="flex flex-col items-center">
                      <Image src="/img/brand/favicon.svg" alt="Progress Marker" width={20} height={20} />
                      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid #11393B`, marginTop: '2px' }}></div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 font-medium mb-5">
                  {donationsToGo > 0 ? `${donationsToGo} Donation${donationsToGo !== 1 ? 's' : ''} to go!` : "Goal Reached!"}
                </p>
                {pageUrl && drive && (
                  <ShareButton
                    pageType="drive"
                    pageData={sharePageData}
                    pageUrl={pageUrl}
                  />
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg border border-ggreen">
                {drive.topDonors && drive.topDonors.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold text-ggreen">Top Donors</h2></div>
                    <ul className="space-y-3">
                      {drive.topDonors.map((donor, index) => (
                        <li key={donor.name + '-' + index} className="flex items-center">
                          <Image src={donor.avatar || '/img/default-avatar.png'} alt={donor.name || 'Donor'} width={40} height={40} className="rounded-full mr-3 object-cover" onError={(e) => e.currentTarget.src = '/img/default-avatar.png'} />
                          <div className="flex-grow">
                            <p className="text-sm font-medium text-slate-800">{donor.name || 'Anonymous Donor'} {donor.badge && <span className="text-xs">{donor.badge}</span>}</p>
                            <p className="text-xs text-slate-500">{donor.items} Item{donor.items !== 1 ? 's' : ''}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (<><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold text-ggreen">Top Donors</h2></div><div className="bg-white p-6 text-center text-slate-500 text-sm">Be the first to donate!</div></>)}
                {drive.recentDonations && drive.recentDonations.length > 0 ? (
                  <>
                    <h2 className="text-xl font-semibold text-ggreen mt-6 mb-4">Recent Donations</h2>
                    <ul className="space-y-4">
                      {drive.recentDonations.map((donation, index) => (
                        <li key={donation.itemName + '-' + donation.time + '-' + index} className="flex items-center">
                          <Image src={donation.avatar || '/img/default-avatar.png'} alt={donation.donorName || 'Donor'} width={40} height={40} className="rounded-full mr-3 object-cover" onError={(e) => e.currentTarget.src = '/img/default-avatar.png'} />
                          <div className="flex-grow">
                            <p className="text-sm"><span className="font-medium text-slate-800">{donation.donorName || 'Anonymous Donor'}</span>{donation.badge && <span className="text-xs ml-1">{donation.badge}</span>}</p>
                            <p className="text-sm text-slate-600">{donation.itemName || 'An item'}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{donation.time}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (<><h2 className="text-xl font-semibold text-ggreen mt-6 mb-4">Recent Donations</h2><div className="bg-white p-6 text-center text-slate-500 text-sm">No recent donations yet.</div></>)}
              </div>
            </div>

            <div className="md:col-span-8">
              {driveItemsOnly && driveItemsOnly.length > 0 && (
                <div className="mb-12">
                  <DriveItemsSection
                    items={driveItemsOnly} cart={cart} cartLoading={cartLoading} itemKeyType="drive_item_id"
                    itemQuantities={itemQuantities} isAddingToCart={isAddingToCart}
                    onAddToCart={handleAddToCart} onQuantityChange={handleQuantityChange}
                    isThisSpecificNeedInCart={isThisSpecificNeedInCart}
                  />
                </div>
              )}
              {driveChildren && driveChildren.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-6">Children Supported by {name}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {driveChildren.map((child) => (
                      <div key={child.child_id} onClick={() => openChildModal(child.child_id)} className="cursor-pointer block border-2 border-ggreen bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow p-4 text-center">
                        {child.child_photo && (<div className="flex justify-center mb-3 h-20 relative"><Image src={child.child_photo || '/img/default-child.png'} alt={child.child_name} width={80} height={80} className="object-contain rounded-full" onError={(e) => e.currentTarget.src = '/img/default-child.png'} /></div>)}
                        <h3 className="text-md font-semibold text-ggreen mb-1">{child.child_name}</h3>
                        <p className="text-xs text-gray-500">{child.items_needed_count || 0} items needed</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(!driveItemsOnly || driveItemsOnly.length === 0) && (!driveChildren || driveChildren.length === 0) && (
                <div className="bg-white p-8 rounded-lg shadow-md text-center border border-gray-200"><p className="text-slate-600 italic">This drive currently has no specific items or children listed.</p><p className="text-slate-600 mt-2">Check back later or support the organization directly!</p></div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ChildModal isOpen={isChildModalOpen} onClose={closeChildModal} childId={selectedChildIdForModal} />
      <CartBlade isOpen={isCartBladeEffectivelyOpen} onClose={handleBladeClose} />
      <Footer isBladeOpen={isCartBladeEffectivelyOpen} />
    </>
  );
};

// --- REFACTORED getServerSideProps ---
export async function getServerSideProps(context) {
  const { id } = context.params;
  // No baseApiUrl needed for internal service calls

  try {
    // 1. Fetch core drive details (includes basic children info)
    const coreDriveData = await getCoreDriveDetails(id);
    if (!coreDriveData || !coreDriveData.drive_id) {
      return { notFound: true };
    }

    // 2. Fetch aggregates
    const aggregateData = await getDriveAggregates(id);

    // 3. Fetch drive-specific items
    const driveSpecificItems = await getDriveSpecificItems(id);

    // 4. Fetch items for each child and their needed counts
    const childrenWithItemsData = await Promise.all(
      (coreDriveData.children || []).map(async (child) => {
        const childSpecificItems = await getChildItems(child.child_id);
        // Ensure items are processed correctly for display (e.g., selected_rye_variant_id)
        const processedChildItems = (childSpecificItems || []).map(item => ({
          ...item,
          selected_rye_variant_id: item.selected_rye_variant_id || null,
          selected_rye_marketplace: item.selected_rye_marketplace || null,
          // Add base_marketplace_store_domain if available in your childService.getChildItems
          base_marketplace_store_domain: item.base_marketplace_store_domain || (item.base_marketplace === 'SHOPIFY' ? 'unknown-shopify.myshopify.com' : null),
        }));
        return {
          ...child,
          items: processedChildItems,
          items_needed_count: processedChildItems.filter(item => item.remaining > 0).length || 0,
        };
      })
    );

    // 5. Fetch top donors
    const topDonorsData = await getDriveTopDonors(id);

    // 6. Fetch recent donations
    const recentDonationsData = await getDriveRecentDonations(id);

    // Assemble the final drive data object for props
    const finalDriveData = {
      ...coreDriveData,
      items: driveSpecificItems, // These are only items directly associated with the drive
      children: childrenWithItemsData, // Children with their own items populated
      totalNeeded: Number(aggregateData.totalNeeded) || 0,
      totalPurchased: Number(aggregateData.totalPurchased) || 0,
      donorsCount: Number(aggregateData.donorsCount) || 0,
      id: coreDriveData.drive_id.toString(), // Keep as string for consistency
      organization_photo: coreDriveData.organization_photo || (coreDriveData.organization?.photo || null), // From coreDriveData
      topDonors: topDonorsData,
      recentDonations: recentDonationsData
    };

    return { props: { drive: finalDriveData, error: null } };

  } catch (error) {
    console.error(`Error fetching data for drive ${id} in GSSP (Refactored):`, error.message || error);
    // Check for specific error types if your service functions throw custom errors for "not found"
    if (error.message.includes("not found") || error.message.includes("Invalid Drive ID")) {
      return { notFound: true };
    }
    return { props: { drive: null, error: 'Failed to load drive data. Please try refreshing.' } };
  }
}
// --- END REFACTORED getServerSideProps ---

// PropTypes for DrivePage (remains the same structure)
DrivePage.propTypes = { /* ... */
  drive: PropTypes.shape({
    drive_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    id: PropTypes.string,
    org_id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    photo: PropTypes.string,
    start_date: PropTypes.string,
    end_date: PropTypes.string,
    organization_name: PropTypes.string,
    organization_photo: PropTypes.string,
    org_city: PropTypes.string,
    org_state: PropTypes.string,
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
    donorsCount: PropTypes.number,
    children: PropTypes.arrayOf(PropTypes.shape({
      child_id: PropTypes.number.isRequired,
      child_name: PropTypes.string.isRequired,
      child_photo: PropTypes.string,
      items_needed_count: PropTypes.number,
      items: PropTypes.array,
    })),
    items: PropTypes.arrayOf(PropTypes.shape({
      drive_item_id: PropTypes.number.isRequired,
      base_item_name: PropTypes.string,
      variant_display_name: PropTypes.string,
      is_rye_linked: PropTypes.bool,
      remaining: PropTypes.number,
      selected_rye_variant_id: PropTypes.string,
      selected_rye_marketplace: PropTypes.string,
      base_rye_product_id: PropTypes.string,
      base_item_photo: PropTypes.string,
      variant_display_photo: PropTypes.string,
      base_item_price: PropTypes.number,
      variant_display_price: PropTypes.number,
      base_marketplace_store_domain: PropTypes.string,
    })),
    topDonors: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string, items: PropTypes.number, avatar: PropTypes.string, badge: PropTypes.string,
    })),
    recentDonations: PropTypes.arrayOf(PropTypes.shape({
      donorName: PropTypes.string, itemName: PropTypes.string, time: PropTypes.string, avatar: PropTypes.string, badge: PropTypes.string,
    })),
  }),
  error: PropTypes.string,
};

export default DrivePage;