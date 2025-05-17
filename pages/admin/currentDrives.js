// File: pages/admin/currentDrives.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DriveCard from '../../components/Cards/DriveCard';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import { useSession } from 'next-auth/react'; // ADD THIS LINE
import { useRouter } from 'next/router';
import Admin from 'layouts/Admin.js';


const CurrentDrives = () => {
  const [drives, setDrives] = useState([]);
  const { openModal } = useModal();
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [isLoadingDrives, setIsLoadingDrives] = useState(true);
  const [pageError, setPageError] = useState(null); // For page-level errors

  const fetchDrives = async () => {
    if (!user || !user.org_id) {
      setIsLoadingDrives(false);
      if (user && !user.org_id) { // User authenticated but no org_id
        setPageError("Organization information is missing for your account.");
        console.warn("CurrentDrives: User authenticated but org_id is missing.");
      }
      setDrives([]); // Clear drives if no org_id
      return;
    }
    setIsLoadingDrives(true);
    setPageError(null); // Clear previous errors
    console.log("[CurrentDrives] Fetching current drives for org_id:", user.org_id);
    try {
      // UPDATED to relative path
      const response = await axios.get(`/api/drives/organization/${user.org_id}/current`, {
        withCredentials: true,
      });
      setDrives(response.data || []);
      console.log("[CurrentDrives] Drives state updated:", response.data);
    } catch (error) {
      console.error('Error fetching current drives:', error.response?.data || error.message);
      setPageError('Failed to load current drives.');
      setDrives([]);
    } finally {
      setIsLoadingDrives(false);
    }
  };

  useEffect(() => {
    if (authStatus === "loading") {
      setIsLoadingDrives(true); // Keep loading if auth is still determining
      return;
    }
    if (authStatus === "unauthenticated") {
      router.push('/auth/login');
      return;
    }
    // If authenticated
    if (user) {
      if (user.is_org_admin && user.org_id) {
        fetchDrives();
      } else if (!user.is_org_admin) {
        console.log("[CurrentDrives] User is not an org admin, redirecting.");
        setPageError("Access denied. You are not an organization administrator.");
        // Optionally redirect: router.push('/visible/profile');
        setIsLoadingDrives(false);
      } else if (!user.org_id) {
        // This case is now handled inside fetchDrives as well, but good to have a top-level check
        setPageError("Organization information is missing for your account.");
        setIsLoadingDrives(false);
        setDrives([]);
      }
    } else {
      // Should ideally not happen if authStatus is "authenticated"
      setIsLoadingDrives(false);
      setDrives([]);
      setPageError("User session not found despite authenticated status.");
    }
  }, [user, authStatus, router]); // router added for completeness if redirects are used

  const handleDriveAddedSuccessfully = () => {
    console.log("[CurrentDrives] Drive added callback, re-fetching drives...");
    fetchDrives();
  };

  const handleDeleteDrive = async (driveIdToDelete) => {
    if (!driveIdToDelete) return;
    if (confirm('Are you sure you want to delete this drive?')) {
      try {
        // UPDATED to relative path
        await axios.delete(`/api/drives/${driveIdToDelete}`, { withCredentials: true });
        fetchDrives(); // Re-fetch after delete
      } catch (error) {
        console.error('Error deleting drive:', error.response?.data || error.message);
        setPageError('Failed to delete drive.'); // Set page-level error
        // Consider toast notification for more specific error
      }
    }
  };

  const handleDriveUpdated = () => {
    console.log("[CurrentDrives] Drive updated callback, re-fetching drives...");
    fetchDrives();
  };

  const triggerAddDriveModal = () => {
    openModal(MODAL_TYPES.ADD_DRIVE, {
      onAddDrive: handleDriveAddedSuccessfully, // Callback to refresh list
    });
  };

  if (authStatus === "loading" || (isLoadingDrives && authStatus === "authenticated")) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 pt-32 text-center">
        <p className="text-xl text-gray-700">Loading current drives...</p>
      </div>
    );
  }

  // If pageError is set, display it (this handles auth errors or fetch errors)
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 pt-32 text-center">
        <p className="text-xl text-red-500">{pageError}</p>
        {authStatus === "authenticated" && !user?.is_org_admin && (
          <button onClick={() => router.push('/visible/profile')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to Profile
          </button>
        )}
      </div>
    );
  }

  // If user is authenticated but not an org admin (and no other error occurred)
  if (authStatus === "authenticated" && user && !user.is_org_admin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 pt-32 text-center">
        <p className="text-xl text-yellow-700">You need to be an organization administrator to manage drives.</p>
        <button onClick={() => router.push('/visible/profile')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go to Profile
        </button>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-32"> {/* Admin layout will add its own padding */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Current Drives</h2>
        <button
          onClick={triggerAddDriveModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Drive
        </button>
      </div>

      {drives.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {drives.map((drive) => (
            <DriveCard
              key={drive.drive_id}
              drive={drive}
              onDelete={() => handleDeleteDrive(drive.drive_id)} // Ensure drive_id is passed correctly
              onUpdateDrive={handleDriveUpdated}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-8">
          {user && user.is_org_admin ? "No current drives available." : "No drives to display."}
        </p>
      )}
    </div>
  );
};

CurrentDrives.layout = Admin; // This line assigns the Admin layout to the page

export default CurrentDrives;