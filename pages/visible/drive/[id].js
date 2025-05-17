// File: pages/visible/drive/[id].js
import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import ChildModal from 'components/Modals/ChildModal';
import CartBlade from '@/components/Blades/CartBlade';
import ShareButton from '@/components/Share/ShareButton';
import { CartContext } from 'contexts/CartContext';
import DriveItemsSection from '@/components/DrivePage/DriveItemsSection';
import DriveHeaderDetails from '@/components/DrivePage/DriveHeaderDetails'; // Assuming you might use this
import DriveOrganizationAside from '@/components/DrivePage/DriveOrganizationAside'; // Assuming you might use this
import SupportedChildrenSection from '@/components/DrivePage/SupportedChildrenSection'; // Assuming this is used

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper functions (isThisSpecificNeedInCart, calculateDaysRemaining) remain the same
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
  const { cart, loading: cartLoading, addToCart } = useContext(CartContext); // removeFromCart might not be used on this page directly
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

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
  // const [isRemovingFromCart, setIsRemovingFromCart] = useState({}); // Not typically used on drive display page

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, [router.asPath]);

  useEffect(() => {
    if (cartHasItems) setIsBladeDismissed(false);
  }, [cartHasItems]);

  // Initialize itemQuantities when drive data (especially items/children) changes
  useEffect(() => {
    const initialQuantities = {};
    const processItems = (items, keyPrefix) => {
      (items || []).forEach(itemNeed => {
        const itemKey = itemNeed[`${keyPrefix}_item_id`]; // e.g., drive_item_id or child_item_id
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
      // UPDATED to relative paths for API calls
      const updatedDriveResponse = await axios.get(`/api/drives/${drive.drive_id}`);
      const aggregateResponse = await axios.get(`/api/drives/${drive.drive_id}/aggregate`);

      // Refetch children with updated item counts
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

      // Fetch top-level drive items separately
      const driveItemsResponse = await axios.get(`/api/drives/${drive.drive_id}/items`);
      const processedDriveItems = (driveItemsResponse.data || []).map(item => ({
        ...item,
        selected_rye_variant_id: item.selected_rye_variant_id || null,
        selected_rye_marketplace: item.selected_rye_marketplace || null,
      }));


      setDrive({
        ...updatedDriveResponse.data,
        items: processedDriveItems, // Use newly fetched drive items
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
    // ... (quantity change logic remains same) ...
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

    const itemKey = itemNeed[itemKeyType]; // e.g., itemNeed.drive_item_id or itemNeed.child_item_id
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
      originalNeedRefType: itemKeyType // This should now be 'drive_item_id' or 'child_item_id' directly
    };

    try {
      await addToCart(payloadForContext); // This calls the CartContext function
      // fetchCart(); // CartContext addToCart should update the cart state
      await fetchDriveDataAfterCartAction(); // Refetch drive data to update remaining counts
    } catch (err) {
      console.error('Error in DrivePage calling CartContext.addToCart:', err);
      // Error already handled by addToCart in context typically
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
    fetchDriveDataAfterCartAction();
  };
  const handleBladeClose = () => setIsBladeDismissed(true);

  if (router.isFallback || (!drive && !pageError && authStatus === "loading")) { // Check pageError here
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

  if (pageError) { // Display error if GSSP or client-side fetch fails
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
  if (!drive) { // Final fallback if drive is null after loading and no specific error
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

  const { name, description, photo, totalNeeded, org_city, org_state, totalPurchased, organization_name, org_id, end_date, children: driveChildren, items: driveItemsOnly } = drive;
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;
  const daysRemaining = calculateDaysRemaining(end_date);


  return (
    <>
      <Navbar isBladeOpen={isCartBladeEffectivelyOpen} />
      <main className={`min-h-screen bg-secondary_green text-gray-800 relative pt-10 pb-16 ${isCartBladeEffectivelyOpen ? 'mr-[15rem]' : 'mr-0'} transition-all duration-300 ease-in-out`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/visible/organization/${org_id || 'org'}`, label: organization_name || 'Organization' },
              { href: `/visible/drive/${drive.drive_id}`, label: name },
            ]}
          />
          <div className="flex justify-between items-center my-6">
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
              aria-label="Go back to previous page"
            >
              <FaArrowLeft className="mr-2" /> Back
            </button>
            {pageUrl && drive && <ShareButton pageType="drive" pageData={drive} pageUrl={pageUrl} />}
          </div>

          <DriveHeaderDetails
            name={name}
            description={description}
            photo={photo}
            totalNeeded={totalNeeded}
            orgCity={org_city}
            orgState={org_state}
            totalPurchased={totalPurchased}
            progressPercentage={progressPercentage}
          />

          <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-80 xl:w-96 space-y-6 lg:sticky lg:top-24 self-start flex-shrink-0">
              <DriveOrganizationAside
                orgId={org_id}
                organizationName={organization_name}
                organizationPhoto={drive.organization_photo} // Assuming this comes from drive data
                donorsCount={drive.donorsCount}
              />
              {/* Optional: Days Remaining Card - You can create a new component or inline it */}
              <div className="border-2 border-ggreen shadow rounded-lg p-6 bg-white">
                <h2 className="text-xl font-semibold text-ggreen mb-2">Drive Ends In</h2>
                <p className="text-3xl font-bold text-gray-800">{daysRemaining}</p>
                <p className="text-sm text-gray-600">days</p>
              </div>
            </aside>

            <div className="w-full lg:flex-1 space-y-12">
              {driveItemsOnly && driveItemsOnly.length > 0 && (
                <DriveItemsSection
                  items={driveItemsOnly}
                  cart={cart}
                  cartLoading={cartLoading}
                  itemKeyType="drive_item_id"
                  itemQuantities={itemQuantities}
                  isAddingToCart={isAddingToCart}
                  // isRemovingFromCart={isRemovingFromCart} // Not used here directly
                  onAddToCart={handleAddToCart}
                  // onRemoveFromCart={handleRemoveFromCart} // Not used here directly
                  onQuantityChange={handleQuantityChange}
                  isThisSpecificNeedInCart={isThisSpecificNeedInCart}
                />
              )}

              {driveChildren && driveChildren.length > 0 && (
                <SupportedChildrenSection
                  childDataList={driveChildren}
                  driveName={name}
                  onOpenChildModal={openChildModal}
                />
              )}

              {(!driveItemsOnly || driveItemsOnly.length === 0) && (!driveChildren || driveChildren.length === 0) && (
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                  <p className="text-gray-600 italic">This drive currently has no specific items or children listed for direct donation.</p>
                  <p className="text-gray-600 mt-2">You can still support the organization directly or check back later!</p>
                  {org_id && (
                    <Link href={`/visible/organization/${org_id}`} className="mt-4 inline-block px-4 py-2 bg-ggreen text-white text-sm font-medium rounded-md hover:bg-teal-700">
                      View Organization
                    </Link>
                  )}
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

// getServerSideProps remains largely the same but uses relative paths for internal API calls
export async function getServerSideProps(context) {
  const { id } = context.params;
  const baseApiUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  try {
    const driveResponse = await axios.get(`${baseApiUrl}/api/drives/${id}`);
    let driveData = driveResponse.data;
    if (!driveData || !driveData.drive_id) return { notFound: true };

    // Fetch aggregate separately as it's a dedicated endpoint
    const aggregateResponse = await axios.get(`${baseApiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data || { totalNeeded: 0, totalPurchased: 0, donorsCount: 0 };

    // Fetch top-level drive items
    const driveItemsResponse = await axios.get(`${baseApiUrl}/api/drives/${id}/items`);
    const processedDriveItems = (driveItemsResponse.data || []).map(item => ({
      ...item,
      selected_rye_variant_id: item.selected_rye_variant_id || null,
      selected_rye_marketplace: item.selected_rye_marketplace || null,
    }));

    // Fetch children and their items
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
      items: processedDriveItems, // Assign fetched drive-specific items
      children: childrenWithItemCounts,
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      donorsCount: Number(aggregate.donorsCount) || 0,
      id: driveData.drive_id.toString(), // For ShareButton
      // Ensure organization_photo is available if needed by DriveOrganizationAside
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
    id: PropTypes.string, // Added for ShareButton consistency
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
      items: PropTypes.array, // Array of child item needs
    })),
    items: PropTypes.arrayOf(PropTypes.shape({ // Drive-specific items
      drive_item_id: PropTypes.number.isRequired,
      // ... other item properties consistent with DriveItemCard expectations ...
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