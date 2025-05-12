// File: pages/visible/child/[id].js
import { useRouter } from 'next/router';
import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import { CartContext } from '../../../contexts/CartContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ChildDetailPage = ({ child: initialChildData }) => {
  const router = useRouter();
  const { setCart, loading: cartLoading } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [child, setChild] = useState(initialChildData);
  const [selectedRyeVariants, setSelectedRyeVariants] = useState({});
  const [availableRyeVariantsInfo, setAvailableRyeVariantsInfo] = useState({});
  const [isLoadingVariants, setIsLoadingVariants] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState({}); // Item-specific loading state

  useEffect(() => {
    if (child?.items) {
      const initialQuantities = {};
      child.items.forEach(itemNeed => {
        initialQuantities[itemNeed.child_item_id] = 1;
      });
      setItemQuantities(initialQuantities);
    }
  }, [child?.items]);

  const fetchVariantsForNeed = async (itemNeed) => {
    if (!itemNeed.allow_donor_variant_choice || !itemNeed.base_rye_product_id_for_donor_choice || availableRyeVariantsInfo[itemNeed.child_item_id]) {
      return;
    }
    setIsLoadingVariants(prev => ({ ...prev, [itemNeed.child_item_id]: true }));
    try {
      const response = await axios.post(`${apiUrl}/api/items/fetch-rye-variants-for-product`, {
        rye_product_id: itemNeed.base_rye_product_id_for_donor_choice,
        marketplace: itemNeed.base_marketplace_for_donor_choice,
      });
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemNeed.child_item_id]: response.data }));
      if (response.data?.variants?.length > 0) {
        const firstAvailable = response.data.variants.find(v => v.isAvailable);
        if (firstAvailable) {
          setSelectedRyeVariants(prev => ({ ...prev, [itemNeed.child_item_id]: firstAvailable.id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch variants:", error);
      toast.error(`Could not load options.`);
      setAvailableRyeVariantsInfo(prev => ({ ...prev, [itemNeed.child_item_id]: { variants: [] } }));
    } finally {
      setIsLoadingVariants(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
    }
  };

  const handleVariantSelectionChange = (childItemId, ryeVariantId) => {
    setSelectedRyeVariants(prev => ({ ...prev, [childItemId]: ryeVariantId }));
  };

  const handleQuantityChange = (childItemId, value, maxRemaining) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, maxRemaining > 0 ? maxRemaining : 1));
    setItemQuantities(prev => ({ ...prev, [childItemId]: newQuantity }));
  };

  const handleAddToCart = async (itemNeed) => {
    if (!user) {
      toast.error("Please log in to add items.");
      router.push('/auth/login');
      return;
    }

    setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: true }));

    let ryeIdForCartApi;
    let marketplaceForCartApi;
    let itemNameForToast = itemNeed.display?.name || "Item";

    if (itemNeed.allow_donor_variant_choice) {
      ryeIdForCartApi = selectedRyeVariants[itemNeed.child_item_id];
      if (!ryeIdForCartApi) {
        toast.error(`Please select an option for "${itemNeed.display?.name || 'the item'}".`);
        setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
        return;
      }
      marketplaceForCartApi = itemNeed.base_marketplace_for_donor_choice;
      const variantInfo = availableRyeVariantsInfo[itemNeed.child_item_id]?.variants?.find(v => v.id === ryeIdForCartApi);
      if (variantInfo) itemNameForToast = variantInfo.title;
    } else if (itemNeed.preset_details) {
      ryeIdForCartApi = itemNeed.preset_details.rye_id_to_add_directly;
      marketplaceForCartApi = itemNeed.preset_details.marketplace;
      itemNameForToast = itemNeed.preset_details.name;
      if (!itemNeed.preset_details.is_rye_linked) {
        toast.warn('This specific item variation cannot be purchased online yet.');
        setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
        return;
      }
    } else {
      toast.error("Item configuration error. Cannot add to cart.");
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
      return;
    }

    if (!ryeIdForCartApi || !marketplaceForCartApi) {
      toast.error(`Cannot add ${itemNameForToast} to cart: Product identifier or marketplace missing.`);
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
      return;
    }
    const quantity = itemQuantities[itemNeed.child_item_id] || 1;

    const payload = {
      ryeIdToAdd: ryeIdForCartApi,
      marketplaceForItem: marketplaceForCartApi,
      quantity: quantity,
      originalNeedRefId: itemNeed.child_item_id,
      originalNeedRefType: 'child_item'
    };

    try {
      const response = await axios.post(`${apiUrl}/api/cart/add`, payload, { withCredentials: true });
      setCart(response.data);
      toast.success(`${itemNameForToast} (Qty: ${quantity}) added to cart!`);

      // Refetch child data to update remaining counts
      const childResponse = await axios.get(`${apiUrl}/api/children/${child.child_id}`);
      const itemsResponse = await axios.get(`${apiUrl}/api/children/${child.child_id}/items`);
      setChild({
        ...childResponse.data,
        items: itemsResponse.data || [],
      });

    } catch (err) {
      console.error('Error adding to cart:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || `Failed to add ${itemNameForToast} to cart.`);
    } finally {
      setIsAddingToCart(prev => ({ ...prev, [itemNeed.child_item_id]: false }));
    }
  };

  if (!child) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-secondary_green text-gray-800 relative">
          <p className="text-gray-600 text-lg">Child not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: `/visible/organization/${child.org_id || 'org'}`, label: child.organization_name || 'Organization' },
              { href: `/visible/drive/${child.drive_id}`, label: child.drive_name },
              { href: `/visible/child/${child.child_id}`, label: child.child_name },
            ]}
          />
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-ggreen text-white rounded-md hover:bg-teal-700 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row items-center p-6">
              {child.photo && (
                <div className="mr-0 md:mr-6 mb-4 md:mb-0 flex-shrink-0">
                  <Image
                    src={child.photo}
                    alt={child.child_name}
                    width={128}
                    height={128}
                    className="object-cover rounded-full border-2 border-ggreen"
                    sizes="128px"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl inter-bold text-ggreen mb-2">
                  {child.child_name}
                </h1>
                <p className="text-gray-600">
                  Part of Drive:{' '}
                  <Link href={`/visible/drive/${child.drive_id}`} className="text-ggreen hover:underline">
                    {child.drive_name}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl inter-semi-bold text-ggreen mb-6">
              Items Needed for {child.child_name}
            </h2>
            {child.items && child.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {child.items.map((itemNeed) => {
                  const currentQuantity = itemQuantities[itemNeed.child_item_id] || 1;
                  const isCompletelyFulfilled = itemNeed.remaining <= 0;
                  const isItemActionLoading = isLoadingVariants[itemNeed.child_item_id] || isAddingToCart[itemNeed.child_item_id] || cartLoading;
                  const cardIsDisabled = isCompletelyFulfilled || !(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked);

                  const addToCartDisabled =
                    cardIsDisabled ||
                    isItemActionLoading ||
                    (itemNeed.allow_donor_variant_choice && !selectedRyeVariants[itemNeed.child_item_id]) ||
                    currentQuantity > (itemNeed.remaining || 0);

                  const buttonText = isAddingToCart[itemNeed.child_item_id]
                    ? "Adding..."
                    : isCompletelyFulfilled
                      ? "Fulfilled"
                      : "Add to Cart";

                  return (
                    <div
                      key={itemNeed.child_item_id}
                      className={`border-2 p-4 rounded-lg shadow-sm flex flex-col justify-between transition-shadow
                                  ${cardIsDisabled
                          ? 'bg-gray-100 opacity-70 border-gray-300 pointer-events-none'
                          : 'border-ggreen bg-white hover:shadow-md'
                        }`}
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
                            className="text-sm text-blue-600 hover:underline mb-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isLoadingVariants[itemNeed.child_item_id] || cardIsDisabled}
                          >
                            {isLoadingVariants[itemNeed.child_item_id]
                              ? 'Loading Options...'
                              : availableRyeVariantsInfo[itemNeed.child_item_id]
                                ? 'Change Options'
                                : 'Select Options'}
                          </button>
                        )}
                        {itemNeed.allow_donor_variant_choice && availableRyeVariantsInfo[itemNeed.child_item_id]?.variants && (
                          <select
                            value={selectedRyeVariants[itemNeed.child_item_id] || ''}
                            onChange={(e) => handleVariantSelectionChange(itemNeed.child_item_id, e.target.value)}
                            className="block w-full mt-1 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ggreen sm:text-sm mb-2 disabled:bg-gray-200"
                            disabled={cardIsDisabled || isLoadingVariants[itemNeed.child_item_id]}
                          >
                            <option value="" disabled>Choose an option...</option>
                            {availableRyeVariantsInfo[itemNeed.child_item_id].variants
                              .filter(v => v.isAvailable)
                              .map(variant => (
                                <option key={variant.id} value={variant.id}>
                                  {variant.title} ({formatCurrency(variant.price?.value, variant.price?.currency)})
                                </option>
                              ))}
                            {availableRyeVariantsInfo[itemNeed.child_item_id].variants.filter(v => v.isAvailable).length === 0 && (
                              <option value="" disabled>No options currently available</option>
                            )}
                          </select>
                        )}
                        {!itemNeed.allow_donor_variant_choice && itemNeed.preset_details?.price && (
                          <p className="text-gray-800 font-bold mb-1">{formatCurrency(itemNeed.preset_details.price * 100, 'USD')}</p>
                        )}
                        <p className="text-gray-600 text-sm mb-2 line-clamp-3">{itemNeed.display?.description}</p>
                        <p className="text-sm text-gray-500 mb-2">Needed: {itemNeed.needed} | Remaining: {itemNeed.remaining}</p>
                        {!(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked) && !cardIsDisabled && (
                          <p className="text-xs text-orange-600 font-semibold mt-1">Item not available for online purchase.</p>
                        )}
                      </div>

                      {(itemNeed.allow_donor_variant_choice || itemNeed.preset_details?.is_rye_linked) && (
                        <div className="mt-4">
                          {itemNeed.needed > 1 && (
                            <div className="flex items-center justify-center mb-2">
                              <label htmlFor={`quantity-child-${itemNeed.child_item_id}`} className="mr-2 text-sm text-gray-700">Qty:</label>
                              <input
                                type="number"
                                id={`quantity-child-${itemNeed.child_item_id}`}
                                min="1"
                                max={isCompletelyFulfilled ? 1 : (itemNeed.remaining || 1)}
                                value={currentQuantity}
                                onChange={(e) => handleQuantityChange(itemNeed.child_item_id, e.target.value, itemNeed.remaining)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-200 disabled:text-gray-500"
                                disabled={cardIsDisabled || isItemActionLoading}
                              />
                            </div>
                          )}
                          <button
                            onClick={() => handleAddToCart(itemNeed)}
                            disabled={addToCartDisabled}
                            className={`w-full px-4 py-2.5 text-white rounded-md shadow-sm transition-colors inter-medium text-sm font-semibold
                                        focus:outline-none focus:ring-2 focus:ring-offset-2
                                        ${addToCartDisabled
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                : 'bg-ggreen hover:bg-teal-700 focus:ring-teal-600'
                              }
                                        ${isAddingToCart[itemNeed.child_item_id] ? 'animate-pulse cursor-wait' : ''}
                                      `}
                          >
                            {buttonText}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">No items are currently needed for this child.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export async function getServerSideProps(context) {
  const { id: uniqueChildId } = context.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const childResponse = await axios.get(`${apiUrl}/api/children/${uniqueChildId}`);
    const childData = childResponse.data;

    if (!childData || !childData.child_id) {
      return { notFound: true };
    }

    const itemsResponse = await axios.get(`${apiUrl}/api/children/${uniqueChildId}/items`);
    const childSpecificItems = itemsResponse.data || [];

    const finalChildData = {
      ...childData,
      items: childSpecificItems,
    };

    return { props: { child: finalChildData } };

  } catch (error) {
    console.error(`Error fetching data for child ${uniqueChildId}:`, error.response?.data || error.message);
    return { props: { child: null } };
  }
}

ChildDetailPage.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    photo: PropTypes.string,
    drive_id: PropTypes.number.isRequired,
    drive_name: PropTypes.string.isRequired,
    org_id: PropTypes.number,
    organization_name: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number.isRequired,
        needed: PropTypes.number,
        purchased: PropTypes.number,
        remaining: PropTypes.number,
        allow_donor_variant_choice: PropTypes.bool.isRequired,
        base_rye_product_id_for_donor_choice: PropTypes.string,
        base_marketplace_for_donor_choice: PropTypes.string,
        display: PropTypes.shape({
          name: PropTypes.string,
          photo: PropTypes.string,
          description: PropTypes.string,
          price: PropTypes.number,
          priceDisplay: PropTypes.string,
        }),
        preset_details: PropTypes.shape({
          internal_item_id: PropTypes.number,
          name: PropTypes.string,
          photo: PropTypes.string,
          price: PropTypes.number,
          is_rye_linked: PropTypes.bool,
          rye_id_to_add_directly: PropTypes.string,
          marketplace: PropTypes.string,
          base_rye_product_id: PropTypes.string,
        }),
        internal_item_id: PropTypes.number,
      })
    ),
  }),
};

export default ChildDetailPage;