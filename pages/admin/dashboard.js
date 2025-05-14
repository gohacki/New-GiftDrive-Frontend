// pages/admin/dashboard.js
import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Import Chart Components
import CardLineChart from "components/Cards/CardLineChart";
import CardBarChart from "components/Cards/CardBarChart";
import CardPieChart from "components/Cards/CardPieChart";
import CardStats from "components/Cards/CardStats.js"; // Re-using CardStats

// Layout
import Admin from "layouts/Admin.js";

// Contexts
import { AuthContext } from "../../contexts/AuthContext";
import { StatisticsContext } from "../../contexts/StatisticsContext";

export default function Dashboard() {
  const [localStatistics, setLocalStatistics] = useState(null);
  const { user, loading } = useContext(AuthContext);
  const { setStatistics: setGlobalStatistics } = useContext(StatisticsContext);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1) // Default to start of current year
  );
  const [endDate, setEndDate] = useState(new Date()); // Default to today
  const [hasDrives, setHasDrives] = useState(true); // Assume true initially, will be checked

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user && user.org_id && !loading) {
        try {
          // Check if any drives exist for the organization
          const drivesCheckResponse = await axios.get(
            `${apiUrl}/api/drives/organization/${user.org_id}/check`, // Lightweight endpoint
            { withCredentials: true }
          );

          if (drivesCheckResponse.data && drivesCheckResponse.data.hasDrives) {
            setHasDrives(true);
            // Proceed to fetch statistics
            const statsResponse = await axios.get(
              `${apiUrl}/api/drives/organization/${user.org_id}/statistics`,
              {
                params: {
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                },
                withCredentials: true,
              }
            );
            setLocalStatistics(statsResponse.data);
            setGlobalStatistics(statsResponse.data); // For HeaderStats
          } else {
            setHasDrives(false);
            setLocalStatistics(null); // No stats if no drives
            setGlobalStatistics(null);
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          // Consider if an error means no drives or just stats fetch failed
          // For now, assume no drives on error for safety to show the 'create drive' message
          setHasDrives(false);
          setLocalStatistics(null);
          setGlobalStatistics(null);
        }
      }
    };

    fetchDashboardData();
  }, [user, loading, apiUrl, setGlobalStatistics, startDate, endDate]); // Dependencies

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-blueGray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!user || !user.org_id) {
    // This case should ideally be handled by auth redirection at a higher level
    return (
      <div className="pt-32 p-6 text-center">
        <p className="text-xl text-blueGray-600">User information not available. Please log in.</p>
      </div>
    )
  }

  if (!hasDrives) {
    return (
      <div className="pt-10 p-6 text-center"> {/* Adjusted padding top from original -m-24 of Admin layout */}
        <div className="bg-white p-8 rounded-lg shadow-lg inline-block">
          <h2 className="text-2xl font-semibold text-blueGray-700 mb-4">Welcome to Your Dashboard!</h2>
          <p className="text-blueGray-600 mb-6">
            You haven&apos;t set up any drives yet. Drives are how you collect items for those in need.
          </p>
          <Link href="/admin/currentDrives"
            className="bg-ggreen text-white active:bg-teal-700 font-bold uppercase text-sm px-6 py-3 rounded-full shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150">
            Create Your First Drive
          </Link>
        </div>
      </div>
    );
  }

  if (!localStatistics) {
    // This state means drives exist, but stats are still loading or failed to load
    return (
      <div className="pt-10 p-6 text-center">
        <p className="text-xl text-blueGray-600">Loading statistics for your drives...</p>
        <p className="text-sm text-blueGray-500 mt-2">If this persists, ensure your drives have associated children and items, and that purchases have been made for the selected date range.</p>
      </div>
    );
  }

  // Safely get values, defaulting to 0 or empty array
  const safeGet = (obj, path, defaultValue = 0) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value === undefined || value === null) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
    return Array.isArray(defaultValue) ? (Array.isArray(value) ? value : defaultValue) : Number(value);
  };

  const activeDrivesCount = safeGet(localStatistics, 'activeDrivesCount');
  const totalKidsInActiveDrives = safeGet(localStatistics, 'totalKidsInActiveDrives');
  const totalItemsPurchased = safeGet(localStatistics, 'totalItemsPurchased');
  const totalItemsNeeded = safeGet(localStatistics, 'totalItemsNeeded');
  const totalMoneySpent = safeGet(localStatistics, 'totalMoneySpent');
  const uniqueDonorsCount = safeGet(localStatistics, 'uniqueDonorsCount');
  const pageViews = safeGet(localStatistics, 'pageViews');
  const kidsFullyGifted = safeGet(localStatistics, 'kidsFullyGifted');
  const kidsPartiallyGifted = safeGet(localStatistics, 'kidsPartiallyGifted');
  const kidsUngifted = safeGet(localStatistics, 'kidsUngifted');
  const giftsPurchased = safeGet(localStatistics, 'giftsPurchased');
  const giftsInCarts = safeGet(localStatistics, 'giftsInCarts');
  const giftsUnpurchased = safeGet(localStatistics, 'giftsUnpurchased');
  const donationsOverTime = safeGet(localStatistics, 'donationsOverTime', []);
  const topDonors = safeGet(localStatistics, 'topDonors', []);


  const fulfillmentRate =
    totalItemsNeeded > 0
      ? (totalItemsPurchased / totalItemsNeeded) * 100
      : 0;

  const hasDoneesForChart = totalKidsInActiveDrives > 0;
  const hasItemsForGiftStatusChart = totalItemsNeeded > 0;

  return (
    <>
      {/* Date Pickers - Positioned above the stats cards */}
      <div className="flex flex-wrap justify-end p-4 mb-4 bg-blueGray-800 rounded -mt-4 md:-mt-12 -mx-4 md:-mx-10 ">
        <div className="mr-4">
          <label className="block text-xs font-bold uppercase text-blueGray-100 mb-1">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
            dateFormat="MM/dd/yyyy"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-blueGray-100 mb-1">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="border-0 px-3 py-2 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
            dateFormat="MM/dd/yyyy"
          />
        </div>
      </div>

      {/* Key Summary Statistics */}
      <div className="flex flex-wrap">
        <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
          <CardStats
            statSubtitle="Active Drives"
            statTitle={activeDrivesCount.toString()}
            statIconName="fas fa-bullhorn"
            statIconColor="bg-lightBlue-500"
            statDescripiron="Within selected dates"
          />
        </div>
        <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
          <CardStats
            statSubtitle="Total Donees (Active)"
            statTitle={totalKidsInActiveDrives.toString()}
            statIconName="fas fa-users"
            statIconColor="bg-pink-500"
            statDescripiron="In active drives"
          />
        </div>
        <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
          <CardStats
            statSubtitle="Items Purchased"
            statTitle={totalItemsPurchased.toLocaleString()}
            statIconName="fas fa-shopping-cart"
            statIconColor="bg-orange-500"
            statDescripiron="In selected period"
          />
        </div>
        <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
          <CardStats
            statSubtitle="Overall Fulfillment"
            statTitle={`${fulfillmentRate.toFixed(1)}%`}
            statIconName="fas fa-tasks"
            statIconColor="bg-emerald-500"
            statDescripiron={`${totalItemsPurchased.toLocaleString()} of ${totalItemsNeeded.toLocaleString()} items`}
          />
        </div>
      </div>
      <div className="flex flex-wrap mt-4">
        <div className="w-full lg:w-6/12 xl:w-4/12 px-4">
          <CardStats
            statSubtitle="Total Value Raised"
            statTitle={`$${totalMoneySpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            statIconName="fas fa-dollar-sign"
            statIconColor="bg-green-500"
            statDescripiron="In selected period"
          />
        </div>
        <div className="w-full lg:w-6/12 xl:w-4/12 px-4">
          <CardStats
            statSubtitle="Unique Donors"
            statTitle={uniqueDonorsCount.toString()}
            statIconName="fas fa-hands-helping"
            statIconColor="bg-indigo-500"
            statDescripiron="In selected period"
          />
        </div>
        <div className="w-full lg:w-6/12 xl:w-4/12 px-4">
          <CardStats
            statSubtitle="Drive Page Views"
            statTitle={pageViews.toLocaleString()}
            statIconName="fas fa-eye"
            statIconColor="bg-red-500"
            statDescripiron="For your org pages"
          />
        </div>
      </div>


      {/* Charts Section */}
      <div className="flex flex-wrap mt-4">
        {hasDoneesForChart ? (
          <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
            <CardPieChart
              title="Donee Gift Status (Active Drives)"
              data={[
                kidsFullyGifted,
                kidsPartiallyGifted,
                kidsUngifted,
              ]}
              labels={["Fully Gifted", "Partially Gifted", "Not Gifted"]}
              colors={["#10B981", "#F59E0B", "#EF4444"]} // Emerald, Amber, Red
            />
          </div>
        ) : (
          <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full h-full shadow-lg rounded p-4 text-center justify-center items-center">
              <i className="fas fa-users text-blueGray-300 text-4xl mb-3"></i>
              <p className="text-blueGray-500 text-sm">
                No donees found in active drives for the selected period.
              </p>
              <Link href="/admin/currentDrives" className="text-ggreen hover:underline mt-2 text-sm">
                Manage Drives & Add Donees
              </Link>
            </div>
          </div>
        )}

        {hasItemsForGiftStatusChart ? (
          <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
            <CardPieChart
              title="Gift Item Status (Active Drives)"
              data={[
                giftsPurchased,
                giftsInCarts,
                giftsUnpurchased,
              ]}
              labels={["Purchased", "In Carts", "Awaiting Purchase"]}
              colors={["#3B82F6", "#6366F1", "#D1D5DB"]} // Blue, Indigo, Gray
            />
          </div>
        ) : (
          <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full h-full shadow-lg rounded p-4 text-center justify-center items-center">
              <i className="fas fa-box-open text-blueGray-300 text-4xl mb-3"></i>
              <p className="text-blueGray-500 text-sm">
                No items needed in active drives to display gift status.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap mt-4">
        {donationsOverTime.length > 0 ? (
          <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
            <CardLineChart
              title="Donation Activity ($)"
              subtitle="Value of items purchased over time"
              data={donationsOverTime.map(d => d.totalValue)}
              labels={donationsOverTime.map(d => new Date(d.date).toLocaleDateString())}
              borderColor="#4c51bf" // Example: Tailwind indigo-600
              backgroundColor="rgba(76, 81, 191, 0.1)" // Lighter version for area fill
            />
          </div>
        ) : (
          <div className="w-full xl:w-8/12 mb-12 xl:mb-0 px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full h-full shadow-lg rounded p-4 text-center justify-center items-center">
              <i className="fas fa-chart-line text-blueGray-300 text-4xl mb-3"></i>
              <p className="text-blueGray-500 text-sm">
                No donation activity data available for the selected period.
              </p>
            </div>
          </div>
        )}
        {topDonors.length > 0 ? (
          <div className="w-full xl:w-4/12 px-4">
            <CardBarChart
              title="Top Donors"
              subtitle="By total donation value"
              data={topDonors.map((donor) => donor.amount)}
              labels={topDonors.map((donor) => donor.name)}
              backgroundColor="#ed64a6" // Example: Tailwind pink-500
            />
          </div>
        ) : (
          <div className="w-full xl:w-4/12 px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full h-full shadow-lg rounded p-4 text-center justify-center items-center">
              <i className="fas fa-trophy text-blueGray-300 text-4xl mb-3"></i>
              <p className="text-blueGray-500 text-sm">
                No donor data available for the selected period.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Dashboard.layout = Admin;