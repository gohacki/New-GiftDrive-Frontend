// File: pages/visible/drive/[id].js
import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { MapPinIcon, BuildingLibraryIcon, GiftIcon as GiftSolidIcon } from '@heroicons/react/24/solid'; // Solid icons
import { ShareIcon } from '@heroicons/react/24/outline'; // Outline for share icon
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Image from 'next/image'; // For donor avatars

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
// Breadcrumbs might not be needed if the screenshot design is followed closely for this page
// import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import ChildModal from 'components/Modals/ChildModal';
import CartBlade from '@/components/Blades/CartBlade';
// ShareButton is used within the progress card now
// import ShareButton from '@/components/Share/ShareButton';
import { CartContext } from 'contexts/CartContext';
import DriveItemsSection from '@/components/DrivePage/DriveItemsSection';
// DriveHeaderDetails is not used directly; elements integrated
// import DriveHeaderDetails from '@/components/DrivePage/DriveHeaderDetails';
// DriveOrganizationAside is not used for the left column donor cards
// import DriveOrganizationAside from '@/components/DrivePage/DriveOrganizationAside';
// SupportedChildrenSection is not shown in the target screenshot for this specific layout.
// If it's needed for other drives, it could be conditionally rendered.
// import SupportedChildrenSection from '@/components/DrivePage/SupportedChildrenSection';


function isThisSpecificNeedInCart(itemNeed, cartFromContext, itemKeyType) {
  if (!cartFromContext || !cartFromContext.stores || !itemNeed) return false;
  const sourceIdToCheck = itemNeed[itemKeyType];
  const sourceFieldInCart = itemKeyType === 'drive_item_id' ? 'giftdrive_source_drive_item_id' : 'giftdrive_source_child_item_id';
  return cartFromContext.stores.some(store =>
    store.cartLines?.some(line => line[sourceFieldInCart] != null && line[sourceFieldInCart] === sourceIdToCheck)
  );
}
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
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [drive, setDrive] = useState(initialDriveData);
  // eslint-disable-next-line no-unused-vars
  const [pageUrl, setPageUrl] = useState('');
  const [pageError, setPageError] = useState(initialError || null);

  const [isBladeDismissed, setIsBladeDismissed] = useState(false);
  const cartHasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
  const isCartBladeEffectivelyOpen = cartHasItems && !isBladeDismissed;

  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});

  // Placeholder data for Top Donors and Recent Donations
  const topDonorsData = [
    { name: 'Maggie Whitman', items: 7, avatar: '/img/team-1-800x800.jpg', badge: '🥇' },
    { name: 'Jacob Medici', items: 4, avatar: '/img/team-2-800x800.jpg', badge: '🥈' },
    { name: 'Paula Leblanc', items: 3, avatar: '/img/team-3-800x800.jpg', badge: '🥉' },
  ];
  const recentDonationsData = [
    { donorName: 'John Powers', itemName: 'Kids Toothbrush', time: '3hrs ago', avatar: '/img/team-4-470x470.png' },
    { donorName: 'Paula Leblanc', itemName: 'Legos', time: '20hrs ago', avatar: '/img/team-3-800x800.jpg', badge: '🥉' },
    { donorName: 'Paula Leblanc', itemName: 'Bed Set', time: '1 day ago', avatar: '/img/team-3-800x800.jpg', badge: '🥉' },
  ];


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
    }
    setItemQuantities(initialQuantities);
  }, [drive]);


  const fetchDriveDataAfterCartAction = async () => {
    if (!drive || !drive.drive_id) return;
    try {
      const updatedDriveResponse = await axios.get(`/api/drives/${drive.drive_id}`);
      const aggregateResponse = await axios.get(`/api/drives/${drive.drive_id}/aggregate`);
      const childrenWithItemCounts = await Promise.all(
        (updatedDriveResponse.data.children || []).map(async (child) => {
          const childItemsResp = await axios.get(`/api/children/${child.child_id}/items`);
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
      const driveItemsResponse = await axios.get(`/api/drives/${drive.drive_id}/items`);
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
    if (authStatus === "unauthenticated" || !user) {
      toast.error("Please log in to add items.");
      router.push('/auth/login?callbackUrl=' + encodeURIComponent(router.asPath));
      return;
    }
    const itemKey = itemNeed[itemKeyType];
    if (!itemKey) {
      toast.error("Item identifier is missing.");
      return;
    }
    setIsAddingToCart(prev => ({ ...prev, [itemKey]: true }));
    const ryeIdForCartApi = itemNeed.selected_rye_variant_id;
    const marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    const itemNameForToast = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";
    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false })); return;
    }
    if (!itemNeed.is_rye_linked) {
      toast.warn('This item cannot be purchased online at this time.');
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false })); return;
    }
    const quantity = itemQuantities[itemKey] || 1;
    const payloadForContext = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemKey,
      originalNeedRefType: itemKeyType
    };
    try {
      await addToCart(payloadForContext);
      await fetchDriveDataAfterCartAction();
    } catch (err) {
      console.error('Error in DrivePage calling CartContext.addToCart:', err);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const closeChildModal = () => {
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
    fetchDriveDataAfterCartAction();
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
          <Link href="/visible/orglist" className="mt-4 px-4 py-2 bg-ggreen text-white rounded hover:bg-teal-700">
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

  const { name, totalNeeded, org_city, org_state, totalPurchased, organization_name, end_date, items: driveItemsOnly } = drive;
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;
  const daysRemaining = calculateDaysRemaining(end_date);
  const donationsToGo = Math.max(0, totalNeeded - totalPurchased);

  return (
    <>
      <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
      <main className={`min-h-screen bg-white text-slate-800 relative pt-24 pb-16 ${isCartBladeEffectivelyOpen ? 'mr-[15rem]' : 'mr-0'} transition-all duration-300 ease-in-out`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button and Share moved above metadata */}
          {/* Removed Breadcrumbs for cleaner look matching screenshot */}
          {/* 
          <div className="flex justify-between items-center my-6">
             <button onClick={() => router.back()} className="text-ggreen hover:text-teal-700 flex items-center text-sm"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back</button>
             {pageUrl && drive && <ShareButton pageType="drive" pageData={drive} pageUrl={pageUrl} />}
          </div>
          */}

          {/* Drive Title */}
          <h1 className="text-3xl lg:text-4xl font-bold text-ggreen mb-3 mt-6 text-center md:text-left">{name}</h1>

          {/* Drive Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-8 justify-center md:justify-start">
            <div className="flex items-center">
              <GiftSolidIcon className="h-5 w-5 mr-1.5 text-ggreen" />
              <span>{totalNeeded || 0} Item{totalNeeded !== 1 ? 's' : ''} Needed</span>
            </div>
            {(org_city && org_state) && (
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-1.5 text-ggreen" />
                <span>{org_city}, {org_state}</span>
              </div>
            )}
            {organization_name && (
              <div className="flex items-center">
                <BuildingLibraryIcon className="h-5 w-5 mr-1.5 text-ggreen" />
                <span>{organization_name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="md:col-span-4 space-y-6">
              {/* Drive Progress Card */}
              <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-ggreen mb-3">Drive Progress</h2>
                {daysRemaining > 0 ? (
                  <p className="text-sm text-slate-500 mb-3">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>
                ) : (
                  <p className="text-sm text-red-500 mb-3 font-medium">This drive has ended.</p>
                )}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div
                    className="bg-ggreen h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-700 font-medium mb-5">
                  {donationsToGo > 0 ? `${donationsToGo} Donation${donationsToGo !== 1 ? 's' : ''} to go!` : "Goal Reached!"}
                </p>
                <button
                  onClick={() => toast.info("Share functionality coming soon!")} // Placeholder for ShareModal
                  className="w-full flex items-center justify-center px-4 py-3 bg-ggreen text-white font-semibold rounded-md hover:bg-teal-700 transition-colors text-sm shadow"
                >
                  <ShareIcon className="h-5 w-5 mr-2" /> Share Drive!
                </button>
              </div>

              {/* Top Donors Card */}
              <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-ggreen">Top Donors</h2>
                  <span className="text-xs text-slate-500">{topDonorsData.reduce((acc, donor) => acc + donor.items, 0)} total donations</span>
                </div>
                <ul className="space-y-3">
                  {topDonorsData.map((donor, index) => (
                    <li key={index} className="flex items-center">
                      <Image src={donor.avatar} alt={donor.name} width={40} height={40} className="rounded-full mr-3" />
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-slate-800">{donor.name} <span className="text-xs">{donor.badge}</span></p>
                        <p className="text-xs text-slate-500">{donor.items} Item{donor.items !== 1 ? 's' : ''}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Donations Card */}
              <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Recent Donations</h2>
                <ul className="space-y-4">
                  {recentDonationsData.map((donation, index) => (
                    <li key={index} className="flex items-center">
                      <Image src={donation.avatar} alt={donation.donorName} width={40} height={40} className="rounded-full mr-3" />
                      <div className="flex-grow">
                        <p className="text-sm">
                          <span className="font-medium text-slate-800">{donation.donorName}</span>
                          {donation.badge && <span className="text-xs ml-1">{donation.badge}</span>}
                        </p>
                        <p className="text-sm text-slate-600">{donation.itemName}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{donation.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column - Items Grid */}
            <div className="md:col-span-8">
              {driveItemsOnly && driveItemsOnly.length > 0 ? (
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
              ) : (
                <div className="bg-white p-8 rounded-lg shadow-md text-center border border-gray-200">
                  <p className="text-slate-600 italic">This drive currently has no specific items listed.</p>
                  <p className="text-slate-600 mt-2">Check back later or support the organization directly!</p>
                </div>
              )}
              {/* SupportedChildrenSection removed as it's not in the target screenshot */}
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
    }));
    const childrenWithItemCounts = await Promise.all(
      (driveData.children || []).map(async (child) => {
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
    const finalDriveData = {
      ...driveData,
      items: processedDriveItems,
      children: childrenWithItemCounts,
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      donorsCount: Number(aggregate.donorsCount) || 0,
      id: driveData.drive_id.toString(),
      organization_photo: driveData.organization_photo || (driveData.organization?.photo || null),
    };
    return { props: { drive: finalDriveData, error: null } };
  } catch (error) {
    console.error(`Error fetching data for drive ${id} in GSSP:`, error.response?.data || error.message || error);
    if (error.response?.status === 404) return { notFound: true };
    return { props: { drive: null, error: 'Failed to load drive data. Please try refreshing.' } };
  }
}

DrivePage.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    id: PropTypes.string,
    org_id: PropTypes.number,
    name: PropTypes.string.isRequired,
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
    })),
  }),
  error: PropTypes.string,
};

export default DrivePage;