// File: pages/visible/drive/[id].js
import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
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
import ShareButton from '@/components/Share/ShareButton'; // Added ShareButton

// Helper function to check if an item is in the cart
function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemKeyType];
  const sourceFieldInCart = itemKeyType === 'drive_item_id' ? 'giftdrive_source_drive_item_id' : 'giftdrive_source_child_item_id';
  return cartFromContext.stores.some(store =>
    store.cartLines?.some(line => line[sourceFieldInCart] != null && line[sourceFieldInCart] == sourceIdToCheck) // Use == for type flexibility if IDs are mixed string/number
  );
}

// Helper function to calculate days remaining
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
  const { status: authStatus } = useSession();
  const [drive, setDrive] = useState(initialDriveData);
  const [pageUrl, setPageUrl] = useState('');
  const [pageError, setPageError] = useState(initialError || null);

  const [isBladeDismissed, setIsBladeDismissed] = useState(false);
  const cartHasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
  const isCartBladeEffectivelyOpen = cartHasItems && !isBladeDismissed;

  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({}); // Tracks loading state for specific items

  const [topDonors, setTopDonors] = useState(initialDriveData?.topDonors || []);
  const [recentDonations, setRecentDonations] = useState(initialDriveData?.recentDonations || []);

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
      processItems(drive.items, 'drive');
      (drive.children || []).forEach(child => {
        processItems(child.items, 'child');
      });
      setTopDonors(drive.topDonors || []);
      setRecentDonations(drive.recentDonations || []);
    }
    setItemQuantities(initialQuantities);
  }, [drive]);


  const fetchDriveDataAfterCartAction = async () => {
    if (!drive || !drive.drive_id) return;
    try {
      const baseApiUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      const driveId = drive.drive_id;

      const [
        updatedDriveResponse,
        aggregateResponse,
        driveItemsResponse,
        topDonorsRes,
        recentDonationsRes
      ] = await Promise.all([
        axios.get(`${baseApiUrl}/api/drives/${driveId}`),
        axios.get(`${baseApiUrl}/api/drives/${driveId}/aggregate`),
        axios.get(`${baseApiUrl}/api/drives/${driveId}/items`),
        axios.get(`${baseApiUrl}/api/drives/${driveId}/top-donors`),
        axios.get(`${baseApiUrl}/api/drives/${driveId}/recent-donations`)
      ]);

      const childrenWithItemCounts = await Promise.all(
        (updatedDriveResponse.data.children || []).map(async (child) => {
          const childItemsResp = await axios.get(`${baseApiUrl}/api/children/${child.child_id}/items`);
          const processedChildItems = (childItemsResp.data || []).map(item => ({
            ...item,
            selected_rye_variant_id: item.selected_rye_variant_id || null,
            selected_rye_marketplace: item.selected_rye_marketplace || null,
          }));
          return {
            ...child,
            items: processedChildItems,
            items_needed_count: processedChildItems.filter(item => item.remaining > 0).length || 0,
          };
        })
      );

      const processedDriveItems = (driveItemsResponse.data || []).map(item => ({
        ...item,
        selected_rye_variant_id: item.selected_rye_variant_id || null,
        selected_rye_marketplace: item.selected_rye_marketplace || null,
      }));

      setDrive({
        ...updatedDriveResponse.data,
        items: processedDriveItems,
        children: childrenWithItemCounts,
        totalNeeded: Number(aggregateResponse.data.totalNeeded) || 0,
        totalPurchased: Number(aggregateResponse.data.totalPurchased) || 0,
        donorsCount: Number(aggregateResponse.data.donorsCount) || 0,
        topDonors: topDonorsRes.data || [],
        recentDonations: recentDonationsRes.data || []
      });
      setPageError(null);
    } catch (error) {
      console.error("Failed to refetch drive data:", error.response?.data || error.message);
      toast.error("Could not refresh drive details.");
      setPageError("Could not refresh drive details after action.");
    }
  };

  const handleQuantityChange = (itemKey, value, maxRemaining) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, maxRemaining > 0 ? maxRemaining : 1));
    setItemQuantities(prev => ({ ...prev, [itemKey]: newQuantity }));
  };

  const handleAddToCart = async (itemNeed, itemKeyType) => {
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
    if (itemKeyType === 'drive_item_id') {
      backendRefType = 'drive_item';
    } else if (itemKeyType === 'child_item_id') {
      backendRefType = 'child_item';
    } else {
      toast.error("Internal error: Unknown item key type for cart.");
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
      return;
    }

    // --- Prepare itemDisplayInfo for optimistic update ---
    const itemDisplayInfo = {
      name: itemNeed.variant_display_name || itemNeed.base_item_name || "Item",
      image: itemNeed.variant_display_photo || itemNeed.base_item_photo,
      priceInCents: Math.round((itemNeed.variant_display_price ?? itemNeed.base_item_price ?? 0) * 100),
      currency: 'USD', // Or get dynamically if available from itemNeed.base_item_price_currency or similar
      base_item_name: itemNeed.base_item_name,
      variant_display_name: itemNeed.variant_display_name,
      base_item_photo: itemNeed.base_item_photo,
      variant_display_photo: itemNeed.variant_display_photo,
      base_item_price: itemNeed.base_item_price,
      variant_display_price: itemNeed.variant_display_price,
      base_rye_product_id: itemNeed.base_rye_product_id,
      // This field is important for Shopify. It should be the store's canonical domain.
      // Ensure itemNeed contains this if the item is from Shopify.
      // e.g., itemNeed.base_marketplace_store_domain (like 'cool-store.myshopify.com')
      base_marketplace_store_domain: itemNeed.base_marketplace_store_domain || (itemNeed.base_marketplace === 'SHOPIFY' ? 'unknown-shopify.myshopify.com' : null),
    };

    const apiPayloadForContext = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemKey,
      originalNeedRefType: backendRefType
    };

    try {
      console.log("DrivePage: Calling optimistic addToCart. DisplayInfo:", itemDisplayInfo, "ApiPayload:", apiPayloadForContext);
      await addToCart(itemDisplayInfo, apiPayloadForContext); // Pass both objects
      await fetchDriveDataAfterCartAction();
    } catch (err) {
      // Error toast is handled by CartContext now, but this ensures the loading spinner stops
      console.error('Error in DrivePage during cart operation:', err);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const openChildModal = (childId) => {
    setSelectedChildIdForModal(childId);
    setIsChildModalOpen(true);
  };
  const closeChildModal = () => {
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
    fetchDriveDataAfterCartAction(); // Refresh data when modal closes
  };
  const handleBladeClose = () => setIsBladeDismissed(true);

  if (router.isFallback || (!drive && !pageError && authStatus === "loading")) {
    return (
      <>
        <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800">
          <p className="text-gray-600 text-lg">Loading drive information...</p>
        </main>
        <Footer isBladeOpen={isCartBladeEffectivelyOpen} />
      </>
    );
  }

  if (pageError) {
    return (
      <>
        <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
        <main className="min-h-screen flex flex-col items-center justify-center bg-secondary_green text-gray-800 px-4 text-center">
          <p className="text-red-600 text-lg font-semibold">{pageError}</p>
          <Link href="/visible/search" className="mt-4 px-4 py-2 bg-ggreen text-white rounded hover:bg-teal-700">
            Browse Other Drives
          </Link>
        </main>
        <Footer isBladeOpen={isCartBladeEffectivelyOpen} />
      </>
    );
  }
  if (!drive) {
    return (
      <>
        <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800">
          <p className="text-gray-600 text-lg">Drive not found.</p>
        </main>
        <Footer isBladeOpen={isCartBladeEffectivelyOpen} />
      </>
    );
  }

  const {
    name,
    totalNeeded = 0,
    org_city,
    org_state,
    totalPurchased = 0,
    organization_name,
    org_id, // Added
    description, // Added for ShareButton
    photo: drivePhoto, // Added for ShareButton
    end_date,
    items: driveItemsOnly = [],
    children: driveChildren = []
  } = drive || {};

  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;
  const daysRemaining = calculateDaysRemaining(end_date);
  const donationsToGo = Math.max(0, totalNeeded - totalPurchased);
  const displayProgressPercentage = (totalNeeded > 0 && totalPurchased === 0) ? 10 : progressPercentage;

  // Prepare pageData for ShareButton
  const sharePageData = {
    id: drive.drive_id,
    name: name,
    description: description,
    photo: drivePhoto,
    organization_name: organization_name,
    // Add other relevant fields if your ShareButton uses them for drives
  };


  return (
    <>
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
            {/* Left Column */}
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
                    style={{ left: `${displayProgressPercentage - 1}%`, bottom: 'calc(2rem + 2px)' }}
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
                {/* Share Button Integration */}
                {pageUrl && drive && (
                  <ShareButton
                    pageType="drive"
                    pageData={sharePageData}
                    pageUrl={pageUrl}
                  />
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg border border-ggreen">
                {topDonors && topDonors.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-ggreen">Top Donors</h2>
                    </div>
                    <ul className="space-y-3">
                      {topDonors.map((donor, index) => (
                        <li key={donor.name + '-' + index} className="flex items-center">
                          <Image
                            src={donor.avatar || '/img/default-avatar.png'}
                            alt={donor.name || 'Donor'}
                            width={40} height={40}
                            className="rounded-full mr-3 object-cover"
                            onError={(e) => e.currentTarget.src = '/img/default-avatar.png'}
                          />
                          <div className="flex-grow">
                            <p className="text-sm font-medium text-slate-800">{donor.name || 'Anonymous Donor'} {donor.badge && <span className="text-xs">{donor.badge}</span>}</p>
                            <p className="text-xs text-slate-500">{donor.items} Item{donor.items !== 1 ? 's' : ''}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-ggreen">Top Donors</h2>
                    </div>
                    <div className="bg-white p-6 text-center text-slate-500 text-sm">
                      Be the first to donate to appear on the leaderboard!
                    </div>
                  </>
                )}

                {recentDonations && recentDonations.length > 0 ? (
                  <>
                    <h2 className="text-xl font-semibold text-ggreen mt-6 mb-4">Recent Donations</h2>
                    <ul className="space-y-4">
                      {recentDonations.map((donation, index) => (
                        <li key={donation.itemName + '-' + donation.time + '-' + index} className="flex items-center">
                          <Image
                            src={donation.avatar || '/img/default-avatar.png'}
                            alt={donation.donorName || 'Donor'}
                            width={40} height={40}
                            className="rounded-full mr-3 object-cover"
                            onError={(e) => e.currentTarget.src = '/img/default-avatar.png'}
                          />
                          <div className="flex-grow">
                            <p className="text-sm">
                              <span className="font-medium text-slate-800">{donation.donorName || 'Anonymous Donor'}</span>
                              {donation.badge && <span className="text-xs ml-1">{donation.badge}</span>}
                            </p>
                            <p className="text-sm text-slate-600">{donation.itemName || 'An item'}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{donation.time}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-ggreen mt-6 mb-4">Recent Donations</h2>
                    <div className="bg-white p-6 text-center text-slate-500 text-sm">
                      No recent donations yet. Your donation could be the first!
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Items Grid */}
            <div className="md:col-span-8">
              {driveItemsOnly && driveItemsOnly.length > 0 && (
                <div className="mb-12">
                  <DriveItemsSection
                    items={driveItemsOnly}
                    cart={cart}
                    cartLoading={cartLoading}
                    itemKeyType="drive_item_id"
                    itemQuantities={itemQuantities}
                    isAddingToCart={isAddingToCart}
                    onAddToCart={handleAddToCart}
                    onQuantityChange={handleQuantityChange}
                    isThisSpecificNeedInCart={isThisSpecificNeedInCart}
                  />
                </div>
              )}

              {driveChildren && driveChildren.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-6">
                    Children Supported by {name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {driveChildren.map((child) => (
                      <div
                        key={child.child_id}
                        onClick={() => openChildModal(child.child_id)}
                        className="cursor-pointer block border-2 border-ggreen bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow p-4 text-center"
                      >
                        {child.child_photo && (
                          <div className="flex justify-center mb-3 h-20 relative">
                            <Image
                              src={child.child_photo || '/img/default-child.png'}
                              alt={child.child_name}
                              width={80} height={80}
                              className="object-contain rounded-full"
                              onError={(e) => e.currentTarget.src = '/img/default-child.png'}
                            />
                          </div>
                        )}
                        <h3 className="text-md font-semibold text-ggreen mb-1">
                          {child.child_name}
                        </h3>
                        <p className="text-xs text-gray-500">{child.items_needed_count || 0} items needed</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(!driveItemsOnly || driveItemsOnly.length === 0) && (!driveChildren || driveChildren.length === 0) && (
                <div className="bg-white p-8 rounded-lg shadow-md text-center border border-gray-200">
                  <p className="text-slate-600 italic">This drive currently has no specific items or children listed.</p>
                  <p className="text-slate-600 mt-2">Check back later or support the organization directly!</p>
                </div>
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

export async function getServerSideProps(context) {
  const { id } = context.params;
  const baseApiUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  try {
    const driveResponse = await axios.get(`${baseApiUrl}/api/drives/${id}`);
    let driveData = driveResponse.data;
    if (!driveData || !driveData.drive_id) return { notFound: true };

    const aggregateResponse = await axios.get(`${baseApiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data || { totalNeeded: 0, totalPurchased: 0, donorsCount: 0 };

    const driveItemsResponse = await axios.get(`${baseApiUrl}/api/drives/${id}/items`);
    const processedDriveItems = (driveItemsResponse.data || []).map(item => ({
      ...item,
      selected_rye_variant_id: item.selected_rye_variant_id || null,
      selected_rye_marketplace: item.selected_rye_marketplace || null,
      // Ensure base_marketplace_store_domain is passed if available from your items table
      base_marketplace_store_domain: item.base_marketplace_store_domain || (item.base_marketplace === 'SHOPIFY' ? 'unknown-shopify.myshopify.com' : null),
    }));

    const childrenWithItemCounts = await Promise.all(
      (driveData.children || []).map(async (child) => {
        const childItemsResp = await axios.get(`${baseApiUrl}/api/children/${child.child_id}/items`);
        const processedChildItems = (childItemsResp.data || []).map(item => ({
          ...item,
          selected_rye_variant_id: item.selected_rye_variant_id || null,
          selected_rye_marketplace: item.selected_rye_marketplace || null,
          base_marketplace_store_domain: item.base_marketplace_store_domain || (item.base_marketplace === 'SHOPIFY' ? 'unknown-shopify.myshopify.com' : null),
        }));
        return {
          ...child,
          items: processedChildItems,
          items_needed_count: processedChildItems.filter(item => item.remaining > 0).length || 0,
        };
      })
    );

    let topDonors = [];
    let recentDonations = [];
    try {
      const topDonorsRes = await axios.get(`${baseApiUrl}/api/drives/${id}/top-donors`);
      topDonors = topDonorsRes.data || [];
    } catch (e) {
      console.warn(`Could not fetch top donors for drive ${id}:`, e.message);
    }
    try {
      const recentDonationsRes = await axios.get(`${baseApiUrl}/api/drives/${id}/recent-donations`);
      recentDonations = recentDonationsRes.data || [];
    } catch (e) {
      console.warn(`Could not fetch recent donations for drive ${id}:`, e.message);
    }

    const finalDriveData = {
      ...driveData,
      items: processedDriveItems,
      children: childrenWithItemCounts,
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      donorsCount: Number(aggregate.donorsCount) || 0,
      id: driveData.drive_id.toString(), // Keep as string for consistency if router passes as string
      organization_photo: driveData.organization_photo || (driveData.organization?.photo || null),
      topDonors,
      recentDonations
    };
    return { props: { drive: finalDriveData, error: null } };
  } catch (error) {
    console.error(`Error fetching data for drive ${id} in GSSP:`, error.response?.data || error.message || error);
    if (error.response?.status === 404) return { notFound: true };
    return { props: { drive: null, error: 'Failed to load drive data. Please try refreshing.', topDonors: [], recentDonations: [] } };
  }
}

DrivePage.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    id: PropTypes.string, // from GSSP string conversion
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
      items: PropTypes.array, // Further PropTypes for items in child can be added
    })),
    items: PropTypes.arrayOf(PropTypes.shape({
      drive_item_id: PropTypes.number.isRequired,
      base_item_name: PropTypes.string,
      variant_display_name: PropTypes.string,
      is_rye_linked: PropTypes.bool,
      remaining: PropTypes.number,
      selected_rye_variant_id: PropTypes.string,
      selected_rye_marketplace: PropTypes.string,
      base_rye_product_id: PropTypes.string, // Added for optimistic updates
      base_item_photo: PropTypes.string,    // Added for optimistic updates
      variant_display_photo: PropTypes.string,// Added for optimistic updates
      base_item_price: PropTypes.number,    // Added for optimistic updates
      variant_display_price: PropTypes.number,// Added for optimistic updates
      base_marketplace_store_domain: PropTypes.string, // Added for Shopify store identifier
    })),
    topDonors: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      items: PropTypes.number,
      avatar: PropTypes.string,
      badge: PropTypes.string,
    })),
    recentDonations: PropTypes.arrayOf(PropTypes.shape({
      donorName: PropTypes.string,
      itemName: PropTypes.string,
      time: PropTypes.string,
      avatar: PropTypes.string,
      badge: PropTypes.string,
    })),
  }),
  error: PropTypes.string,
};


export default DrivePage;