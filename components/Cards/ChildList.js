// components/Cards/ChildList.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ChildCard from './ChildCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ChildList = ({ driveId }) => {
  const [children, setChildren] = useState([]);
  const { openModal } = useModal();

  useEffect(() => {
    fetchChildren();
  }, [driveId]);

  const fetchChildren = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/drives/${driveId}`, {
        withCredentials: true,
      });
      setChildren(response.data.children);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const handleAddChild = () => {
    fetchChildren(); // Refresh the list after adding
  };

  const handleDeleteChild = async (childId) => {
    if (confirm('Are you sure you want to delete this child?')) {
      try {
        await axios.delete(`${apiUrl}/api/children/${childId}`, { withCredentials: true });
        fetchChildren(); // Refresh the list after deletion
      } catch (error) {
        console.error('Error deleting child:', error);
      }
    }
  };

  const triggerAddChildModal = () => {
    openModal(MODAL_TYPES.ADD_CHILD, {
      driveId,
      onAddChild: handleAddChild,
    });
  };

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
              onUpdateChild={handleAddChild} // Assuming onAddChild refreshes the list
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