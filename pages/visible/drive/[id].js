// src/pages/drive/[id].js

import axios from 'axios';
import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from 'components/UI/Breadcrumbs.js'; // optional breadcrumb component
import Image from 'next/image';
import { useContext, useState } from 'react';
import { CartContext } from 'contexts/CartContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;


const DrivePage = ({ drive }) => {
  const router = useRouter();

  // Inside the component function, after you have the drive prop:
const { cart, addToCart, removeFromCart } = useContext(CartContext);
const [driveQuantities, setDriveQuantities] = useState({});

// Helper: Check if a drive item is already added to the cart
const isDriveItemAdded = (item) => {
  return cart?.items?.some(
    (ci) =>
      ci.item_id === item.item_id &&
      ci.config_id === (item.config_id || null) &&
      // We assume drive items are stored with drive_id instead of child_id:
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

// Handle adding a drive item to the cart.
// Note: We pass drive.drive_id (or another identifier) so the CartContext
// knows this is a drive item rather than a child item.
const handleAddToCartDrive = (item, quantity) => {
  const itemId = item.item_id;
  const configId = item.config_id || null;
  // Pass null for child_id and drive.drive_id as drive_id
  addToCart(itemId, configId, null, drive.drive_id, quantity);
};


  if (!drive) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">Drive not found.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-500 py-16">
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
            className="flex items-center mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          {/* Drive Header */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-10">
            <div className="flex flex-col md:flex-row">
              {/* Drive Image */}
              {drive.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-4">
                  <Image
                    src={drive.photo || '/img/default-drive.png'}
                    alt={drive.name}
                    width={192} // 48 * 4 (Tailwind's default spacing scale)
                    height={192}
                    className="object-cover rounded-md"
                  />
                </div>
              )}
              {/* Drive Info */}
              <div className="md:w-2/3 p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  {drive.name}
                </h1>
                <p className="text-gray-600 mb-4">{drive.description}</p>
                {/* Optional: Add more drive details here */}
                {drive.location && (
                  <p className="text-gray-600">
                    <strong>Location:</strong> {drive.location}
                  </p>
                )}
                {drive.date && (
                  <p className="text-gray-600">
                    <strong>Date:</strong>{' '}
                    {new Date(drive.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* =====================
              CONDITIONAL RENDER
              ===================== */}
              {/* Render Children Section if available */}
{drive.children && drive.children.length > 0 && (
  <section className="mb-10">
    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
      Children in {drive.name}
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {drive.children.map((child) => (
        <Link
          key={child.child_id}
          href={`/visible/child/${child.child_id}`}
          passHref
          className="block bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Child Image */}
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
          {/* Child Info */}
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
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

{drive.items && drive.items.length > 0 && (
  <section className="mb-10">
    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
      Items in {drive.name}
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {drive.items.map((item) => {
        const added = isDriveItemAdded(item);
        const cartItemId = getDriveCartItemId(item);
        // Determine out-of-stock status based on remaining quantity
        const isOutOfStock = item.remaining <= 0;
        const maxQuantity = item.remaining; // You might adjust this logic as needed

        return (
          <div
            key={item.drive_item_id}
            className={`border p-4 rounded-lg shadow-sm ${
              added ? 'border-green-500' : 'border-gray-200'
            } flex flex-col justify-between`}
          >
            {/* Item Image */}
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
            {/* Item Info */}
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {item.item_name}
            </h3>
            <p className="text-gray-600 mb-2">{item.description}</p>
            <p className="text-gray-800 font-bold mb-2">
              ${Number(item.price).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Needed:</strong> {item.needed} &nbsp;
              <strong>Remaining:</strong> {item.remaining}
            </p>
            {/* Quantity Selector and Add/Remove Button */}
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
                      className="w-16 px-2 py-1 border rounded text-center"
                      disabled={isOutOfStock}
                    />
                  </div>
                  <button
                    onClick={() =>
                      added
                        ? removeFromCart(cartItemId)
                        : handleAddToCartDrive(item, driveQuantities[item.item_id] || 1)
                    }
                    className={`w-full py-2 rounded-lg text-white transition-colors ${
                      added
                        ? 'bg-red-500 hover:bg-red-600'
                        : isOutOfStock
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                    disabled={isOutOfStock}
                  >
                    {added ? 'Remove' : isOutOfStock ? 'Out of Stock' : 'Add'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    added ? removeFromCart(cartItemId) : handleAddToCartDrive(item, 1)
                  }
                  className={`w-full py-2 rounded-lg text-white transition-colors ${
                    added
                      ? 'bg-red-500 hover:bg-red-600'
                      : isOutOfStock
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                  disabled={isOutOfStock}
                >
                  {added ? 'Remove' : isOutOfStock ? 'Out of Stock' : 'Add'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

{/* Fallback if neither children nor items exist */}
{(!drive.children || drive.children.length === 0) &&
  (!drive.items || drive.items.length === 0) && (
    <p className="text-white text-lg">No children or items for this drive.</p>
  )}

        </div>
      </div>
      <Footer />
    </>
  );
};

// PropTypes validation for the DrivePage component
DrivePage.propTypes = {
  drive: PropTypes.shape({
    id: PropTypes.string.isRequired, // or number, depending on your DB
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    photo: PropTypes.string,
    location: PropTypes.string, // optional
    date: PropTypes.string, // optional
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
    // Fetch drive details
    const driveResponse = await axios.get(`${apiUrl}/api/drives/${id}`);
    const drive = driveResponse.data;

    // Fetch drive items separately
    const itemsResponse = await axios.get(`${apiUrl}/api/drives/${id}/items`);
    drive.items = itemsResponse.data;

    // (Optional) Normalize the drive object if needed (e.g., set drive.id for consistency)
    drive.id = drive.drive_id;

    return {
      props: {
        drive,
      },
    };
  } catch (error) {
    console.error('Error fetching drive data:', error.message);
    return {
      props: {
        drive: null,
      },
    };
  }
}


export default DrivePage;
