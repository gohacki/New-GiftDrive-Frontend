// components/Modals/ChildModal.js
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ChildModal({ isOpen, onClose, childId }) {
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch child details whenever childId changes (and modal is open)
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
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data.');
      } finally {
        setLoading(false);
      }
    };
    fetchChild();
  }, [isOpen, childId]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Optional: reset childData if you want
    setChildData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-lg p-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
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

            {/* Items Section */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-ggreen">
                Items Needed
              </h3>
              {childData.items.length > 0 ? (
                <ul className="space-y-3">
                  {childData.items.map((item) => (
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
                        <div>
                          <p className="font-semibold">{item.item_name}</p>
                          <p className="text-sm text-gray-600">
                            ${Number(item.price).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Needed: {item.needed} | Purchased: {item.purchased} |{' '}
                            Remaining: {item.remaining}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
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
