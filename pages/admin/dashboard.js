// pages/dashboard.js

import React, { useState, useEffect, useContext } from "react";
import axios from "axios";

// Import Chart Components
import CardLineChart from "components/Cards/CardLineChart";
import CardBarChart from "components/Cards/CardBarChart";
import CardPieChart from "components/Cards/CardPieChart";
import CardStats from "components/Cards/CardStats";
import CardPageVisits from "components/Cards/CardPageVisits";
import CardSocialTraffic from "components/Cards/CardSocialTraffic";

// Layout
import Admin from "layouts/Admin.js";

// Auth Context
import { AuthContext } from "../../contexts/AuthContext";
import { StatisticsContext } from "../../contexts/StatisticsContext"; // Import the StatisticsContext

export default function Dashboard() {
  const [localStatistics, setLocalStatistics] = useState(null);
  const { user, loading } = useContext(AuthContext);
  const { setStatistics: setGlobalStatistics } = useContext(StatisticsContext); // Destructure setStatistics

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        if (user && user.org_id) {
          const response = await axios.get(
            `${apiUrl}/api/drives/organization/${user.org_id}/statistics`,
            {
              withCredentials: true,
            }
          );
          setLocalStatistics(response.data);
          setGlobalStatistics(response.data); // Update the global StatisticsContext
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      }
    };

    if (!loading) {
      fetchStatistics();
    }
  }, [user, loading, apiUrl, setGlobalStatistics]);

  if (loading || !localStatistics) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Loading statistics...</p>
      </div>
    );
  }

  return (
    <>
      {/* Charts Section */}
      <div className="flex flex-wrap mt-4">
        {/* Kids Gifted Status Pie Chart */}
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardPieChart
            title="Kids Gifted Status"
            data={[
              localStatistics.kidsFullyGifted,
              localStatistics.kidsPartiallyGifted,
              localStatistics.kidsUngifted,
            ]}
            labels={["Fully Gifted", "Partially Gifted", "Ungifted"]}
            colors={["#0088FE", "#00C49F", "#FFBB28"]}
          />
        </div>

        {/* Gifts Status Pie Chart */}
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardPieChart
            title="Gifts Status"
            data={[
              localStatistics.giftsPurchased,
              localStatistics.giftsInCarts,
              localStatistics.giftsUnpurchased,
            ]}
            labels={["Purchased", "In Carts", "Unpurchased"]}
            colors={["#FF8042", "#00C49F", "#FFBB28"]}
          />
        </div>
      </div>

      <div className="flex flex-wrap mt-4">
        {/* Leaderboard of Donors Bar Chart */}
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardBarChart
            title="Leaderboard of Donors"
            subtitle="Top Donors"
            data={localStatistics.topDonors.map((donor) => donor.amount)}
            labels={localStatistics.topDonors.map((donor) => donor.name)}
            backgroundColor="#8884d8"
          />
        </div>

        {/* Page Views Over Time Line Chart */}
        {localStatistics.pageViewsOverTime && (
          <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
            <CardLineChart
              title="Page Views Over Time"
              subtitle="Daily Page Views"
              data={localStatistics.pageViewsOverTime.map((pv) => pv.views)}
              labels={localStatistics.pageViewsOverTime.map((pv) =>
                new Date(pv.date).toLocaleDateString()
              )}
              borderColor="#4c51bf"
              backgroundColor="#4c51bf"
            />
          </div>
        )}
      </div>

      {/* Additional Statistics */}
      <div className="flex flex-wrap mt-4">
        {/* Financial Statistics */}
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardStats
            statSubtitle="Total Money Spent"
            statTitle={`$${localStatistics.totalMoneySpent.toLocaleString()}`}
            statArrow="up"
            statPercent="5.45"
            statPercentColor="text-emerald-500"
            statDescripiron="Since last month"
            statIconName="fas fa-dollar-sign"
            statIconColor="bg-green-500"
          />
        </div>
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardStats
            statSubtitle="Avg Donation per Person"
            statTitle={`$${localStatistics.avgMoneyDonatedPerPerson.toFixed(2)}`}
            statArrow="up"
            statPercent="2.34"
            statPercentColor="text-emerald-500"
            statDescripiron="Since last month"
            statIconName="fas fa-user-dollar"
            statIconColor="bg-blue-500"
          />
        </div>
        {/* Add more financial stats as needed */}
      </div>

      {/* Page Visits and Social Traffic Tables */}
      <div className="flex flex-wrap mt-4">
        {/* Page Visits */}
        <div className="w-full xl:w-6/12 mb-12 xl:mb-0 px-4">
          <CardPageVisits />
        </div>

        {/* Social Traffic */}
        <div className="w-full xl:w-6/12 px-4">
          <CardSocialTraffic />
        </div>
      </div>
    </>
  );
}

Dashboard.layout = Admin;