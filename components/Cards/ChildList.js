// File: components/Cards/ChildList.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ChildCard from './ChildCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import axios from 'axios';

const ChildList = ({ driveId }) => {
  const [children, setChildren] = useState([]);
  const { openModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Renamed for clarity and to avoid potential conflicts if driveId prop changes
  const fetchChildrenForDrive = async (currentDriveId) => {
    if (!currentDriveId) {
      setLoading(false);
      setError("Drive ID is missing, cannot fetch children.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch drive details which include its children (basic info)
      // UPDATED to relative path
      const driveResponse = await axios.get(`/api/drives/${currentDriveId}`, {
        withCredentials: true,
      });

      // Assuming the drive object has a 'children' array with basic child info (id, name, photo)
      const childrenDataFromDrive = driveResponse.data.children;

      if (!Array.isArray(childrenDataFromDrive)) {
        console.warn(`No children array or invalid format in drive data for drive ID ${currentDriveId}.`);
        setChildren([]);
        setLoading(false);
        return;
      }

      // Step 2: For each child, fetch their associated items (detailed info)
      // This step might be redundant if EditChildModal (triggered by ChildCard) fetches items on demand.
      // However, keeping it for now if ChildList needs to display item counts or similar.
      // If not, this can be simplified.
      const childrenWithItemsPromises = childrenDataFromDrive.map(async (child) => {
        try {
          // UPDATED to relative path
          const itemsResponse = await axios.get(
            `/api/children/${child.child_id}/items`,
            { withCredentials: true }
          );
          const itemsData = itemsResponse.data;
          if (!Array.isArray(itemsData)) {
            console.warn(
              `Invalid items data format for child_id ${child.child_id}. Expected an array.`
            );
            return { ...child, items: [] }; // Ensure items is always an array
          }
          return { ...child, items: itemsData };
        } catch (itemsError) {
          console.error(
            `Error fetching items for child_id ${child.child_id}:`,
            itemsError
          );
          return { ...child, items: [] }; // Default to empty items on error
        }
      });

      const resolvedChildrenWithItems = await Promise.all(childrenWithItemsPromises);
      setChildren(resolvedChildrenWithItems);

    } catch (err) {
      console.error(`Error fetching children for drive ${currentDriveId}:`, err);
      setError('Failed to load children. Please try again later.');
      setChildren([]); // Clear children on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driveId) { // Ensure driveId is present
      fetchChildrenForDrive(driveId);
    }
  }, [driveId]); // Re-fetch if driveId changes

  const handleUpdateChild = (updatedChild) => {
    setChildren((prevChildren) =>
      prevChildren.map((child) =>
        child.child_id === updatedChild.child_id ? updatedChild : child
      )
    );
    // Optionally, refetch all children if updates can have broader implications
    // fetchChildrenForDrive(driveId);
  };

  const handleDeleteChild = async (childIdToDelete) => {
    if (confirm('Are you sure you want to delete this child?')) {
      try {
        // UPDATED to relative path
        // The API route should handle cascading deletes or deactivations (e.g., child_items, cart_contents)
        await axios.delete(`/api/children/${childIdToDelete}`, {
          withCredentials: true,
        });
        // Refetch children list to reflect deletion
        fetchChildrenForDrive(driveId);
        // Or, filter locally for faster UI update, but refetch is safer for consistency:
        // setChildren((prevChildren) =>
        //   prevChildren.filter((child) => child.child_id !== childIdToDelete)
        // );
      } catch (err) {
        console.error(`Error deleting child_id ${childIdToDelete}:`, err);
        alert('Failed to delete child. Please try again.'); // Or use toast
      }
    }
  };

  const triggerAddChildModal = (e) => {
    if (e) e.stopPropagation();
    openModal(MODAL_TYPES.ADD_CHILD, {
      driveId, // Pass driveId to the modal
      onAddChild: () => fetchChildrenForDrive(driveId), // Refresh the list after adding
    });
  };

  if (loading) {
    return <p className="text-center py-4">Loading children...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-4">{error}</p>;
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
              child={child} // ChildCard expects a child object
              onDelete={handleDeleteChild}
              onUpdateChild={handleUpdateChild}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 py-4 text-center">No children added to this drive yet.</p>
      )}
    </div>
  );
};

ChildList.propTypes = {
  driveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // driveId can be string from URL or number
};

export default ChildList;