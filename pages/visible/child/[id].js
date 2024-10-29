// src/pages/drive/[id].js

import { useRouter } from 'next/router';
import axios from 'axios';
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { CartContext } from '../../../contexts/CartContext';
import Link from 'next/link';
import Footer from 'components/Footers/Footer';
import Navbar from 'components/Navbars/AuthNavbar';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from 'components/UI/Breadcrumbs'; // Ensure this component exists
import Image from 'next/image';

const ChildDetailPage = ({ child }) => {
  const router = useRouter();
  const { cart, addToCart, removeFromCart } = useContext(CartContext);

  if (!child) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">Child not found.</p>
        </div>
        <Footer />
      </>
    );
  }

  const handleAddToCart = (item) => {
    const ryeItemId = item.rye_item_id;
    const quantity = 1;

    if (!ryeItemId) {
      console.error('Missing rye_item_id');
      return;
    }

    addToCart(ryeItemId, quantity);
  };

  const handleRemoveFromCart = (item) => {
    const cartItem = cart?.stores?.flatMap((store) => store.cartLines)?.find(
      (ci) => ci.product?.id === item.rye_item_id
    );

    if (cartItem) {
      removeFromCart(cartItem.id);
    }
  };

  const isItemAdded = (item) => {
    return cart?.stores?.flatMap((store) => store.cartLines)?.some(
      (ci) => ci.product?.id === item.rye_item_id
    );
  };

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
              { href: `/drive/${child.drive_id}`, label: child.drive_name },
              { href: `/drive/${child.drive_id}/child/${child.child_id}`, label: child.child_name },
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

          {/* Child Details */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              {/* Child Image */}
              {child.photo && (
                <div className="md:w-1/3 flex justify-center items-center p-6">
                  <Image
                    src={child.photo || '/img/default-child.png'}
                    alt={child.child_name}
                    width={192} // 48 * 4 (Tailwind's default spacing scale)
                    height={192}
                    className="object-cover rounded-full"
                  />
                </div>
              )}
              {/* Child Info */}
              <div className="md:w-2/3 p-6 flex flex-col justify-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{child.child_name}</h1>
                <p className="text-gray-600 mb-2">{child.organization_name}</p>
                <p className="text-gray-500 mb-2">
                  Associated with Drive:{' '}
                  <Link href={`/drive/${child.drive_id}`} className="text-blue-500 hover:underline">
                    {child.drive_name}
                  </Link>
                </p>
                {/* Optional: Add more child details here */}
                {child.age && <p className="text-gray-600 mb-1"><strong>Age:</strong> {child.age}</p>}
                {child.gender && <p className="text-gray-600 mb-1"><strong>Gender:</strong> {child.gender}</p>}
                {child.description && <p className="text-gray-600">{child.description}</p>}
              </div>
            </div>
          </div>

          {/* Items Needed */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Items Needed</h2>

            {child.items && child.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {child.items.map((item) => {
                  const isAdded = isItemAdded(item);

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
                            src={item.item_photo || '/img/default-item.png'}
                            alt={item.item_name || 'Item Image'}
                            width={128} // 32 * 4
                            height={128}
                            className="object-cover rounded-lg mb-4"
                          />
                        </div>
                      )}
                      {/* Item Info */}
                      <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.item_name}</h3>
                        <p className="text-gray-600 mb-2">${Number(item.price).toFixed(2)}</p>
                        {/* Optional: Add more item details here */}
                        {item.description && <p className="text-gray-600 mb-2">{item.description}</p>}
                      </div>
                      {/* Users with Item in Cart */}
                      {item.users_with_item_in_cart > 0 && (
                        <div className="bg-yellow-100 text-yellow-800 text-sm rounded-lg p-2 mb-2">
                          {item.users_with_item_in_cart} other {item.users_with_item_in_cart === 1 ? 'person' : 'people'} have this item in their cart
                        </div>
                      )}
                      {/* Add/Remove Button */}
                      <button
                        onClick={() =>
                          isAdded ? handleRemoveFromCart(item) : handleAddToCart(item)
                        }
                        className={`w-full py-2 rounded-lg text-white ${
                          isAdded ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                        } transition-colors`}
                        aria-label={isAdded ? `Remove ${item.item_name} from cart` : `Add ${item.item_name} to cart`}
                      >
                        {isAdded ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No items are currently needed for this child.</p>
            )}
          </div>
        </div>
      </div>
        <Footer />
      </>
    );
  };

  // PropTypes validation for the ChildDetailPage component
  ChildDetailPage.propTypes = {
    child: PropTypes.shape({
      child_id: PropTypes.number.isRequired,
      child_name: PropTypes.string.isRequired,
      organization_name: PropTypes.string.isRequired,
      drive_id: PropTypes.number.isRequired,
      drive_name: PropTypes.string.isRequired,
      photo: PropTypes.string.isRequired,
      age: PropTypes.number, // Optional
      gender: PropTypes.string, // Optional
      description: PropTypes.string, // Optional
      items: PropTypes.arrayOf(
        PropTypes.shape({
          child_item_id: PropTypes.number.isRequired,
          item_name: PropTypes.string.isRequired,
          item_photo: PropTypes.string.isRequired,
          price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          users_with_item_in_cart: PropTypes.number.isRequired,
          rye_item_id: PropTypes.number.isRequired,
          description: PropTypes.string, // Optional
        })
      ).isRequired,
    }).isRequired,
  };

  export default ChildDetailPage;

  // Fetch child data on the server side
  export async function getServerSideProps(context) {
    const { id } = context.params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      const response = await axios.get(`${apiUrl}/api/children/${id}`);
      const child = response.data;

      return {
        props: {
          child,
        },
      };
    } catch (error) {
      console.error('Error fetching child data:', error);

      return {
        props: {
          child: null,
        },
      };
    }
  }