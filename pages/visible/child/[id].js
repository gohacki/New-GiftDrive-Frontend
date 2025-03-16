// src/pages/visible/child/[id].js

import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { CartContext } from '../../../contexts/CartContext';
import Link from 'next/link';
import Footer from 'components/Footers/Footer';
import Navbar from 'components/Navbars/AuthNavbar';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from 'components/UI/Breadcrumbs'; // Ensure this component exists
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-toastify';

const ChildDetailPage = ({ child }) => {
  const router = useRouter();
  const { cart, addToCart, removeFromCart } = useContext(CartContext);
  const [quantities, setQuantities] = useState({});

  console.log('Rendered Child:', child);

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

  const handleAddToCart = (item, quantity) => {
    const itemId = item.item_id;
    const configId = item.config_id || null;
    const childId = child.child_id;

    if (!itemId) {
      console.error('Missing item_id');
      toast.error('Invalid item. Please try again.');
      return;
    }

    addToCart(itemId, configId, childId, quantity);
  };

  const handleRemoveFromCart = (cartItemId) => {
    removeFromCart(cartItemId);
  };

  const isItemAdded = (item) => {
    return cart?.items?.some(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.child_id === child.child_id
    );
  };

  const getCartItemId = (item) => {
    const cartItem = cart?.items?.find(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.child_id === child.child_id
    );
    return cartItem ? cartItem.cart_item_id : null;
  };

  const handleQuantityChange = (itemId, value, max) => {
    const newQuantity = Math.max(1, Math.min(Number(value), max));
    setQuantities((prev) => ({
      ...prev,
      [itemId]: newQuantity,
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
              { href: '/visible/orglist', label: 'Organizations' },
              { href: `/drive/${child.drive_id}`, label: child.drive_name },
              { href: `/drive/${child.drive_id}/child/${child.child_id}`, label: child.child_name },
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

          {/* Child Details */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              {/* Child Image */}
              {child.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-6">
                  <Image
                    src={child.photo}
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
                  Associated with Drive:{' '}
                  <Link href={`/drive/${child.drive_id}`} className="text-ggreen hover:underline">
                    {child.drive_name}
                  </Link>
                </p>
                {child.age && (
                  <p className="text-gray-600 mb-1">
                    <strong>Age:</strong> {child.age}
                  </p>
                )}
                {child.gender && (
                  <p className="text-gray-600 mb-1">
                    <strong>Gender:</strong> {child.gender}
                  </p>
                )}
                {child.description && (
                  <p className="text-gray-600">{child.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Needed */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl inter-semi-bold text-ggreen mb-6">
              Items Needed
            </h2>
            {child.items && child.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {child.items.map((item) => {
                  const isAdded = isItemAdded(item);
                  const cartItemId = getCartItemId(item);
                  const isOutOfStock = item.remaining <= 0;
                  const maxQuantity = item.remaining;
                  return (
                    <div
                      key={item.child_item_id}
                      className={`border p-4 rounded-lg shadow-sm ${
                        isAdded ? 'border-green-500' : 'border-gray-200'
                      } flex flex-col justify-between`}
                    >
                      {/* Item Image */}
                      {item.item_photo && (
                        <div className="flex justify-center">
                          <Image
                            src={item.item_photo}
                            alt={item.item_name || 'Item Image'}
                            width={128}
                            height={128}
                            className="object-cover rounded-lg mb-4"
                          />
                        </div>
                      )}
                      {/* Item Info */}
                      <div className="flex-grow">
                        <h3 className="text-lg inter-semi-bold text-ggreen mb-2">
                          {item.item_name}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          ${Number(item.price).toFixed(2)}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Needed: {item.needed} | Purchased: {item.purchased} | Remaining: {item.remaining}
                        </p>
                        {item.description && (
                          <p className="text-gray-600 mb-2">{item.description}</p>
                        )}
                      </div>
                      {/* Users with Item in Cart (optional) */}
                      {item.users_with_item_in_cart > 1 && (
                        <div className="bg-yellow-100 text-yellow-800 text-sm rounded-lg p-2 mb-2">
                          {item.users_with_item_in_cart} other {item.users_with_item_in_cart === 2 ? 'person' : 'people'} have this item in their cart
                        </div>
                      )}
                      {/* Quantity Selector and Add/Remove Button */}
                      <div className="mt-4">
                        {item.needed > 1 ? (
                          <>
                            <div className="flex items-center mb-2">
                              <label htmlFor={`quantity-${item.child_item_id}`} className="mr-2 text-gray-700">
                                Quantity:
                              </label>
                              <input
                                type="number"
                                id={`quantity-${item.child_item_id}`}
                                name={`quantity-${item.child_item_id}`}
                                min="1"
                                max={maxQuantity}
                                value={quantities[item.item_id] || 1}
                                onChange={(e) =>
                                  handleQuantityChange(item.item_id, e.target.value, maxQuantity)
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-ggreen"
                                disabled={isOutOfStock}
                              />
                            </div>
                            <button
                              onClick={() =>
                                isAdded
                                  ? handleRemoveFromCart(cartItemId)
                                  : handleAddToCart(item, quantities[item.item_id] || 1)
                              }
                              className={`w-full py-2 rounded-lg text-white transition-colors ${
                                isAdded
                                  ? 'bg-red-500 hover:bg-red-600'
                                  : isOutOfStock
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-ggreen hover:bg-ggreen-dark'
                              }`}
                              aria-label={
                                isAdded
                                  ? `Remove ${item.item_name} from cart`
                                  : isOutOfStock
                                  ? `${item.item_name} is fully purchased`
                                  : `Add ${item.item_name} to cart`
                              }
                              disabled={isOutOfStock}
                            >
                              {isAdded ? 'Remove' : isOutOfStock ? 'Out of Stock' : 'Add'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              isAdded ? handleRemoveFromCart(cartItemId) : handleAddToCart(item, 1)
                            }
                            className={`w-full py-2 rounded-lg text-white transition-colors ${
                              isAdded
                                ? 'bg-red-500 hover:bg-red-600'
                                : isOutOfStock
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-ggreen hover:bg-ggreen-dark'
                            }`}
                            aria-label={
                              isAdded
                                ? `Remove ${item.item_name} from cart`
                                : isOutOfStock
                                ? `${item.item_name} is fully purchased`
                                : `Add ${item.item_name} to cart`
                            }
                            disabled={isOutOfStock}
                          >
                            {isAdded ? 'Remove' : isOutOfStock ? 'Out of Stock' : 'Add'}
                          </button>
                        )}
                      </div>
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

ChildDetailPage.propTypes = {
  child: PropTypes.shape({
    child_id: PropTypes.number.isRequired,
    child_name: PropTypes.string.isRequired,
    drive_id: PropTypes.number.isRequired,
    drive_name: PropTypes.string.isRequired,
    photo: PropTypes.string,
    age: PropTypes.number,
    gender: PropTypes.string,
    description: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number.isRequired,
        item_id: PropTypes.number.isRequired,
        config_id: PropTypes.number,
        item_name: PropTypes.string.isRequired,
        item_photo: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        users_with_item_in_cart: PropTypes.number.isRequired,
        description: PropTypes.string,
        size: PropTypes.string,
        color: PropTypes.string,
        needed: PropTypes.number.isRequired,
        purchased: PropTypes.number.isRequired,
        remaining: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export async function getServerSideProps(context) {
  const { id } = context.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    // Fetch child details
    const childResponse = await axios.get(`${apiUrl}/api/children/${id}`, {
      withCredentials: true,
    });
    const childData = childResponse.data;

    if (!childData || !childData.child_id) {
      console.warn(`Child with ID ${id} not found.`);
      return {
        props: {
          child: null,
        },
      };
    }

    // Fetch items associated with the child
    const itemsResponse = await axios.get(`${apiUrl}/api/children/${childData.child_id}/items`, {
      withCredentials: true,
    });
    const itemsData = itemsResponse.data;

    const items = Array.isArray(itemsData)
      ? itemsData.map((item) => ({
          child_item_id: item.child_item_id,
          item_id: item.item_id,
          config_id: item.config_id || null,
          item_name: item.item_name,
          item_photo: item.item_photo || '/img/default-item.png',
          price: Number(item.price),
          users_with_item_in_cart: Number(item.users_with_item_in_cart) || 0,
          description: item.description || null,
          size: item.size || null,
          color: item.color || null,
          needed: Number(item.needed) || 0,
          purchased: Number(item.purchased) || 0,
          remaining: Number(item.remaining) || 0,
        }))
      : [];

    const child = {
      child_id: childData.child_id,
      child_name: childData.child_name,
      drive_id: childData.drive_id,
      drive_name: childData.drive_name,
      photo: childData.photo || '/img/default-child.png',
      age: childData.age || null,
      gender: childData.gender || null,
      description: childData.description || null,
      items: items,
    };

    return {
      props: {
        child,
      },
    };
  } catch (error) {
    console.error('Error fetching child or items data:', error.message);
    return {
      props: {
        child: null,
      },
    };
  }
}

export default ChildDetailPage;
