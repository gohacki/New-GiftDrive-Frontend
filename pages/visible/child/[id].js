// src/pages/visible/child/[id].js

import { useRouter } from 'next/router';
import React, { useContext, useState, useEffect } from 'react'; // Added useEffect
import PropTypes from 'prop-types';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import { CartContext } from '../../../contexts/CartContext'; // Corrected path
import { AuthContext } from '../../../contexts/AuthContext'; // Corrected path
import { formatCurrency } from '@/lib/utils'; // Assuming utils is in lib

const ChildDetailPage = ({ child }) => {
  const router = useRouter();
  const { addToCart: addItemToContextCart } = useContext(CartContext); // Use CartContext addToCart
  const { user } = useContext(AuthContext); // Get user status
  const [quantities, setQuantities] = useState({});

  // Initialize quantities when child data loads
  useEffect(() => {
    if (child?.items) {
      const initialQuantities = {};
      child.items.forEach(item => {
        // Default quantity to 1, but respect item.needed if it's the max
        initialQuantities[item.item_id] = 1; // item.item_id is now the internal GiftDrive ID
      });
      setQuantities(initialQuantities);
    }
  }, [child]);


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

  // --- MODIFIED Add to Cart Handler ---
  const handleAddToCart = (item, quantity) => {
    // 'item' here comes from the child.items array fetched by getServerSideProps
    // We expect item.item_id to be the INTERNAL GiftDrive item ID
    const giftDriveItemId = item.item_id;

    if (!user) {
      toast.error("Please log in to add items.");
      // Consider opening a login modal here instead of just a toast
      // Example: openModal(MODAL_TYPES.LOGIN); // If you implement this
      return;
    }

    if (!giftDriveItemId) {
      console.error('handleAddToCart Error: Missing internal GiftDrive Item ID on item object:', item);
      toast.error('Cannot add item: Item configuration error.');
      return;
    }

    if (!item.is_rye_linked) {
      toast.warn('This item cannot be purchased online yet. Please check back later.');
      return;
    }

    console.log(`Adding GiftDrive Item ID ${giftDriveItemId} (Qty: ${quantity}) to context cart.`);
    addItemToContextCart(giftDriveItemId, quantity); // Call the context function
  };

  // Quantity change handler remains the same conceptually
  const handleQuantityChange = (itemId, value, max) => {
    // Ensure value is treated as a number and clamped between 1 and max
    const numericValue = Number(value);
    if (isNaN(numericValue)) return; // Ignore non-numeric input

    const newQuantity = Math.max(1, Math.min(numericValue, max));
    setQuantities((prev) => ({
      ...prev,
      [itemId]: newQuantity, // Use internal item_id as key
    }));
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              // Update these links as needed based on your org/drive structure
              { href: `/visible/organization/${child.org_id || 'org'}`, label: child.organization_name || 'Organization' },
              { href: `/visible/drive/${child.drive_id}`, label: child.drive_name },
              { href: `/visible/child/${child.child_id}`, label: child.child_name },
            ]}
          />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center mb-6 px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark transition-colors focus:outline-none focus:ring-2 focus:ring-ggreen"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          {/* Child Details Card */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              {/* Child Image */}
              {child.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-6">
                  <Image
                    src={child.photo} // Uses photo from default_children via backend join
                    alt={child.child_name}
                    width={192}
                    height={192}
                    className="object-cover rounded-full"
                  />
                </div>
              )}
              {/* Child Info */}
              <div className="md:w-2/3 p-6 flex flex-col justify-center">
                <h1 className="text-3xl inter-bold text-ggreen mb-2">
                  {child.child_name}
                </h1>
                <p className="text-gray-600 mb-2">
                  Part of Drive:{' '}
                  <Link href={`/visible/drive/${child.drive_id}`} className="text-ggreen hover:underline">
                    {child.drive_name}
                  </Link>
                </p>
                {/* Display Age/Gender if available */}
                {/* {child.age && ( ... )} */}
                {/* {child.gender && ( ... )} */}
                {/* Add description if available */}
                {/* {child.description && ( ... )} */}
              </div>
            </div>
          </div>

          {/* Items Needed Section */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl inter-semi-bold text-ggreen mb-6">
              Items Needed for {child.child_name}
            </h2>
            {child.items && child.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {child.items.map((item) => {
                  // Removed isAdded/cartItemId logic - relies on context/backend now
                  const isOutOfStock = item.remaining <= 0;
                  const maxQuantity = item.remaining > 0 ? item.remaining : 0; // Max can't be less than 0
                  const currentQuantity = quantities[item.item_id] || 1; // Use internal item_id

                  return (
                    <div
                      key={item.child_item_id} // Use the unique child_item link ID
                      className={`border p-4 rounded-lg shadow-sm ${!item.is_rye_linked ? 'bg-gray-100 opacity-70' : 'bg-white hover:shadow-md'} flex flex-col justify-between transition-shadow`}
                    >
                      {/* Item Image */}
                      {item.item_photo && (
                        <div className="flex justify-center mb-4 h-32 relative">
                          <Image
                            src={item.item_photo}
                            alt={item.item_name || 'Item Image'}
                            fill
                            style={{ objectFit: 'contain' }} // Use contain to show full image
                            className="rounded-lg"
                            onError={(e) => e.currentTarget.src = '/img/default-item.png'} // Fallback image
                          />
                        </div>
                      )}
                      {/* Item Info */}
                      <div className="flex-grow">
                        <h3 className="text-lg inter-semi-bold text-ggreen mb-1 line-clamp-2 h-12">
                          {item.item_name}
                        </h3>
                        <p className="text-gray-800 font-bold mb-1">
                          {formatCurrency(item.price * 100, 'USD')} {/* Format price */}
                        </p>
                        <p className="text-gray-600 text-xs mb-2 line-clamp-3">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          Needed: {item.needed} | Purchased: {item.purchased} | Remaining: {item.remaining}
                        </p>
                        {!item.is_rye_linked && (
                          <p className="text-xs text-orange-600 font-semibold mt-1">Item not linked for online purchase.</p>
                        )}
                      </div>

                      {/* Quantity Selector and Add Button */}
                      {item.is_rye_linked && (
                        <div className="mt-4">
                          {item.needed > 1 ? ( // Show quantity selector only if more than 1 needed
                            <div className="flex items-center justify-center mb-2">
                              <label htmlFor={`quantity-${item.child_item_id}`} className="mr-2 text-sm text-gray-700">
                                Qty:
                              </label>
                              <input
                                type="number"
                                id={`quantity-${item.child_item_id}`}
                                name={`quantity-${item.item_id}`} // Use internal item_id for state key
                                min="1"
                                max={maxQuantity} // Max is remaining available
                                value={currentQuantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.item_id, e.target.value, maxQuantity)
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-100"
                                disabled={isOutOfStock} // Disable if none remaining
                                aria-label={`Quantity for ${item.item_name}`}
                              />
                            </div>
                          ) : (
                            // Hidden input or just rely on default quantity=1 if needed=1
                            <div className='h-[34px] mb-2'></div> // Placeholder for alignment
                          )}
                          <button
                            onClick={() => handleAddToCart(item, currentQuantity)}
                            className={`w-full py-2 rounded-lg text-white transition-colors font-medium ${isOutOfStock
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-ggreen hover:bg-ggreen-dark'
                              }`}
                            aria-label={
                              isOutOfStock
                                ? `${item.item_name} is fully purchased`
                                : `Add ${item.item_name} to cart`
                            }
                            disabled={isOutOfStock}
                          >
                            {isOutOfStock ? 'Fulfilled' : 'Add to Cart'}
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

// --- ADJUSTED getServerSideProps ---
export async function getServerSideProps(context) {
  const { id } = context.params; // This is unique_child_id
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    // Fetch unique_child details (includes drive info, default child info, org info)
    const childResponse = await axios.get(`${apiUrl}/api/children/${id}`); // Uses unique_child_id
    const childData = childResponse.data; // Expect backend to join necessary tables

    if (!childData || !childData.child_id) {
      console.warn(`Child with ID ${id} not found.`);
      return { notFound: true }; // Return 404 if child not found
    }

    // Fetch items specifically associated with this unique_child
    // ** CRUCIAL: Backend /api/children/:childId/items MUST return internal item_id AND is_rye_linked **
    const itemsResponse = await axios.get(`${apiUrl}/api/children/${childData.child_id}/items`);
    const itemsData = itemsResponse.data || [];

    const items = itemsData.map((item) => ({
      child_item_id: item.child_item_id, // Link between unique_child and item need
      item_id: item.item_id,             // *** INTERNAL GiftDrive item ID ***
      item_name: item.item_name,
      item_photo: item.item_photo || '/img/default-item.png',
      price: Number(item.price || 0), // Use price from DB, default 0
      description: item.description || null,
      needed: Number(item.needed || item.quantity || 0),
      purchased: Number(item.purchased || 0),
      remaining: Number(item.remaining || 0),
      is_rye_linked: Boolean(item.is_rye_linked), // **** Make sure backend sends this ****
      // Other fields like Rye IDs are not strictly needed on this page anymore
    }));

    // Structure the final prop, including org details if joined by backend
    const child = {
      child_id: childData.child_id,
      child_name: childData.child_name,
      drive_id: childData.drive_id,
      drive_name: childData.drive_name,
      org_id: childData.org_id, // Assuming backend joins to get org_id from drives table
      organization_name: childData.organization_name, // Assuming backend joins to get org name
      photo: childData.photo || '/img/default-child.png',
      items: items,
      // Add other default_child fields like age/gender if available and needed
    };

    return { props: { child } };

  } catch (error) {
    console.error(`Error fetching child/items data for unique_child ${id}:`, error.response?.data || error.message);
    // Consider returning a specific error prop or redirecting
    return { props: { child: null } }; // Or handle error differently
  }
}

ChildDetailPage.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    drive_id: PropTypes.number.isRequired,
    drive_name: PropTypes.string.isRequired,
    org_id: PropTypes.number, // Optional but good for breadcrumbs
    organization_name: PropTypes.string, // Optional
    photo: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number.isRequired,
        item_id: PropTypes.number.isRequired, // Internal GiftDrive ID
        item_name: PropTypes.string.isRequired,
        item_photo: PropTypes.string,
        price: PropTypes.number.isRequired,
        description: PropTypes.string,
        needed: PropTypes.number.isRequired,
        purchased: PropTypes.number.isRequired,
        remaining: PropTypes.number.isRequired,
        is_rye_linked: PropTypes.bool, // Important flag
      })
    ).isRequired,
  }), // Allow child to be null if fetch fails
};


export default ChildDetailPage;