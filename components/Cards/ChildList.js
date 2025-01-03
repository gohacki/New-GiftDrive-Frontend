// components/Cards/ChildList.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ChildCard from './ChildCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Validate apiUrl
if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const ChildList = ({ driveId }) => {
  const [children, setChildren] = useState([]);
  const { openModal } = useModal();
  const [loading, setLoading] = useState(true); // Optional: To handle loading state
  const [error, setError] = useState(null); // Optional: To handle errors

  useEffect(() => {
    fetchChildrenWithItems();
  }, [driveId]);

  /**
   * Fetches all children for the given driveId and their associated items.
   */
  const fetchChildrenWithItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch all children for the given driveId
      const response = await axios.get(`${apiUrl}/api/drives/${driveId}`, {
        withCredentials: true,
      });

      const childrenData = response.data.children;

      if (!Array.isArray(childrenData)) {
        throw new Error('Invalid children data format received from server.');
      }

      // Step 2: For each child, fetch their associated items
      const childrenWithItems = await Promise.all(
        childrenData.map(async (child) => {
          try {
            const itemsResponse = await axios.get(
              `${apiUrl}/api/children/${child.child_id}/items`,
              { withCredentials: true }
            );

            const itemsData = itemsResponse.data;

            // Ensure itemsData is an array
            if (!Array.isArray(itemsData)) {
              console.warn(
                `Invalid items data format for child_id ${child.child_id}. Expected an array.`
              );
              return { ...child, items: [] };
            }

            // Merge items into the child object
            return { ...child, items: itemsData };
          } catch (itemsError) {
            console.error(
              `Error fetching items for child_id ${child.child_id}:`,
              itemsError
            );
            // Optionally, you can set items to an empty array or keep previous items
            return { ...child, items: [] };
          }
        })
      );

      setChildren(childrenWithItems);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('Failed to load children. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the update of a child (e.g., after editing items).
   * @param {Object} updatedChild - The updated child object returned from the server.
   */
  const handleUpdateChild = (updatedChild) => {
    setChildren((prevChildren) =>
      prevChildren.map((child) =>
        child.child_id === updatedChild.child_id ? updatedChild : child
      )
    );
  };

  /**
   * Handles the deletion of a child.
   * @param {number} childId - The ID of the child to delete.
   */
  const handleDeleteChild = async (childId) => {
    if (confirm('Are you sure you want to delete this child?')) {
      try {
        await axios.delete(`${apiUrl}/api/children/${childId}`, {
          withCredentials: true,
        });
        // Remove the deleted child from the state
        setChildren((prevChildren) =>
          prevChildren.filter((child) => child.child_id !== childId)
        );
      } catch (error) {
        console.error(`Error deleting child_id ${childId}:`, error);
        alert('Failed to delete child. Please try again.');
      }
    }
  };

  /**
   * Triggers the modal to add a new child.
   */
  const triggerAddChildModal = () => {
    openModal(MODAL_TYPES.ADD_CHILD, {
      driveId,
      onAddChild: fetchChildrenWithItems, // Refresh the list after adding
    });
  };

  /**
   * Optional: Loading and Error Handling UI
   */
  if (loading) {
    return <p>Loading children...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold">Children in this Drive</h4>
        <button
          onClick={triggerAddChildModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Child
        </button>
      </div>

      {children.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {children.map((child) => (
            <ChildCard
              key={child.child_id}
              child={child}
              onDelete={handleDeleteChild}
              onUpdateChild={handleUpdateChild} // Pass the handler to update specific child
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No children added to this drive yet.</p>
      )}
    </div>
  );
};

ChildList.propTypes = {
  driveId: PropTypes.number.isRequired,
};

export default ChildList;
