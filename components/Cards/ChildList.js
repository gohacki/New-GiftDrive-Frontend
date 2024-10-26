import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import ChildCard from './ChildCard';
import AddChildModal from '../Modals/AddChildModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ChildList = ({ driveId }) => {
  const [children, setChildren] = useState([]);
  const [showAddChildModal, setShowAddChildModal] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, [driveId]);

  const fetchChildren = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/drives/${driveId}`);
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

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold">Children in this Drive</h4>
        <button
          onClick={() => setShowAddChildModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Child
        </button>
      </div>

      {showAddChildModal && (
        <AddChildModal
          driveId={driveId}
          onClose={() => setShowAddChildModal(false)}
          onAddChild={handleAddChild}
        />
      )}

      {children.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((child) => (
            <ChildCard key={child.child_id} child={child} onDelete={handleDeleteChild} />
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