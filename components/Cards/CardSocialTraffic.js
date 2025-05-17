// File: components/Cards/CardSocialTraffic.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react"; // ADD THIS LINE

// REMOVED: apiUrl prop

export default function CardSocialTraffic() { // Removed apiUrl prop
  const [socialTraffic, setSocialTraffic] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [error, setError] = useState(null); // Added error state

  // const { user } = useContext(AuthContext); // REMOVE THIS LINE
  const { data: session, status: authStatus } = useSession(); // USE useSession hook
  const user = session?.user; // User object from NextAuth session

  useEffect(() => {
    const fetchSocialTraffic = async () => {
      if (authStatus === "loading") {
        setIsLoading(true);
        return;
      }
      if (authStatus === "unauthenticated" || !user || !user.org_id) {
        setSocialTraffic([]);
        setIsLoading(false);
        if (user && !user.org_id) {
          console.warn("CardSocialTraffic: User is authenticated but has no org_id.");
          // setError("Organization ID not found for this user."); // Optional
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // UPDATED to relative path and removed apiUrl
        // Assuming your API route is /api/analytics/social-traffic
        // and it can infer org_id from session or use the passed param.
        const response = await axios.get(`/api/analytics/social-traffic`, { // Adjust API path if different
          params: {
            org_id: user.org_id, // Pass org_id if your backend API route needs it
          },
          withCredentials: true,
        });
        setSocialTraffic(response.data || []);
      } catch (err) {
        console.error("Error fetching social traffic:", err.response?.data || err.message);
        setError("Failed to load social traffic data.");
        setSocialTraffic([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSocialTraffic();
  }, [user, authStatus]); // Depend on user and authStatus

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-base text-slate-700">Social Traffic</h3>
            </div>
            {/* Optional: Add a refresh button or date range selector here */}
          </div>
        </div>
        <div className="block w-full overflow-x-auto">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Loading social traffic...</p>
          ) : error ? (
            <p className="text-center text-red-500 py-4">{error}</p>
          ) : (
            <table className="items-center w-full bg-transparent border-collapse">
              <thead>
                <tr>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Source
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Visitors
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left min-w-[120px]"> {/* Added min-w for progress bar */}
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {socialTraffic.length > 0 ? (
                  socialTraffic.map((source, index) => ( // Added index for key if platform isn't guaranteed unique
                    <tr key={source.platform || index}>
                      <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                        {source.platform || 'N/A'}
                      </th>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {source.visitors || 0}
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        <div className="flex items-center">
                          <span className="mr-2">{source.percentage || 0}%</span>
                          <div className="relative w-full">
                            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                              <div
                                style={{ width: `${source.percentage || 0}%` }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500" /* Consider a dynamic color based on source or a theme color */
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center text-gray-500"
                    >
                      No social traffic data available.
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

// REMOVED: CardSocialTraffic.propTypes related to apiUrl