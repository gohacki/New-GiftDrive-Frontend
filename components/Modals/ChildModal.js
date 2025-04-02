import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import axios from 'axios';
import { CartContext } from '../../contexts/CartContext';
import { toast } from 'react-toastify';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ChildModal({ isOpen, onClose, childId }) {
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { cart, addToCart, removeFromCart } = useContext(CartContext);
  const [quantities, setQuantities] = useState({});

  // Fetch child details and items when modal opens and childId is set
  useEffect(() => {
    if (!isOpen || !childId) return;
    const fetchChild = async () => {
      setLoading(true);
      setError(null);
      try {
        const childResponse = await axios.get(`${apiUrl}/api/children/${childId}`);
        const itemsResponse = await axios.get(`${apiUrl}/api/children/${childId}/items`);
        const fetchedChild = childResponse.data;
        const fetchedItems = itemsResponse.data || [];
        setChildData({
          ...fetchedChild,
          items: fetchedItems,
        });
        // Initialize each item's quantity to 1
        const initialQuantities = {};
        fetchedItems.forEach(item => {
          initialQuantities[item.item_id] = 1;
        });
        setQuantities(initialQuantities);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data.');
      } finally {
        setLoading(false);
      }
    };
    fetchChild();
  }, [isOpen, childId]);

  const handleClose = () => {
    setChildData(null);
    onClose();
  };

  // Cart helper functions
  const isItemAdded = (item) => {
    return cart?.items?.some(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.child_id === childData.child_id
    );
  };

  const getCartItemId = (item) => {
    const cartItem = cart?.items?.find(
      (ci) =>
        ci.item_id === item.item_id &&
        ci.config_id === (item.config_id || null) &&
        ci.child_id === childData.child_id
    );
    return cartItem ? cartItem.cart_item_id : null;
  };

  const handleAddToCart = (item, quantity) => {
    const itemId = item.item_id;
    const configId = item.config_id || null;
    const childIdLocal = childData.child_id;
    if (!itemId) {
      console.error('Missing item_id');
      toast.error('Invalid item. Please try again.');
      return;
    }
    addToCart(itemId, configId, childIdLocal, quantity);
  };

  const handleRemoveFromCart = (cartItemId) => {
    removeFromCart(cartItemId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 overflow-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : childData ? (
          <>
            {/* Child Basic Info */}
            <div className="flex items-center mb-4">
              {childData.photo && (
                <div className="mr-4">
                  <Image
                    src={childData.photo || '/img/default-child.png'}
                    alt={childData.child_name}
                    width={80}
                    height={80}
                    className="object-cover rounded-full"
                  />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-semibold text-ggreen">
                  {childData.child_name}
                </h2>
                {childData.age && <p>Age: {childData.age}</p>}
                {childData.gender && <p>Gender: {childData.gender}</p>}
              </div>
            </div>

            {/* Items Section with Add to Cart functionality */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-ggreen">
                Items Needed
              </h3>
              {childData.items.length > 0 ? (
                <ul className="space-y-3">
                  {childData.items.map((item) => {
                    const isAdded = isItemAdded(item);
                    const cartItemId = getCartItemId(item);
                    const maxQuantity = item.remaining;
                    return (
                      <li
                        key={item.child_item_id}
                        className="p-3 border border-gray-300 rounded-md"
                      >
                        <div className="flex items-center">
                          {item.item_photo && (
                            <Image
                              src={item.item_photo || '/img/default-item.png'}
                              alt={item.item_name}
                              width={50}
                              height={50}
                              className="object-cover rounded mr-3"
                            />
                          )}
                          <div className="flex-grow">
                            <p className="font-semibold">{item.item_name}</p>
                            <p className="text-sm text-gray-600">
                              ${Number(item.price).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Needed: {item.needed} | Purchased: {item.purchased} | Remaining: {item.remaining}
                            </p>
                          </div>
                        </div>
                        {/* Quantity Selector and Add/Remove Button */}
                        <div className="mt-2">
                          {item.needed > 1 && (
                            <div className="flex items-center mb-2">
                              <label
                                htmlFor={`quantity-${item.child_item_id}`}
                                className="mr-2 text-gray-700"
                              >
                                Quantity:
                              </label>
                              <input
                                type="number"
                                id={`quantity-${item.child_item_id}`}
                                min="1"
                                max={maxQuantity}
                                value={quantities[item.item_id] || 1}
                                onChange={(e) =>
                                  setQuantities({
                                    ...quantities,
                                    [item.item_id]: e.target.value,
                                  })
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-ggreen"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (isAdded) {
                                handleRemoveFromCart(cartItemId);
                              } else {
                                const qty = Number(quantities[item.item_id]) || 1;
                                handleAddToCart(item, qty);
                              }
                            }}
                            className={`w-full py-2 rounded-lg text-white transition-colors ${isAdded
                                ? 'bg-red-500 hover:bg-red-600'
                                : item.remaining <= 0
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-ggreen hover:bg-ggreen-dark'
                              }`}
                            disabled={item.remaining <= 0}
                          >
                            {isAdded
                              ? 'Remove'
                              : item.remaining <= 0
                                ? 'Out of Stock'
                                : 'Add to Cart'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-600">No items for this child.</p>
              )}
            </div>
          </>
        ) : (
          <p>No child data.</p>
        )}
      </div>
    </div>
  );
}

ChildModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  childId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
