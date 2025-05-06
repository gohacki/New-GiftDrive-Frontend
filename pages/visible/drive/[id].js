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
import ChildModal from 'components/Modals/ChildModal';
import { CartContext } from 'contexts/CartContext';
import { AuthContext } from 'contexts/AuthContext';
import { formatCurrency } from '@/lib/utils'; // Assuming utils is in lib

const DrivePage = ({ drive }) => {
  const router = useRouter();
  const { addToCart: addItemToContextCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [driveQuantities, setDriveQuantities] = useState({}); // State for drive-level item quantities

  // State for showing/hiding Child Modal
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Initialize quantities when drive data loads (for drive-level items)
  useEffect(() => {
    if (drive?.items) {
      const initialQuantities = {};
      drive.items.forEach(item => {
        initialQuantities[item.item_id] = 1; // item.item_id is the internal GiftDrive ID
      });
      setDriveQuantities(initialQuantities);
    }
  }, [drive]);

  const openChildModal = (childId) => {
    setSelectedChildId(childId);
    setModalOpen(true);
  };

  const closeChildModal = () => {
    setSelectedChildId(null);
    setModalOpen(false);
  };

  // Early return if drive is null
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

  // Calculate progress
  const totalNeeded = Number(drive.totalNeeded) || 0;
  const totalDonated = Number(drive.totalPurchased) || 0;
  const totalRemaining = totalNeeded > 0 ? Math.max(0, totalNeeded - totalDonated) : 0;
  const progressPercentage = totalNeeded > 0 ? Math.min(100, (totalDonated / totalNeeded) * 100) : 0;

  // Handler to add DRIVE items to cart
  const handleAddToCartDrive = (item, quantity) => {
    const giftDriveItemId = item.item_id;

    if (!user) {
      toast.error("Please log in to add items.");
      return;
    }
    if (!giftDriveItemId) {
      console.error('handleAddToCartDrive Error: Missing internal GiftDrive Item ID on item object:', item);
      toast.error('Cannot add item: Item configuration error.');
      return;
    }
    if (!item.is_rye_linked) {
      toast.warn('This item cannot be purchased online yet. Please check back later.');
      return;
    }

    console.log(`Adding GiftDrive Item ID ${giftDriveItemId} (Qty: ${quantity}) to context cart.`);
    addItemToContextCart(giftDriveItemId, quantity); // Call context function
  };

  // Handle quantity change for drive items
  const handleDriveQuantityChange = (itemId, value, max) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newQuantity = Math.max(1, Math.min(numericValue, max));
    setDriveQuantities((prev) => ({
      ...prev,
      [itemId]: newQuantity, // Use internal item_id as key
    }));
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs and Back Button */}
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

          {/* Drive Photo and Title */}
          {drive.photo && (
            <div className="mb-8 flex justify-left ">
              <div className="relative w-full max-w-2xl h-64 md:h-80 rounded-lg overflow-hidden shadow-lg border-4 border-ggreen">
                <Image src={drive.photo} alt={`${drive.name} cover photo`} layout="fill" objectFit="cover" priority />
              </div>
            </div>
          )}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-ggreen mb-2">{drive.name}</h1>
            <div className="text-gray-600 flex flex-wrap gap-4 items-center">
              <p className="font-medium">{totalNeeded} Items Needed</p>
              {drive.org_city && drive.org_state && <p className="font-medium">{drive.org_city}, {drive.org_state}</p>}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column */}
            <div className="md:w-2/3 space-y-6">
              {/* Drive Progress & Top Donors */}
              <div className="flex">
                <div className="border-2 border-ggreen shadow rounded-lg p-6 w-1/2 mr-4">
                  <h2 className="text-xl font-semibold text-ggreen mb-4">Drive Progress</h2>
                  <div className="bg-gray-200 w-full h-4 rounded-full mb-2 overflow-hidden">
                    <div className="bg-ggreen h-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">Donated: <strong>{totalDonated}</strong></p>
                  <p className="text-sm text-gray-700">Remaining: <strong>{totalRemaining}</strong></p>
                </div>
                <div className="border-2 border-ggreen shadow rounded-lg p-6 w-1/2">
                  <h3 className="text-lg font-semibold text-ggreen mb-2">Top Donors</h3>
                  {/* Placeholder for donor list */}
                  <p className="text-sm text-gray-500 italic">(Donor display coming soon)</p>
                </div>
              </div>

              {/* Drive-Level Items Section (Render if drive.items exists and has items) */}
              {drive.items && drive.items.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Directly Needed Items {/* Updated Heading */}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.items.map((item) => {
                      const isOutOfStock = item.remaining <= 0;
                      const maxQuantity = item.remaining > 0 ? item.remaining : 1; // Ensure max is at least 1 if not OOS
                      const currentQuantity = driveQuantities[item.item_id] || 1;

                      return (
                        <div
                          key={item.drive_item_id} // Use the unique drive_item link ID
                          className={`border-2 p-4 rounded-lg shadow-sm flex flex-col justify-between ${!item.is_rye_linked ? 'bg-gray-100 opacity-70 border-gray-300' : 'border-ggreen bg-white hover:shadow-md'} transition-shadow`}
                        >
                          {/* Item Image */}
                          {item.item_photo && (
                            <div className="flex justify-center mb-4 h-32 relative">
                              <Image src={item.item_photo || '/img/default-item.png'} alt={item.item_name} fill style={{ objectFit: 'contain' }} className="rounded-md" onError={(e) => e.currentTarget.src = '/img/default-item.png'} />
                            </div>
                          )}
                          {/* Item Info */}
                          <div className="flex-grow">
                            <h3 className="text-lg text-ggreen font-medium mb-1 line-clamp-2 h-12">{item.item_name}</h3>
                            <p className="text-gray-800 font-bold mb-1">{formatCurrency(item.price * 100, 'USD')}</p>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-3">{item.description}</p>
                            <p className="text-sm text-gray-500 mb-2">Needed: {item.needed} | Remaining: {item.remaining}</p>
                            {!item.is_rye_linked && (
                              <p className="text-xs text-orange-600 font-semibold mt-1">Item not linked for online purchase.</p>
                            )}
                          </div>

                          {/* Quantity + Buttons (Only show if linked) */}
                          {item.is_rye_linked && (
                            <div className="mt-4">
                              {item.needed > 1 ? (
                                // Show quantity selector if more than 1 needed
                                <>
                                  <div className="flex items-center justify-center mb-2">
                                    <label htmlFor={`quantity-drive-${item.drive_item_id}`} className="mr-2 text-sm text-gray-700">Qty:</label>
                                    <input
                                      type="number"
                                      id={`quantity-drive-${item.drive_item_id}`}
                                      min="1"
                                      max={maxQuantity}
                                      value={currentQuantity}
                                      onChange={(e) => handleDriveQuantityChange(item.item_id, e.target.value, maxQuantity)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-ggreen disabled:bg-gray-100"
                                      disabled={isOutOfStock}
                                      aria-label={`Quantity for ${item.item_name}`}
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleAddToCartDrive(item, currentQuantity)}
                                    className={`w-full py-2 rounded-lg text-white transition-colors font-medium ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-ggreen hover:bg-ggreen-dark'}`}
                                    disabled={isOutOfStock}
                                    aria-label={isOutOfStock ? `${item.item_name} is fully purchased` : `Add ${item.item_name} to cart`}
                                  >
                                    {isOutOfStock ? 'Fulfilled' : 'Add to Cart'}
                                  </button>
                                </>
                              ) : (
                                // Only show Add to Cart button if needed is 1
                                <>
                                  <button
                                    onClick={() => handleAddToCartDrive(item, 1)} // Always add 1 if needed=1
                                    className={`w-full py-2 rounded-lg text-white transition-colors font-medium ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-ggreen hover:bg-ggreen-dark'}`}
                                    disabled={isOutOfStock}
                                    aria-label={isOutOfStock ? `${item.item_name} is fully purchased` : `Add ${item.item_name} to cart`}
                                  >
                                    {isOutOfStock ? 'Fulfilled' : 'Add to Cart'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Children Section (Render if drive.children exists and has items) */}
              {drive.children && drive.children.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-ggreen mb-4">
                    Children Supported by {drive.name} {/* Updated Heading */}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.children.map((child) => (
                      <div
                        key={child.child_id}
                        onClick={() => openChildModal(child.child_id)}
                        className="cursor-pointer block border-2 border-ggreen shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Child Image */}
                        {child.child_photo && (
                          <div className="flex justify-center mt-4 h-24 relative">
                            <Image src={child.child_photo || '/img/default-child.png'} alt={child.child_name} fill style={{ objectFit: 'contain' }} className="rounded-full" />
                          </div>
                        )}
                        {/* Child Name */}
                        <div className="p-4 text-center">
                          <h3 className="text-lg font-semibold text-ggreen mb-2">
                            {child.child_name}
                          </h3>
                          {/* Optionally add age/gender if available */}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Message if drive has neither children nor direct items */}
              {(!drive.children || drive.children.length === 0) &&
                (!drive.items || drive.items.length === 0) && (
                  <p className="text-center text-gray-600 mt-6 italic">This drive currently has no specific items or children listed.</p>
                )}
            </div>

            {/* Right Column: Organization / Share Info */}
            <div className="md:w-1/3 space-y-6">
              <div className="border-2 border-ggreen shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Organization</h2>
                <Link href={`/visible/organization/${drive.org_id}`} className="text-ggreen hover:underline block mb-2">
                  <strong>{drive.organization_name}</strong>
                </Link>
                {/* Placeholder for org description or other details */}
                <p className="text-gray-700 mb-4 text-sm">
                  {/* Example: Displaying donor count if available */}
                  {drive.donorsCount != null && `Supported by ${drive.donorsCount} donor(s)`}
                </p>
                {/* Placeholder Share Button */}
                <button className="px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark">
                  Share Drive
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Child Modal */}
      <ChildModal
        isOpen={isModalOpen}
        onClose={closeChildModal}
        childId={selectedChildId}
      />

      <Footer />
    </>
  );
};

// Updated getServerSideProps
export async function getServerSideProps(context) {
  const { id } = context.params; // Drive ID
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    // 1. Fetch drive details (includes org info and children)
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const drive = driveResponse.data;

    if (!drive || !drive.drive_id) {
      return { notFound: true };
    }

    // 2. Fetch drive-level items separately
    let driveItems = [];
    try {
      const itemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
      driveItems = (itemsResponse.data || []).map(item => ({
        ...item,
        item_id: item.item_id, // Ensure internal item_id is present
        price: Number(item.price || 0),
        needed: Number(item.needed || item.quantity || 0),
        purchased: Number(item.purchased || 0),
        remaining: Number(item.remaining || 0),
        is_rye_linked: Boolean(item.is_rye_linked),
      }));
    } catch (itemError) {
      // Log error but continue, drive might just not have direct items
      console.warn(`Could not fetch direct items for drive ${id}:`, itemError.message);
    }

    // 3. Fetch aggregate totals
    const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data;

    // 4. Combine data
    drive.items = driveItems; // Add fetched drive-level items
    drive.children = drive.children || []; // Ensure children array exists (fetched in step 1)
    drive.totalNeeded = Number(aggregate.totalNeeded) || 0;
    drive.totalPurchased = Number(aggregate.totalPurchased) || 0;
    drive.id = drive.drive_id.toString(); // For prop consistency

    // Add org location if fetched (ensure backend provides this in GET /api/drives/:id)
    drive.org_city = drive.org_city || null;
    drive.org_state = drive.org_state || null;

    return {
      props: { drive },
    };
  } catch (error) {
    console.error(`Error fetching data for drive ${id}:`, error.response?.data || error.message);
    return { props: { drive: null } }; // Or return notFound: true
  }
}

// Updated PropTypes
DrivePage.propTypes = {
  drive: PropTypes.shape({
    drive_id: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired, // Added for consistency
    org_id: PropTypes.number,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    organization_name: PropTypes.string,
    org_city: PropTypes.string,
    org_state: PropTypes.string,
    // is_item_only: PropTypes.bool, // REMOVED
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
    donorsCount: PropTypes.number,
    children: PropTypes.arrayOf( // Array of children
      PropTypes.shape({
        child_id: PropTypes.number.isRequired,
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
      })
    ),
    items: PropTypes.arrayOf( // Array of drive-level items
      PropTypes.shape({
        drive_item_id: PropTypes.number.isRequired,
        item_id: PropTypes.number.isRequired, // Internal GiftDrive ID
        item_name: PropTypes.string.isRequired,
        item_photo: PropTypes.string,
        description: PropTypes.string,
        price: PropTypes.number,
        needed: PropTypes.number,
        purchased: PropTypes.number, // Added purchased
        remaining: PropTypes.number,
        is_rye_linked: PropTypes.bool,
      })
    ),
  }), // Allow drive to be null
};

export default DrivePage;