// File: pages/visible/drive/[id].js
import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import ChildModal from 'components/Modals/ChildModal';
import CartBlade from '@/components/Blades/CartBlade';
import ShareButton from '@/components/Share/ShareButton';
import { CartContext } from 'contexts/CartContext';
import { AuthContext } from 'contexts/AuthContext';

// Import your new components
import DriveHeaderDetails from '@/components/DrivePage/DriveHeaderDetails';
import DriveItemsSection from '@/components/DrivePage/DriveItemsSection';
import SupportedChildrenSection from '@/components/DrivePage/SupportedChildrenSection';
import DriveOrganizationAside from '@/components/DrivePage/DriveOrganizationAside';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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
  const { cart, loading: cartLoading, addToCart, removeFromCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [drive, setDrive] = useState(initialDriveData);
  const [pageUrl, setPageUrl] = useState('');

  const [isBladeDismissed, setIsBladeDismissed] = useState(false);
  const cartHasItems = cart?.stores?.some(store => store.cartLines?.length > 0);
  const isCartBladeEffectivelyOpen = cartHasItems && !isBladeDismissed;

  const [selectedChildIdForModal, setSelectedChildIdForModal] = useState(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);

  const [selectedRyeVariants, setSelectedRyeVariants] = useState({});
  const [availableRyeVariantsInfo, setAvailableRyeVariantsInfo] = useState({});
  const [isLoadingVariants, setIsLoadingVariants] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({});
  const [isRemovingFromCart, setIsRemovingFromCart] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') setPageUrl(window.location.href);
  }, [router.asPath]);

  useEffect(() => {
    if (cartHasItems) setIsBladeDismissed(false);
  }, [cartHasItems]);

  useEffect(() => {
    const initialDriveItemQuantities = {};
    drive?.items?.forEach(itemNeed => {
      initialDriveItemQuantities[itemNeed.drive_item_id] = 1;
    });
    drive?.children?.forEach(child => {
      child.items?.forEach(itemNeed => {
        initialDriveItemQuantities[itemNeed.child_item_id] = 1;
      });
    });
    setItemQuantities(initialDriveItemQuantities);
  }, [drive?.items, drive?.children]);

  const fetchDriveDataAfterCartAction = async () => {
    try {
      const updatedDriveResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}`);
      const updatedItemsResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}/items`);
      const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${drive.drive_id}/aggregate`);
      setDrive({
        ...updatedDriveResponse.data,
        items: updatedItemsResponse.data,
        children: updatedDriveResponse.data.children || [],
        totalNeeded: Number(aggregateResponse.data.totalNeeded) || 0,
        totalPurchased: Number(aggregateResponse.data.totalPurchased) || 0,
      });
    } catch (error) {
      console.error("Failed to refetch drive data:", error);
      toast.error("Could not refresh drive details.");
    }
  };

  const fetchVariantsForNeed = async (itemNeed, itemKey) => {
    if (!itemNeed.allow_donor_variant_choice || !itemNeed.base_rye_product_id || availableRyeVariantsInfo[itemKey]) {
      return;
    }
    setIsLoadingVariants(prev => ({ ...prev, [itemKey]: true }));
    try {
      const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
        rye_product_id: itemNeed.base_rye_product_id,
        marketplace: itemNeed.base_marketplace,
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

  const handleAddToCart = async (itemNeed, itemKeyType) => {
    if (!user) {
      toast.error("Please log in to add items.");
      router.push('/auth/login'); return;
    }
    const itemKey = itemNeed[itemKeyType];
    setIsAddingToCart(prev => ({ ...prev, [itemKey]: true }));

    let ryeIdForCartApi = itemNeed.selected_rye_variant_id;
    let marketplaceForCartApi = itemNeed.selected_rye_marketplace;
    let itemNameForToast = itemNeed.variant_display_name || itemNeed.base_item_name || "Item";

    if (itemNeed.allow_donor_variant_choice && selectedRyeVariants[itemKey]) {
      ryeIdForCartApi = selectedRyeVariants[itemKey];
      marketplaceForCartApi = itemNeed.base_marketplace;
      const variantInfo = availableRyeVariantsInfo[itemKey]?.variants?.find(v => v.id === ryeIdForCartApi);
      if (variantInfo) itemNameForToast = variantInfo.title;
    }

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false })); return;
    }
    if (!itemNeed.is_rye_linked) {
      toast.warn('This item variation cannot be purchased online at this time.');
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false })); return;
    }

    const quantity = itemQuantities[itemKey] || 1;
    const payloadForContext = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemKey,
      originalNeedRefType: itemKeyType === 'drive_item_id' ? 'drive_item' : 'child_item'
    };

    try {
      await addToCart(payloadForContext); // Context handles API call, cart update, and redirect
      await fetchDriveDataAfterCartAction(); // Refetch drive data after cart action
    } catch (err) {
      console.error('Error in DrivePage calling CartContext.addToCart:', err);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleRemoveFromCart = async (itemNeed, itemKeyType) => {
    if (!user) {
      toast.error("Please log in to manage your cart.");
      router.push('/auth/login'); return;
    }
    const itemKey = itemNeed[itemKeyType];
    setIsRemovingFromCart(prev => ({ ...prev, [itemKey]: true }));

    let ryeIdForRemoval = itemNeed.selected_rye_variant_id;
    let marketplaceForRemoval = itemNeed.selected_rye_marketplace;

    if (!ryeIdForRemoval || !marketplaceForRemoval) {
      toast.error(`Cannot remove item: Critical item identifiers missing.`);
      setIsRemovingFromCart(prev => ({ ...prev, [itemKey]: false })); return;
    }

    try {
      await removeFromCart(ryeIdForRemoval, marketplaceForRemoval); // Context handles API call and cart update
      await fetchDriveDataAfterCartAction(); // Refetch drive data
    } catch (err) {
      console.error('Error removing item from cart (DrivePage):', err);
    } finally {
      setIsRemovingFromCart(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const openChildModal = (childId) => {
    setSelectedChildIdForModal(childId);
    setIsChildModalOpen(true);
  };
  const closeChildModal = () => {
    setSelectedChildIdForModal(null);
    setIsChildModalOpen(false);
    fetchDriveDataAfterCartAction(); // Refetch drive data if modal actions could change counts
  };
  const handleBladeClose = () => setIsBladeDismissed(true);

  if (!drive) {
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

  const totalNeeded = Number(drive.totalNeeded) || 0;
  const totalPurchased = Number(drive.totalPurchased) || 0;
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalPurchased / totalNeeded) * 100) : 0;

  return (
    <>
      <Navbar transparent isBladeOpen={isCartBladeEffectivelyOpen} />
      <main className={`min-h-screen bg-secondary_green text-gray-800 relative pt-24 pb-16 ${isCartBladeEffectivelyOpen ? 'mr-[15rem]' : 'mr-0'} transition-margin duration-300 ease-in-out`}>
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

          <DriveHeaderDetails
            name={drive.name}
            description={drive.description}
            photo={drive.photo}
            totalNeeded={totalNeeded}
            orgCity={drive.org_city}
            orgState={drive.org_state}
            totalPurchased={totalPurchased}
            progressPercentage={progressPercentage}
          />

          <div className="flex flex-col md:flex-row gap-8 mt-8">
            <div className="md:w-2/3 space-y-8">
              <DriveItemsSection
                items={drive.items || []}
                cart={cart}
                cartLoading={cartLoading}
                itemKeyType="drive_item_id"
                selectedRyeVariants={selectedRyeVariants}
                availableRyeVariantsInfo={availableRyeVariantsInfo}
                isLoadingVariants={isLoadingVariants}
                itemQuantities={itemQuantities}
                isAddingToCart={isAddingToCart}
                isRemovingFromCart={isRemovingFromCart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onFetchVariants={fetchVariantsForNeed}
                onVariantSelect={handleVariantSelectionChange}
                onQuantityChange={handleQuantityChange}
                isThisSpecificNeedInCart={isThisSpecificNeedInCart}
              />

              <SupportedChildrenSection
                childDataList={drive.children || []} // Changed prop name from 'children' to 'childDataList'
                driveName={drive.name}
                onOpenChildModal={openChildModal}
              />
              {(!drive.items || drive.items.length === 0) && (!drive.children || drive.children.length === 0) && (
                <p className="text-gray-600 italic text-center py-6">This drive currently has no specific items or children listed.</p>
              )}
            </div>

            <aside className="md:w-1/3 space-y-6">
              <DriveOrganizationAside
                orgId={drive.org_id}
                organizationName={drive.organization_name}
                organizationPhoto={drive.organization_photo}
                donorsCount={drive.donorsCount}
              />
            </aside>
          </div>
        </div>
      </main >
      <ChildModal isOpen={isChildModalOpen} onClose={closeChildModal} childId={selectedChildIdForModal} />
      <CartBlade isOpen={isCartBladeEffectivelyOpen} onClose={handleBladeClose} />
      <Footer isBladeOpen={isCartBladeEffectivelyOpen} />
    </>
  );
};

export async function getServerSideProps(context) {
  const { id } = context.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  try {
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const driveData = driveResponse.data;
    if (!driveData || !driveData.drive_id) return { notFound: true };

    const driveItemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
    const childrenWithItemCounts = await Promise.all(
      (driveData.children || []).map(async (child) => {
        const childItemsResp = await axios.get(`${apiUrl}/api/children/${child.child_id}/items`);
        return { ...child, items_needed_count: childItemsResp.data?.filter(item => item.remaining > 0).length || 0 };
      })
    );
    const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data;
    const finalDriveData = {
      ...driveData,
      items: driveItemsResponse.data || [],
      children: childrenWithItemCounts,
      totalNeeded: Number(aggregate.totalNeeded) || 0,
      totalPurchased: Number(aggregate.totalPurchased) || 0,
      id: driveData.drive_id.toString(),
      organization_photo: driveData.organization_photo || null,
    };
    return { props: { drive: finalDriveData } };
  } catch (error) {
    console.error(`Error fetching data for drive ${id}:`, error.response?.data || error.message);
    return { props: { drive: null } };
  }
}

DrivePage.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired,
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
    children: PropTypes.arrayOf(PropTypes.shape({
      child_id: PropTypes.number.isRequired,
      child_name: PropTypes.string.isRequired,
      child_photo: PropTypes.string,
      items_needed_count: PropTypes.number,
    })),
    items: PropTypes.arrayOf(PropTypes.shape({
      drive_item_id: PropTypes.number.isRequired,
      item_id: PropTypes.number,
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
    })),
  }),
};

export default DrivePage;