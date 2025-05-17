// File: components/Cards/CardPageVisits.js
import React, { useEffect, useState } from "react";
import axios from "axios";
// import { AuthContext } from "../../contexts/AuthContext"; // REMOVE THIS LINE
import { useSession } from "next-auth/react"; // ADD THIS LINE

// REMOVED: apiUrl prop, as it will use relative paths

export default function CardPageVisits() { // Removed apiUrl prop
  const [pageVisits, setPageVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [error, setError] = useState(null); // Added error state

  // const { user } = useContext(AuthContext); // REMOVE THIS LINE
  const { data: session, status: authStatus } = useSession(); // USE useSession hook
  const user = session?.user; // User object from NextAuth session

  useEffect(() => {
    const fetchPageVisits = async () => {
      if (authStatus === "loading") {
        setIsLoading(true); // Keep loading if auth is still determining
        return;
      }
      if (authStatus === "unauthenticated" || !user || !user.org_id) {
        // If not authenticated, or no user/org_id, don't attempt to fetch.
        // Optionally set an error or just show no data.
        setPageVisits([]);
        setIsLoading(false);
        if (user && !user.org_id) {
          console.warn("CardPageVisits: User is authenticated but has no org_id.");
          // setError("Organization ID not found for this user."); // Optional: set error
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // UPDATED to relative path and removed apiUrl
        // Assuming your API route is /api/analytics/page-visits
        // and it can infer the org_id from the authenticated user session on the backend.
        // If you still need to pass org_id explicitly from frontend:
        const response = await axios.get(`/api/analytics/page-visits`, { // Adjust API path if different
          params: {
            org_id: user.org_id, // Pass org_id if your backend API route needs it
          },
          withCredentials: true,
        });
        setPageVisits(response.data || []);
      } catch (err) {
        console.error("Error fetching page visits:", err.response?.data || err.message);
        setError("Failed to load page visit data.");
        setPageVisits([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageVisits();
  }, [user, authStatus]); // Depend on user and authStatus

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-base text-blueGray-700">Page Visits</h3>
            </div>
            {/* Optional: Add a refresh button or date range selector here */}
          </div>
        </div>
        <div className="block w-full overflow-x-auto">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Loading page visits...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-4">{error}</p>
          ) : (
            <table className="items-center w-full bg-transparent border-collapse">
              <thead>
                <tr>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Page Name
                  </th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Visitors
                  </th>
                  <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Unique Users
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageVisits.length > 0 ? (
                  pageVisits.map((visit, index) => ( // Added index for key if pageName isn't guaranteed unique
                    <tr key={visit.pageName || index}>
                      <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                        {visit.pageName || 'N/A'}
                      </th>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {visit.visitors || 0}
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {visit.uniqueUsers || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center text-gray-500"
                    >
                      No page visit data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// REMOVED: CardPageVisits.propTypes related to apiUrl
// If this component is always used within an authenticated context where user.org_id is expected,
// no new props are strictly needed. If it could be used more generically, you might pass org_id as a prop.