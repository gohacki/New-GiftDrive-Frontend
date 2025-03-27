import axios from 'axios';
import React, { useContext, useState } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from 'components/UI/Breadcrumbs.js';
import Image from 'next/image';
import { CartContext } from 'contexts/CartContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const DrivePage = ({ drive }) => {
  const router = useRouter();
  const { cart, addToCart, removeFromCart } = useContext(CartContext);
  const [driveQuantities, setDriveQuantities] = useState({});

  // Early return if drive is null to avoid runtime errors
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

  // Use aggregated totals if available
  const totalNeeded =
    drive.totalNeeded || drive.items?.reduce((sum, item) => sum + (item.needed || 0), 0);
  const totalDonated =
    drive.totalPurchased ||
    drive.items?.reduce((sum, item) => sum + ((item.needed || 0) - (item.remaining || 0)), 0);
  const totalRemaining = totalNeeded - totalDonated;
  const progressPercentage = totalNeeded ? (totalDonated / totalNeeded) * 100 : 0;

  // Placeholder top donors
  const topDonors = [
    { name: 'Bethia Maglioni', items: 5 },
    { name: 'Margaret Whitman', items: 3 },
    { name: 'Maxwell Krupp', items: 3 },
  ];

  // Helper: Check if a drive item is already in the cart
  const isDriveItemAdded = (item) => {
    return cart?.items?.some(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.drive_id === drive.drive_id
    );
  };

  // Helper: Get the cart_item_id for a drive item
  const getDriveCartItemId = (item) => {
    const cartItem = cart?.items?.find(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.drive_id === drive.drive_id
    );
    return cartItem ? cartItem.cart_item_id : null;
  };

  // Handle quantity change for drive items
  const handleDriveQuantityChange = (itemId, value, max) => {
    const newQuantity = Math.max(1, Math.min(Number(value), max));
    setDriveQuantities((prev) => ({
      ...prev,
      [itemId]: newQuantity,
    }));
  };

  // Handle adding a drive item to the cart
  const handleAddToCartDrive = (item, quantity) => {
    const itemId = item.item_id;
    const configId = item.config_id || null;
    addToCart(itemId, configId, null, drive.drive_id, quantity);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            links={[
              { href: '/', label: 'Home' },
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/drive/${drive.id}`, label: drive.name },
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

          {/* Drive Title & Basic Info */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-ggreen mb-2">{drive.name}</h1>
            <div className="text-gray-600 flex flex-wrap gap-4 items-center">
              <p className="font-medium">{totalNeeded} Items Needed</p>
              {drive.location && <p className="font-medium">{drive.location}</p>}
            </div>
          </div>

          {/* Two-column layout: Left = progress/items, Right = org info */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column */}
            <div className="md:w-2/3 space-y-6">
              <div className="flex">
              {/* Drive Progress / Top Donors */}
              <div className="border-2 border-ggreen  shadow rounded-lg p-6 w-1/2 mr-4">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Drive Progress</h2>
                <div className="bg-gray-200 w-full h-4 rounded-full mb-2">
                <div
                  className="border-2 border-ggreen bg-ggreen h-4 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
                <p className="text-sm text-gray-700 mb-2">
                  Items Donated: <strong>{totalDonated}</strong>
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Items Still Needed: <strong>{totalRemaining}</strong>
                </p>
              </div>

              <div className="border-2 border-ggreen shadow rounded-lg p-6 w-1/2">
              <h3 className="text-lg font-semibold text-ggreen mb-2">Top Donors</h3>
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 list-none">
                  {topDonors.map((donor, idx) => (
                    <li key={idx}>
                      {idx + 1}. {donor.name} ({donor.items} items)
                    </li>
                  ))}
                </ul>
              </div>
              </div>

              {/* Items Section */}
              {drive.items && drive.items.length > 0 && (
                <section>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.items.map((item) => {
                      const added = isDriveItemAdded(item);
                      const cartItemId = getDriveCartItemId(item);
                      const isOutOfStock = item.remaining <= 0;
                      const maxQuantity = item.remaining;
                      return (
                        <div
                          key={item.drive_item_id}
                          className="border-2 border-ggreen  p-4 rounded-lg shadow-sm flex flex-col justify-between"
                        >
                          {/* Item image */}
                          {item.item_photo && (
                            <div className="flex justify-center mb-4">
                              <Image
                                src={item.item_photo || '/img/default-item.png'}
                                alt={item.item_name}
                                width={96}
                                height={96}
                                className="object-cover rounded-md"
                              />
                            </div>
                          )}
                          {/* Item name & details */}
                          <h3 className="text-lg text-ggreen font-medium mb-1">
                            {item.item_name}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                          <p className="text-gray-800 font-bold mb-2">
                            ${Number(item.price).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Needed:</strong> {item.needed} &nbsp;
                            <strong>Remaining:</strong> {item.remaining}
                          </p>

                          {/* Quantity + Buttons */}
                          <div className="mt-4">
                            {item.needed > 1 ? (
                              <>
                                <div className="flex items-center mb-2">
                                  <label
                                    htmlFor={`quantity-drive-${item.drive_item_id}`}
                                    className="mr-2 text-gray-700"
                                  >
                                    Quantity:
                                  </label>
                                  <input
                                    type="number"
                                    id={`quantity-drive-${item.drive_item_id}`}
                                    min="1"
                                    max={maxQuantity}
                                    value={driveQuantities[item.item_id] || 1}
                                    onChange={(e) =>
                                      handleDriveQuantityChange(
                                        item.item_id,
                                        e.target.value,
                                        maxQuantity
                                      )
                                    }
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-ggreen"
                                    disabled={isOutOfStock}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      added
                                        ? removeFromCart(cartItemId)
                                        : handleAddToCartDrive(
                                            item,
                                            driveQuantities[item.item_id] || 1
                                          )
                                    }
                                    className={`w-full py-2 rounded-lg text-white transition-colors ${
                                      added
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : isOutOfStock
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-ggreen hover:bg-ggreen-dark'
                                    }`}
                                    disabled={isOutOfStock}
                                  >
                                    {added
                                      ? 'Remove'
                                      : isOutOfStock
                                      ? 'Out of Stock'
                                      : 'Add to Cart'}
                                  </button>
                                  <button
                                    className={`w-full py-2 rounded-lg border transition-colors ${
                                      isOutOfStock
                                        ? 'border-gray-400 text-gray-400 cursor-not-allowed'
                                        : 'border-ggreen text-ggreen hover:bg-gray-100'
                                    }`}
                                    disabled={isOutOfStock}
                                  >
                                    Purchase in Person
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    added ? removeFromCart(cartItemId) : handleAddToCartDrive(item, 1)
                                  }
                                  className={`w-full py-2 rounded-lg text-white transition-colors ${
                                    added
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : isOutOfStock
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-ggreen hover:bg-ggreen-dark'
                                  }`}
                                  disabled={isOutOfStock}
                                >
                                  {added ? 'Remove' : isOutOfStock ? 'Out of Stock' : 'Add'}
                                </button>
                                <button
                                  className={`w-full py-2 rounded-lg border transition-colors ${
                                    isOutOfStock
                                      ? 'border-gray-400 text-gray-400 cursor-not-allowed'
                                      : 'border-ggreen text-ggreen hover:bg-gray-100'
                                  }`}
                                  disabled={isOutOfStock}
                                >
                                  Purchase in Person
                                </button>
                              </div>
                            )}
                          </div>
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
                    Children in {drive.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drive.children.map((child) => (
                      <Link
                        key={child.child_id}
                        href={`/visible/child/${child.child_id}`}
                        passHref
                        className="block border-2 border-ggreen shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {child.child_photo && (
                          <div className="flex justify-center mt-4">
                            <Image
                              src={child.child_photo || '/img/default-child.png'}
                              alt={child.child_name}
                              width={96}
                              height={96}
                              className="object-cover rounded-full"
                            />
                          </div>
                        )}
                        <div className="p-4 text-center">
                          <h3 className="text-lg font-semibold text-ggreen mb-2">
                            {child.child_name}
                          </h3>
                          {child.age && (
                            <p className="text-gray-600">
                              <strong>Age:</strong> {child.age}
                            </p>
                          )}
                          {child.gender && (
                            <p className="text-gray-600">
                              <strong>Gender:</strong> {child.gender}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {(!drive.children || drive.children.length === 0) &&
                (!drive.items || drive.items.length === 0) && (
                  <p className="text-ggreen text-lg">No children or items for this drive.</p>
                )}
            </div>

            {/* Right Column: Organization / Share Info */}
            <div className="md:w-1/3 space-y-6">
              <div className="border-2 border-ggreen  shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ggreen mb-4">Organization</h2>
                <p className="text-gray-700 mb-2">
                  <strong>Org Name:</strong> {drive.organization_name || 'Williston Federated Church'}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Drive Organizer:</strong> {drive.organizer_name || 'Logan Vaughan'}
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Donors:</strong> {drive.donorsCount || 8}
                </p>
                <button className="px-4 py-2 bg-ggreen text-white rounded-md hover:bg-ggreen-dark">
                  Share / Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

DrivePage.propTypes = {
  drive: PropTypes.shape({
    id: PropTypes.string.isRequired,
    drive_id: PropTypes.number,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    location: PropTypes.string,
    organization_name: PropTypes.string,
    organizer_name: PropTypes.string,
    donorsCount: PropTypes.number,
    totalNeeded: PropTypes.number,
    totalPurchased: PropTypes.number,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        child_id: PropTypes.string.isRequired,
        child_name: PropTypes.string.isRequired,
        child_photo: PropTypes.string,
        age: PropTypes.number,
        gender: PropTypes.string,
      })
    ),
    items: PropTypes.arrayOf(
      PropTypes.shape({
        drive_item_id: PropTypes.number.isRequired,
        item_id: PropTypes.number.isRequired,
        item_name: PropTypes.string.isRequired,
        item_photo: PropTypes.string,
        description: PropTypes.string,
        price: PropTypes.number,
        needed: PropTypes.number,
        remaining: PropTypes.number,
      })
    ),
  }),
};

export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const drive = driveResponse.data;

    const itemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
    drive.items = itemsResponse.data;

    // Fetch aggregated totals from your backend (make sure to implement this endpoint)
    const aggregateResponse = await axios.get(`${apiUrl}/api/drives/${id}/aggregate`);
    const aggregate = aggregateResponse.data;
    drive.totalNeeded = aggregate.totalNeeded;
    drive.totalPurchased = aggregate.totalPurchased;

    drive.id = drive.drive_id;

    return {
      props: { drive },
    };
  } catch (error) {
    console.error('Error fetching drive data:', error.message);
    return {
      props: { drive: null },
    };
  }
}

export default DrivePage;
