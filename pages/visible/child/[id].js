import { useRouter } from 'next/router';
import axios from 'axios';
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { CartContext } from '../../../contexts/CartContext';
import Link from 'next/link';
import Footer from 'components/Footers/Footer';
import Navbar from 'components/Navbars/AuthNavbar';

const ChildDetailPage = ({ child }) => {
  const router = useRouter();
  const { cart, addToCart, removeFromCart } = useContext(CartContext);

  if (!child) {
    return <p className="text-center text-red-500 mt-10">Child not found.</p>;
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
    const cartItem = cart?.stores?.flatMap(store => store.cartLines)?.find(
      (ci) => ci.product?.id === item.rye_item_id
    );

    if (cartItem) {
      removeFromCart(cartItem.id);
    }
  };

  const isItemAdded = (item) => {
    return cart?.stores?.flatMap(store => store.cartLines)?.some(
      (ci) => ci.product?.id === item.rye_item_id
    );
  };

  return (
    <>
    <Navbar /> 
    <div className="min-h-screen bg-gray-500 p-6 pt-20">
      <button
        onClick={() => router.back()}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 mb-4"
      >
        Back
      </button>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row">
          <div className="flex-shrink-0">
            <img
              src={child.photo}
              alt={child.child_name}
              className="w-full h-40 md:h-60 object-cover rounded-lg"
            />
          </div>

          <div className="md:ml-6 mt-4 md:mt-0 flex flex-col justify-between">
            <h3 className="text-2xl font-semibold text-gray-800">{child.child_name}</h3>
            <p className="text-gray-600">{child.organization_name}</p>
            <p className="text-gray-500 mt-2">
              Associated with Drive:{' '}
              <Link href={`/drive/${child.drive_id}`} className="text-blue-500 hover:underline">
                {child.drive_name}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Items Needed</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {child.items.map((item) => {
            const isAdded = isItemAdded(item);

            return (
              <div
                key={item.child_item_id}
                className={`border p-4 rounded-lg shadow-sm ${
                  isAdded ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                <img
                  src={item.item_photo}
                  alt={item.item_name || 'Item Image'}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />

                <h4 className="text-lg font-medium text-gray-800">{item.item_name}</h4>
                <p className="text-gray-600 mb-2">${Number(item.price).toFixed(2)}</p>

                {item.users_with_item_in_cart > 0 && (
                  <div className="bg-yellow-100 text-yellow-800 text-sm rounded-lg p-2 mb-2">
                    {item.users_with_item_in_cart} other people have this item in their cart
                  </div>
                )}

                <button
                  onClick={() =>
                    isAdded ? handleRemoveFromCart(item) : handleAddToCart(item)
                  }
                  className={`w-full py-2 rounded-lg text-white ${
                    isAdded ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isAdded ? 'Remove' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
};

// Prop Validation
ChildDetailPage.propTypes = {
  child: PropTypes.shape({
    child_name: PropTypes.string.isRequired,
    organization_name: PropTypes.string.isRequired,
    drive_id: PropTypes.number.isRequired,
    drive_name: PropTypes.string.isRequired,
    photo: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        child_item_id: PropTypes.number.isRequired,
        item_name: PropTypes.string.isRequired,
        item_photo: PropTypes.string.isRequired,
        price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        users_with_item_in_cart: PropTypes.number.isRequired,
        rye_item_id: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export default ChildDetailPage;

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