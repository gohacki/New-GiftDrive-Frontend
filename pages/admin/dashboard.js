// File: pages/admin/dashboard.js
import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

import CardLineChart from "components/Cards/CardLineChart";
import CardBarChart from "components/Cards/CardBarChart";
import CardPieChart from "components/Cards/CardPieChart";
import CardStats from "components/Cards/CardStats.js";
import Admin from "layouts/Admin.js";
import { StatisticsContext } from "../../contexts/StatisticsContext";

export default function Dashboard() {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [localStatistics, setLocalStatistics] = useState(null);
  const { setStatistics: setGlobalStatistics } = useContext(StatisticsContext);

  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState(new Date());
  const [hasDrives, setHasDrives] = useState(true); // Assume true initially, verify via API
  const [dataFetchLoading, setDataFetchLoading] = useState(true);
  const [pageError, setPageError] = useState(null); // For displaying errors

  useEffect(() => {
    if (authStatus === "loading") {
      setDataFetchLoading(true);
      return;
    }

    if (authStatus === "unauthenticated") {
      console.log("Dashboard: User not authenticated, redirecting to login.");
      router.push('/auth/login');
      return;
    }

    if (user) {
      if (!user.is_org_admin || !user.org_id) {
        console.log("Dashboard: User is not an org admin or org_id missing.");
        setPageError("Access Denied. This dashboard is for organization administrators.");
        setDataFetchLoading(false);
        // Optionally redirect: router.push('/visible/profile');
        return;
      }

      const fetchDashboardData = async () => {
        setDataFetchLoading(true);
        setPageError(null);
        try {
          // UPDATED to relative paths
          const drivesCheckResponse = await axios.get(
            `/api/drives/organization/${user.org_id}/check`,
            { withCredentials: true }
          );

          if (drivesCheckResponse.data && drivesCheckResponse.data.hasDrives) {
            setHasDrives(true);
            const statsResponse = await axios.get(
              `/api/drives/organization/${user.org_id}/statistics`,
              {
                params: {
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                },
                withCredentials: true,
              }
            );
            setLocalStatistics(statsResponse.data);
            setGlobalStatistics(statsResponse.data); // Update global context
          } else {
            setHasDrives(false);
            setLocalStatistics(null);
            setGlobalStatistics(null);
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error.response?.data || error.message);
          setPageError("Failed to load dashboard data. Please try again.");
          setHasDrives(false);
          setLocalStatistics(null);
          setGlobalStatistics(null);
        } finally {
          setDataFetchLoading(false);
        }
      };
      fetchDashboardData();
    } else {
      // Should not happen if authStatus is 'authenticated', but as a safeguard
      setDataFetchLoading(false);
      setPageError("User session not available.");
    }
  }, [user, authStatus, router, setGlobalStatistics, startDate, endDate]); // Dependencies

  if (authStatus === "loading" || dataFetchLoading) {
    return (
      <Admin>
        <div className="flex justify-center items-center h-screen -mt-24">
          <p className="text-xl text-blueGray-600">Loading dashboard...</p>
        </div>
      </Admin>
    );
  }

  if (pageError) {
    return (
      <Admin>
        <div className="pt-10 p-6 text-center">
          <p className="text-xl text-red-500">{pageError}</p>
          <Link href="/visible/profile" className="text-ggreen hover:underline mt-4 inline-block">
            Go to Profile
          </Link>
        </div>
      </Admin>
    );
  }

  if (!user || !user.org_id || !user.is_org_admin) {
    // This state implies user is authenticated but not an authorized org admin (already handled by pageError)
    // Or, user data somehow became null after initial checks.
    return (
      <Admin>
        <div className="pt-10 p-6 text-center">
          <p className="text-xl text-blueGray-600">Access Denied or User Data Error.</p>
          <Link href="/auth/login" className="text-ggreen hover:underline mt-4 inline-block">
            Return to Login
          </Link>
        </div>
      </Admin>
    );
  }

  if (!hasDrives) {
    return (
      <Admin> {/* Ensure Admin layout is applied */}
        <div className="pt-10 p-6 text-center">
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
      </Admin>
    );
  }

  if (!localStatistics) {
    // This case would be hit if hasDrives is true, but stats API call failed or returned null
    return (
      <Admin>
        <div className="pt-10 p-6 text-center">
          <p className="text-xl text-blueGray-600">Loading statistics for your drives...</p>
          <p className="text-sm text-blueGray-500 mt-2">If this persists, ensure your drives have associated children and items, and that purchases have been made for the selected date range.</p>
        </div>
      </Admin>
    );
  }

  // Safely get values, defaulting to 0 or empty array
  const safeGet = (obj, path, defaultValue = 0) => {
    // ... (safeGet function remains the same) ...
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value === undefined || value === null) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
    return Array.isArray(defaultValue) ? (Array.isArray(value) ? value : defaultValue) : Number(value);
  };

  // ... (Statistic variable assignments remain the same) ...
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

  const fulfillmentRate = totalItemsNeeded > 0 ? (totalItemsPurchased / totalItemsNeeded) * 100 : 0;
  const hasDoneesForChart = totalKidsInActiveDrives > 0;
  const hasItemsForGiftStatusChart = totalItemsNeeded > 0;

  return (
    <> {/* Admin layout handles its own structure, so this fragment is fine */}
      {/* Date Pickers are part of the content for this page, so they stay here */}
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

      {/* Key Summary Statistics Cards */}
      {/* ... (CardStats components remain the same) ... */}
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
      {/* ... (Chart components and their conditional rendering remain the same) ... */}
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
              colors={["#10B981", "#F59E0B", "#EF4444"]}
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
              colors={["#3B82F6", "#6366F1", "#D1D5DB"]}
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
              borderColor="#4c51bf"
              backgroundColor="rgba(76, 81, 191, 0.1)"
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
              backgroundColor="#ed64a6"
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