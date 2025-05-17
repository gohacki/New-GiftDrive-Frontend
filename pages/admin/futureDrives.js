// File: pages/admin/futureDrives.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DriveCard from '../../components/Cards/DriveCard'; // Make sure this path is correct
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Admin from 'layouts/Admin.js';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const FutureDrives = () => {
  const [drives, setDrives] = useState([]);
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [isLoadingDrives, setIsLoadingDrives] = useState(true);
  const [pageError, setPageError] = useState(null);

  const fetchFutureDrives = async () => {
    if (!user || !user.org_id) {
      setIsLoadingDrives(false);
      if (user && !user.org_id) {
        setPageError("Organization information is missing for your account.");
        console.warn("FutureDrives: User authenticated but org_id is missing.");
      }
      setDrives([]);
      return;
    }
    setIsLoadingDrives(true);
    setPageError(null);
    try {
      // UPDATED to relative path
      const response = await axios.get(
        `/api/drives/organization/${user.org_id}/future`,
        { withCredentials: true }
      );
      setDrives(response.data || []);
    } catch (error) {
      console.error('Error fetching future drives:', error.response?.data || error.message);
      setPageError('Failed to load future drives.');
      setDrives([]);
    } finally {
      setIsLoadingDrives(false);
    }
  };

  useEffect(() => {
    if (authStatus === "loading") {
      setIsLoadingDrives(true);
      return;
    }
    if (authStatus === "unauthenticated") {
      router.push('/auth/login');
      return;
    }
    if (user) {
      if (user.is_org_admin && user.org_id) {
        fetchFutureDrives();
      } else if (!user.is_org_admin) {
        setPageError("Access denied. You are not an organization administrator.");
        setIsLoadingDrives(false);
        // Optionally redirect: router.push('/visible/profile');
      } else if (!user.org_id) {
        setPageError("Organization information is missing for your account.");
        setIsLoadingDrives(false);
        setDrives([]);
      }
    } else {
      setIsLoadingDrives(false);
      setDrives([]);
      setPageError("User session not found despite authenticated status.");
    }
  }, [user, authStatus, router]);

  const handleDeleteDrive = async (driveIdToDelete) => {
    if (!driveIdToDelete) return;
    if (confirm('Are you sure you want to delete this future drive?')) {
      try {
        // UPDATED to relative path
        await axios.delete(`/api/drives/${driveIdToDelete}`, { withCredentials: true });
        fetchFutureDrives(); // Re-fetch to get the updated list
      } catch (error) {
        console.error('Error deleting drive:', error.response?.data || error.message);
        setPageError('Failed to delete drive.');
      }
    }
  };

  const handleUpdateDrive = () => { // This is a callback from EditDriveModal
    fetchFutureDrives(); // Re-fetch the list for consistency after an update
  };

  if (authStatus === "loading" || (isLoadingDrives && authStatus === "authenticated")) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 pt-32 text-center">
        <p className="text-xl text-gray-700">Loading future drives...</p>
      </div>
    );
  }

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

  if (authStatus === "authenticated" && user && !user.is_org_admin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 pt-32 text-center">
        <p className="text-xl text-yellow-700">You need to be an organization administrator to view drives.</p>
        <button onClick={() => router.push('/visible/profile')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-32"> {/* Admin layout provides some padding */}
      <h2 className="text-2xl font-semibold mb-4">Future Drives</h2>
      {drives.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {drives.map((drive) => (
            <DriveCard
              key={drive.drive_id}
              drive={drive}
              onDelete={() => handleDeleteDrive(drive.drive_id)}
              onUpdateDrive={handleUpdateDrive} // This is passed to DriveCard, which then passes to EditDriveModal
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-10">
          {user && user.is_org_admin ? "No future drives scheduled." : "No drives to display."}
        </p>
      )}
    </div>
  );
};

FutureDrives.layout = Admin;

export default FutureDrives;